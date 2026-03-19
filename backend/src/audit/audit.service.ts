import * as auditRepository from './audit.repository.js';

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
  metadata?: Record<string, unknown>;
}) {
  return auditRepository.insert({
    eventType: event.eventType,
    actorId: event.actorId,
    actorType: event.actorType,
    entityType: event.entityType,
    entityId: event.entityId,
    metadata: event.metadata ?? null,
  });
}

export async function getTrailForEntity(entityType: string, entityId: string) {
  return auditRepository.findByEntity(entityType, entityId);
}

export async function getRecentEvents(limit: number = 50) {
  return auditRepository.findRecent(limit);
}
