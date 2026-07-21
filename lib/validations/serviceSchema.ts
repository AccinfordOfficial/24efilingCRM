import { z } from 'zod';

export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const subServiceSchema = z.object({
  name: z.string().min(1, 'Sub-service name is required'),
  price: z.number().min(0, 'Price must be non-negative'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  required_documents: z.array(z.string()).default([]),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
export type SubServiceFormValues = z.infer<typeof subServiceSchema>;
