import { describe, it, expect } from 'vitest';

const sampleGoats = [
  { id: 'g1', tag_id: '#101', name: 'Bella', area_id: 'area-a' },
  { id: 'g2', tag_id: '#102', name: 'Daisy', area_id: 'area-a' },
  { id: 'g3', tag_id: '#103', name: 'Max', area_id: 'area-b' },
];

function resolveEventTarget(event, goats, barnAreas) {
  let customFields = {};
  if (typeof event.custom_fields === 'object' && event.custom_fields) {
    customFields = event.custom_fields;
  } else if (typeof event.custom_fields === 'string') {
    try { customFields = JSON.parse(event.custom_fields) || {}; } catch (e) {}
  }

  const targetMode = customFields.target_mode || (event.goat_id && event.goat_id !== 'herd' ? 'SINGLE' : 'HERD');
  const targetGoatIds = customFields.target_goat_ids || [];
  const penId = customFields.target_pen_id;

  if (targetMode === 'SINGLE') {
    const singleId = event.goat_id || (targetGoatIds.length === 1 ? targetGoatIds[0] : null);
    const g = goats.find((x) => x.id === singleId);
    return { mode: 'SINGLE', summary: g ? `Goat ${g.tag_id} (${g.name})` : 'Single Goat', goats: g ? [g] : [] };
  }

  if (targetMode === 'PEN' && penId) {
    const pen = barnAreas.find((p) => p.id === penId);
    const penName = pen ? `Pen ${pen.letter}` : 'Pen';
    const penGoats = targetGoatIds.length > 0 ? goats.filter((g) => targetGoatIds.includes(g.id)) : goats.filter((g) => g.area_id === penId);
    return { mode: 'PEN', summary: `${penName} (${penGoats.length} Goats)`, goats: penGoats };
  }

  if (targetMode === 'CUSTOM') {
    const customGoats = goats.filter((g) => targetGoatIds.includes(g.id));
    if (customGoats.length === 1) {
      return { mode: 'SINGLE', summary: `Goat ${customGoats[0].tag_id} (${customGoats[0].name})`, goats: customGoats };
    }
    return { mode: 'CUSTOM', summary: `Custom Selection (${customGoats.length} Goats)`, goats: customGoats };
  }

  return { mode: 'HERD', summary: `Entire Herd (${goats.length} Goats)`, goats: goats };
}

describe('Target Mode Resolution & Snapshot Insulation', () => {
  const mockBarns = [{ id: 'area-a', name: 'Pen A', letter: 'A' }, { id: 'area-b', name: 'Pen B', letter: 'B' }];

  it('resolves HERD event correctly', () => {
    const event = { custom_fields: { target_mode: 'HERD' } };
    const res = resolveEventTarget(event, sampleGoats, mockBarns);
    expect(res.mode).toBe('HERD');
    expect(res.goats).toHaveLength(3);
  });

  it('resolves PEN event with snapshot goats', () => {
    const event = { custom_fields: { target_mode: 'PEN', target_pen_id: 'area-a', target_goat_ids: ['g1', 'g2'] } };
    const res = resolveEventTarget(event, sampleGoats, mockBarns);
    expect(res.mode).toBe('PEN');
    expect(res.summary).toBe('Pen A (2 Goats)');
    expect(res.goats).toHaveLength(2);
  });

  it('automatically resolves CUSTOM selection of 1 goat to SINGLE mode', () => {
    const event = { custom_fields: { target_mode: 'CUSTOM', target_goat_ids: ['g1'] } };
    const res = resolveEventTarget(event, sampleGoats, mockBarns);
    expect(res.mode).toBe('SINGLE');
    expect(res.summary).toBe('Goat #101 (Bella)');
    expect(res.goats).toHaveLength(1);
  });
});
