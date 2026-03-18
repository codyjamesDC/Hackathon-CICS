import { Hono } from 'hono';

const requisitionsRoutes = new Hono();

// GET /api/requisitions — List (filterable by status)
requisitionsRoutes.get('/', async (c) => { /* TODO */ return c.json([]); });

// GET /api/requisitions/:id — Detail with items
requisitionsRoutes.get('/:id', async (c) => { /* TODO */ return c.json({ message: 'not implemented' }, 501); });

// POST /api/requisitions/:id/approve — MHO one-tap approve
requisitionsRoutes.post('/:id/approve', async (c) => { /* TODO */ return c.json({ message: 'not implemented' }, 501); });

export { requisitionsRoutes };
