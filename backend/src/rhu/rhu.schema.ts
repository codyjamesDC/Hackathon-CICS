import { pgTable, real, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../common/utils/drizzle.js';
import { municipalitiesTable } from '../users/municipalities.schema.js';

export const rhuTable = pgTable('rhu', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  barangay: text('barangay').notNull(),
  municipalityId: uuid('municipality_id')
    .notNull()
    .references(() => municipalitiesTable.id),
  lat: real('lat'),
  lng: real('lng'),
  ...timestamps,
});

export type Rhu = typeof rhuTable.$inferSelect;
export type NewRhu = typeof rhuTable.$inferInsert;
