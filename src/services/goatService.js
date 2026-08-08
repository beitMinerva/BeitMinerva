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

// ----------------------------------------------------
// Barn Areas Operations (Pure Supabase)
// ----------------------------------------------------
export async function getBarnAreas() {
  try {
    const { data, error } = await supabase.from('barn_areas').select('*').order('id', { ascending: true });
    if (!error && data && data.length > 0) return data;
  } catch (err) {
    console.warn('Supabase barn_areas query notice:', err.message);
  }
  return DEFAULT_BARN_AREAS;
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

  try {
    const { data, error } = await supabase.from('goats').insert([newGoat]).select().single();
    if (!error && data) {
      // Log Initial Weight Record
      if (newGoat.weight) {
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
  } catch (err) {
    console.warn('Supabase add goat notice:', err.message);
  }

  return newGoat;
}

export async function updateGoat(id, updates) {
  try {
    const { data, error } = await supabase.from('goats').update(updates).eq('id', id).select().single();
    if (!error && data) {
      // Auto Log Weight Progression event if weight was updated
      if (updates.weight) {
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
  } catch (err) {
    console.warn('Supabase update goat notice:', err.message);
  }

  return null;
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

  try {
    const { data, error } = await supabase.from('timeline_events').insert([newEvent]).select().single();
    if (!error && data) return data;
  } catch (err) {
    console.warn('Supabase add event notice:', err.message);
  }

  return newEvent;
}

export async function updateTimelineEvent(eventId, updates) {
  try {
    const { data, error } = await supabase.from('timeline_events').update(updates).eq('id', eventId).select().single();
    if (!error && data) return data;
  } catch (err) {
    console.warn('Supabase update timeline event notice:', err.message);
  }
  return null;
}

export async function deleteTimelineEvent(eventId) {
  try {
    const { error } = await supabase.from('timeline_events').delete().eq('id', eventId);
    if (!error) return true;
  } catch (err) {
    console.warn('Supabase delete timeline event notice:', err.message);
  }
  return false;
}
