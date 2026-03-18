import { integer, pgTable, uuid, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';
import { timestamps } from '../common/utils/drizzle.js';
import { rhuTable } from '../rhu/rhu.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';
import { usersTable } from '../users/users.schema.js';

export const stockEntriesTable = pgTable('stock_entries', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rhuId: uuid('rhu_id').notNull().references(() => rhuTable.id),
  medicineId: uuid('medicine_id').notNull().references(() => medicinesTable.id),
  nurseId: uuid('nurse_id').notNull().references(() => usersTable.id),
  quantityOnHand: integer('quantity_on_hand').notNull(),
  submittedAt: pgTimestamp('submitted_at', { withTimezone: true, mode: 'date' }).notNull(),
  syncedAt: pgTimestamp('synced_at', { withTimezone: true, mode: 'date' }),
  ...timestamps,
});

export type StockEntry = typeof stockEntriesTable.$inferSelect;
export type NewStockEntry = typeof stockEntriesTable.$inferInsert;
