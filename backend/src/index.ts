import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { db } from './db/client.js';

// Feature module routes
import { usersRoutes } from './users/users.controller.js';
import { rhuRoutes } from './rhu/rhu.controller.js';
import { medicinesRoutes } from './medicines/medicines.controller.js';
import { stockEntriesRoutes } from './stock-entries/stock-entries.controller.js';
import { alertsRoutes } from './alerts/alerts.controller.js';
import { auditRoutes } from './audit/audit.controller.js';
import { dashboardRoutes } from './dashboard/dashboard.controller.js';
import { requisitionsRoutes } from './requisitions/requisitions.controller.js';

dotenv.config();

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => c.json({ message: 'Agap API is running' }));
app.get('/health', async (c) => {
  try {
    if (typeof db.execute === 'function') {
      await db.execute(sql`select 1`);
      return c.json({ status: 'ok', database: 'connected' });
    }
    return c.json({ status: 'ok', database: 'stub' });
  } catch (err: any) {
    return c.json({ status: 'error', error: err.message }, 500);
  }
});

// Mount all feature routes
app.route('/api/users', usersRoutes);
app.route('/api/rhu', rhuRoutes);
app.route('/api/medicines', medicinesRoutes);
app.route('/api/stock-entries', stockEntriesRoutes);
app.route('/api/alerts', alertsRoutes);
app.route('/api/audit', auditRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/requisitions', requisitionsRoutes);

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);
serve({ fetch: app.fetch, port });
