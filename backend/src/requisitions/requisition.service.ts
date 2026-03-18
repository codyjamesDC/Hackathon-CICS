/**
 * Requisition Service — auto-draft → approve → email workflow
 */

export async function autoDraft(rhuId: string, breachId: string, items: any[]) {
  // TODO: create requisition + items in a transaction
  // TODO: update breach status to 'requisition_drafted'
  // TODO: log to audit trail
  return null;
}

export async function approve(requisitionId: string, mhoUserId: string) {
  // TODO: update status, set approvedAt, approvedBy
  // TODO: trigger PDF generation
  // TODO: log to audit trail
}

export async function findMany(status?: string) { /* TODO */ return []; }
export async function findOneById(id: string) { /* TODO */ return null; }
export async function generatePdf(requisitionId: string) { /* TODO */ }
export async function sendToPharmacy(requisitionId: string) { /* TODO */ }
