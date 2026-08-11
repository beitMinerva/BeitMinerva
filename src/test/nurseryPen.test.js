import { describe, it, expect } from 'vitest';
import { isNurseryPenCheck } from '../services/goatService';

describe('Nursery Pen Strict Checkbox & Dedicated Feeding Validation', () => {
  it('strictly identifies Nursery Pens ONLY when is_nursery checkbox flag is set to true', () => {
    expect(isNurseryPenCheck({ is_nursery: true, name: 'Pen A', letter: 'A' })).toBe(true);
    expect(isNurseryPenCheck({ isNursery: true, name: 'Special Pen', letter: 'S' })).toBe(true);

    // Pen with name 'Nursery' or letter 'N' without checkbox checked is NOT a nursery pen
    expect(isNurseryPenCheck({ name: 'Nursery Pen', letter: 'N', is_nursery: false })).toBe(false);
    expect(isNurseryPenCheck({ name: 'Kids Barn', letter: 'K' })).toBe(false);
    expect(isNurseryPenCheck({ name: 'Pen A', letter: 'A' })).toBe(false);
  });

  it('excludes Nursery Pens from adult shared trough pen selection list', () => {
    const allPens = [
      { id: 'pen-A', letter: 'A', name: 'Pen A', is_nursery: false },
      { id: 'pen-B', letter: 'B', name: 'Pen B', is_nursery: false },
      { id: 'pen-N', letter: 'N', name: 'Nursery', is_nursery: true }
    ];

    const currentPen = allPens[0];
    const availableSharedPens = allPens.filter(p => p.id !== currentPen.id && !isNurseryPenCheck(p));

    expect(availableSharedPens.length).toBe(1);
    expect(availableSharedPens[0].id).toBe('pen-B');
    expect(availableSharedPens.find(p => p.id === 'pen-N')).toBeUndefined();
  });
});
