import { afterEach, describe, expect, it, vi } from 'vitest';
import { addFarmDays, beirutInputToISO, farmDate, farmDateTime, farmDayStart,
  farmDayEnd, farmDisplay, nextFarmDueDate } from '../../supabase/functions/_shared/farmTime.js';
import { doesEventOccurOnDate } from '../views/CalendarView';
import { generateDynamicFarmAlerts } from '../services/notificationService';
import { calculateDailyMilkCarryover, calculateDailyFeedCarryover, calculateMonthlySnapshots } from '../components/FarmAnalyticsModal';

afterEach(() => vi.useRealTimers());

describe('Farm dates consistently use Asia/Beirut', () => {
  it('converts summer and winter form input without using the device timezone', () => {
    expect(beirutInputToISO('2026-08-09T18:30')).toBe('2026-08-09T15:30:00.000Z');
    expect(beirutInputToISO('2026-12-09T18:30')).toBe('2026-12-09T16:30:00.000Z');
    expect(farmDateTime('2026-12-09T16:30:00Z')).toBe('2026-12-09T18:30');
    expect(beirutInputToISO('2026-12-09')).toBe('2026-12-08T22:00:00.000Z');
  });

  it('uses the Beirut day at midnight and preserves date-only records', () => {
    expect(farmDate('2026-08-09T21:30:00Z')).toBe('2026-08-10');
    expect(farmDate('2026-12-09T22:30:00Z')).toBe('2026-12-10');
    expect(farmDate('2026-08-09')).toBe('2026-08-09');
    expect(farmDisplay('2026-08-09T21:30:00Z')).toContain('Aug 10, 2026');
    expect(farmDisplay('invalid')).toBe('');
  });

  it('keeps the farm clock time across spring and autumn recurrence', () => {
    expect(nextFarmDueDate('2026-03-28T09:00', 'daily')).toBe('2026-03-29T06:00:00.000Z');
    expect(nextFarmDueDate('2026-10-24T09:00', 'daily')).toBe('2026-10-25T07:00:00.000Z');
    expect(nextFarmDueDate('2026-08-10T09:00:37.123Z', 'every_3_months')).toBe('2026-11-10T10:00:37.123Z');
    expect(addFarmDays('2026-03-28', 1)).toBe('2026-03-29');
  });

  it('handles nonexistent and repeated Beirut clock hours consistently', () => {
    expect(beirutInputToISO('2026-03-29T00:30')).toBe('2026-03-28T22:30:00.000Z');
    expect(farmDateTime(beirutInputToISO('2026-03-29T00:30'))).toBe('2026-03-29T01:30');
    expect(beirutInputToISO('2026-10-24T23:30')).toBe('2026-10-24T20:30:00.000Z');
  });

  it('uses actual Beirut day boundaries on short and long days', () => {
    expect(farmDayStart('2026-08-10').toISOString()).toBe('2026-08-09T21:00:00.000Z');
    expect(farmDayEnd('2026-08-10').toISOString()).toBe('2026-08-10T20:59:59.999Z');
    const length = date => farmDayEnd(date) - farmDayStart(date) + 1;
    expect(length('2026-03-29')).toBe(23 * 3600000);
    expect(length('2026-10-24')).toBe(25 * 3600000);
  });

  it('places calendar entries on their Beirut date', () => {
    const event = { date: '2026-08-09T21:30:00Z' };
    expect(doesEventOccurOnDate(event, '2026-08-10')).toBe(true);
    expect(doesEventOccurOnDate(event, '2026-08-09')).toBe(false);
    expect(doesEventOccurOnDate({ ...event, custom_fields: { repeat_frequency: 'weekly' } }, '2026-08-17')).toBe(true);
  });

  it('classifies due tasks by the Beirut day as midnight passes', () => {
    vi.useFakeTimers();
    const events = [{ id: 'task', status: 'pending', date: '2026-08-09T21:30:00Z', title: 'Check pen' }];
    vi.setSystemTime(new Date('2026-08-09T20:59:00Z'));
    expect(generateDynamicFarmAlerts({ events })[0].type).toBe('UPCOMING_TASK');
    vi.setSystemTime(new Date('2026-08-09T21:01:00Z'));
    expect(generateDynamicFarmAlerts({ events })[0].type).toBe('TODAY_TASK');
    vi.setSystemTime(new Date('2026-08-10T21:01:00Z'));
    expect(generateDynamicFarmAlerts({ events })[0].type).toBe('OVERDUE_TASK');
  });

  it('starts feeding alerts at Beirut noon and recognizes late-evening UTC entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T09:00:00Z'));
    const data = { barnAreas: [{ id: 'a', letter: 'A' }], goats: [{ id: 'g', barn_area_id: 'a' }] };
    expect(generateDynamicFarmAlerts(data).some(alert => alert.type === 'MISSING_FEED')).toBe(true);
    expect(generateDynamicFarmAlerts({ ...data, feedingEntries: [{ barn_area_id: 'a', date: '2026-08-09T21:30:00Z' }] })).toEqual([]);
  });

  it('groups milk, feed, and monthly snapshots using Beirut boundaries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T12:00:00Z'));
    const barnAreas = [{ id: 'a' }];
    const milkEntries = [{ barn_area_id: 'a', date: '2026-07-31T21:30:00Z', amount_liters: 10 }];
    expect(calculateDailyMilkCarryover({ barnAreas, milkEntries, startDate: '2026-07-31', endDate: '2026-07-31' }).totalMilkLiters).toBe(0);
    expect(calculateDailyMilkCarryover({ barnAreas, milkEntries, startDate: '2026-08-01', endDate: '2026-08-01' }).totalMilkLiters).toBe(10);
    const feedingEntries = [{ barn_area_id: 'a', date: '2026-07-31T21:30:00Z', total_weight: 5 }];
    expect(calculateDailyFeedCarryover({ barnAreas, feedingEntries, timeRange: 'custom', customStartDate: '2026-07-31', customEndDate: '2026-07-31' }).totalFeedKg).toBe(0);
    expect(calculateMonthlySnapshots({ barnAreas, milkEntries, feedingEntries }).map(month => month.key)).toEqual(['2026-08']);
  });
});
