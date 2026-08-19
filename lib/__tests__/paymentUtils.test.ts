import { describe, it, expect } from 'vitest';
import {
  getNextPaymentSequenceClientSide,
  formatPaymentReferenceId,
  generateReferenceNumber,
} from '../paymentUtils';
import { Lead, Customer } from '../../types';

const baseLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-1',
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  phone_number: '9999999999',
  service_requested: 'GST Registration',
  status: 'New Lead',
  priority: 'Warm',
  created_at: '2026-01-01T00:00:00Z',
  last_contacted: '2026-01-01T00:00:00Z',
  source: 'Website',
  ...overrides,
} as Lead);

describe('paymentUtils', () => {
  describe('formatPaymentReferenceId', () => {
    it('formats E-XXX-YYYY with padded sequence', () => {
      expect(formatPaymentReferenceId(1, 2026)).toBe('E-001-2026');
      expect(formatPaymentReferenceId(42, 2026)).toBe('E-042-2026');
      expect(formatPaymentReferenceId(999, 2026)).toBe('E-999-2026');
    });
  });

  describe('getNextPaymentSequenceClientSide', () => {
    it('returns 1 when no leads exist', () => {
      expect(getNextPaymentSequenceClientSide([], 2026)).toBe(1);
    });

    it('scans lead reference numbers for the same year', () => {
      const leads = [
        baseLead({ id: 'a', reference_number: 'E-005-2026' }),
        baseLead({ id: 'b', reference_number: 'E-012-2026' }),
      ];
      expect(getNextPaymentSequenceClientSide(leads, 2026)).toBe(13);
    });

    it('ignores reference numbers from other years', () => {
      const leads = [baseLead({ reference_number: 'E-099-2025' })];
      expect(getNextPaymentSequenceClientSide(leads, 2026)).toBe(1);
    });

    it('scans nested payment receipt numbers', () => {
      const leads = [
        baseLead({
          payments: [{ id: 'p1', amount: 100, date: '2026-01-01', method: 'UPI', receipt_number: 'E-007-2026' }],
        }),
      ];
      expect(getNextPaymentSequenceClientSide(leads, 2026)).toBe(8);
    });

    it('takes the max of lead and payment sequences', () => {
      const leads = [
        baseLead({
          reference_number: 'E-003-2026',
          payments: [{ id: 'p1', amount: 100, date: '2026-01-01', method: 'Cash', receipt_number: 'E-020-2026' }],
        }),
      ];
      expect(getNextPaymentSequenceClientSide(leads, 2026)).toBe(21);
    });

    it('handles malformed reference numbers gracefully', () => {
      const leads = [
        baseLead({ reference_number: 'INVALID' }),
        baseLead({ reference_number: 'E-ABC-2026' }),
        baseLead({ reference_number: undefined }),
      ];
      expect(getNextPaymentSequenceClientSide(leads, 2026)).toBe(1);
    });
  });

  describe('generateReferenceNumber', () => {
    it('returns E-001-YYYY for empty data', () => {
      expect(generateReferenceNumber([], [], 2026)).toBe('E-001-2026');
    });

    it('combines lead and customer sequences', () => {
      const leads = [baseLead({ reference_number: 'E-004-2026' })];
      const customers = [{ id: 'c1', reference_number: 'E-009-2026' }] as unknown as Customer[];
      expect(generateReferenceNumber(leads, customers, 2026)).toBe('E-010-2026');
    });
  });
});
