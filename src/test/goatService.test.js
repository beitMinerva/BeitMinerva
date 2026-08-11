import { describe, it, expect } from 'vitest';
import { calculateNextDueDate, formatBeirutDateTime } from '../services/goatService';
import { getRepeatLabel } from '../components/GoatDetailModal';

describe('goatService & Helper Functions Unit Tests', () => {
  describe('calculateNextDueDate', () => {
    it('calculates daily recurrence correctly', () => {
      const base = '2026-08-10T09:00:00.000Z';
      const next = calculateNextDueDate(base, 'daily');
      const expected = new Date('2026-08-11T09:00:00.000Z').toISOString();
      expect(next).toBe(expected);
    });

    it('calculates weekly recurrence correctly', () => {
      const base = '2026-08-10T09:00:00.000Z';
      const next = calculateNextDueDate(base, 'weekly');
      const expected = new Date('2026-08-17T09:00:00.000Z').toISOString();
      expect(next).toBe(expected);
    });

    it('calculates monthly recurrence correctly', () => {
      const base = '2026-08-10T09:00:00.000Z';
      const next = calculateNextDueDate(base, 'monthly');
      const expected = new Date('2026-09-10T09:00:00.000Z').toISOString();
      expect(next).toBe(expected);
    });

    it('calculates 3-month recurrence for Hoof Trimming correctly', () => {
      const base = '2026-08-10T09:00:00.000Z';
      const next = calculateNextDueDate(base, 'every_3_months');
      const expected = new Date('2026-11-10T09:00:00.000Z').toISOString();
      expect(next).toBe(expected);
    });

    it('calculates 6-month recurrence correctly', () => {
      const base = '2026-08-10T09:00:00.000Z';
      const next = calculateNextDueDate(base, 'every_6_months');
      const expected = new Date('2027-02-10T09:00:00.000Z').toISOString();
      expect(next).toBe(expected);
    });

    it('calculates custom days recurrence correctly', () => {
      const base = '2026-08-10T09:00:00.000Z';
      const next = calculateNextDueDate(base, 'custom', 45);
      const expected = new Date('2026-09-24T09:00:00.000Z').toISOString();
      expect(next).toBe(expected);
    });
  });

  describe('getRepeatLabel', () => {
    it('returns correct label for every_3_months', () => {
      const event = { custom_fields: { repeat_frequency: 'every_3_months' } };
      expect(getRepeatLabel(event)).toBe('Every 3 Months');
    });

    it('returns One-time Task for none frequency', () => {
      const event = { custom_fields: { repeat_frequency: 'none' } };
      expect(getRepeatLabel(event)).toBe('One-time Task');
    });
  });
});
