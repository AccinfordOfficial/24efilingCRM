import { z } from 'zod';

export const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Customer selection is required'),
  issue_date: z.string().min(1, 'Issue date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  subtotal: z.number().min(0, 'Subtotal must be non-negative'),
  tax_amount: z.number().min(0, 'Tax amount must be non-negative'),
  total_amount: z.number().min(0, 'Total amount must be non-negative'),
  status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']),
  notes: z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
