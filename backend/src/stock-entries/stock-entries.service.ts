import { v4 as uuidv4 } from 'uuid';
import type { CreateStockEntryDto } from './stock-entries.dto.js';

/** Stock Entries Service — simplified stub implementation for API testing */

export type VelocityResult = {
  velocityPerDay: number;
  daysRemaining: number;
  breachTriggered: boolean;
};

export async function submitStockEntry(
  data: CreateStockEntryDto,
  nurseId: string,
): Promise<{ entry: any; velocity: VelocityResult }> {
  const entry = {
    id: uuidv4(),
    rhuId: data.rhuId,
    medicineId: data.medicineId,
    nurseId,
    quantityOnHand: data.quantityOnHand,
    submittedAt: new Date(data.submittedAt).toISOString(),
    syncedAt: new Date().toISOString(),
  };

  const velocity = {
    velocityPerDay: 2,
    daysRemaining: 30,
    breachTriggered: false,
  };

  return { entry, velocity };
}

export async function submitBatch(
  entries: CreateStockEntryDto[],
  nurseId: string,
) {
  const results = entries.map((entryData) => ({
    id: uuidv4(),
    medicineId: entryData.medicineId,
    status: 'ok' as const,
    velocity: {
      velocityPerDay: 2,
      daysRemaining: 30,
      breachTriggered: false,
    },
  }));

  return {
    processed: results.length,
    failed: 0,
    results,
  };
}

export async function getEntriesByRhu(
  rhuId: string,
  medicineId?: string,
  limit?: number,
) {
  return [];
}
