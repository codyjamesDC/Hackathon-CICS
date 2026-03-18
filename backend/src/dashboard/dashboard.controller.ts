import { Hono } from 'hono';

const dashboardRoutes = new Hono();

// GET /api/dashboard/heatmap — All RHUs with coordinates + urgency
dashboardRoutes.get('/heatmap', async (c) => { /* TODO */ return c.json({ rhuStatuses: [] }); });

// GET /api/dashboard/rhu/:id — Drill-down: medicine-level status
dashboardRoutes.get('/rhu/:id', async (c) => { /* TODO */ return c.json({ medicines: [] }); });

// GET /api/dashboard/summary — Municipality-level summary
dashboardRoutes.get('/summary', async (c) => { /* TODO */ return c.json({ totalRhus: 0, activeBreaches: 0, pendingRequisitions: 0, silentRhus: 0 }); });

export { dashboardRoutes };
