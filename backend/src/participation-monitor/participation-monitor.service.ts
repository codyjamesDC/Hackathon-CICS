/**
 * Participation Monitor Service
 *
 * Detects when an RHU goes silent (no stock entries for N days).
 * Silence ≠ safety — this is separate from stockout alerts.
 */

import { eq, max, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { stockEntriesTable } from '../stock-entries/stock-entries.schema.js';
import { rhuTable } from '../rhu/rhu.schema.js';

const SILENCE_THRESHOLD_DAYS = 3;

export type SilentRhu = {
  rhuId: string;
  rhuName: string;
  daysSinceLastEntry: number;
  lastEntryAt: Date | null;
};

export async function checkAllRhus(): Promise<SilentRhu[]> {
  return getSilentRhus();
}

export async function checkSingleRhu(rhuId: string): Promise<{ silent: boolean; daysSinceLastEntry: number }> {
  const rows = await db
    .select({ maxSubmittedAt: max(stockEntriesTable.submittedAt) })
    .from(stockEntriesTable)
    .where(eq(stockEntriesTable.rhuId, rhuId));

  const latest = rows[0]?.maxSubmittedAt ?? null;

  if (!latest) {
    return { silent: true, daysSinceLastEntry: 999 };
  }

  const daysSinceLastEntry = (Date.now() - (latest as Date).getTime()) / (1000 * 60 * 60 * 24);
  return {
    silent: daysSinceLastEntry >= SILENCE_THRESHOLD_DAYS,
    daysSinceLastEntry: Math.round(daysSinceLastEntry * 10) / 10,
  };
}

export async function getSilentRhus(municipalityId?: string): Promise<SilentRhu[]> {
  const cutoff = new Date(Date.now() - SILENCE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  // Fetch RHUs, optionally scoped to a municipality
  let rhuQuery = db
    .select({ id: rhuTable.id, name: rhuTable.name, barangay: rhuTable.barangay })
    .from(rhuTable)
    .$dynamic();

  if (municipalityId) {
    rhuQuery = rhuQuery.where(eq(rhuTable.municipalityId, municipalityId));
  }

  const rhus = await rhuQuery;
  if (rhus.length === 0) return [];

  const rhuIds = rhus.map((r) => r.id);

  // Get latest stock entry timestamp per RHU in one query
  const latestEntries = await db
    .select({
      rhuId: stockEntriesTable.rhuId,
      maxSubmittedAt: max(stockEntriesTable.submittedAt),
    })
    .from(stockEntriesTable)
    .where(inArray(stockEntriesTable.rhuId, rhuIds))
    .groupBy(stockEntriesTable.rhuId);

  const latestMap = new Map<string, Date>(
    latestEntries
      .filter((e) => e.maxSubmittedAt !== null)
      .map((e) => [e.rhuId, e.maxSubmittedAt as Date]),
  );

  return rhus
    .filter((rhu) => {
      const latest = latestMap.get(rhu.id);
      if (!latest) return true; // Never reported → always silent
      return latest < cutoff;
    })
    .map((rhu) => {
      const latest = latestMap.get(rhu.id) ?? null;
      const daysSinceLastEntry = latest
        ? (Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      return {
        rhuId: rhu.id,
        rhuName: rhu.name,
        daysSinceLastEntry: isFinite(daysSinceLastEntry)
          ? Math.round(daysSinceLastEntry * 10) / 10
          : 999,
        lastEntryAt: latest,
      };
    });
}
