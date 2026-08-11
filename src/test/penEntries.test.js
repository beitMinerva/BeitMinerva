import { describe, it, expect } from 'vitest';
import { getBeirutDateTimeString, formatBeirutDisplay } from '../services/goatService';
import { calculateDailyFeedCarryover, calculateMonthlySnapshots } from '../components/FarmAnalyticsModal';

describe('Pen Milk & Feeding Entries - Beirut Timezone & Amount Calculations', () => {
  it('correctly parses amount_liters for pen milk entries', () => {
    const milkEntry = { amount_liters: '4.5', notes: 'Morning session' };
    const amountLiters = Number(milkEntry.amount_liters ?? milkEntry.milk_liters) || 0;
    expect(amountLiters).toBe(4.5);
  });

  it('correctly generates Beirut local time string for datetime-local picker', () => {
    const utcDate = '2026-08-10T17:30:00.000Z'; // 17:30 UTC is 20:30 Beirut Time (UTC+3)
    const beirutString = getBeirutDateTimeString(utcDate);
    expect(beirutString).toBe('2026-08-10T20:30');
  });

  it('formats display date in Beirut time with 12-hour AM/PM format', () => {
    const utcDate = '2026-08-10T17:30:00.000Z';
    const formatted = formatBeirutDisplay(utcDate);
    expect(formatted).toContain('8:30 PM');
    expect(formatted).toContain('Aug 10, 2026');
  });
});

describe('Daily Feed Carryover & Shift Validation', () => {
  it('carries over the active feed ration daily across custom date range when no new entry is logged', () => {
    const barnAreas = [{ id: 'pen-A', letter: 'A', name: 'Pen A' }];
    const feedingEntries = [
      {
        id: 'feed-1',
        barn_area_id: 'pen-A',
        date: '2026-08-01T08:00:00.000Z',
        alpha_kg: 2,
        alpha_price_per_kg: 0.5,
        mixed_grains_kg: 16,
        mixed_grains_price_per_kg: 0.4,
        straw_kg: 2,
        straw_price_per_kg: 0.2
      }
    ];

    // Range: Aug 1 to Aug 10 (10 days)
    const result = calculateDailyFeedCarryover({
      feedingEntries,
      barnAreas,
      timeRange: 'custom',
      customStartDate: '2026-08-01',
      customEndDate: '2026-08-10'
    });

    // Daily kg = 2 + 16 + 2 = 20 kg/day. 10 days = 200 kg total
    // Daily cost = (2*0.5) + (16*0.4) + (2*0.2) = 1.0 + 6.4 + 0.4 = $7.80/day. 10 days = $78.00 total
    expect(result.totalFeedKg).toBe(200);
    expect(result.totalFeedCost).toBeCloseTo(78.00, 2);
    expect(result.totalRangeDays).toBe(10);
    expect(result.penFeedPerformanceMap['pen-A'].feedKg).toBe(200);
  });

  it('automatically increments total feed on August 12 (tomorrow) by +1 day of active feed', () => {
    const barnAreas = [{ id: 'pen-A', letter: 'A', name: 'Pen A' }];
    const feedingEntries = [
      {
        id: 'feed-1',
        barn_area_id: 'pen-A',
        date: '2026-08-01T08:00:00.000Z',
        alpha_kg: 1,
        alpha_price_per_kg: 0.45,
        mixed_grains_kg: 18,
        mixed_grains_price_per_kg: 0.45,
        straw_kg: 1,
        straw_price_per_kg: 0.25
      }
    ];

    // Aug 1 to Aug 11 (Today: 11 days @ 20 kg/day = 220 kg)
    const todayResult = calculateDailyFeedCarryover({
      feedingEntries,
      barnAreas,
      timeRange: 'custom',
      customStartDate: '2026-08-01',
      customEndDate: '2026-08-11'
    });
    expect(todayResult.totalFeedKg).toBe(220);
    expect(todayResult.totalRangeDays).toBe(11);

    // Aug 1 to Aug 12 (Tomorrow: 12 days @ 20 kg/day = 240 kg) -> automatically increments by +20 kg
    const tomorrowResult = calculateDailyFeedCarryover({
      feedingEntries,
      barnAreas,
      timeRange: 'custom',
      customStartDate: '2026-08-01',
      customEndDate: '2026-08-12'
    });
    expect(tomorrowResult.totalFeedKg).toBe(240); // 220 + 20 kg
    expect(tomorrowResult.totalRangeDays).toBe(12);
  });

  it('updates daily carryover immediately when a new ration is logged mid-period', () => {
    const barnAreas = [{ id: 'pen-A', letter: 'A', name: 'Pen A' }];
    const feedingEntries = [
      {
        id: 'feed-1',
        barn_area_id: 'pen-A',
        date: '2026-08-01T08:00:00.000Z',
        alpha_kg: 2,
        alpha_price_per_kg: 0.5,
        mixed_grains_kg: 16,
        mixed_grains_price_per_kg: 0.4,
        straw_kg: 2,
        straw_price_per_kg: 0.2
      },
      {
        id: 'feed-2',
        barn_area_id: 'pen-A',
        date: '2026-08-06T08:00:00.000Z',
        alpha_kg: 4,
        alpha_price_per_kg: 0.5,
        mixed_grains_kg: 20,
        mixed_grains_price_per_kg: 0.4,
        straw_kg: 1,
        straw_price_per_kg: 0.2
      }
    ];

    // Range: Aug 1 to Aug 10 (10 days)
    // Aug 1 to Aug 5 (5 days): 20 kg/day = 100 kg
    // Aug 6 to Aug 10 (5 days): 25 kg/day = 125 kg
    // Total = 225 kg
    const result = calculateDailyFeedCarryover({
      feedingEntries,
      barnAreas,
      timeRange: 'custom',
      customStartDate: '2026-08-01',
      customEndDate: '2026-08-10'
    });

    expect(result.totalFeedKg).toBe(225);
    expect(result.totalRangeDays).toBe(10);
  });

  it('correctly aggregates monthly snapshots for each calendar month with daily feed carryover', () => {
    const barnAreas = [{ id: 'pen-A', letter: 'A', name: 'Pen A' }];
    const milkEntries = [
      { id: 'm1', barn_area_id: 'pen-A', date: '2026-07-15T08:00:00Z', amount_liters: 100, destination: 'commercial' },
      { id: 'm2', barn_area_id: 'pen-A', date: '2026-08-05T08:00:00Z', amount_liters: 150, destination: 'commercial' }
    ];
    const feedingEntries = [
      { id: 'f1', barn_area_id: 'pen-A', date: '2026-07-01T08:00:00Z', alpha_kg: 10, mixed_grains_kg: 10, straw_kg: 0 } // 20 kg/day
    ];

    const monthlySnapshots = calculateMonthlySnapshots({
      milkEntries,
      feedingEntries,
      timelineEvents: [],
      barnAreas,
      milkPricePerLiter: 1.1
    });

    expect(monthlySnapshots.length).toBeGreaterThanOrEqual(2);
    const julySnapshot = monthlySnapshots.find(m => m.key === '2026-07');
    expect(julySnapshot).toBeDefined();
    expect(julySnapshot.milk).toBe(100);
    expect(julySnapshot.milkRevenue).toBeCloseTo(110.00, 2); // 100 L * $1.10 = $110.00
    // July has 31 days @ 20 kg/day = 620 kg feed
    expect(julySnapshot.feed).toBe(620);
  });
});
