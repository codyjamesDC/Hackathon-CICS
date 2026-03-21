/**
 * Anomaly Detection Service
 *
 * Compares current consumption velocity against the EWMA baseline.
 * If ratio > ANOMALY_THRESHOLD → flag for MHO review.
 */

import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { anomalyAlertsTable } from './anomaly-alerts.schema.js';
import { consumptionBaselinesTable } from '../velocity-engine/consumption-baselines.schema.js';
import * as auditService from '../audit/audit.service.js';

const ANOMALY_THRESHOLD = 2.0;

/**
 * Called after every velocity calculation.
 * Checks if current velocity is ANOMALY_THRESHOLD times the EWMA baseline.
 * Skips if a duplicate open anomaly already exists for this rhu+medicine.
 *
 * @param knownBaseline - Pre-spike EWMA baseline. When provided, the DB fetch
 *   is skipped entirely. This prevents a stale-read bug where the upsert has
 *   already blended the spike into the baseline before the comparison runs.
 */
export async function checkForAnomaly(
  rhuId: string,
  medicineId: string,
  currentVelocity: number,
  knownBaseline?: number,
): Promise<void> {
  if (currentVelocity <= 0) return;

  let baselineVelocity: number;

  if (knownBaseline !== undefined) {
    if (knownBaseline <= 0) return;
    baselineVelocity = knownBaseline;
  } else {
    // Fallback: fetch from DB (only used when called outside the velocity engine)
    const rows = await db
      .select({ velocity: consumptionBaselinesTable.velocity })
      .from(consumptionBaselinesTable)
      .where(
        and(
          eq(consumptionBaselinesTable.rhuId, rhuId),
          eq(consumptionBaselinesTable.medicineId, medicineId),
        ),
      )
      .limit(1);

    if (rows.length === 0) return;
    baselineVelocity = parseFloat(rows[0].velocity);
    if (baselineVelocity <= 0) return;
  }

  const ratio = currentVelocity / baselineVelocity;
  if (ratio < ANOMALY_THRESHOLD) return;

  // Deduplicate: skip if an open anomaly already exists
  const existing = await db
    .select({ id: anomalyAlertsTable.id })
    .from(anomalyAlertsTable)
    .where(
      and(
        eq(anomalyAlertsTable.rhuId, rhuId),
        eq(anomalyAlertsTable.medicineId, medicineId),
        inArray(anomalyAlertsTable.status, ['open']),
      ),
    )
    .limit(1);

  if (existing.length > 0) return;

  await flagAnomaly(rhuId, medicineId, baselineVelocity, currentVelocity, ratio);
}

/**
 * Inserts an anomaly_alert record and writes to the audit trail.
 */
export async function flagAnomaly(
  rhuId: string,
  medicineId: string,
  baselineVelocity: number,
  currentVelocity: number,
  ratio: number,
): Promise<void> {
  const rows = await db
    .insert(anomalyAlertsTable)
    .values({
      rhuId,
      medicineId,
      baselineVelocity: baselineVelocity.toFixed(4),
      currentVelocity: currentVelocity.toFixed(4),
      velocityRatio: ratio.toFixed(4),
      status: 'open',
    })
    .returning();

  const alert = rows[0];

  await auditService.log({
    eventType: 'anomaly_detected',
    actorId: null,
    actorType: 'system',
    entityType: 'anomaly_alert',
    entityId: alert.id,
    metadata: { rhuId, medicineId, baselineVelocity, currentVelocity, ratio },
  });

  console.log(
    `[ANOMALY] RHU=${rhuId} Medicine=${medicineId} ` +
    `ratio=${ratio.toFixed(2)}x (${currentVelocity.toFixed(2)} vs baseline ${baselineVelocity.toFixed(2)})`,
  );
}
