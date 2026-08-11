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

describe('Shared Feed Trough & Single Pen Recipe Proportion Allocation Math', () => {
  it('correctly calculates feed intake per pen based on recipe proportions and (goats * target rate)', () => {
    const pens = [
      { id: 'pen-A', count: 10, targetRate: 2.5 }, // 25.0 kg target intake
      { id: 'pen-B', count: 5, targetRate: 2.0 }   // 10.0 kg target intake
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 10,
      totalMixed: 5,
      totalStraw: 5
    });

    const penA = result.find(r => r.penId === 'pen-A');
    const penB = result.find(r => r.penId === 'pen-B');

    expect(penA.totalAllocatedKg).toBe(25);
    expect(penA.perHeadKg).toBe(2.5);
    expect(penA.alphaAllocated).toBe(12.5);
    expect(penA.mixedAllocated).toBe(6.25);
    expect(penA.strawAllocated).toBe(6.25);

    expect(penB.totalAllocatedKg).toBe(10);
    expect(penB.perHeadKg).toBe(2.0);
    expect(penB.alphaAllocated).toBe(5.0);
    expect(penB.mixedAllocated).toBe(2.5);
    expect(penB.strawAllocated).toBe(2.5);
  });

  it('correctly calculates Single Pen mode (Pen A: 8 goats @ 2.5 kg/goat) with recipe mix 1kg Alpha, 18kg Mixed, 1kg Straw', () => {
    const pens = [
      { id: 'pen-A', count: 8, targetRate: 2.5 }
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 1,
      totalMixed: 18,
      totalStraw: 1
    });

    const penA = result[0];
    expect(penA.perHeadKg).toBe(2.5);
    expect(penA.totalAllocatedKg).toBe(20.0);
    expect(penA.alphaAllocated).toBe(1.0);
    expect(penA.mixedAllocated).toBe(18.0);
    expect(penA.strawAllocated).toBe(1.0);
  });

  it('correctly calculates Mlk A (8 goats) and Mlk B (15 goats) with 1kg Alpha, 18kg Mixed, 1kg Straw recipe', () => {
    const pens = [
      { id: 'mlk-A', count: 8, targetRate: 2.5 },
      { id: 'mlk-B', count: 15, targetRate: 2.5 }
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 1,
      totalMixed: 18,
      totalStraw: 1
    });

    const mlkA = result.find(r => r.penId === 'mlk-A');
    const mlkB = result.find(r => r.penId === 'mlk-B');

    expect(mlkA.perHeadKg).toBe(2.5);
    expect(mlkA.totalAllocatedKg).toBe(20.0);
    expect(mlkA.alphaAllocated).toBe(1.0);
    expect(mlkA.mixedAllocated).toBe(18.0);
    expect(mlkA.strawAllocated).toBe(1.0);

    expect(mlkB.perHeadKg).toBe(2.5);
    expect(mlkB.totalAllocatedKg).toBe(37.5);
    expect(mlkB.alphaAllocated).toBe(1.875);
    expect(mlkB.mixedAllocated).toBe(33.75);
    expect(mlkB.strawAllocated).toBe(1.875);
  });

  it('handles single component recipe (e.g. 100% Alfalfa)', () => {
    const pens = [
      { id: 'pen-A', count: 8, targetRate: 3.0 }
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 15,
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

  it('handles edge case: pen with 0 goats gracefully without division by zero', () => {
    const pens = [
      { id: 'empty-pen', count: 0, targetRate: 2.5 },
      { id: 'pen-A', count: 10, targetRate: 2.5 }
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 2,
      totalMixed: 18,
      totalStraw: 0
    });

    const emptyPen = result.find(r => r.penId === 'empty-pen');
    expect(emptyPen.totalAllocatedKg).toBe(0);
    expect(emptyPen.perHeadKg).toBeNull();
    expect(emptyPen.alphaAllocated).toBe(0);
    expect(emptyPen.mixedAllocated).toBe(0);
  });

  it('handles edge case: fractional rates and fractional component mix inputs accurately', () => {
    const pens = [
      { id: 'pen-A', count: 4, targetRate: 1.55 } // 4 * 1.55 = 6.2 kg target
    ];

    const result = calculateSharedTroughAllocation({
      pens,
      totalAlpha: 0.75,  // 5% alpha
      totalMixed: 13.5,  // 90% mixed
      totalStraw: 0.75   // 5% straw
    });

    const penA = result[0];
    expect(penA.totalAllocatedKg).toBe(6.2);
    expect(penA.perHeadKg).toBe(1.55);
    expect(penA.alphaAllocated).toBe(0.31);  // 6.2 * 0.05
    expect(penA.mixedAllocated).toBe(5.58);  // 6.2 * 0.90
    expect(penA.strawAllocated).toBe(0.31);  // 6.2 * 0.05
  });
});
