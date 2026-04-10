import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { requisitionsTable, type NewRequisition } from './requisitions.schema.js';
import { requisitionItemsTable, type NewRequisitionItem } from './requisition-items.schema.js';
import { rhuTable } from '../rhu/rhu.schema.js';
import { medicinesTable } from '../medicines/medicines.schema.js';
import { takeFirstOrThrow } from '../common/utils/drizzle.js';
import { municipalitiesTable } from '../users/municipalities.schema.js';
import { usersTable } from '../users/users.schema.js';
import { thresholdBreachesTable } from '../alerts/threshold-breaches.schema.js';

/** Requisitions Repository — database queries */

export async function create(data: NewRequisition) {
  const rows = await db.insert(requisitionsTable).values(data).returning();
  return rows[0];
}

export async function createItems(items: NewRequisitionItem[]) {
  if (items.length === 0) return [];
  return db.insert(requisitionItemsTable).values(items).returning();
}

export async function findMany(opts?: { municipalityId?: string; status?: string }) {
  // Build a base query joining requisitions with RHU for name and municipality scoping
  let query = db
    .select({
      id: requisitionsTable.id,
      rhuId: requisitionsTable.rhuId,
      rhuName: rhuTable.name,
      breachId: requisitionsTable.breachId,
      status: requisitionsTable.status,
      draftedAt: requisitionsTable.draftedAt,
      approvedAt: requisitionsTable.approvedAt,
      approvedBy: requisitionsTable.approvedBy,
      sentAt: requisitionsTable.sentAt,
      acknowledgedAt: requisitionsTable.acknowledgedAt,
    })
    .from(requisitionsTable)
    .innerJoin(rhuTable, eq(requisitionsTable.rhuId, rhuTable.id))
    .orderBy(desc(requisitionsTable.draftedAt))
    .$dynamic();

  const conditions = [];

  if (opts?.municipalityId) {
    conditions.push(eq(rhuTable.municipalityId, opts.municipalityId));
  }
  if (opts?.status) {
    conditions.push(eq(requisitionsTable.status, opts.status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const requisitions = await query;

  if (requisitions.length === 0) return [];

  // Fetch all items for the retrieved requisitions in a single query
  const reqIds = requisitions.map((r) => r.id);
  const allItems = await db
    .select({
      requisitionId: requisitionItemsTable.requisitionId,
      medicineId: requisitionItemsTable.medicineId,
      genericName: medicinesTable.genericName,
      unit: medicinesTable.unit,
      quantityRequested: requisitionItemsTable.quantityRequested,
      currentStock: requisitionItemsTable.currentStock,
    })
    .from(requisitionItemsTable)
    .innerJoin(medicinesTable, eq(requisitionItemsTable.medicineId, medicinesTable.id))
    .where(inArray(requisitionItemsTable.requisitionId, reqIds));

  // Group items by requisitionId
  const itemsByReqId = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByReqId.get(item.requisitionId) ?? [];
    list.push(item);
    itemsByReqId.set(item.requisitionId, list);
  }

  return requisitions.map((req) => {
    // We intentionally exclude requisitionId from the final returned item objects to match previous shape
    const items = (itemsByReqId.get(req.id) ?? []).map(({ requisitionId, ...rest }) => rest);
    return { ...req, items };
  });
}

export async function findById(id: string) {
  const rows = await db
    .select({
      id: requisitionsTable.id,
      rhuId: requisitionsTable.rhuId,
      rhuName: rhuTable.name,
      breachId: requisitionsTable.breachId,
      status: requisitionsTable.status,
      draftedAt: requisitionsTable.draftedAt,
      approvedAt: requisitionsTable.approvedAt,
      approvedBy: requisitionsTable.approvedBy,
      sentAt: requisitionsTable.sentAt,
      acknowledgedAt: requisitionsTable.acknowledgedAt,
    })
    .from(requisitionsTable)
    .innerJoin(rhuTable, eq(requisitionsTable.rhuId, rhuTable.id))
    .where(eq(requisitionsTable.id, id));

  const req = takeFirstOrThrow(rows);

  // Fetch items
  const items = await db
    .select({
      medicineId: requisitionItemsTable.medicineId,
      genericName: medicinesTable.genericName,
      unit: medicinesTable.unit,
      quantityRequested: requisitionItemsTable.quantityRequested,
      currentStock: requisitionItemsTable.currentStock,
    })
    .from(requisitionItemsTable)
    .innerJoin(medicinesTable, eq(requisitionItemsTable.medicineId, medicinesTable.id))
    .where(eq(requisitionItemsTable.requisitionId, id));

  return { ...req, items };
}

export async function updateStatus(
  id: string,
  updates: Partial<{
    status: 'drafted' | 'approved' | 'sent' | 'acknowledged';
    approvedAt: Date;
    approvedBy: string;
    sentAt: Date;
    acknowledgedAt: Date;
  }>,
) {
  const rows = await db
    .update(requisitionsTable)
    .set(updates)
    .where(eq(requisitionsTable.id, id))
    .returning();
  return rows[0];
}

/** Full requisition data needed for PDF generation — joins municipality, MHO user */
export async function findByIdRich(id: string) {
  const rows = await db
    .select({
      id: requisitionsTable.id,
      rhuName: rhuTable.name,
      barangay: rhuTable.barangay,
      municipalityName: municipalitiesTable.name,
      province: municipalitiesTable.province,
      mhoName: usersTable.name,
      approvedAt: requisitionsTable.approvedAt,
    })
    .from(requisitionsTable)
    .innerJoin(rhuTable, eq(requisitionsTable.rhuId, rhuTable.id))
    .innerJoin(municipalitiesTable, eq(rhuTable.municipalityId, municipalitiesTable.id))
    .leftJoin(usersTable, eq(requisitionsTable.approvedBy, usersTable.id))
    .where(eq(requisitionsTable.id, id));

  if (!rows[0]) return null;
  const req = rows[0];

  // Join projectedZeroDate per item via the item's own breachId
  const items = await db
    .select({
      genericName: medicinesTable.genericName,
      unit: medicinesTable.unit,
      quantityRequested: requisitionItemsTable.quantityRequested,
      currentStock: requisitionItemsTable.currentStock,
      projectedZeroDate: thresholdBreachesTable.projectedZeroDate,
    })
    .from(requisitionItemsTable)
    .innerJoin(medicinesTable, eq(requisitionItemsTable.medicineId, medicinesTable.id))
    .leftJoin(thresholdBreachesTable, eq(requisitionItemsTable.breachId, thresholdBreachesTable.id))
    .where(eq(requisitionItemsTable.requisitionId, id));

  return { ...req, items };
}
