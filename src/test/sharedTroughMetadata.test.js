import { describe, it, expect } from 'vitest';
import { normalizeSharedTroughMetadata, resolvePenFeedingFormSource } from '../services/goatService';

describe('Shared trough metadata normalization', () => {
  it('reads structured database metadata and keeps plain notes clean', () => {
    const result = normalizeSharedTroughMetadata({
      shared_trough_metadata: {
        enabled: true,
        pen_ids: ['area-1', 'area-2'],
        percent: 50
      },
      notes: '[Shared Trough: area-1,area-2 · 50% share] Extra feed today'
    });

    expect(result).toEqual({
      enabled: true,
      penIds: ['area-1', 'area-2'],
      percent: 50,
      cleanNotes: '[Shared Trough: area-1,area-2 · 50% share] Extra feed today'
    });
  });

  it('returns empty shared-trough state when metadata is missing', () => {
    const result = normalizeSharedTroughMetadata({
      notes: 'Supplement grain'
    });

    expect(result).toEqual({
      enabled: false,
      penIds: [],
      percent: 0,
      cleanNotes: 'Supplement grain'
    });
  });

  it('prefers the clicked historical entry as the edit source instead of the newest feed row', () => {
    const source = resolvePenFeedingFormSource({
      latestFeedingEntry: { id: 'newest', alpha_kg: 12, notes: 'latest', daily_weight: 3 },
      selectedEntry: { id: 'older', alpha_kg: 8, notes: 'selected', daily_weight: 2 },
      fallbackParsed: { alpha_kg: 6, notes: 'fallback', daily_weight: 1 }
    });

    expect(source.id).toBe('older');
    expect(source.alpha_kg).toBe(8);
    expect(source.notes).toBe('selected');
  });
});
