import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// ---------- Drizzle (PostgreSQL) ----------

const connectionString = process.env.DATABASE_URL;

let db = {
  execute: async () => ({ rows: [] }),
};

if (connectionString) {
  // Disable prefetch as it is not supported for "Transaction" pool mode
  const client = postgres(connectionString, { prepare: false });
  db = drizzle(client);
} else {
  console.warn('DATABASE_URL is not set — using in-memory stub database');
}

export { db };

// ---------- Supabase Client (for auth, storage, realtime) ----------

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
} else {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY is not set — Supabase client disabled');
}

export { supabase };
