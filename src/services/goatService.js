import { supabase } from '../config/supabase';
import { INITIAL_GOATS, INITIAL_TIMELINE_EVENTS, DEFAULT_BARN_AREAS } from './sampleData';

// Dynamic helper to calculate age string from birth date (e.g. "2 yrs 4 mos" or "5 mos")
export function calculateGoatAge(birthDateStr) {
  if (!birthDateStr) return 'Age unknown';
  const birth = new Date(birthDateStr);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years === 0) {
    return months === 1 ? '1 mo' : `${months} mos`;
  }
  if (months === 0) {
    return years === 1 ? '1 yr' : `${years} yrs`;
  }
  return `${years} yrs ${months} mos`;
}

export function getSupabaseSqlSchema() {
  return `-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS goats (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL,
  name TEXT,
  breed TEXT,
  gender TEXT,
  neutered_status TEXT,
  birth_date DATE,
  weight NUMERIC,
  status TEXT,
  area_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  goat_id TEXT REFERENCES goats(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT,
  date TIMESTAMPTZ,
  notes TEXT,
  custom_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS barn_areas (
  id TEXT PRIMARY KEY,
  letter TEXT,
  name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (allow authenticated users full access, anon read-only)
ALTER TABLE goats ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE barn_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_goats" ON goats FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_goats" ON goats FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_events" ON timeline_events FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_events" ON timeline_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_barns" ON barn_areas FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all_barns" ON barn_areas FOR ALL TO authenticated USING (true) WITH CHECK (true);`;
}

// ----------------------------------------------------
// Barn Areas CRUD Operations (Supabase + Local State Persistence)
// ----------------------------------------------------
export async function getBarnAreas() {
  try {
    const { data, error } = await supabase.from('barn_areas').select('*').order('letter', { ascending: true });
    if (!error && data && data.length > 0) return data;
  } catch (err) {
    console.warn('Supabase barn_areas query notice:', err.message);
  }

  // Fallback to local storage or DEFAULT_BARN_AREAS (4 preset pens)
  const saved = localStorage.getItem('beit_minerva_barn_areas');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return [...parsed].sort((a, b) => (a.letter || '').localeCompare(b.letter || ''));
    } catch (e) {}
  }
  return DEFAULT_BARN_AREAS;
}

export async function addBarnArea(areaData) {
  const currentAreas = await getBarnAreas();
  const nextLetter = String.fromCharCode(65 + currentAreas.length);

  const newArea = {
    id: `area-${Date.now()}`,
    letter: areaData.letter || nextLetter,
    name: areaData.name || `Pen ${areaData.letter || nextLetter}`
  };

  const { data, error } = await supabase.from('barn_areas').insert([newArea]).select().single();
  if (error) {
    console.error('Supabase addBarnArea error:', error);
    throw new Error(error.message || 'Failed to add pen.');
  }

  const updated = [...currentAreas, data].sort((a, b) => (a.letter || '').localeCompare(b.letter || ''));
  localStorage.setItem('beit_minerva_barn_areas', JSON.stringify(updated));
  return data;
}

export async function updateBarnArea(id, updates) {
  const currentAreas = await getBarnAreas();
  const { data, error } = await supabase.from('barn_areas').update(updates).eq('id', id).select().single();
  
  if (error) {
    console.error('Supabase updateBarnArea error:', error);
    throw new Error(error.message || 'Failed to update pen.');
  }

  const updatedList = currentAreas.map(a => a.id === id ? { ...a, ...updates } : a).sort((a, b) => (a.letter || '').localeCompare(b.letter || ''));
  localStorage.setItem('beit_minerva_barn_areas', JSON.stringify(updatedList));
  return data;
}

export async function deleteBarnArea(id) {
  const currentAreas = await getBarnAreas();
  const { error } = await supabase.from('barn_areas').delete().eq('id', id);

  if (error) {
    console.error('Supabase deleteBarnArea error:', error);
    throw new Error(error.message || 'Failed to delete pen.');
  }

  const updatedList = currentAreas.filter(a => a.id !== id);
  localStorage.setItem('beit_minerva_barn_areas', JSON.stringify(updatedList));
  return true;
}

// ----------------------------------------------------
// Goats CRUD Operations (100% Pure Clean Supabase - Female/Male + Neutered Status)
// ----------------------------------------------------
export async function getGoats() {
  try {
    const { data, error } = await supabase.from('goats').select('*').order('tag_id', { ascending: true });
    if (!error && data) return data;
  } catch (err) {
    console.warn('Supabase goats query notice:', err.message);
  }
  return [];
}

export async function getGoatByTagOrId(identifier) {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();
  const goats = await getGoats();
  return goats.find(
    (g) => g.id.toLowerCase() === cleanId || g.tag_id.toLowerCase() === cleanId
  ) || null;
}

