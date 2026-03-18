import { Hono } from 'hono';

const auditRoutes = new Hono();

// GET /api/audit?entity_type=&entity_id= — Get audit trail for entity
auditRoutes.get('/', async (c) => { /* TODO */ return c.json([]); });

// GET /api/audit/recent — Recent events for admin/MHO dashboard
auditRoutes.get('/recent', async (c) => { /* TODO */ return c.json([]); });

export { auditRoutes };
