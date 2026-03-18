import { jsonb, pgEnum, pgTable, text, uuid, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';
import { usersTable } from '../users/users.schema.js';

export const actorTypeEnum = pgEnum('actor_type', ['nurse', 'mho', 'system']);

export const auditLogTable = pgTable('audit_log', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventType: text('event_type').notNull(),
  actorId: uuid('actor_id').references(() => usersTable.id),
  actorType: actorTypeEnum('actor_type').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  metadata: jsonb('metadata'),
  createdAt: pgTimestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
export type NewAuditLog = typeof auditLogTable.$inferInsert;
