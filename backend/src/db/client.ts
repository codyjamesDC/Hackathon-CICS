import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client);

// Supabase client for auth, storage, realtime
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY is not set');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
