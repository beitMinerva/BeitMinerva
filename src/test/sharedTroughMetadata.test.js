import { describe, it, expect } from 'vitest';
import { normalizeSharedTroughMetadata, resolvePenFeedingFormSource, buildSharedTroughEditState } from '../services/goatService';

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

  it('rebuilds shared-trough edit state from the selected historical row', () => {
    const barnAreas = [{ id: 'area-1', name: 'Pen A' }, { id: 'area-2', name: 'Pen B' }];
    const selected = {
      id: 'older',
      alpha_kg: 8,
      alpha_price_per_kg: 2.5,
      mixed_grains_kg: 10,
      mixed_grains_price_per_kg: 1.5,
      straw_kg: 4,
      straw_price_per_kg: 0.5,
      notes: 'Saved note',
      shared_trough_metadata: {
        enabled: true,
        pen_ids: ['area-1', 'area-2'],
        percent: 50
      }
    };

    const latest = {
      id: 'newest',
      alpha_kg: 20,
      alpha_price_per_kg: 2.5,
      mixed_grains_kg: 12,
      mixed_grains_price_per_kg: 1.5,
      straw_kg: 6,
      straw_price_per_kg: 0.5,
      notes: 'Latest stale note',
      shared_trough_metadata: {
        enabled: true,
        pen_ids: ['area-1'],
        percent: 100
      }
    };

    const result = buildSharedTroughEditState({
      selectedEntry: selected,
      latestFeedingEntry: latest,
      barnAreas,
      primaryPenId: 'area-1'
    });

    expect(result).toMatchObject({
      isShared: true,
      selectedPenIds: ['area-1', 'area-2'],
      alphaKg: '16.00',
      mixedGrainsKg: '20.00',
      strawKg: '8.00'
    });
  });
});
