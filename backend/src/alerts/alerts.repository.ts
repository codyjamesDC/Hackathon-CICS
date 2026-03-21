/** Alerts Repository — database queries for threshold breaches and anomaly alerts */

import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { thresholdBreachesTable } from './threshold-breaches.schema.js';
import { anomalyAlertsTable } from '../anomaly-detection/anomaly-alerts.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';
import { rhuTable } from '../rhu/rhu.schema.js';
import { requisitionItemsTable } from '../requisitions/requisition-items.schema.js';

export async function findBreachesByRhu(rhuId: string, statuses?: string[]) {
  const conditions = [eq(thresholdBreachesTable.rhuId, rhuId)];
  if (statuses && statuses.length > 0) conditions.push(inArray(thresholdBreachesTable.status, statuses as any[]));

  return db
    .select({
      id: thresholdBreachesTable.id,
      rhuId: thresholdBreachesTable.rhuId,
      rhuName: rhuTable.name,
      medicineId: thresholdBreachesTable.medicineId,
      genericName: medicinesTable.genericName,
      daysRemaining: thresholdBreachesTable.daysRemaining,
      projectedZeroDate: thresholdBreachesTable.projectedZeroDate,
      status: thresholdBreachesTable.status,
      createdAt: thresholdBreachesTable.createdAt,
    })
    .from(thresholdBreachesTable)
    .innerJoin(medicinesTable, eq(thresholdBreachesTable.medicineId, medicinesTable.id))
    .innerJoin(rhuTable, eq(thresholdBreachesTable.rhuId, rhuTable.id))
    .where(and(...conditions))
    .orderBy(desc(thresholdBreachesTable.createdAt));
}

export async function findBreachesByMunicipality(municipalityId: string, statuses?: string[]) {
  const conditions = [eq(rhuTable.municipalityId, municipalityId)];
  if (statuses && statuses.length > 0) conditions.push(inArray(thresholdBreachesTable.status, statuses as any[]));

  return db
    .select({
      id: thresholdBreachesTable.id,
      rhuId: thresholdBreachesTable.rhuId,
      rhuName: rhuTable.name,
      medicineId: thresholdBreachesTable.medicineId,
      genericName: medicinesTable.genericName,
      daysRemaining: thresholdBreachesTable.daysRemaining,
      projectedZeroDate: thresholdBreachesTable.projectedZeroDate,
      status: thresholdBreachesTable.status,
      createdAt: thresholdBreachesTable.createdAt,
    })
    .from(thresholdBreachesTable)
    .innerJoin(rhuTable, eq(thresholdBreachesTable.rhuId, rhuTable.id))
    .innerJoin(medicinesTable, eq(thresholdBreachesTable.medicineId, medicinesTable.id))
    .where(and(...conditions))
    .orderBy(desc(thresholdBreachesTable.createdAt));
}

export async function findAnomaliesByRhu(rhuId: string) {
  return db
    .select({
      id: anomalyAlertsTable.id,
      rhuId: anomalyAlertsTable.rhuId,
      rhuName: rhuTable.name,
      medicineId: anomalyAlertsTable.medicineId,
      genericName: medicinesTable.genericName,
      baselineVelocity: anomalyAlertsTable.baselineVelocity,
      currentVelocity: anomalyAlertsTable.currentVelocity,
      velocityRatio: anomalyAlertsTable.velocityRatio,
      status: anomalyAlertsTable.status,
      createdAt: anomalyAlertsTable.createdAt,
    })
    .from(anomalyAlertsTable)
    .innerJoin(medicinesTable, eq(anomalyAlertsTable.medicineId, medicinesTable.id))
    .innerJoin(rhuTable, eq(anomalyAlertsTable.rhuId, rhuTable.id))
    .where(and(eq(anomalyAlertsTable.rhuId, rhuId), eq(anomalyAlertsTable.status, 'open')))
    .orderBy(desc(anomalyAlertsTable.createdAt));
}

export async function findAnomaliesByMunicipality(municipalityId: string) {
  return db
    .select({
      id: anomalyAlertsTable.id,
      rhuId: anomalyAlertsTable.rhuId,
      rhuName: rhuTable.name,
      medicineId: anomalyAlertsTable.medicineId,
      genericName: medicinesTable.genericName,
      baselineVelocity: anomalyAlertsTable.baselineVelocity,
      currentVelocity: anomalyAlertsTable.currentVelocity,
      velocityRatio: anomalyAlertsTable.velocityRatio,
      status: anomalyAlertsTable.status,
      createdAt: anomalyAlertsTable.createdAt,
    })
    .from(anomalyAlertsTable)
    .innerJoin(rhuTable, eq(anomalyAlertsTable.rhuId, rhuTable.id))
    .innerJoin(medicinesTable, eq(anomalyAlertsTable.medicineId, medicinesTable.id))
    .where(and(eq(rhuTable.municipalityId, municipalityId), eq(anomalyAlertsTable.status, 'open')))
    .orderBy(desc(anomalyAlertsTable.createdAt));
}

/**
 * Given a list of threshold breach IDs, returns a Map<breachId, requisitionId>.
 * Used to attach relatedRequisitionId to breach alerts.
 */
export async function findRequisitionsByBreachIds(breachIds: string[]): Promise<Map<string, string>> {
  if (breachIds.length === 0) return new Map();

  const rows = await db
    .select({
      breachId: requisitionItemsTable.breachId,
      requisitionId: requisitionItemsTable.requisitionId,
    })
    .from(requisitionItemsTable)
    .where(inArray(requisitionItemsTable.breachId, breachIds as any[]));

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.breachId && !map.has(row.breachId)) {
      map.set(row.breachId, row.requisitionId);
    }
  }
  return map;
}
