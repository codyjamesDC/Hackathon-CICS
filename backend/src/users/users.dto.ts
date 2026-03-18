import { z } from 'zod';

/** Login request */
export const loginDto = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/** Register request */
export const registerDto = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['nurse', 'mho']),
  rhuId: z.string().uuid().optional(),       // required for nurse, ignored for MHO
  municipalityId: z.string().uuid().optional(), // required for MHO
});

export type LoginDto = z.infer<typeof loginDto>;
export type RegisterDto = z.infer<typeof registerDto>;
