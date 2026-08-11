import { describe, it, expect } from 'vitest';

export function calculateSharedTroughAllocation({ pens, totalAlpha = 0, totalMixed = 0, totalStraw = 0 }) {
  const totalComponentInput = totalAlpha + totalMixed + totalStraw;

  const alphaProp = totalComponentInput > 0 ? totalAlpha / totalComponentInput : 0;
  const mixedProp = totalComponentInput > 0 ? totalMixed / totalComponentInput : 0;
  const strawProp = totalComponentInput > 0 ? totalStraw / totalComponentInput : 0;

  const totalGroupGoats = pens.reduce((sum, p) => sum + p.count, 0);
  const combinedTargetNeed = pens.reduce((sum, p) => sum + (p.count * p.targetRate), 0);

  return pens.map(p => {
    const penTargetIntake = p.count * p.targetRate;
    let ratio = 0;
    if (combinedTargetNeed > 0) {
      ratio = penTargetIntake / combinedTargetNeed;
    } else if (totalGroupGoats > 0) {
      ratio = p.count / totalGroupGoats;
    } else if (pens.length > 0) {
      ratio = 1 / pens.length;
    }

    const alphaAllocated = parseFloat((penTargetIntake * alphaProp).toFixed(3));
    const mixedAllocated = parseFloat((penTargetIntake * mixedProp).toFixed(3));
    const strawAllocated = parseFloat((penTargetIntake * strawProp).toFixed(3));
    const totalAllocatedKg = parseFloat((penTargetIntake).toFixed(3));
    const perHeadKg = p.count > 0 ? parseFloat((totalAllocatedKg / p.count).toFixed(3)) : null;

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

describe('Shared Feed Trough Recipe Proportion Allocation Math', () => {
  it('correctly calculates feed intake per pen based on recipe proportions and (goats * target rate)', () => {
    const pens = [
      { id: 'pen-A', count: 10, targetRate: 2.5 }, // 25.0 kg target intake
      { id: 'pen-B', count: 5, targetRate: 2.0 }   // 10.0 kg target intake
    ];

    // Entered mix components: 10 kg Alpha, 5 kg Mixed Grains, 5 kg Straw (Total 20 kg mix)
    // Recipe proportions: 50% Alpha, 25% Mixed Grains, 25% Straw
    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 10,
      totalMixed: 5,
      totalStraw: 5
    });

    const penA = result.find(r => r.penId === 'pen-A');
    const penB = result.find(r => r.penId === 'pen-B');

    // Pen A Intake: 10 goats * 2.5 kg/head = 25 kg total
    expect(penA.totalAllocatedKg).toBe(25);
    expect(penA.perHeadKg).toBe(2.5);
    expect(penA.alphaAllocated).toBe(12.5); // 25 * 50%
    expect(penA.mixedAllocated).toBe(6.25); // 25 * 25%
    expect(penA.strawAllocated).toBe(6.25); // 25 * 25%

    // Pen B Intake: 5 goats * 2.0 kg/head = 10 kg total
    expect(penB.totalAllocatedKg).toBe(10);
    expect(penB.perHeadKg).toBe(2.0);
    expect(penB.alphaAllocated).toBe(5.0); // 10 * 50%
    expect(penB.mixedAllocated).toBe(2.5); // 10 * 25%
    expect(penB.strawAllocated).toBe(2.5); // 10 * 25%
  });

  it('handles single component recipe (e.g. 100% Alfalfa)', () => {
    const pens = [
      { id: 'pen-A', count: 8, targetRate: 3.0 } // 24 kg target intake
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 15, // 100% Alpha mix
      totalMixed: 0,
      totalStraw: 0
    });

    const penA = result[0];
    expect(penA.totalAllocatedKg).toBe(24);
    expect(penA.alphaAllocated).toBe(24);
    expect(penA.mixedAllocated).toBe(0);
    expect(penA.strawAllocated).toBe(0);
  });

  it('handles zero component input gracefully without NaN errors', () => {
    const pens = [
      { id: 'pen-A', count: 10, targetRate: 2.5 }
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 0,
      totalMixed: 0,
      totalStraw: 0
    });

    const penA = result[0];
    expect(penA.alphaAllocated).toBe(0);
    expect(penA.mixedAllocated).toBe(0);
    expect(penA.strawAllocated).toBe(0);
    expect(penA.totalAllocatedKg).toBe(25);
  });
});
