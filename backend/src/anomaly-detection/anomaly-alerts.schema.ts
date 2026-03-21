import { decimal, pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../common/utils/drizzle.js';
import { rhuTable } from '../rhu/rhu.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';

export const anomalyStatusEnum = pgEnum('anomaly_status', ['open', 'acknowledged']);

export const anomalyAlertsTable = pgTable('anomaly_alerts', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rhuId: uuid('rhu_id').notNull().references(() => rhuTable.id),
  medicineId: uuid('medicine_id').notNull().references(() => medicinesTable.id),
  baselineVelocity: decimal('baseline_velocity', { precision: 10, scale: 4 }).notNull(),
  currentVelocity: decimal('current_velocity', { precision: 10, scale: 4 }).notNull(),
  velocityRatio: decimal('velocity_ratio', { precision: 10, scale: 4 }).notNull(),
  status: anomalyStatusEnum('status').notNull().default('open'),
  ...timestamps,
});

export type AnomalyAlert = typeof anomalyAlertsTable.$inferSelect;
export type NewAnomalyAlert = typeof anomalyAlertsTable.$inferInsert;
