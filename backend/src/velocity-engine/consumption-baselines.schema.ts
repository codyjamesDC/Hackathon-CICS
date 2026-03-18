import { decimal, pgTable, uuid, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';
import { rhuTable } from '../rhu/rhu.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';

export const consumptionBaselinesTable = pgTable('consumption_baselines', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rhuId: uuid('rhu_id').notNull().references(() => rhuTable.id),
  medicineId: uuid('medicine_id').notNull().references(() => medicinesTable.id),
  velocity: decimal('velocity', { precision: 10, scale: 4 }).notNull(),
  daysRemaining: decimal('days_remaining', { precision: 10, scale: 2 }).notNull(),
  lastUpdated: pgTimestamp('last_updated', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});

export type ConsumptionBaseline = typeof consumptionBaselinesTable.$inferSelect;
export type NewConsumptionBaseline = typeof consumptionBaselinesTable.$inferInsert;
