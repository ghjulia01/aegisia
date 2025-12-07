/**
 * useCVEMonitoring - Hook for CVE Monitoring
 * 
 * Permet de surveiller en temps réel les nouvelles vulnérabilités
 * pour les packages analysés.
 */

import { useState, useEffect, useCallback } from 'react';
import { Dependency, CVEData } from '../types';
import { CVEClient } from '../services/api/CVEClient';

interface CVEAlert {
  packageName: string;
  packageVersion: string;
  cve: CVEData;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface UseCVEMonitoringResult {
  alerts: CVEAlert[];
  isMonitoring: boolean;
  startMonitoring: (dependencies: Dependency[]) => void;
  stopMonitoring: () => void;
  clearAlerts: () => void;
  acknowledgeAlert: (alertId: string) => void;
  unacknowledgedCount: number;
}

/**
 * Hook pour surveiller les CVEs en temps réel
 */
export const useCVEMonitoring = (
  checkIntervalMinutes: number = 30
): UseCVEMonitoringResult => {
  const [alerts, setAlerts] = useState<CVEAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoredDependencies, setMonitoredDependencies] = useState<Dependency[]>([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  const cveClient = new CVEClient();

  /**
   * Vérifie les CVEs pour tous les packages surveillés
   */
  const checkForNewCVEs = useCallback(async () => {
    if (monitoredDependencies.length === 0) return;

    console.log('🔍 Vérification des nouvelles CVEs...');

    for (const dep of monitoredDependencies) {
      try {
        const cves = await cveClient.checkVulnerabilities(dep.name, dep.version);
        
        // Identifier les nouvelles CVEs (pas déjà dans les alertes)
        const existingCVEIds = new Set(alerts.map(a => a.cve.id));
        const newCVEs = cves.filter(cve => !existingCVEIds.has(cve.id));

        if (newCVEs.length > 0) {
          const newAlerts: CVEAlert[] = newCVEs.map(cve => ({
            packageName: dep.name,
            packageVersion: dep.version,
            cve,
            timestamp: new Date(),
            severity: getSeverityFromCVSS(cve.cvss)
          }));

          setAlerts(prev => [...newAlerts, ...prev]);

          // Notification browser si disponible
          if ('Notification' in window && Notification.permission === 'granted') {
            newAlerts.forEach(alert => {
              new Notification('⚠️ Nouvelle Vulnérabilité Détectée', {
                body: `${alert.packageName}: ${alert.cve.id} (${alert.severity})`,
                icon: '/alert-icon.png'
              });
            });
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification CVE pour ${dep.name}:`, error);
      }
    }
  }, [monitoredDependencies, alerts, cveClient]);

  /**
   * Démarre la surveillance
   */
  const startMonitoring = useCallback((dependencies: Dependency[]) => {
    if (dependencies.length === 0) {
      console.warn('Aucune dépendance à surveiller');
      return;
    }

    setMonitoredDependencies(dependencies);
    setIsMonitoring(true);

    // Demander permission pour les notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    console.log(`✅ Surveillance démarrée pour ${dependencies.length} packages`);
  }, []);

  /**
   * Arrête la surveillance
   */
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    setMonitoredDependencies([]);
    console.log('⏸️ Surveillance arrêtée');
  }, []);

  /**
   * Efface toutes les alertes
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setAcknowledgedAlerts(new Set());
  }, []);

  /**
   * Marque une alerte comme acquittée
   */
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
  }, []);

  /**
   * Nombre d'alertes non acquittées
   */
  const unacknowledgedCount = alerts.filter(
    alert => !acknowledgedAlerts.has(`${alert.packageName}-${alert.cve.id}`)
  ).length;

  /**
   * Effet pour la surveillance périodique
   */
  useEffect(() => {
    if (!isMonitoring) return;

    // Vérification immédiate
    checkForNewCVEs();

    // Vérifications périodiques
    const intervalId = setInterval(
      checkForNewCVEs,
      checkIntervalMinutes * 60 * 1000
    );

    return () => clearInterval(intervalId);
  }, [isMonitoring, checkForNewCVEs, checkIntervalMinutes]);

  return {
    alerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    acknowledgeAlert,
    unacknowledgedCount
  };
};

/**
 * Détermine la sévérité à partir du score CVSS
 */
function getSeverityFromCVSS(cvss: number): 'critical' | 'high' | 'medium' | 'low' {
  if (cvss >= 9.0) return 'critical';
  if (cvss >= 7.0) return 'high';
  if (cvss >= 4.0) return 'medium';
  return 'low';
}
