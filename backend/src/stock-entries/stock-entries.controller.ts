import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createStockEntryDto, batchStockEntryDto } from './stock-entries.dto.js';

const stockEntriesRoutes = new Hono();

// POST /api/stock-entries — Nurse submits stock count
stockEntriesRoutes.post('/', zValidator('json', createStockEntryDto), async (c) => {
  const data = c.req.valid('json');
  // TODO: call service.submitStockEntry(data)
  return c.json({ message: 'not implemented' }, 501);
});

// POST /api/stock-entries/batch — Offline sync flush
stockEntriesRoutes.post('/batch', zValidator('json', batchStockEntryDto), async (c) => {
  const { entries } = c.req.valid('json');
  // TODO: call service.submitBatch(entries)
  return c.json({ message: 'not implemented' }, 501);
});

// GET /api/stock-entries?rhu_id= — Get entries for an RHU
stockEntriesRoutes.get('/', async (c) => {
  // TODO: call service.getEntriesByRhu(rhuId)
  return c.json([]);
});

export { stockEntriesRoutes };
