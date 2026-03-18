import { integer, pgEnum, pgTable, text, uuid, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';
import { rhuTable } from '../rhu/rhu.schema.js';
import { usersTable } from '../users/users.schema.js';
import { thresholdBreachesTable } from '../alerts/threshold-breaches.schema.js';

export const requisitionStatusEnum = pgEnum('requisition_status', [
  'drafted', 'approved', 'sent', 'acknowledged',
]);

export const requisitionsTable = pgTable('requisitions', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rhuId: uuid('rhu_id').notNull().references(() => rhuTable.id),
  breachId: uuid('breach_id').references(() => thresholdBreachesTable.id),
  status: requisitionStatusEnum('status').notNull().default('drafted'),
  draftedAt: pgTimestamp('drafted_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true, mode: 'date' }),
  approvedBy: uuid('approved_by').references(() => usersTable.id),
  sentAt: pgTimestamp('sent_at', { withTimezone: true, mode: 'date' }),
  acknowledgedAt: pgTimestamp('acknowledged_at', { withTimezone: true, mode: 'date' }),
  pdfUrl: text('pdf_url'),
});

export type Requisition = typeof requisitionsTable.$inferSelect;
export type NewRequisition = typeof requisitionsTable.$inferInsert;
