import { eq, and, desc, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { stockEntriesTable, type NewStockEntry } from './stock-entries.schema.js';

/** Stock Entries Repository — database queries */

export async function create(data: NewStockEntry) {
  const rows = await db.insert(stockEntriesTable).values(data).returning();
  return rows[0];
}

export async function findByRhu(
  rhuId: string,
  opts?: { medicineId?: string; limit?: number },
) {
  const conditions = [eq(stockEntriesTable.rhuId, rhuId)];

  if (opts?.medicineId) {
    conditions.push(eq(stockEntriesTable.medicineId, opts.medicineId));
  }

  return db
    .select()
    .from(stockEntriesTable)
    .where(and(...conditions))
    .orderBy(desc(stockEntriesTable.submittedAt))
    .limit(opts?.limit ?? 50);
}

export async function findPreviousEntry(
  rhuId: string,
  medicineId: string,
  beforeDate: Date,
) {
  const rows = await db
    .select()
    .from(stockEntriesTable)
    .where(
      and(
        eq(stockEntriesTable.rhuId, rhuId),
        eq(stockEntriesTable.medicineId, medicineId),
        lt(stockEntriesTable.submittedAt, beforeDate),
      ),
    )
    .orderBy(desc(stockEntriesTable.submittedAt))
    .limit(1);

  return rows[0] ?? null;
}
