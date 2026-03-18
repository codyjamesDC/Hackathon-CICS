/**
 * Audit Service — append-only event logging
 *
 * Every state transition is logged here:
 *   stock_entry → threshold_breach → requisition_drafted → MHO_approved → email_sent
 */

export async function log(event: {
  eventType: string;
  actorId: string | null;
  actorType: 'nurse' | 'mho' | 'system';
  entityType: string;
  entityId: string;
  metadata?: any;
}) {
  // TODO: insert into audit_log via repository
}

export async function getTrailForEntity(entityType: string, entityId: string) {
  // TODO: call repository
  return [];
}

export async function getRecentEvents(limit: number = 50) {
  // TODO: call repository
  return [];
}
