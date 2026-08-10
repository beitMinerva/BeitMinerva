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
