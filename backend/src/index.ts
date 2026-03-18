import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { db, supabase } from './db/client.js';

dotenv.config();

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => {
  return c.json({ message: 'Agap API Backend is running' });
});

app.get('/health', async (c) => {
  // basic db check
  try {
    await db.execute(sql`select 1`);
    return c.json({ status: 'ok', database: 'connected' });
  } catch (err: any) {
    return c.json({ status: 'error', error: err.message }, 500);
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
