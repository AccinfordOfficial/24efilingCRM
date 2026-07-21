import { z } from 'zod';
import { phoneSchema, panSchema, emailSchema } from './commonSchemas';

export const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: emailSchema.or(z.literal('')),
  phone_number: phoneSchema,
  pan_number: panSchema.or(z.literal('')),
  business_name: z.string().min(1, 'Business name is mandatory'),
  business_category: z.string().min(1, 'Business category is mandatory'),
  industry_type: z.string().min(1, 'Industry type is mandatory'),
  source: z.string().min(1, 'Source is required'),
  referred_by_customer_id: z.string().optional(),
  referred_by_employee_id: z.string().optional(),
  priority: z.string(),
  notes: z.string().optional(),
  created_at: z.string(),
  alternate_mobile: phoneSchema.or(z.literal('')),
  alternate_is_whatsapp: z.boolean().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
