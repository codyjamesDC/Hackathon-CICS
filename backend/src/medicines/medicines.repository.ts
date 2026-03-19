import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { medicinesTable } from './medicines.schema.js';
import { takeFirstOrThrow } from '../common/utils/drizzle.js';

/** Medicines Repository — database queries for medicine catalog */

export async function findAll() {
  return db.select().from(medicinesTable);
}

export async function findById(id: string) {
  const rows = await db
    .select()
    .from(medicinesTable)
    .where(eq(medicinesTable.id, id));
  return takeFirstOrThrow(rows);
}
