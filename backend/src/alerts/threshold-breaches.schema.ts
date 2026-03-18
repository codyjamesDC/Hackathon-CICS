import { date, decimal, pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../common/utils/drizzle.js';
import { rhuTable } from '../rhu/rhu.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';

export const breachStatusEnum = pgEnum('breach_status', ['open', 'requisition_drafted', 'resolved']);

export const thresholdBreachesTable = pgTable('threshold_breaches', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rhuId: uuid('rhu_id').notNull().references(() => rhuTable.id),
  medicineId: uuid('medicine_id').notNull().references(() => medicinesTable.id),
  daysRemaining: decimal('days_remaining', { precision: 10, scale: 2 }).notNull(),
  projectedZeroDate: date('projected_zero_date', { mode: 'date' }).notNull(),
  status: breachStatusEnum('status').notNull().default('open'),
  ...timestamps,
});

export type ThresholdBreach = typeof thresholdBreachesTable.$inferSelect;
export type NewThresholdBreach = typeof thresholdBreachesTable.$inferInsert;
