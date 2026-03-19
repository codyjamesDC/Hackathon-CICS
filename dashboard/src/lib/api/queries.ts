import { apiClient } from './client';
import {
  ENDPOINTS,
  type DashboardHeatmapRow,
  type DashboardRhuDetail,
  type Requisition,
  type Alert,
} from './endpoints';

// ---- Fetch functions ----

async function fetchHeatmap(municipalityId: string) {
  return apiClient<DashboardHeatmapRow[]>(
    `${ENDPOINTS.DASHBOARD_HEATMAP}?municipalityId=${municipalityId}`
  );
}

async function fetchRequisitions(municipalityId: string) {
  return apiClient<Requisition[]>(
    `${ENDPOINTS.REQUISITIONS}?municipalityId=${municipalityId}`
  );
}

async function fetchRequisitionById(id: string) {
  return apiClient<Requisition>(ENDPOINTS.REQUISITION_DETAIL(id));
}

async function fetchRhuDrilldown(rhuId: string) {
  return apiClient<DashboardRhuDetail>(ENDPOINTS.DASHBOARD_RHU(rhuId));
}

async function fetchAlerts() {
  return apiClient<Alert[]>(ENDPOINTS.ALERTS);
}

async function fetchRhuList(municipalityId: string) {
  return apiClient<any[]>(`${ENDPOINTS.RHU_LIST}?municipalityId=${municipalityId}`);
}

// ---- Mutation functions ----

export async function approveRequisition(id: string) {
  return apiClient<{ id: string; status: string; approvedAt: string; approvedBy: string }>(
    ENDPOINTS.REQUISITION_APPROVE(id),
    { method: 'POST' }
  );
}

// ---- TanStack Query factory ----

export const queries = {
  heatmap: (municipalityId: string) => ({
    queryKey: ['heatmap', municipalityId] as const,
    queryFn: () => fetchHeatmap(municipalityId),
    refetchInterval: 30_000,
  }),

  requisitions: (municipalityId: string) => ({
    queryKey: ['requisitions', municipalityId] as const,
    queryFn: () => fetchRequisitions(municipalityId),
    refetchInterval: 30_000,
  }),

  requisitionDetail: (id: string) => ({
    queryKey: ['requisitions', 'detail', id] as const,
    queryFn: () => fetchRequisitionById(id),
  }),

  rhuDrilldown: (rhuId: string) => ({
    queryKey: ['rhu', rhuId] as const,
    queryFn: () => fetchRhuDrilldown(rhuId),
    refetchInterval: 30_000,
  }),

  alerts: () => ({
    queryKey: ['alerts'] as const,
    queryFn: () => fetchAlerts(),
    refetchInterval: 30_000,
  }),

  rhuList: (municipalityId: string) => ({
    queryKey: ['rhus', municipalityId] as const,
    queryFn: () => fetchRhuList(municipalityId),
  }),
};
