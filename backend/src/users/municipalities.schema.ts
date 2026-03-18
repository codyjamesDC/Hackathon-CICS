import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../common/utils/drizzle.js';

export const municipalitiesTable = pgTable('municipalities', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  province: text('province').notNull(),
  ...timestamps,
});

export type Municipality = typeof municipalitiesTable.$inferSelect;
export type NewMunicipality = typeof municipalitiesTable.$inferInsert;
