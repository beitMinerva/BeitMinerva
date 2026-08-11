import { describe, it, expect } from 'vitest';
import { isNurseryPenCheck } from '../services/goatService';

describe('Nursery Pen Detection & Dedicated Feeding Validation', () => {
  it('correctly identifies Nursery Pens by name, letter, or is_nursery flag', () => {
    expect(isNurseryPenCheck({ name: 'Nursery Pen', letter: 'N' })).toBe(true);
    expect(isNurseryPenCheck({ name: 'Kids Barn', letter: 'K' })).toBe(true);
    expect(isNurseryPenCheck({ name: 'Pen N', letter: 'N' })).toBe(true);
    expect(isNurseryPenCheck({ name: 'Lambs Section', letter: 'L' })).toBe(true);
    expect(isNurseryPenCheck({ is_nursery: true, name: 'Custom Pen', letter: 'X' })).toBe(true);

    expect(isNurseryPenCheck({ name: 'Pen A', letter: 'A' })).toBe(false);
    expect(isNurseryPenCheck({ name: 'Milking Does', letter: 'M' })).toBe(false);
  });

  it('excludes Nursery Pens from adult shared trough pen selection list', () => {
    const allPens = [
      { id: 'pen-A', letter: 'A', name: 'Pen A' },
      { id: 'pen-B', letter: 'B', name: 'Pen B' },
      { id: 'pen-N', letter: 'N', name: 'Nursery', is_nursery: true }
    ];

    const currentPen = allPens[0];
    const availableSharedPens = allPens.filter(p => p.id !== currentPen.id && !isNurseryPenCheck(p));

    expect(availableSharedPens.length).toBe(1);
    expect(availableSharedPens[0].id).toBe('pen-B');
    expect(availableSharedPens.find(p => p.id === 'pen-N')).toBeUndefined();
  });
});
