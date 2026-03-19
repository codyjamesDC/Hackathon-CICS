import { apiClient } from '$lib/api/client';
import { ENDPOINTS, type Alert } from '$lib/api/endpoints';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const municipalityId = '00000000-0000-0000-0000-000000000002'; // Mock ID
  const alerts = await apiClient<Alert[]>(
    fetch, 
    `${ENDPOINTS.ALERTS}?municipalityId=${municipalityId}`
  );
  return { alerts };
};
