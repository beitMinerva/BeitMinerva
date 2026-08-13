import { describe, it, expect } from 'vitest';
import { normalizeSharedTroughMetadata } from '../services/goatService';

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
});
