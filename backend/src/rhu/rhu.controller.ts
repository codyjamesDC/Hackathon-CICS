import { Hono } from 'hono';

const rhuRoutes = new Hono();

// GET /api/rhu — List RHUs (scoped by MHO municipality)
rhuRoutes.get('/', async (c) => { /* TODO */ return c.json([]); });

// GET /api/rhu/:id — Single RHU detail
rhuRoutes.get('/:id', async (c) => { /* TODO */ return c.json({ message: 'not implemented' }, 501); });

export { rhuRoutes };
