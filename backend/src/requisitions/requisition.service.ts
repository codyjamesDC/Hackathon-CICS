/**
 * Requisition Service — auto-draft → approve → email workflow
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as requisitionsRepository from './requisitions.repository.js';
import { thresholdBreachesTable } from '../alerts/threshold-breaches.schema.js';
import * as auditService from '../audit/audit.service.js';
import { NotFound, Conflict } from '../common/utils/exceptions.js';
import { generateRequisitionPdf } from '../common/pdf/requisition-pdf.js';
import { sendRequisitionEmail } from '../common/email/email.service.js';
import type { BreachData } from '../velocity-engine/velocity-engine.service.js';

/**
 * Auto-draft ONE requisition for an entire batch of threshold breaches.
 * All medicines that breached in the same submission become items on a single form.
 */
export async function autoDraftBatch(
  rhuId: string,
  breaches: BreachData[],
) {
  if (breaches.length === 0) return null;

  const requisition = await requisitionsRepository.create({
    rhuId,
    status: 'drafted',
  });

  await requisitionsRepository.createItems(
    breaches.map(b => ({
      requisitionId: requisition.id,
      medicineId: b.medicineId,
      breachId: b.breachId,
      quantityRequested: b.quantityRequested,
      currentStock: b.currentStock,
    })),
  );

  // Mark all breaches as requisition_drafted
  await db
    .update(thresholdBreachesTable)
    .set({ status: 'requisition_drafted' })
    .where(inArray(thresholdBreachesTable.id, breaches.map(b => b.breachId)));

  await auditService.log({
    eventType: 'requisition_drafted',
    actorId: null,
    actorType: 'system',
    entityType: 'requisition',
    entityId: requisition.id,
    metadata: {
      rhuId,
      itemCount: breaches.length,
      medicines: breaches.map(b => b.medicineId),
    },
  });

  console.log(
    `[REQUISITION DRAFTED] id=${requisition.id} rhu=${rhuId} ` +
    `medicines=${breaches.length} (${breaches.map(b => b.medicineId).join(', ')})`,
  );

  return requisition;
}

/**
 * MHO one-tap approve.
 * Generates a PDF requisition form and emails it to the configured recipient.
 */
export async function approve(requisitionId: string, mhoUserId: string) {
  // Fetch current requisition
  const requisition = await requisitionsRepository.findById(requisitionId);
  if (!requisition) throw NotFound('Requisition not found');
  if (requisition.status !== 'drafted') {
    throw Conflict(`Cannot approve requisition in "${requisition.status}" state`);
  }

  const approvedAt = new Date();

  // Update status → approved
  const updated = await requisitionsRepository.updateStatus(requisitionId, {
    status: 'approved',
    approvedAt,
    approvedBy: mhoUserId,
  });

  // Log approval to audit trail
  await auditService.log({
    eventType: 'requisition_approved',
    actorId: mhoUserId,
    actorType: 'mho',
    entityType: 'requisition',
    entityId: requisitionId,
    metadata: { approvedAt: approvedAt.toISOString() },
  });

  console.log(`[REQUISITION APPROVED] id=${requisitionId} by=${mhoUserId}`);

  // Fetch rich data (municipality, MHO name, breach date, items) for PDF
  const rich = await requisitionsRepository.findByIdRich(requisitionId);
  if (!rich) {
    console.warn(`[PDF] Could not load rich data for requisition ${requisitionId} — skipping email`);
    return updated;
  }

  // Generate PDF in memory
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateRequisitionPdf({
      id: requisitionId,
      rhuName: rich.rhuName,
      barangay: rich.barangay,
      municipalityName: rich.municipalityName,
      province: rich.province,
      mhoName: rich.mhoName,
      approvedAt,
      items: rich.items,
    });
    console.log(`[PDF] Generated ${pdfBuffer.length} bytes for requisition ${requisitionId}`);
  } catch (err) {
    console.error(`[PDF] Generation failed for ${requisitionId}:`, err);
    return updated;
  }

  // Dispatch email with PDF attachment
  try {
    await sendRequisitionEmail(pdfBuffer, {
      id: requisitionId,
      rhuName: rich.rhuName,
      barangay: rich.barangay,
      municipalityName: rich.municipalityName,
      province: rich.province,
      mhoName: rich.mhoName,
      approvedAt,
      items: rich.items,
    });
  } catch (err) {
    console.error(`[EMAIL] Dispatch failed for ${requisitionId}:`, err);
    // Non-fatal — approval succeeded, email failure is logged only
    return updated;
  }

  // Mark as sent
  const sent = await requisitionsRepository.updateStatus(requisitionId, {
    status: 'sent',
    sentAt: new Date(),
  });

  // Log email dispatch to audit trail
  await auditService.log({
    eventType: 'requisition_sent',
    actorId: null,
    actorType: 'system',
    entityType: 'requisition',
    entityId: requisitionId,
    metadata: { sentAt: new Date().toISOString(), to: process.env.EMAIL_TO },
  });

  console.log(`[REQUISITION SENT] id=${requisitionId} → email dispatched`);

  return sent ?? updated;
}

export async function findMany(municipalityId?: string, status?: string) {
  return requisitionsRepository.findMany({ municipalityId, status });
}

export async function findOneById(id: string) {
  return requisitionsRepository.findById(id);
}
