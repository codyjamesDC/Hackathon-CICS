import { Hono } from 'hono';
import * as auditService from './audit.service.js';

const auditRoutes = new Hono();

// GET /api/audit?entity_type=&entity_id= — Get audit trail for entity
auditRoutes.get('/', async (c) => {
  const entityType = c.req.query('entity_type');
  const entityId = c.req.query('entity_id');

  if (entityType && entityId) {
    const trail = await auditService.getTrailForEntity(entityType, entityId);
    return c.json({ data: trail });
  }

  // Fallback: return recent events
  const events = await auditService.getRecentEvents(50);
  return c.json({ data: events });
});

// GET /api/audit/recent — Recent events for admin/MHO dashboard
auditRoutes.get('/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const events = await auditService.getRecentEvents(limit);
  return c.json({ data: events });
});

export { auditRoutes };
