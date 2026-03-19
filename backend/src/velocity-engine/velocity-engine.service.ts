/**
 * Velocity Engine Service
 *
 * Core predictive engine. Triggered on every new stock entry.
 * Calculates consumption rate using EWMA (Exponential Weighted Moving Average),
 * projects days remaining, and triggers threshold breaches.
 */

import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { consumptionBaselinesTable } from './consumption-baselines.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';
import { thresholdBreachesTable } from '../alerts/threshold-breaches.schema.js';
import * as stockEntriesRepository from '../stock-entries/stock-entries.repository.js';
import * as auditService from '../audit/audit.service.js';
import type { StockEntry } from '../stock-entries/stock-entries.schema.js';

const SMOOTHING_FACTOR = 0.3;

export type VelocityResult = {
  velocityPerDay: number;
  daysRemaining: number;
  breachTriggered: boolean;
};

/**
 * Process a newly saved stock entry.
 * 1. Find previous entry for the same rhu+medicine
 * 2. Calculate current velocity
 * 3. Apply EWMA smoothing
 * 4. Upsert consumption_baselines
 * 5. Check threshold → create breach + auto-draft requisition
 */
export async function processNewEntry(entry: StockEntry): Promise<VelocityResult> {
  // 1. Fetch previous entry for the same rhu + medicine
  const prevEntry = await stockEntriesRepository.findPreviousEntry(
    entry.rhuId,
    entry.medicineId,
    entry.submittedAt,
  );

  // First entry for this rhu+medicine → no velocity data yet
  if (!prevEntry) {
    await upsertBaseline(entry.rhuId, entry.medicineId, 0, 9999);
    return { velocityPerDay: 0, daysRemaining: 9999, breachTriggered: false };
  }

  // 2. Calculate current velocity
  const currentVelocity = calculateVelocity(
    prevEntry.quantityOnHand,
    entry.quantityOnHand,
    prevEntry.submittedAt,
    entry.submittedAt,
  );

  // If negative or zero velocity (restocked), reset
  if (currentVelocity <= 0) {
    await upsertBaseline(entry.rhuId, entry.medicineId, 0, 9999);
    return { velocityPerDay: 0, daysRemaining: 9999, breachTriggered: false };
  }

  // 3. Get previous baseline for EWMA calculation
  const prevBaseline = await getBaseline(entry.rhuId, entry.medicineId);
  const prevAvgVelocity = prevBaseline ? parseFloat(prevBaseline.velocity) : 0;

  // EWMA: new_avg = α × current + (1 - α) × previous
  const ewmaVelocity = prevAvgVelocity > 0
    ? SMOOTHING_FACTOR * currentVelocity + (1 - SMOOTHING_FACTOR) * prevAvgVelocity
    : currentVelocity; // First real velocity, just use current

  // 4. Calculate days remaining
  const daysRemaining = ewmaVelocity > 0
    ? entry.quantityOnHand / ewmaVelocity
    : 9999;

  // 5. Upsert baseline
  await upsertBaseline(entry.rhuId, entry.medicineId, ewmaVelocity, daysRemaining);

  // 6. Check threshold breach
  const medicine = await db
    .select({ criticalThresholdDays: medicinesTable.criticalThresholdDays })
    .from(medicinesTable)
    .where(eq(medicinesTable.id, entry.medicineId))
    .limit(1);

  const threshold = medicine[0]?.criticalThresholdDays ?? 7;
  let breachTriggered = false;

  if (daysRemaining <= threshold) {
    // Check if an active breach already exists to prevent duplicate spam
    const activeBreaches = await db
      .select({ id: thresholdBreachesTable.id })
      .from(thresholdBreachesTable)
      .where(
        and(
          eq(thresholdBreachesTable.rhuId, entry.rhuId),
          eq(thresholdBreachesTable.medicineId, entry.medicineId),
          inArray(thresholdBreachesTable.status, ['open', 'requisition_drafted']),
        )
      )
      .limit(1);

    if (activeBreaches.length === 0) {
      breachTriggered = true;
      await createThresholdBreach(entry, daysRemaining, ewmaVelocity);
    }
  }

  return {
    velocityPerDay: Math.round(ewmaVelocity * 100) / 100,
    daysRemaining: Math.round(daysRemaining * 100) / 100,
    breachTriggered,
  };
}

/**
 * Pure function: calculate units consumed per day between two entries.
 */
export function calculateVelocity(
  prevQty: number,
  currQty: number,
  prevDate: Date,
  currDate: Date,
): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = (currDate.getTime() - prevDate.getTime()) / msPerDay;

  if (daysElapsed <= 0) return 0;

  const unitsConsumed = prevQty - currQty;
  if (unitsConsumed <= 0) return 0; // Restocked

  return unitsConsumed / daysElapsed;
}

/**
 * Get existing baseline for rhu+medicine.
 */
async function getBaseline(rhuId: string, medicineId: string) {
  const rows = await db
    .select()
    .from(consumptionBaselinesTable)
    .where(
      and(
        eq(consumptionBaselinesTable.rhuId, rhuId),
        eq(consumptionBaselinesTable.medicineId, medicineId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Upsert consumption_baselines using the unique (rhu_id, medicine_id) index.
 */
async function upsertBaseline(
  rhuId: string,
  medicineId: string,
  velocity: number,
  daysRemaining: number,
) {
  await db
    .insert(consumptionBaselinesTable)
    .values({
      rhuId,
      medicineId,
      velocity: velocity.toFixed(4),
      daysRemaining: daysRemaining.toFixed(2),
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: [consumptionBaselinesTable.rhuId, consumptionBaselinesTable.medicineId],
      set: {
        velocity: velocity.toFixed(4),
        daysRemaining: daysRemaining.toFixed(2),
        lastUpdated: new Date(),
      },
    });
}

/**
 * Create a threshold breach and auto-draft a requisition.
 */
async function createThresholdBreach(
  entry: StockEntry,
  daysRemaining: number,
  velocity: number,
) {
  // Calculate projected zero date
  const projectedZeroDate = new Date();
  projectedZeroDate.setDate(projectedZeroDate.getDate() + Math.ceil(daysRemaining));

  // Insert threshold breach
  const breachRows = await db
    .insert(thresholdBreachesTable)
    .values({
      rhuId: entry.rhuId,
      medicineId: entry.medicineId,
      daysRemaining: daysRemaining.toFixed(2),
      projectedZeroDate,
      status: 'open',
    })
    .returning();

  const breach = breachRows[0];

  // Log breach to audit trail
  await auditService.log({
    eventType: 'threshold_breach_detected',
    actorId: null,
    actorType: 'system',
    entityType: 'threshold_breach',
    entityId: breach.id,
    metadata: {
      rhuId: entry.rhuId,
      medicineId: entry.medicineId,
      daysRemaining,
      velocity,
      projectedZeroDate: projectedZeroDate.toISOString(),
    },
  });

  // Auto-draft requisition
  const { autoDraftFromBreach } = await import('../requisitions/requisition.service.js');
  await autoDraftFromBreach(entry.rhuId, breach.id, entry.medicineId, entry.quantityOnHand, velocity);

  console.log(
    `[BREACH] RHU=${entry.rhuId} Medicine=${entry.medicineId} ` +
    `daysRemaining=${daysRemaining.toFixed(1)} projected_zero=${projectedZeroDate.toISOString()}`
  );
}
