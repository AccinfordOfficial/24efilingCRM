import { z } from 'zod';
import { emailSchema, phoneSchema } from './commonSchemas';

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: emailSchema,
  role: z.string().min(1, 'Role is required'),
  city_id: z.string().min(1, 'City is required'),
  branch_id: z.string().min(1, 'Branch is required'),
  phone: phoneSchema.or(z.literal('')),
  date_of_birth: z.string().or(z.literal('')),
  gender: z.string().optional(),
});

export type UserFormValues = z.infer<typeof userSchema>;
