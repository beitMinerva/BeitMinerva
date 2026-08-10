import { describe, it, expect } from 'vitest';
import { getBeirutDateTimeString, formatBeirutDisplay } from '../services/goatService';

describe('Beirut Timezone (Asia/Beirut, UTC+3) Date Formatting', () => {
  it('formats dates in Beirut local time display string correctly', () => {
    const utcDateStr = '2026-08-09T15:30:00.000Z'; // 15:30 UTC is 18:30 Beirut Time (UTC+3)
    const formatted = formatBeirutDisplay(utcDateStr);
    expect(formatted).toContain('6:30 PM');
    expect(formatted).toContain('Aug 9, 2026');
  });

  it('generates Beirut local datetime-local ISO string correctly', () => {
    const beirutISO = getBeirutDateTimeString(new Date('2026-08-09T15:30:00.000Z'));
    expect(beirutISO).toBe('2026-08-09T18:30');
  });
});
