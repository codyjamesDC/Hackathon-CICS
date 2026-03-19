import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { auditLogTable, type NewAuditLog } from './audit-log.schema.js';

/** Audit Repository — database queries for audit log */

export async function insert(event: NewAuditLog) {
  const rows = await db.insert(auditLogTable).values(event).returning();
  return rows[0];
}

export async function findByEntity(entityType: string, entityId: string) {
  return db
    .select()
    .from(auditLogTable)
    .where(
      and(
        eq(auditLogTable.entityType, entityType),
        eq(auditLogTable.entityId, entityId),
      ),
    )
    .orderBy(desc(auditLogTable.createdAt));
}

export async function findRecent(limit: number = 50) {
  return db
    .select()
    .from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit);
}
