import { describe, it, expect } from 'vitest';
import { calculateMonthlySnapshots } from '../components/FarmAnalyticsModal';

describe('Farm Dashboard & Analytics End-to-End Integration Edge Cases', () => {
  it('correctly combines pen milk entries AND individual goat milking timeline events in total volume & sellable revenue', () => {
    const penMilkEntries = [
      { id: 'p1', barn_area_id: 'pen-A', date: '2026-08-05T08:00:00Z', amount_liters: 100, destination: 'commercial' }
    ];

    const timelineEvents = [
      // Individual goat milking event: 5 Liters commercial
      { id: 't1', type: 'Milking', date: '2026-08-05T10:00:00Z', custom_fields: { amount_liters: 5, destination: 'commercial' } },
      // Goat sale event: $250.00 revenue
      { id: 't2', type: 'Sale', date: '2026-08-08T12:00:00Z', custom_fields: { sale_price: 250 } }
    ];

    const snapshots = calculateMonthlySnapshots({
      milkEntries: penMilkEntries,
      feedingEntries: [],
      timelineEvents,
      barnAreas: [{ id: 'pen-A', letter: 'A' }],
      milkPricePerLiter: 1.10
    });

    const augSnapshot = snapshots.find(s => s.key === '2026-08');
    expect(augSnapshot).toBeDefined();
    expect(augSnapshot.milk).toBe(105); // Pen milk (100) + Individual milk (5)
    expect(augSnapshot.milkRevenue).toBeCloseTo(115.50, 2); // 105 * 1.10 = $115.50
    expect(augSnapshot.grossIncome).toBeCloseTo(365.50, 2); // $115.50 milk + $250 goat sale = $365.50
  });

  it('accurately tallies herd status counts for dashboard summary cards', () => {
    const goats = [
      { id: 'g1', status: 'Healthy', area_id: 'pen-A' },
      { id: 'g2', status: 'Healthy', area_id: 'pen-A' },
      { id: 'g3', status: 'Pregnant', area_id: 'pen-B' },
      { id: 'g4', status: 'Under Treatment', area_id: 'pen-B' },
      { id: 'g5', status: 'Dry', area_id: 'pen-C' },
      { id: 'g6', status: 'Quarantine', area_id: 'pen-C' },
      { id: 'g7', status: 'Sold', area_id: null }
    ];

    const stats = {
      total: goats.length,
      healthy: goats.filter(g => g.status === 'Healthy').length,
      pregnant: goats.filter(g => g.status === 'Pregnant').length,
      underTreatment: goats.filter(g => g.status === 'Under Treatment').length,
      dry: goats.filter(g => g.status === 'Dry').length,
      quarantine: goats.filter(g => g.status === 'Quarantine').length,
      sold: goats.filter(g => g.status === 'Sold').length
    };

    expect(stats.total).toBe(7);
    expect(stats.healthy).toBe(2);
    expect(stats.pregnant).toBe(1);
    expect(stats.underTreatment).toBe(1);
    expect(stats.dry).toBe(1);
    expect(stats.quarantine).toBe(1);
    expect(stats.sold).toBe(1);
  });

  it('correctly calculates active milking doe count excluding Dry, Quarantine, and Male goats', () => {
    const goats = [
      { id: 'g1', gender: 'Female', status: 'Healthy' },
      { id: 'g2', gender: 'Doe', status: 'Pregnant' },
      { id: 'g3', gender: 'Female', status: 'Dry' },         // Excluded (Dry)
      { id: 'g4', gender: 'Female', status: 'Quarantine' },  // Excluded (Quarantine)
      { id: 'g5', gender: 'Male', status: 'Healthy' }        // Excluded (Male)
    ];

    const activeMilkingDoes = goats.filter(g => {
      const gen = (g.gender || '').toLowerCase();
      const isFemale = gen.includes('female') || gen.includes('doe') || gen === 'f';
      return isFemale && g.status !== 'Dry' && g.status !== 'Quarantine';
    });

    expect(activeMilkingDoes.length).toBe(2); // g1 & g2
  });
});
