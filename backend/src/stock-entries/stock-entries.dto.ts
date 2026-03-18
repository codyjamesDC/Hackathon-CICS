import { z } from 'zod';

/** Single stock entry submission from nurse */
export const createStockEntryDto = z.object({
  rhuId: z.string().uuid(),
  medicineId: z.string().uuid(),
  quantityOnHand: z.number().int().min(0),
  submittedAt: z.string().datetime(), // ISO string from Flutter
});

/** Batch submission — offline sync flush */
export const batchStockEntryDto = z.object({
  entries: z.array(createStockEntryDto).min(1).max(100),
});

export type CreateStockEntryDto = z.infer<typeof createStockEntryDto>;
export type BatchStockEntryDto = z.infer<typeof batchStockEntryDto>;
