/** Dashboard Service — data aggregation for MHO heatmap */

export async function getHeatmapData(municipalityId: string) {
  // TODO: query RHUs with lat/lng + worst days_remaining
  return { rhuStatuses: [] };
}

export async function getRhuDrilldown(rhuId: string) {
  // TODO: query all consumption_baselines for this RHU
  return { rhuId, medicines: [] };
}

export async function getSummaryStats() {
  // TODO: aggregate (total RHUs, active breaches, pending requisitions, silent RHUs)
  return { totalRhus: 0, activeBreaches: 0, pendingRequisitions: 0, silentRhus: 0 };
}
