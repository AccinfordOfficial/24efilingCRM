import { describe, it, expect } from 'vitest';
import { calculateLeadScore, getScoreCategory, getScoreBreakdown } from '../scoring';
import { Lead, Task } from '../../types';

const baseTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  content: 't',
  is_completed: false,
  created_at: '2026-01-01',
  created_by: { id: 'u1', name: 'Test User', email: 't@example.com', role: 'Sales Executive', is_active: true, created_at: '2026-01-01', last_updated: '2026-01-01', phone_number: '' } as Task['created_by'],
  priority: 'Medium',
  ...overrides,
} as Task);

const baseLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-1',
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  phone_number: '9999999999',
  service_requested: 'GST Registration',
  status: 'New Lead',
  priority: 'Cold',
  created_at: '2026-01-01T00:00:00Z',
  last_contacted: '2026-01-01T00:00:00Z',
  source: 'Manual',
  ...overrides,
} as Lead);

describe('scoring', () => {
  describe('calculateLeadScore', () => {
    it('scores a bare lead with only its Cold priority base', () => {
      expect(calculateLeadScore(baseLead())).toBe(5);
    });

    it('adds priority points (Hot=30, Warm=15, Cold=5)', () => {
      expect(calculateLeadScore(baseLead({ priority: 'Hot' }))).toBe(30);
      expect(calculateLeadScore(baseLead({ priority: 'Warm' }))).toBe(15);
      expect(calculateLeadScore(baseLead({ priority: 'Cold' }))).toBe(5);
    });

    it('adds engagement points capped at 30', () => {
      const lead = baseLead({
        priority: 'Cold',
        activities: [{ id: 'a1', type: 'Note', content: 'n', created_at: '2026-01-01' }],
        tasks: [
          baseTask({ id: 't1', is_completed: true }),
          baseTask({ id: 't2', is_completed: true }),
          baseTask({ id: 't3', is_completed: false }),
        ],
      });
      // 5 (cold) + min(3 + 8, 30) = 16
      expect(calculateLeadScore(lead)).toBe(16);
    });

    it('adds qualification points capped at 25', () => {
      const lead = baseLead({
        priority: 'Cold',
        documents: [{ id: 'd1', name: 'pan.pdf', type: 'Pancard', url: 'x', status: 'Approved', uploaded_at: '2026-01-01' }],
        total_payment: 5000,
      });
      // 5 (cold) + min(10 + 20, 25) = 30
      expect(calculateLeadScore(lead)).toBe(30);
    });

    it('adds source points (Referral=15, Website=10, Social Media=5)', () => {
      expect(calculateLeadScore(baseLead({ priority: 'Cold', source: 'Referral' }))).toBe(20);
      expect(calculateLeadScore(baseLead({ priority: 'Cold', source: 'Website' }))).toBe(15);
      expect(calculateLeadScore(baseLead({ priority: 'Cold', source: 'Social Media' }))).toBe(10);
    });

    it('caps the score at 100', () => {
      const lead = baseLead({
        priority: 'Hot',
        source: 'Referral',
        activities: Array.from({ length: 20 }, (_, i) => ({ id: `a${i}`, type: 'Note' as const, content: 'n', created_at: '2026-01-01' })),
        documents: Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, name: 'p.pdf', type: 'Pancard', url: 'x', status: 'Approved' as const, uploaded_at: '2026-01-01' })),
        total_payment: 1000,
      });
      expect(calculateLeadScore(lead)).toBe(100);
    });
  });

  describe('getScoreCategory', () => {
    it('classifies Hot above 70', () => {
      expect(getScoreCategory(71).category).toBe('Hot');
    });
    it('classifies Warm between 41 and 70', () => {
      expect(getScoreCategory(70).category).toBe('Warm');
      expect(getScoreCategory(41).category).toBe('Warm');
    });
    it('classifies Cold at 40 or below', () => {
      expect(getScoreCategory(40).category).toBe('Cold');
      expect(getScoreCategory(0).category).toBe('Cold');
    });
  });

  describe('getScoreBreakdown', () => {
    it('returns an entry per scored dimension', () => {
      const lead = baseLead({
        priority: 'Hot',
        source: 'Website',
        activities: [{ id: 'a1', type: 'Note', content: 'n', created_at: '2026-01-01' }],
        total_payment: 500,
      });
      const breakdown = getScoreBreakdown(lead);
      expect(breakdown).toContainEqual({ label: 'Priority: Hot', points: 30 });
      expect(breakdown).toContainEqual({ label: '1 Activities', points: 3 });
      expect(breakdown).toContainEqual({ label: 'Payment Info Added', points: 20 });
      expect(breakdown).toContainEqual({ label: 'Source: Website', points: 10 });
      const total = breakdown.reduce((sum, item) => sum + item.points, 0);
      expect(total).toBe(calculateLeadScore(lead));
    });
  });
});
