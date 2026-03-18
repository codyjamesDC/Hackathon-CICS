import { integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { requisitionsTable } from './requisitions.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';

export const requisitionItemsTable = pgTable('requisition_items', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  requisitionId: uuid('requisition_id').notNull().references(() => requisitionsTable.id, { onDelete: 'cascade' }),
  medicineId: uuid('medicine_id').notNull().references(() => medicinesTable.id),
  quantityRequested: integer('quantity_requested').notNull(),
  currentStock: integer('current_stock').notNull(),
});

export type RequisitionItem = typeof requisitionItemsTable.$inferSelect;
export type NewRequisitionItem = typeof requisitionItemsTable.$inferInsert;
