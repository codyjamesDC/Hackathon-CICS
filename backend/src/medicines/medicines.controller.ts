import { Hono } from 'hono';

const medicinesRoutes = new Hono();

// GET /api/medicines — List all medicines
medicinesRoutes.get('/', async (c) => { /* TODO */ return c.json([]); });

export { medicinesRoutes };
