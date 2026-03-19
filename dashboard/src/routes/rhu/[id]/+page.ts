import { apiClient } from '$lib/api/client';
import { ENDPOINTS, type DashboardRhuDetail } from '$lib/api/endpoints';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
  const rhuDetail = await apiClient<DashboardRhuDetail>(
    fetch, 
    ENDPOINTS.DASHBOARD_RHU(params.id)
  );
  return { rhuDetail };
};
