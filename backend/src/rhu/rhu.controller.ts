import { Hono } from 'hono';
import * as rhuService from './rhu.service.js';
import { BadRequest } from '../common/utils/exceptions.js';

const rhuRoutes = new Hono();

// GET /api/rhu — List RHUs (scoped by municipality)
rhuRoutes.get('/', async (c) => {
  const municipalityId = c.req.query('municipalityId');
  if (!municipalityId) {
    throw BadRequest('municipalityId query parameter is required');
  }
  const rhus = await rhuService.getRhusByMunicipality(municipalityId);
  return c.json({ data: rhus });
});

// GET /api/rhu/:id — Single RHU detail
rhuRoutes.get('/:id', async (c) => {
  const rhu = await rhuService.getRhuById(c.req.param('id'));
  return c.json({ data: rhu });
});

export { rhuRoutes };
