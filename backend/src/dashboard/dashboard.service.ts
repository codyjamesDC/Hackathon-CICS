/** Dashboard Service — data aggregation for MHO heatmap */

import { eq, and, min, max, count, sql, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { rhuTable } from '../rhu/rhu.schema.js';
import { consumptionBaselinesTable } from '../velocity-engine/consumption-baselines.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';
import { stockEntriesTable } from '../stock-entries/stock-entries.schema.js';
import { thresholdBreachesTable } from '../alerts/threshold-breaches.schema.js';

function deriveStatus(worstDaysRemaining: number | null, lastReportedAt: Date | null): string {
  if (worstDaysRemaining === null) return 'silent';

  if (lastReportedAt) {
    const daysSinceReport = (new Date().getTime() - lastReportedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceReport >= 3) return 'silent';
  }

  if (worstDaysRemaining < 7) return 'critical';
  if (worstDaysRemaining < 14) return 'warning';
  return 'ok';
}

function deriveMedicineStatus(
  daysRemaining: number,
  criticalThresholdDays: number,
  lastReportedAt: Date | null,
): string {
  if (lastReportedAt) {
    const daysSinceReport = (new Date().getTime() - lastReportedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceReport >= 3) return 'silent';
  }
  if (daysRemaining <= criticalThresholdDays) return 'critical';
  if (daysRemaining <= criticalThresholdDays * 2) return 'warning';
  return 'ok';
}

export async function getHeatmapData(municipalityId: string) {
  // Query all RHUs in the municipality with their worst days_remaining
  const rows = await db
    .select({
      rhuId: rhuTable.id,
      rhuName: rhuTable.name,
      barangay: rhuTable.barangay,
      lat: rhuTable.lat,
      lng: rhuTable.lng,
      worstDaysRemaining: min(consumptionBaselinesTable.daysRemaining),
      totalMedicines: count(consumptionBaselinesTable.medicineId),
    })
    .from(rhuTable)
    .leftJoin(
      consumptionBaselinesTable,
      eq(consumptionBaselinesTable.rhuId, rhuTable.id),
    )
    .where(eq(rhuTable.municipalityId, municipalityId))
    .groupBy(rhuTable.id, rhuTable.name, rhuTable.barangay, rhuTable.lat, rhuTable.lng);

  const rhuIds = rows.map((r) => r.rhuId);

  if (rhuIds.length === 0) return [];

  // Group active breaches by rhuId
  const activeBreaches = await db
    .select({ rhuId: thresholdBreachesTable.rhuId, count: count() })
    .from(thresholdBreachesTable)
    .where(
      and(
        inArray(thresholdBreachesTable.rhuId, rhuIds),
        eq(thresholdBreachesTable.status, 'open'),
      ),
    )
    .groupBy(thresholdBreachesTable.rhuId);

  const breachesMap = new Map<string, number>(activeBreaches.map((b) => [b.rhuId, Number(b.count)]));

  // Group latest stock entries by rhuId
  const latestEntries = await db
    .select({ rhuId: stockEntriesTable.rhuId, maxSubmittedAt: max(stockEntriesTable.submittedAt) })
    .from(stockEntriesTable)
    .where(inArray(stockEntriesTable.rhuId, rhuIds))
    .groupBy(stockEntriesTable.rhuId);

  const latestEntriesMap = new Map<string, Date>(latestEntries.map((e) => [e.rhuId, e.maxSubmittedAt as Date]));

  const result = rows.map((row) => {
    const worstDaysRemaining = row.worstDaysRemaining ? parseFloat(row.worstDaysRemaining) : null;
    const lastReportedAt = latestEntriesMap.get(row.rhuId) ?? null;

    return {
      rhuId: row.rhuId,
      rhuName: row.rhuName,
      barangay: row.barangay,
      lat: row.lat,
      lng: row.lng,
      worstDaysRemaining,
      totalMedicines: Number(row.totalMedicines),
      breachCount: breachesMap.get(row.rhuId) ?? 0,
      lastReportedAt,
      status: deriveStatus(worstDaysRemaining, lastReportedAt),
    };
  });

  return result;
}

export async function getRhuDrilldown(rhuId: string) {
  // Get RHU info
  const rhuRows = await db
    .select({ id: rhuTable.id, name: rhuTable.name, barangay: rhuTable.barangay })
    .from(rhuTable)
    .where(eq(rhuTable.id, rhuId))
    .limit(1);

  if (rhuRows.length === 0) {
    const { NotFound } = await import('../common/utils/exceptions.js');
    throw NotFound('RHU not found');
  }

  const rhu = rhuRows[0];

  // Get all consumption baselines for this RHU, joined with medicines and latest stock entry
  const baselines = await db
    .select({
      medicineId: consumptionBaselinesTable.medicineId,
      genericName: medicinesTable.genericName,
      unit: medicinesTable.unit,
      category: medicinesTable.category,
      velocity: consumptionBaselinesTable.velocity,
      daysRemaining: consumptionBaselinesTable.daysRemaining,
      criticalThresholdDays: medicinesTable.criticalThresholdDays,
      lastUpdated: consumptionBaselinesTable.lastUpdated,
    })
    .from(consumptionBaselinesTable)
    .innerJoin(medicinesTable, eq(consumptionBaselinesTable.medicineId, medicinesTable.id))
    .where(eq(consumptionBaselinesTable.rhuId, rhuId));

  // For each medicine, get the current stock from the latest stock entry
  const medicines = await Promise.all(
    baselines.map(async (b) => {
      const latestEntry = await db
        .select({
          quantityOnHand: stockEntriesTable.quantityOnHand,
          submittedAt: stockEntriesTable.submittedAt,
        })
        .from(stockEntriesTable)
        .where(
          and(
            eq(stockEntriesTable.rhuId, rhuId),
            eq(stockEntriesTable.medicineId, b.medicineId),
          ),
        )
        .orderBy(sql`${stockEntriesTable.submittedAt} DESC`)
        .limit(1);

      const daysRemaining = parseFloat(b.daysRemaining);
      const velocityPerDay = parseFloat(b.velocity);

      return {
        medicineId: b.medicineId,
        genericName: b.genericName,
        unit: b.unit,
        category: b.category,
        currentStock: latestEntry[0]?.quantityOnHand ?? 0,
        velocityPerDay: Math.round(velocityPerDay * 100) / 100,
        daysRemaining: Math.round(daysRemaining * 100) / 100,
        criticalThresholdDays: b.criticalThresholdDays,
        status: deriveMedicineStatus(daysRemaining, b.criticalThresholdDays, latestEntry[0]?.submittedAt ?? null),
        lastEntryAt: latestEntry[0]?.submittedAt ?? null,
      };
    }),
  );

  return { rhu, medicines };
}
