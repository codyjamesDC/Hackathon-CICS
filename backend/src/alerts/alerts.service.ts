/** Alerts Service — business logic for alert aggregation */

import * as alertsRepository from './alerts.repository.js';
import * as participationMonitor from '../participation-monitor/participation-monitor.service.js';

type NormalizedAlert = {
  id: string;
  rhuId: string;
  rhuName: string;
  type: 'threshold_breach' | 'anomaly_spike' | 'participation_alert';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  medicineName: string | null;
  relatedRequisitionId: string | null;
  createdAt: string;
};

export async function getAlertsForRhu(rhuId: string): Promise<NormalizedAlert[]> {
  const [breaches, anomalies, silentCheck] = await Promise.all([
    alertsRepository.findBreachesByRhu(rhuId, ['open', 'requisition_drafted']),
    alertsRepository.findAnomaliesByRhu(rhuId),
    participationMonitor.checkSingleRhu(rhuId),
  ]);

  const breachIds = breaches.map((b) => b.id);
  const requisitionMap = await alertsRepository.findRequisitionsByBreachIds(breachIds);

  const alerts: NormalizedAlert[] = [
    ...breaches.map((b) => ({
      id: b.id,
      rhuId: b.rhuId,
      rhuName: b.rhuName,
      type: 'threshold_breach' as const,
      severity: 'critical' as const,
      title: 'Threshold Breach',
      message: `${b.genericName} is projected to run out in ${parseFloat(b.daysRemaining).toFixed(1)} day(s).`,
      medicineName: b.genericName,
      createdAt: (b.createdAt as Date).toISOString(),
      relatedRequisitionId: requisitionMap.get(b.id) ?? null,
    })),
    ...anomalies.map((a) => ({
      id: a.id,
      rhuId: a.rhuId,
      rhuName: a.rhuName,
      type: 'anomaly_spike' as const,
      severity: 'warning' as const,
      title: 'Anomaly Spike',
      message: `${a.genericName} consumption is ${parseFloat(a.velocityRatio).toFixed(1)}× the normal rate (${parseFloat(a.currentVelocity).toFixed(1)} vs ${parseFloat(a.baselineVelocity).toFixed(1)} units/day).`,
      medicineName: a.genericName,
      createdAt: (a.createdAt as Date).toISOString(),
      relatedRequisitionId: null,
    })),
  ];

  if (silentCheck.silent) {
    alerts.push({
      id: `participation-${rhuId}`,
      rhuId,
      rhuName: '',
      type: 'participation_alert',
      severity: 'info',
      title: 'Silent Facility',
      message: silentCheck.daysSinceLastEntry >= 999
        ? 'This facility has not submitted any stock reports.'
        : `This facility has not reported stock entries for ${silentCheck.daysSinceLastEntry} day(s).`,
      medicineName: null,
      createdAt: new Date().toISOString(),
      relatedRequisitionId: null,
    });
  }

  alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return alerts;
}

export async function getAlertsForMunicipality(municipalityId: string): Promise<NormalizedAlert[]> {
  const [breaches, anomalies, silentRhus] = await Promise.all([
    alertsRepository.findBreachesByMunicipality(municipalityId, ['open', 'requisition_drafted']),
    alertsRepository.findAnomaliesByMunicipality(municipalityId),
    participationMonitor.getSilentRhus(municipalityId),
  ]);

  const breachIds = breaches.map((b) => b.id);
  const requisitionMap = await alertsRepository.findRequisitionsByBreachIds(breachIds);

  const alerts: NormalizedAlert[] = [
    ...breaches.map((b) => ({
      id: b.id,
      rhuId: b.rhuId,
      rhuName: b.rhuName,
      type: 'threshold_breach' as const,
      severity: 'critical' as const,
      title: 'Threshold Breach',
      message: `${b.genericName} is projected to run out in ${parseFloat(b.daysRemaining).toFixed(1)} day(s).`,
      medicineName: b.genericName,
      createdAt: (b.createdAt as Date).toISOString(),
      relatedRequisitionId: requisitionMap.get(b.id) ?? null,
    })),
    ...anomalies.map((a) => ({
      id: a.id,
      rhuId: a.rhuId,
      rhuName: a.rhuName,
      type: 'anomaly_spike' as const,
      severity: 'warning' as const,
      title: 'Anomaly Spike',
      message: `${a.genericName} consumption is ${parseFloat(a.velocityRatio).toFixed(1)}× the normal rate (${parseFloat(a.currentVelocity).toFixed(1)} vs ${parseFloat(a.baselineVelocity).toFixed(1)} units/day).`,
      medicineName: a.genericName,
      createdAt: (a.createdAt as Date).toISOString(),
      relatedRequisitionId: null,
    })),
    ...silentRhus.map((r) => ({
      id: `participation-${r.rhuId}`,
      rhuId: r.rhuId,
      rhuName: r.rhuName,
      type: 'participation_alert' as const,
      severity: 'info' as const,
      title: 'Silent Facility',
      message: r.daysSinceLastEntry >= 999
        ? `${r.rhuName} has not submitted any stock reports.`
        : `${r.rhuName} has not reported stock entries for ${r.daysSinceLastEntry} day(s).`,
      medicineName: null,
      createdAt: r.lastEntryAt ? r.lastEntryAt.toISOString() : new Date().toISOString(),
      relatedRequisitionId: null,
    })),
  ];

  alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return alerts;
}
