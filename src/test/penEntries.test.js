import { describe, it, expect } from 'vitest';
import { getBeirutDateTimeString, formatBeirutDisplay } from '../services/goatService';

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
