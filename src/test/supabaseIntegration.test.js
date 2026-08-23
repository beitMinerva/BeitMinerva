import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const testUrl = 'https://bwmrkzmlstjhzhptvtqy.supabase.co';
const testKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bXJrem1sc3RqaHpocHR2dHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODYwNjEsImV4cCI6MjEwMTg2MjA2MX0.QH_cjxMwmnLyylCEH6_cOGTW3YEB6KfEbpQ-8PvkRQQ';

const testSupabase = createClient(testUrl, testKey);

describe('Live Test Supabase Project E2E Database Integration', () => {
  const testGoatId = `test-goat-${Date.now()}`;
  const testEventId = `test-event-${Date.now()}`;
  let isOnline = false;

  beforeAll(async () => {
    try {
      const { data, error } = await testSupabase.from('goats').select('id').limit(1);
      isOnline = !error && Array.isArray(data);
    } catch {
      isOnline = false;
    }
  });

  afterAll(async () => {
    if (!isOnline) return;
    try {
      await testSupabase.from('timeline_events').delete().eq('id', testEventId);
      await testSupabase.from('goats').delete().eq('id', testGoatId);
    } catch {}
  });

  it('inserts a test goat into Test Supabase successfully', async (ctx) => {
    if (!isOnline) {
      ctx.skip();
      return;
    }

    const { data, error } = await testSupabase.from('goats').insert([{
      id: testGoatId,
      tag_id: '#TEST-99',
      name: 'Integration Test Goat',
      breed: 'Shami',
      gender: 'Female',
      birth_date: '2025-01-01',
      area_id: 'area-a',
      status: 'Active'
    }]).select().single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.tag_id).toBe('#TEST-99');
  });

  it('inserts a timeline event with custom_fields target_mode snapshot into Test Supabase', async (ctx) => {
    if (!isOnline) {
      ctx.skip();
      return;
    }

    const { data, error } = await testSupabase.from('timeline_events').insert([{
      id: testEventId,
      goat_id: testGoatId,
      type: 'Vaccination',
      title: 'Vaccination: FMD (1 ML)',
      date: new Date().toISOString(),
      status: 'completed',
      notes: 'Test suite automated run',
      custom_fields: {
        target_mode: 'SINGLE',
        target_goat_ids: [testGoatId],
        medicines_list: [{ name: 'FMD', dosage: '1 ML' }]
      }
    }]).select().single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.title).toBe('Vaccination: FMD (1 ML)');
  });

  it('queries timeline event for test goat and parses custom_fields correctly', async (ctx) => {
    if (!isOnline) {
      ctx.skip();
      return;
    }

    const { data, error } = await testSupabase
      .from('timeline_events')
      .select('*')
      .eq('goat_id', testGoatId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].custom_fields.target_mode).toBe('SINGLE');
    expect(data[0].custom_fields.medicines_list[0].name).toBe('FMD');
  });
});

