/**
 * Requisition Service — auto-draft → approve → email workflow
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as requisitionsRepository from './requisitions.repository.js';
import { thresholdBreachesTable } from '../alerts/threshold-breaches.schema.js';
import * as auditService from '../audit/audit.service.js';
import { NotFound, Conflict } from '../common/utils/exceptions.js';

const RESTOCK_PERIOD_DAYS = 30;

/**
 * Auto-draft a requisition from a threshold breach.
 * Called by the velocity engine when days_remaining <= threshold.
 */
export async function autoDraftFromBreach(
  rhuId: string,
  breachId: string,
  medicineId: string,
  currentStock: number,
  velocity: number,
) {
  // Calculate quantity to request: enough to cover RESTOCK_PERIOD_DAYS
  const quantityRequested = Math.ceil(velocity * RESTOCK_PERIOD_DAYS);

  // Create requisition
  const requisition = await requisitionsRepository.create({
    rhuId,
    breachId,
    status: 'drafted',
  });

  // Create requisition items
  await requisitionsRepository.createItems([
    {
      requisitionId: requisition.id,
      medicineId,
      quantityRequested,
      currentStock,
    },
  ]);

  // Update breach status
  await db
    .update(thresholdBreachesTable)
    .set({ status: 'requisition_drafted' })
    .where(eq(thresholdBreachesTable.id, breachId));

  // Log to audit trail
  await auditService.log({
    eventType: 'requisition_drafted',
    actorId: null,
    actorType: 'system',
    entityType: 'requisition',
    entityId: requisition.id,
    metadata: {
      rhuId,
      breachId,
      medicineId,
      quantityRequested,
      currentStock,
    },
  });

  console.log(
    `[REQUISITION DRAFTED] id=${requisition.id} rhu=${rhuId} ` +
    `medicine=${medicineId} qty=${quantityRequested}`,
  );

  return requisition;
}

/**
 * MHO one-tap approve.
 */
export async function approve(requisitionId: string, mhoUserId: string) {
  // Fetch current requisition
  const requisition = await requisitionsRepository.findById(requisitionId);
  if (!requisition) throw NotFound('Requisition not found');
  if (requisition.status !== 'drafted') {
    throw Conflict(`Cannot approve requisition in "${requisition.status}" state`);
  }

  // Update status
  const updated = await requisitionsRepository.updateStatus(requisitionId, {
    status: 'approved',
    approvedAt: new Date(),
    approvedBy: mhoUserId,
  });

  // Log to audit trail
  await auditService.log({
    eventType: 'requisition_approved',
    actorId: mhoUserId,
    actorType: 'mho',
    entityType: 'requisition',
    entityId: requisitionId,
    metadata: { approvedAt: new Date().toISOString() },
  });

  console.log(
    `[REQUISITION APPROVED] id=${requisitionId} by=${mhoUserId} — ` +
    `Email dispatch would be triggered here`,
  );

  return updated;
}

export async function findMany(municipalityId?: string, status?: string) {
  return requisitionsRepository.findMany({ municipalityId, status });
}

export async function findOneById(id: string) {
  return requisitionsRepository.findById(id);
}
