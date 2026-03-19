import { Hono } from 'hono';
import * as medicinesService from './medicines.service.js';

const medicinesRoutes = new Hono();

// GET /api/medicines — List all medicines
medicinesRoutes.get('/', async (c) => {
  const medicines = await medicinesService.getAllMedicines();
  return c.json({ data: medicines });
});

// GET /api/medicines/:id — Single medicine detail
medicinesRoutes.get('/:id', async (c) => {
  const medicine = await medicinesService.getMedicineById(c.req.param('id'));
  return c.json({ data: medicine });
});

export { medicinesRoutes };
