import { supabase } from '../config/supabase';

export function calculateGoatAge(birthDate) {
  if (!birthDate) return 'Age unknown';
  const birth = new Date(birthDate);
  const now = new Date();
  if (isNaN(birth.getTime())) return 'Age unknown';

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years === 0 && months === 0) return 'Less than 1 mo';
  if (years === 0) return `${months} ${months === 1 ? 'month' : 'months'}`;
  if (months === 0) return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
  return `${years} yrs ${months} mos`;
}

// ----------------------------------------------------
// Barn Areas CRUD Operations (Direct Pure Supabase with order_index)
// ----------------------------------------------------
export async function getBarnAreas() {
  try {
    const { data, error } = await supabase.from('barn_areas').select('*');
    if (!error && data && data.length > 0) {
      const sorted = [...data].sort((a, b) => {
        if (a.order_index !== undefined && a.order_index !== null && b.order_index !== undefined && b.order_index !== null) {
          return a.order_index - b.order_index;
        }
        return (a.letter || '').localeCompare(b.letter || '');
      });
      return sorted;
    }
  } catch (err) {
    console.warn('Supabase barn_areas query notice:', err.message);
  }

  return [];
}

export async function addBarnArea(areaData) {
  const currentAreas = await getBarnAreas();
  const nextLetter = String.fromCharCode(65 + currentAreas.length);

  const newArea = {
    id: areaData.id || makeId('ba'),
    letter: areaData.letter || nextLetter,
    name: areaData.name || `Pen ${areaData.letter || nextLetter}`,
    order_index: areaData.order_index !== undefined ? areaData.order_index : currentAreas.length
  };

  const { data, error } = await supabase.from('barn_areas').insert([newArea]).select().single();
  if (error) {
    console.error('Supabase addBarnArea error:', error);
    throw new Error(error.message || 'Failed to add pen.');
  }
  return data;
}

export async function updateBarnArea(id, updates) {
  const { data, error } = await supabase.from('barn_areas').update(updates).eq('id', id).select().single();
  if (error) {
    console.error('Supabase updateBarnArea error:', error);
    throw new Error(error.message || 'Failed to update pen area.');
  }
  return data;
}

export async function getPenMilkEntries() {
  try {
    const { data, error } = await supabase.from('pen_milk_entries').select('*').order('date', { ascending: false });
    if (!error && data) return data;
  } catch (err) {
    console.warn('Supabase pen_milk_entries query notice:', err.message);
  }
  return [];
}

export async function addPenMilkEntry(entryData) {
  const newEntry = {
    id: `pme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    barn_area_id: entryData.barn_area_id,
    date: entryData.date || new Date().toISOString(),
    amount_liters: Number(entryData.amount_liters) || 0,
    notes: entryData.notes || ''
  };

  const { data, error } = await supabase.from('pen_milk_entries').insert([newEntry]).select().single();
  if (error) {
    console.error('Supabase addPenMilkEntry error:', error);
    throw new Error(error.message || 'Failed to save pen milk entry.');
  }
  return data;
}

export async function updatePenMilkEntry(id, updates) {
  const { data, error } = await supabase
    .from('pen_milk_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase updatePenMilkEntry error:', error);
    throw new Error(error.message || 'Failed to update pen milk entry.');
  }
  return data;
}

export async function deletePenMilkEntry(id) {
  const { error } = await supabase.from('pen_milk_entries').delete().eq('id', id);
  if (error) {
    console.error('Supabase deletePenMilkEntry error:', error);
    throw new Error(error.message || 'Failed to delete pen milk entry.');
  }
  return true;
}

// ----------------------------------------------------
// Pen Feeding Entries CRUD Operations
// ----------------------------------------------------
export async function getPenFeedingEntries() {
  try {
    const { data, error } = await supabase.from('pen_feeding_entries').select('*').order('date', { ascending: false });
    if (!error && data) return data;
  } catch (err) {
    console.warn('Supabase pen_feeding_entries query notice:', err.message);
  }
  return [];
}

export async function addPenFeedingEntry(entryData) {
  const newEntry = {
    id: `pfe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    barn_area_id: entryData.barn_area_id,
    date: entryData.date || new Date().toISOString(),
    food_type: entryData.food_type || '',
    daily_weight: Number(entryData.daily_weight) || 0,
    composition: entryData.composition || '',
    schedule: entryData.schedule || '',
    notes: entryData.notes || ''
  };

  const { data, error } = await supabase.from('pen_feeding_entries').insert([newEntry]).select().single();
  if (error) {
    console.error('Supabase addPenFeedingEntry error:', error);
    throw new Error(error.message || 'Failed to save pen feeding entry.');
  }
  return data;
}

export async function updatePenFeedingEntry(id, updates) {
  const { data, error } = await supabase
    .from('pen_feeding_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase updatePenFeedingEntry error:', error);
    throw new Error(error.message || 'Failed to update pen feeding entry.');
  }
  return data;
}

export async function deletePenFeedingEntry(id) {
  const { error } = await supabase.from('pen_feeding_entries').delete().eq('id', id);
  if (error) {
    console.error('Supabase deletePenFeedingEntry error:', error);
    throw new Error(error.message || 'Failed to delete pen feeding entry.');
  }
  return true;
}

export async function deleteBarnArea(id) {
  const { error } = await supabase.from('barn_areas').delete().eq('id', id);
  if (error) {
    console.error('Supabase deleteBarnArea error:', error);
    throw new Error(error.message || 'Failed to delete pen.');
  }
  return true;
}

// ----------------------------------------------------
// Goats CRUD Operations (Direct Pure Supabase Only)
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

const makeId = (prefix = 'gt') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
};

export async function addGoat(goatData) {
  const newGoat = {
    id: makeId(),
    tag_id: goatData.tag_id.toUpperCase().trim(),
    name: goatData.name || 'Unnamed Goat',
    breed: goatData.breed || 'Alpine',
    gender: goatData.gender || 'Female',
    neutered_status: goatData.neutered_status || 'Intact',
    birth_date: goatData.birth_date || new Date().toISOString().split('T')[0],
    weight: goatData.weight ? parseFloat(goatData.weight) : 45.0,
    status: goatData.status || 'Healthy',
    area_id: goatData.area_id || null,
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
// Timeline Events Operations (Direct Pure Supabase Only)
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
    id: eventData.id || makeId('evt'),
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
  const newEvents = eventDataList.map((eventData) => ({
    id: eventData.id || makeId('evt'),
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
