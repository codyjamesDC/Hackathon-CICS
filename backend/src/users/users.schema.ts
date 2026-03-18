import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../common/utils/drizzle.js';
import { municipalitiesTable } from './municipalities.schema.js';

export const userRoleEnum = pgEnum('user_role', ['nurse', 'mho']);

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  rhuId: uuid('rhu_id'),
  municipalityId: uuid('municipality_id').references(() => municipalitiesTable.id),
  ...timestamps,
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
