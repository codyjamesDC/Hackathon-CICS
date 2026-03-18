/** Alerts Service — business logic for alert aggregation */

export async function getAlertsForUser(userId: string) {
  // TODO: determine user scope (nurse sees RHU alerts, MHO sees municipality alerts)
  // TODO: aggregate breaches + anomalies + participation alerts
  return { breaches: [], anomalies: [], participationAlerts: [] };
}
