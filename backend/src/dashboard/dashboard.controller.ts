import { Hono } from 'hono';
import * as dashboardService from './dashboard.service.js';
import { BadRequest } from '../common/utils/exceptions.js';

const dashboardRoutes = new Hono();

// GET /api/dashboard/heatmap — All RHUs with coordinates + urgency
dashboardRoutes.get('/heatmap', async (c) => {
  const municipalityId = c.req.query('municipalityId');
  if (!municipalityId) {
    throw BadRequest('municipalityId query parameter is required');
  }

  const rhuStatuses = await dashboardService.getHeatmapData(municipalityId);
  return c.json({ data: rhuStatuses });
});

// GET /api/dashboard/rhu/:id — Drill-down: medicine-level status
dashboardRoutes.get('/rhu/:id', async (c) => {
  const result = await dashboardService.getRhuDrilldown(c.req.param('id'));
  return c.json({ data: result });
});

export { dashboardRoutes };
