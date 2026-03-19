import { apiClient } from '$lib/api/client';
import { ENDPOINTS, type Requisition } from '$lib/api/endpoints';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
  const reqDetail = await apiClient<Requisition>(
    fetch, 
    ENDPOINTS.REQUISITION_DETAIL(params.id)
  );
  return { reqDetail };
};
