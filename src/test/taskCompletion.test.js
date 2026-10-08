import { describe, it, expect } from 'vitest';
import { sanitizeTimelineEventUpdates, calculateNextDueDate } from '../services/goatService';

describe('Task Completion & Schema Sanitization Tests', () => {
  it('reproduces schema cache failure pattern when is_scheduled is passed as top-level column', () => {
    // Top-level payload that previously caused PostgreSQL / PostgREST PGRST204:
    // "Could not find the 'is_scheduled' column of 'timeline_events' in the schema cache"
    const faultyUpdate = {
      status: 'completed',
      is_scheduled: false
    };

    expect(faultyUpdate).toHaveProperty('is_scheduled');
    // Top-level column does not exist in timeline_events schema
    const validDbColumns = ['id', 'goat_id', 'type', 'title', 'date', 'notes', 'custom_fields', 'status'];
    expect(validDbColumns.includes('is_scheduled')).toBe(false);
  });

  it('sanitizeTimelineEventUpdates strips top-level is_scheduled and moves it to custom_fields', () => {
    const rawUpdate = {
      status: 'completed',
      is_scheduled: false,
      notes: 'Admin completed vaccine'
    };

    const sanitized = sanitizeTimelineEventUpdates(rawUpdate);

    expect(sanitized.is_scheduled).toBeUndefined();
    expect(sanitized.status).toBe('completed');
    expect(sanitized.notes).toBe('Admin completed vaccine');
    expect(sanitized.custom_fields).toBeDefined();
    expect(sanitized.custom_fields.is_scheduled).toBe(false);
  });

  it('sanitizeTimelineEventUpdates preserves existing custom_fields when migrating is_scheduled', () => {
    const rawUpdate = {
      status: 'pending',
      date: '2026-11-01T09:00:00.000Z',
      is_scheduled: true,
      custom_fields: {
        target_mode: 'ALL',
        target_goat_ids: ['g1', 'g2'],
        repeat_frequency: 'every_3_months'
      }
    };

    const sanitized = sanitizeTimelineEventUpdates(rawUpdate);

    expect(sanitized.is_scheduled).toBeUndefined();
    expect(sanitized.custom_fields.is_scheduled).toBe(true);
    expect(sanitized.custom_fields.target_mode).toBe('ALL');
    expect(sanitized.custom_fields.target_goat_ids).toEqual(['g1', 'g2']);
    expect(sanitized.custom_fields.repeat_frequency).toBe('every_3_months');
  });

  it('filters out any extraneous top-level properties not present in the database schema', () => {
    const rawUpdate = {
      status: 'completed',
      unknown_column_xyz: 123,
      is_scheduled: false
    };

    const sanitized = sanitizeTimelineEventUpdates(rawUpdate);

    expect(sanitized.unknown_column_xyz).toBeUndefined();
    expect(sanitized.is_scheduled).toBeUndefined();
    expect(sanitized.status).toBe('completed');
  });

  it('correctly prepares completion payload for one-time task vs recurring task', () => {
    const taskToComplete = {
      id: 'evt-task-1',
      type: 'Vaccination',
      status: 'pending',
      custom_fields: {
        repeat_frequency: 'none',
        medicines_list: [{ name: 'CD&T', dosage: '2ml' }]
      }
    };

    // One-time task completion
    const oneTimePayload = {
      status: 'completed',
      custom_fields: {
        ...taskToComplete.custom_fields,
        is_scheduled: false,
        status: 'completed'
      }
    };
    const sanitizedOneTime = sanitizeTimelineEventUpdates(oneTimePayload);

    expect(sanitizedOneTime.status).toBe('completed');
    expect(sanitizedOneTime.is_scheduled).toBeUndefined();
    expect(sanitizedOneTime.custom_fields.is_scheduled).toBe(false);
    expect(sanitizedOneTime.custom_fields.status).toBe('completed');
    expect(sanitizedOneTime.custom_fields.medicines_list).toHaveLength(1);

    // Recurring task completion
    const recurringTask = {
      id: 'evt-task-2',
      type: 'Hoof Trimming',
      status: 'pending',
      custom_fields: {
        repeat_frequency: 'every_3_months',
        custom_repeat_days: '90'
      }
    };
    const nextDate = calculateNextDueDate('2026-08-01T09:00:00.000Z', 'every_3_months');
    const recurringPayload = {
      date: nextDate,
      status: 'pending',
      custom_fields: {
        ...recurringTask.custom_fields,
        is_scheduled: true,
        status: 'pending'
      }
    };
    const sanitizedRecurring = sanitizeTimelineEventUpdates(recurringPayload);

    expect(sanitizedRecurring.status).toBe('pending');
    expect(sanitizedRecurring.date).toBe(nextDate);
    expect(sanitizedRecurring.is_scheduled).toBeUndefined();
    expect(sanitizedRecurring.custom_fields.is_scheduled).toBe(true);
  });
});
