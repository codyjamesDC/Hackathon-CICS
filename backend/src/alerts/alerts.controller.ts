import { Hono } from 'hono';
import * as alertsService from './alerts.service.js';
import { db } from '../db/client.js';
import { anomalyAlertsTable } from '../anomaly-detection/anomaly-alerts.schema.js';
import { eq } from 'drizzle-orm';
import { BadRequest } from '../common/utils/exceptions.js';

const alertsRoutes = new Hono();

// GET /api/alerts
// Nurse (X-User-Role: nurse, X-Rhu-Id): returns breaches + anomalies for their RHU
// MHO  (X-User-Role: mho, X-Municipality-Id): returns all for municipality
alertsRoutes.get('/', async (c) => {
  const role = c.req.header('X-User-Role');
  const rhuId = c.req.header('X-Rhu-Id');
  const municipalityId = c.req.header('X-Municipality-Id');

  if (role === 'nurse') {
    if (!rhuId) throw BadRequest('X-Rhu-Id header required for nurse role');
    const data = await alertsService.getAlertsForRhu(rhuId);
    return c.json({ data });
  }

  if (role === 'mho') {
    if (!municipalityId) throw BadRequest('X-Municipality-Id header required for mho role');
    const data = await alertsService.getAlertsForMunicipality(municipalityId);
    return c.json({ data });
  }

  throw BadRequest('X-User-Role must be nurse or mho');
});

// PATCH /api/alerts/anomalies/:id/acknowledge
alertsRoutes.patch('/anomalies/:id/acknowledge', async (c) => {
  const id = c.req.param('id');
  const rows = await db
    .update(anomalyAlertsTable)
    .set({ status: 'acknowledged' })
    .where(eq(anomalyAlertsTable.id, id))
    .returning();
  if (rows.length === 0) throw BadRequest('Anomaly alert not found');
  return c.json({ data: rows[0] });
});

export { alertsRoutes };
