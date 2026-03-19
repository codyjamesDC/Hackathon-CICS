import { apiClient } from '$lib/api/client';
import { ENDPOINTS, type Requisition } from '$lib/api/endpoints';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const municipalityId = '00000000-0000-0000-0000-000000000002'; // Mock ID
  const requisitions = await apiClient<Requisition[]>(
    fetch, 
    `${ENDPOINTS.REQUISITIONS}?municipalityId=${municipalityId}`
  );
  return { requisitions };
};
