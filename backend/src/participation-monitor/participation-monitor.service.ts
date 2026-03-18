/**
 * Participation Monitor Service
 *
 * Detects when an RHU goes silent (no stock entries for N days).
 * Silence ≠ safety — this is separate from stockout alerts.
 */

const SILENCE_THRESHOLD_DAYS = 3;

export async function checkAllRhus() {
  // TODO: for each RHU, find latest stock_entry timestamp
  // TODO: if (now - latest) > SILENCE_THRESHOLD_DAYS → create alert
}

export async function checkSingleRhu(rhuId: string) {
  // TODO: find latest stock entry for this RHU
  // TODO: return { silent: boolean, daysSinceLastEntry: number }
  return { silent: false, daysSinceLastEntry: 0 };
}

export async function getSilentRhus() {
  // TODO: query RHUs with no entries in the last SILENCE_THRESHOLD_DAYS
  return [];
}
