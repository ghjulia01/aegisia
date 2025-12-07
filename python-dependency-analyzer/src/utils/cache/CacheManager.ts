// ==========================================
// CACHE MANAGER
// Multi-tier caching strategy (Memory + LocalStorage)
// ==========================================

import { CacheEntry } from '../../types/Dependency';

/**
 * Multi-tier Cache Manager
 * L1: In-memory cache (fast, session-only)
 * L2: LocalStorage cache (persistent, larger capacity)
 */
export class CacheManager {
  private memoryCache: Map<string, any>;
  private readonly namespace: string;
  private readonly ttl: number; // Time to live in seconds
  private readonly maxMemoryItems: number = 100;

  constructor(namespace: string, ttl: number = 3600) {
    this.namespace = namespace;
    this.ttl = ttl;
    this.memoryCache = new Map();

    // Cleanup old entries on initialization
    this.cleanupExpiredEntries();
  }

  /**
   * Get value from cache
   * Checks L1 (memory) first, then L2 (localStorage)
   * @param key - Cache key
   * @returns Cached value or null
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);

    // L1: Check memory cache
    if (this.memoryCache.has(fullKey)) {
      const entry = this.memoryCache.get(fullKey) as CacheEntry<T>;

      if (this.isValid(entry)) {
        console.log(`[Cache] L1 hit: ${fullKey}`);
        return entry.data;
      } else {
        // Expired, remove from L1
        this.memoryCache.delete(fullKey);
      }
    }

    // L2: Check localStorage
    try {
      const stored = localStorage.getItem(fullKey);

      if (stored) {
        const entry = JSON.parse(stored) as CacheEntry<T>;

        if (this.isValid(entry)) {
          console.log(`[Cache] L2 hit: ${fullKey}`);

          // Promote to L1
          this.promoteToMemory(fullKey, entry);

          return entry.data;
        } else {
          // Expired, remove from L2
          localStorage.removeItem(fullKey);
        }
      }
    } catch (error) {
      console.error(`[Cache] Error reading from localStorage:`, error);
    }

    console.log(`[Cache] Miss: ${fullKey}`);
    return null;
  }

  /**
   * Set value in cache
   * Stores in both L1 and L2
   * @param key - Cache key
   * @param value - Value to cache
   */
  async set<T>(key: string, value: T): Promise<void> {
    const fullKey = this.getFullKey(key);
    const entry: CacheEntry<T> = {
      data: value,
      expiry: Date.now() + this.ttl * 1000,
      timestamp: Date.now(),
    };

    // Store in L1 (memory)
    this.memoryCache.set(fullKey, entry);

    // Enforce memory cache size limit
    this.enforceMemoryLimit();

    // Store in L2 (localStorage)
    try {
      localStorage.setItem(fullKey, JSON.stringify(entry));
      console.log(`[Cache] Set: ${fullKey}`);
    } catch (error) {
      // localStorage might be full or disabled
      console.error(`[Cache] Error writing to localStorage:`, error);

      // Try to free up space
      this.cleanupExpiredEntries();

      // Retry once
      try {
        localStorage.setItem(fullKey, JSON.stringify(entry));
      } catch (retryError) {
        console.error(`[Cache] Retry failed, cache not persisted`);
      }
    }
  }

  /**
   * Delete specific cache entry
   * @param key - Cache key to delete
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);

    // Remove from L1
    this.memoryCache.delete(fullKey);

    // Remove from L2
    try {
      localStorage.removeItem(fullKey);
      console.log(`[Cache] Deleted: ${fullKey}`);
    } catch (error) {
      console.error(`[Cache] Error deleting from localStorage:`, error);
    }
  }

  /**
   * Clear all cache for this namespace
   */
  async clear(): Promise<void> {
    // Clear L1
    this.memoryCache.clear();

    // Clear L2 (only entries for this namespace)
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.namespace}:`)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log(`[Cache] Cleared namespace: ${this.namespace}`);
    } catch (error) {
      console.error(`[Cache] Error clearing localStorage:`, error);
    }
  }

  /**
   * Get cache statistics
   * @returns Cache stats object
   */
  getStats(): {
    memorySize: number;
    localStorageSize: number;
    namespace: string;
    ttl: number;
  } {
    let localStorageCount = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.namespace}:`)) {
          localStorageCount++;
        }
      }
    } catch (error) {
      console.error(`[Cache] Error reading stats:`, error);
    }

    return {
      memorySize: this.memoryCache.size,
      localStorageSize: localStorageCount,
      namespace: this.namespace,
      ttl: this.ttl,
    };
  }

  /**
   * Check if cache entry is still valid
   * @param entry - Cache entry to check
   * @returns True if valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiry;
  }

  /**
   * Generate full cache key with namespace
   * @param key - Original key
   * @returns Namespaced key
   */
  private getFullKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Promote entry from L2 to L1
   * @param key - Cache key
   * @param entry - Cache entry
   */
  private promoteToMemory<T>(key: string, entry: CacheEntry<T>): void {
    this.memoryCache.set(key, entry);
    this.enforceMemoryLimit();
  }

  /**
   * Enforce memory cache size limit
   * Uses LRU (Least Recently Used) eviction
   */
  private enforceMemoryLimit(): void {
    if (this.memoryCache.size > this.maxMemoryItems) {
      // Find oldest entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        console.log(`[Cache] Evicted from memory: ${oldestKey}`);
      }
    }
  }

  /**
   * Cleanup expired entries from localStorage
   */
  private cleanupExpiredEntries(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith(`${this.namespace}:`)) {
          const stored = localStorage.getItem(key);

          if (stored) {
            try {
              const entry = JSON.parse(stored) as CacheEntry<any>;

              if (!this.isValid(entry)) {
                keysToRemove.push(key);
              }
            } catch (parseError) {
              // Invalid JSON, remove it
              keysToRemove.push(key);
            }
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      if (keysToRemove.length > 0) {
        console.log(`[Cache] Cleaned up ${keysToRemove.length} expired entries`);
      }
    } catch (error) {
      console.error(`[Cache] Error during cleanup:`, error);
    }
  }

  /**
   * Prefetch multiple keys
   * Useful for warming up cache
   * @param keys - Array of keys to prefetch
   */
  async prefetch(keys: string[]): Promise<void> {
    const promises = keys.map(key => this.get(key));
    await Promise.all(promises);
  }

  /**
   * Check if key exists in cache
   * @param key - Cache key
   * @returns True if exists and valid
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get cache size in bytes (approximate)
   * @returns Size in bytes
   */
  getSizeInBytes(): number {
    let size = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith(`${this.namespace}:`)) {
          const value = localStorage.getItem(key);
          if (value) {
            size += key.length + value.length;
          }
        }
      }
    } catch (error) {
      console.error(`[Cache] Error calculating size:`, error);
    }

    return size;
  }
}

/**
 * Global cache instances for different namespaces
 */
export const createCacheManager = (namespace: string, ttl?: number): CacheManager => {
  return new CacheManager(namespace, ttl);
};
