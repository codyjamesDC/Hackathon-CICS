import { apiClient } from '$lib/api/client';
import { ENDPOINTS, type DashboardHeatmapRow, type Requisition } from '$lib/api/endpoints';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const municipalityId = '00000000-0000-0000-0000-000000000002'; // Mock ID

  // Await the promises here to block SSR and pass resolved data
  const [heatmap, requisitions] = await Promise.all([
    apiClient<DashboardHeatmapRow[]>(
      fetch, 
      `${ENDPOINTS.DASHBOARD_HEATMAP}?municipalityId=${municipalityId}`
    ),
    apiClient<Requisition[]>(
      fetch, 
      `${ENDPOINTS.REQUISITIONS}?municipalityId=${municipalityId}`
    )
  ]);

  return { heatmap, requisitions };
};
