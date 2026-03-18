import { Hono } from 'hono';

const alertsRoutes = new Hono();

// GET /api/alerts — Get alerts for the current user's scope
alertsRoutes.get('/', async (c) => { /* TODO */ return c.json({ breaches: [], anomalies: [], participationAlerts: [] }); });

export { alertsRoutes };
