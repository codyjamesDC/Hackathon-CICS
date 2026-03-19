import { Hono } from 'hono';
import * as requisitionService from './requisition.service.js';
import * as auditService from '../audit/audit.service.js';
import { BadRequest } from '../common/utils/exceptions.js';

const requisitionsRoutes = new Hono();

// GET /api/requisitions — List (filterable by status, scoped by municipality)
requisitionsRoutes.get('/', async (c) => {
  const municipalityId = c.req.query('municipalityId');
  const status = c.req.query('status');

  const requisitions = await requisitionService.findMany(municipalityId, status);
  return c.json({ data: requisitions });
});

// GET /api/requisitions/:id — Detail with items
requisitionsRoutes.get('/:id', async (c) => {
  const requisition = await requisitionService.findOneById(c.req.param('id'));

  // Fetch audit trail for this requisition
  const audit = await auditService.getTrailForEntity('requisition', c.req.param('id'));

  return c.json({ data: { ...requisition, audit } });
});

// POST /api/requisitions/:id/approve — MHO one-tap approve
requisitionsRoutes.post('/:id/approve', async (c) => {
  const mhoUserId = c.req.header('X-User-Id');
  if (!mhoUserId) throw BadRequest('X-User-Id header is required');

  const updated = await requisitionService.approve(c.req.param('id'), mhoUserId);
  return c.json({
    data: {
      id: updated!.id,
      status: updated!.status,
      approvedAt: updated!.approvedAt,
      approvedBy: updated!.approvedBy,
    },
  });
});

export { requisitionsRoutes };
