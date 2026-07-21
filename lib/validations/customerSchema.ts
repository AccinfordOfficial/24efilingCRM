import { z } from 'zod';
import { phoneSchema, panSchema, emailSchema, aadharSchema, gstinSchema } from './commonSchemas';

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: emailSchema.or(z.literal('')),
  phone: phoneSchema,
  business_name: z.string().min(1, 'Business name is mandatory'),
  business_category: z.string().min(1, 'Business category is mandatory'),
  industry_type: z.string().min(1, 'Industry type is mandatory'),
  lead_source: z.string().optional(),
  pan_number: panSchema.or(z.literal('')),
  aadhar_number: aadharSchema.or(z.literal('')),
  gstin: gstinSchema.or(z.literal('')),
  date_of_birth: z.string().or(z.literal('')),
  gender: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
