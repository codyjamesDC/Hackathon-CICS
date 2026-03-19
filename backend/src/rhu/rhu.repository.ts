import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { rhuTable } from './rhu.schema.js';
import { takeFirstOrThrow } from '../common/utils/drizzle.js';

/** RHU Repository — database queries for Rural Health Units */

export async function findAll() {
  return db.select().from(rhuTable);
}

export async function findByMunicipality(municipalityId: string) {
  return db
    .select()
    .from(rhuTable)
    .where(eq(rhuTable.municipalityId, municipalityId));
}

export async function findById(id: string) {
  const rows = await db
    .select()
    .from(rhuTable)
    .where(eq(rhuTable.id, id));
  return takeFirstOrThrow(rows);
}
