import * as stockEntriesRepository from './stock-entries.repository.js';
import * as auditService from '../audit/audit.service.js';
import { processNewEntry } from '../velocity-engine/velocity-engine.service.js';
import type { CreateStockEntryDto } from './stock-entries.dto.js';

/** Stock Entries Service — business logic for stock submissions */

export type VelocityResult = {
  velocityPerDay: number;
  daysRemaining: number;
  breachTriggered: boolean;
};

export async function submitStockEntry(
  data: CreateStockEntryDto,
  nurseId: string,
): Promise<{ entry: any; velocity: VelocityResult }> {
  // 1. Persist the stock entry
  const entry = await stockEntriesRepository.create({
    rhuId: data.rhuId,
    medicineId: data.medicineId,
    nurseId,
    quantityOnHand: data.quantityOnHand,
    submittedAt: new Date(data.submittedAt),
    syncedAt: new Date(),
  });

  // 2. Log to audit trail
  await auditService.log({
    eventType: 'stock_entry_submitted',
    actorId: nurseId,
    actorType: 'nurse',
    entityType: 'stock_entry',
    entityId: entry.id,
    metadata: {
      rhuId: data.rhuId,
      medicineId: data.medicineId,
      quantityOnHand: data.quantityOnHand,
    },
  });

  // 3. Run velocity engine
  const velocity = await processNewEntry(entry);

  return { entry, velocity };
}

export async function submitBatch(
  entries: CreateStockEntryDto[],
  nurseId: string,
) {
  const results: Array<{
    id: string;
    medicineId: string;
    status: 'ok' | 'error';
    velocity?: VelocityResult;
    error?: string;
  }> = [];

  let failed = 0;

  // Fix: Sort entries chronologically to ensure accurate velocity calculation
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );

  for (const entryData of sortedEntries) {
    try {
      const { entry, velocity } = await submitStockEntry(entryData, nurseId);
      results.push({
        id: entry.id,
        medicineId: entry.medicineId,
        status: 'ok',
        velocity,
      });
    } catch (err: any) {
      failed++;
      results.push({
        id: '',
        medicineId: entryData.medicineId,
        status: 'error',
        error: err.message || 'Unknown error',
      });
    }
  }

  return {
    processed: entries.length - failed,
    failed,
    results,
  };
}

export async function getEntriesByRhu(
  rhuId: string,
  medicineId?: string,
  limit?: number,
) {
  return stockEntriesRepository.findByRhu(rhuId, { medicineId, limit });
}