export async function addGoat(goatData) {
  const newGoat = {
    id: `gt-${Date.now()}`,
    tag_id: goatData.tag_id.toUpperCase().trim(),
    name: goatData.name || 'Unnamed Goat',
    breed: goatData.breed || 'Alpine',
    gender: goatData.gender || 'Female',
    neutered_status: goatData.neutered_status || 'Intact',
    birth_date: goatData.birth_date || new Date().toISOString().split('T')[0],
    weight: goatData.weight ? parseFloat(goatData.weight) : 45.0,
    status: goatData.status || 'Healthy',
    area_id: goatData.area_id || 'area-1',
    notes: goatData.notes || '',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('goats').insert([newGoat]).select().single();
  if (error) {
    console.error('Supabase addGoat error:', error);
    throw new Error(error.message || 'Failed to add goat.');
  }

  if (newGoat.weight && data) {
    await addTimelineEvent({
      goat_id: data.id,
      type: 'Weight Check',
      title: `Weight Logged: ${newGoat.weight} kg`,
      date: new Date().toISOString(),
      notes: 'Initial registration weight'
    });
  }
  return data;
}

export async function updateGoat(id, updates) {
  const { data, error } = await supabase.from('goats').update(updates).eq('id', id).select().single();
  if (error) {
    console.error('Supabase updateGoat error:', error);
    throw new Error(error.message || 'Failed to update goat.');
  }

  if (updates.weight && data) {
    await addTimelineEvent({
      goat_id: id,
      type: 'Weight Check',
      title: `Weight Updated: ${updates.weight} kg`,
      date: new Date().toISOString(),
      notes: 'Weight progression record'
    });
  }
  return data;
}

export async function updateGoatArea(goatId, newAreaId, oldAreaName = '', newAreaName = '') {
  const updatedGoat = await updateGoat(goatId, { area_id: newAreaId });
  
  await addTimelineEvent({
    goat_id: goatId,
    type: 'Transfer',
    title: 'Barn Area Transfer',
    date: new Date().toISOString(),
    notes: `Moved from ${oldAreaName || 'previous area'} to ${newAreaName || newAreaId}`
  });

  return updatedGoat;
}

export async function deleteGoat(id) {
  const { error } = await supabase.from('goats').delete().eq('id', id);
  if (error) {
    console.error('Supabase deleteGoat error:', error);
    throw new Error(error.message || 'Failed to delete goat record.');
  }
  return true;
}

// ----------------------------------------------------
// Timeline Events Operations
// ----------------------------------------------------
export async function getTimelineEvents(goatId = null) {
  try {
    let query = supabase.from('timeline_events').select('*').order('date', { ascending: false });
    if (goatId) query = query.eq('goat_id', goatId);
    const { data, error } = await query;
    if (!error && data) return data;
  } catch (err) {
    console.warn('Supabase timeline_events query notice:', err.message);
  }

  return [];
}

export async function addTimelineEvent(eventData) {
  const newEvent = {
    id: `ev-${Date.now()}`,
    goat_id: eventData.goat_id,
    type: eventData.type || 'General Notes',
    title: eventData.title || eventData.type,
    date: eventData.date || new Date().toISOString(),
    notes: eventData.notes || '',
    custom_fields: eventData.custom_fields || []
  };

  const { data, error } = await supabase.from('timeline_events').insert([newEvent]).select().single();
  if (error) {
    console.error('Supabase addTimelineEvent error:', error);
    throw new Error(error.message || 'Failed to save event.');
  }
  return data;
}

export async function addBatchTimelineEvents(eventDataList) {
  const newEvents = eventDataList.map((eventData, index) => ({
    id: `ev-${Date.now()}-${index}`,
    goat_id: eventData.goat_id,
    type: eventData.type || 'General Notes',
    title: eventData.title || eventData.type,
    date: eventData.date || new Date().toISOString(),
    notes: eventData.notes || '',
    custom_fields: eventData.custom_fields || []
  }));

  const { data, error } = await supabase.from('timeline_events').insert(newEvents).select();
  if (error) {
    console.error('Supabase addBatchTimelineEvents error:', error);
    throw new Error(error.message || 'Failed to save batch timeline events.');
  }
  return data;
}

export async function updateTimelineEvent(eventId, updates) {
  const { data, error } = await supabase.from('timeline_events').update(updates).eq('id', eventId).select().single();
  if (error) {
    console.error('Supabase updateTimelineEvent error:', error);
    throw new Error(error.message || 'Failed to update event.');
  }
  return data;
}

export async function deleteTimelineEvent(eventId) {
  const { error } = await supabase.from('timeline_events').delete().eq('id', eventId);
  if (error) {
    console.error('Supabase deleteTimelineEvent error:', error);
    throw new Error(error.message || 'Failed to delete event.');
  }
  return true;
}
