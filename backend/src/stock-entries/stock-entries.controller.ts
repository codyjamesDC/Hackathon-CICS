import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createStockEntryDto, batchStockEntryDto } from './stock-entries.dto.js';
import * as stockEntriesService from './stock-entries.service.js';
import { autoDraftBatch } from '../requisitions/requisition.service.js';
import { BadRequest } from '../common/utils/exceptions.js';

const stockEntriesRoutes = new Hono();

// POST /api/stock-entries — Nurse submits stock count
stockEntriesRoutes.post('/', zValidator('json', createStockEntryDto), async (c) => {
  const data = c.req.valid('json');
  const nurseId = c.req.header('X-User-Id');
  if (!nurseId) throw BadRequest('X-User-Id header is required');

  const { entry, velocity } = await stockEntriesService.submitStockEntry(data, nurseId);
  if (velocity.breach) {
    await autoDraftBatch(data.rhuId, [velocity.breach]);
  }
  return c.json({ data: entry, velocity }, 201);
});

// POST /api/stock-entries/batch — Offline sync flush
stockEntriesRoutes.post('/batch', zValidator('json', batchStockEntryDto), async (c) => {
  const { entries } = c.req.valid('json');
  const nurseId = c.req.header('X-User-Id');
  if (!nurseId) throw BadRequest('X-User-Id header is required');

  const result = await stockEntriesService.submitBatch(entries, nurseId);
  return c.json({ data: result }, 201);
});

// GET /api/stock-entries?rhuId= — Get entries for an RHU
stockEntriesRoutes.get('/', async (c) => {
  const rhuId = c.req.query('rhuId');
  if (!rhuId) throw BadRequest('rhuId query parameter is required');

  const medicineId = c.req.query('medicineId');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;

  const entries = await stockEntriesService.getEntriesByRhu(rhuId, medicineId, limit);
  return c.json({ data: entries });
});

export { stockEntriesRoutes };
