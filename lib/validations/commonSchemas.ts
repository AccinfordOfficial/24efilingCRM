import { z } from 'zod';

export const phoneSchema = z.string()
  .regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number');

export const panSchema = z.string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter valid PAN (e.g., ABCDE1234F)');

export const gstinSchema = z.string()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/, 'Enter valid GSTIN');

export const aadharSchema = z.string()
  .regex(/^\d{12}$/, 'Enter valid 12-digit Aadhar number');

export const emailSchema = z.string().email('Enter valid email address');
