/**
 * Anomaly Detection Service
 *
 * Compares current consumption velocity against 30-day baseline.
 * If ratio > ANOMALY_THRESHOLD → flag for MHO review.
 */

const ANOMALY_THRESHOLD = 2.0;

export async function checkForAnomaly(rhuId: string, medicineId: string, currentVelocity: number) {
  // TODO: fetch baseline from consumption_baselines
  // TODO: compare ratio against ANOMALY_THRESHOLD
  // TODO: if anomaly → create alert + log to audit
}

export async function flagAnomaly(rhuId: string, medicineId: string, ratio: number) {
  // TODO: create anomaly alert record
  // TODO: send notification to MHO
  // TODO: log to audit trail
}
