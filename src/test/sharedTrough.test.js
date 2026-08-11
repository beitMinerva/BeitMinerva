import { describe, it, expect } from 'vitest';

function calculateSharedTroughAllocation({ pens, totalAlpha, totalMixed, totalStraw }) {
  const totalGroupGoats = pens.reduce((sum, p) => sum + p.count, 0);
  const combinedTargetNeed = pens.reduce((sum, p) => sum + (p.count * p.targetRate), 0);

  return pens.map(p => {
    const targetNeed = p.count * p.targetRate;
    let ratio = 0;
    if (combinedTargetNeed > 0) {
      ratio = targetNeed / combinedTargetNeed;
    } else if (totalGroupGoats > 0) {
      ratio = p.count / totalGroupGoats;
    } else if (pens.length > 0) {
      ratio = 1 / pens.length;
    }

    const alphaAllocated = parseFloat((totalAlpha * ratio).toFixed(3));
    const mixedAllocated = parseFloat((totalMixed * ratio).toFixed(3));
    const strawAllocated = parseFloat((totalStraw * ratio).toFixed(3));
    const totalAllocatedKg = parseFloat(((totalAlpha + totalMixed + totalStraw) * ratio).toFixed(3));
    const perHeadKg = p.count > 0 ? (totalAllocatedKg / p.count) : null;

    return {
      penId: p.id,
      ratio,
      alphaAllocated,
      mixedAllocated,
      strawAllocated,
      totalAllocatedKg,
      perHeadKg
    };
  });
}

describe('Shared Feed Trough Allocation Math', () => {
  it('correctly calculates proportional feed split for Pen A (10 goats @ 2.5 kg) & Pen B (5 goats @ 2.0 kg)', () => {
    const pens = [
      { id: 'pen-A', count: 10, targetRate: 2.5 },
      { id: 'pen-B', count: 5, targetRate: 2.0 }
    ];
    // Total Target Need: 10*2.5 + 5*2.0 = 25 + 10 = 35 kg.
    // Pen A ratio: 25/35 = 0.7142857 (71.43%)
    // Pen B ratio: 10/35 = 0.2857142 (28.57%)

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 0,
      totalMixed: 13,
      totalStraw: 2
    });

    const penA = result.find(r => r.penId === 'pen-A');
    const penB = result.find(r => r.penId === 'pen-B');

    expect(penA.ratio).toBeCloseTo(0.7143, 3);
    expect(penB.ratio).toBeCloseTo(0.2857, 3);

    // Mixed Grains allocation (13 kg total)
    expect(penA.mixedAllocated).toBe(9.286); // 13 * (25/35) = 9.2857 -> 9.286
    expect(penB.mixedAllocated).toBe(3.714); // 13 * (10/35) = 3.7143 -> 3.714
    expect(penA.mixedAllocated + penB.mixedAllocated).toBe(13);

    // Straw allocation (2 kg total)
    expect(penA.strawAllocated).toBe(1.429); // 2 * (25/35) = 1.4285 -> 1.429
    expect(penB.strawAllocated).toBe(0.571); // 2 * (10/35) = 0.5714 -> 0.571
    expect(penA.strawAllocated + penB.strawAllocated).toBe(2);

    // Total feed sum across pens equals original 15 kg
    expect(penA.totalAllocatedKg + penB.totalAllocatedKg).toBe(15);
  });

  it('fallbacks cleanly to headcount ratio if target rates are 0', () => {
    const pens = [
      { id: 'pen-A', count: 10, targetRate: 0 },
      { id: 'pen-B', count: 5, targetRate: 0 }
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 15,
      totalMixed: 0,
      totalStraw: 0
    });

    const penA = result.find(r => r.penId === 'pen-A');
    const penB = result.find(r => r.penId === 'pen-B');

    expect(penA.ratio).toBeCloseTo(10 / 15, 3);
    expect(penB.ratio).toBeCloseTo(5 / 15, 3);
    expect(penA.alphaAllocated).toBe(10);
    expect(penB.alphaAllocated).toBe(5);
  });
});
