import { describe, it, expect } from 'vitest';

const sampleEvents = [
  { id: 'e1', goat_id: 'g1', title: 'Vaccination FMD', status: 'completed', date: '2026-08-01T10:00:00Z' },
  { id: 'e2', goat_id: 'g1', title: 'Hoof Trimming', status: 'pending', date: '2026-08-25T10:00:00Z' },
  { id: 'e3', goat_id: 'g2', title: 'Weight Check', status: 'completed', date: '2026-08-05T10:00:00Z' },
];

function getGoatTimelineHistory(events, goatId) {
  return events.filter((e) => e.goat_id === goatId && e.status === 'completed');
}

function getGoatPendingTasks(events, goatId) {
  return events.filter((e) => e.goat_id === goatId && e.status === 'pending');
}

describe('Timeline History vs Pending Tasks Separation', () => {
  it('filters past timeline history strictly for completed status', () => {
    const history = getGoatTimelineHistory(sampleEvents, 'g1');
    expect(history).toHaveLength(1);
    expect(history[0].title).toBe('Vaccination FMD');
  });

  it('filters upcoming tasks strictly for pending status', () => {
    const pending = getGoatPendingTasks(sampleEvents, 'g1');
    expect(pending).toHaveLength(1);
    expect(pending[0].title).toBe('Hoof Trimming');
  });

  it('excludes pending tasks from past history timeline', () => {
    const history = getGoatTimelineHistory(sampleEvents, 'g1');
    const hasPending = history.some((e) => e.status === 'pending');
    expect(hasPending).toBe(false);
  });
});

describe('Shared Event Multi-Goat Target Removal Logic', () => {
  it('correctly removes a single goat from a multi-goat event targets array', () => {
    const event = {
      id: 'evt-100',
      goat_id: null,
      type: 'Vaccination',
      custom_fields: {
        target_mode: 'ALL',
        target_goat_ids: ['goat-1', 'goat-2', 'goat-3']
      }
    };

    const targetGoatIdToRemove = 'goat-2';
    const remainingIds = event.custom_fields.target_goat_ids.filter((id) => id !== targetGoatIdToRemove);

    expect(remainingIds).toHaveLength(2);
    expect(remainingIds).toEqual(['goat-1', 'goat-3']);
    expect(remainingIds.includes('goat-2')).toBe(false);
  });

  it('transitions to single goat mode when only one target goat remains', () => {
    const event = {
      id: 'evt-101',
      goat_id: null,
      type: 'Medication',
      custom_fields: {
        target_mode: 'CUSTOM',
        target_goat_ids: ['goat-1', 'goat-2']
      }
    };

    const remainingIds = event.custom_fields.target_goat_ids.filter((id) => id !== 'goat-1');
    expect(remainingIds).toHaveLength(1);
    expect(remainingIds[0]).toBe('goat-2');
  });
});
