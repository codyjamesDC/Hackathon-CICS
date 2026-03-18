import { timestamp } from 'drizzle-orm/pg-core';
import { NotFound } from './exceptions.js';

// Reusable created_at / updated_at columns for all tables
export const timestamps = {
  createdAt: timestamp('created_at', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
};

// Extract first row or return null
export const takeFirst = <T>(values: T[]): T | null => {
  return values.shift() || null;
};

// Extract first row or throw 404
export const takeFirstOrThrow = <T>(values: T[]): T => {
  const value = values.shift();
  if (!value) throw NotFound('The requested resource was not found.');
  return value;
};
