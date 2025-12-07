/**
 * useScanHistory - Hook for Scan History Management
 * 
 * Gère l'historique des analyses effectuées avec persistance localStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import { Dependency } from '../types';

interface ScanRecord {
  id: string;
  timestamp: Date;
  packages: string[];
  results: Dependency[];
  totalRiskScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCVEs: number;
}

interface UseScanHistoryResult {
  history: ScanRecord[];
  addScan: (packages: string[], results: Dependency[]) => void;
  deleteScan: (scanId: string) => void;
  clearHistory: () => void;
  getScan: (scanId: string) => ScanRecord | undefined;
  exportHistory: (format: 'json' | 'csv') => void;
  searchHistory: (query: string) => ScanRecord[];
}

const STORAGE_KEY = 'dependency-analyzer-history';
const MAX_HISTORY_SIZE = 100;

/**
 * Hook pour gérer l'historique des scans
 */
export const useScanHistory = (): UseScanHistoryResult => {
  const [history, setHistory] = useState<ScanRecord[]>([]);

  /**
   * Charge l'historique depuis localStorage au montage
   */
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convertir les timestamps en objets Date
          const historyWithDates = parsed.map((record: any) => ({
            ...record,
            timestamp: new Date(record.timestamp)
          }));
          setHistory(historyWithDates);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
      }
    };

    loadHistory();
  }, []);

  /**
   * Sauvegarde l'historique dans localStorage
   */
  const saveHistory = useCallback((newHistory: ScanRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'historique:', error);
    }
  }, []);

  /**
   * Calcule les statistiques d'un scan
   */
  const calculateStats = useCallback((results: Dependency[]) => {
    return {
      totalRiskScore: results.reduce((sum, dep) => sum + dep.riskScore, 0) / results.length,
      criticalCount: results.filter(d => d.riskScore >= 8).length,
      highCount: results.filter(d => d.riskScore >= 6 && d.riskScore < 8).length,
      mediumCount: results.filter(d => d.riskScore >= 4 && d.riskScore < 6).length,
      lowCount: results.filter(d => d.riskScore < 4).length,
      totalCVEs: results.reduce((sum, d) => sum + (d.vulnerabilities?.length || 0), 0)
    };
  }, []);

  /**
   * Ajoute un nouveau scan à l'historique
   */
  const addScan = useCallback((packages: string[], results: Dependency[]) => {
    const stats = calculateStats(results);
    
    const newScan: ScanRecord = {
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      packages,
      results,
      ...stats
    };

    setHistory(prev => {
      // Ajouter le nouveau scan au début
      const updated = [newScan, ...prev];
      
      // Limiter la taille de l'historique
      const trimmed = updated.slice(0, MAX_HISTORY_SIZE);
      
      // Sauvegarder
      saveHistory(trimmed);
      
      return trimmed;
    });

    console.log(`✅ Scan ajouté à l'historique: ${packages.join(', ')}`);
  }, [calculateStats, saveHistory]);

  /**
   * Supprime un scan de l'historique
   */
  const deleteScan = useCallback((scanId: string) => {
    setHistory(prev => {
      const updated = prev.filter(scan => scan.id !== scanId);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  /**
   * Efface tout l'historique
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Historique effacé');
  }, []);

  /**
   * Récupère un scan spécifique
   */
  const getScan = useCallback((scanId: string): ScanRecord | undefined => {
    return history.find(scan => scan.id === scanId);
  }, [history]);

  /**
   * Export de l'historique
   */
  const exportHistory = useCallback((format: 'json' | 'csv') => {
    if (history.length === 0) {
      console.warn('Aucun historique à exporter');
      return;
    }

    if (format === 'json') {
      const dataStr = JSON.stringify(history, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scan-history-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // En-têtes CSV
      let csv = 'ID,Date,Packages,Total Risk,Critical,High,Medium,Low,CVEs\n';
      
      // Lignes de données
      history.forEach(scan => {
        csv += [
          scan.id,
          scan.timestamp.toISOString(),
          `"${scan.packages.join(', ')}"`,
          scan.totalRiskScore.toFixed(2),
          scan.criticalCount,
          scan.highCount,
          scan.mediumCount,
          scan.lowCount,
          scan.totalCVEs
        ].join(',') + '\n';
      });

      const dataBlob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scan-history-${new Date().toISOString()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [history]);

  /**
   * Recherche dans l'historique
   */
  const searchHistory = useCallback((query: string): ScanRecord[] => {
    if (!query.trim()) return history;

    const lowerQuery = query.toLowerCase();
    return history.filter(scan => 
      scan.packages.some(pkg => pkg.toLowerCase().includes(lowerQuery)) ||
      scan.id.toLowerCase().includes(lowerQuery)
    );
  }, [history]);

  return {
    history,
    addScan,
    deleteScan,
    clearHistory,
    getScan,
    exportHistory,
    searchHistory
  };
};
