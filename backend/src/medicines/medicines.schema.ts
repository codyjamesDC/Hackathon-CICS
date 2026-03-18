import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../common/utils/drizzle.js';

export const medicinesTable = pgTable('medicines', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  genericName: text('generic_name').notNull(),
  unit: text('unit').notNull(),
  category: text('category').notNull(),
  criticalThresholdDays: integer('critical_threshold_days').notNull().default(7),
  ...timestamps,
});

export type Medicine = typeof medicinesTable.$inferSelect;
export type NewMedicine = typeof medicinesTable.$inferInsert;
