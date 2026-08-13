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

export function isNurseryPenCheck(pen) {
  if (!pen) return false;
  if (pen.is_nursery === true || pen.isNursery === true) return true;
  if (pen.name && pen.name.includes('[NURSERY]')) return true;
  if (pen.note && pen.note.includes('[NURSERY]')) return true;
  return false;
}

export function normalizeSharedTroughMetadata(entry = {}) {
  const metadata = (() => {
    if (!entry.shared_trough_metadata) return null;
    if (typeof entry.shared_trough_metadata === 'string') {
      try { return JSON.parse(entry.shared_trough_metadata); } catch (e) { return null; }
    }
    return entry.shared_trough_metadata;
  })();

  const explicit = metadata || {};
  const penIds = Array.isArray(explicit.pen_ids) ? explicit.pen_ids : [];
  const percent = Number(explicit.percent ?? 0);

  return {
    enabled: Boolean(explicit.enabled),
    penIds,
    percent: Number.isFinite(percent) ? percent : 0,
    cleanNotes: typeof entry.notes === 'string' ? entry.notes.trim() : ''
  };
}

export function resolvePenFeedingFormSource({ latestFeedingEntry = null, selectedEntry = null, fallbackParsed = null } = {}) {
  if (selectedEntry && typeof selectedEntry === 'object') return selectedEntry;
  if (latestFeedingEntry && typeof latestFeedingEntry === 'object') return latestFeedingEntry;
  if (fallbackParsed && typeof fallbackParsed === 'object') {
    const current = fallbackParsed.current || fallbackParsed;
    return current || {};
  }
  return {};
}

export function buildSharedTroughEditState({ selectedEntry = null, latestFeedingEntry = null, barnAreas = [], primaryPenId = null } = {}) {
  const sourceEntry = resolvePenFeedingFormSource({ latestFeedingEntry, selectedEntry });
  const normalized = normalizeSharedTroughMetadata(sourceEntry);
  const sharedPenIds = (normalized.penIds || []).filter((id) => barnAreas.some((pen) => pen.id === id));
  const fallbackPrimary = primaryPenId ? [primaryPenId] : [];
  const finalSelectedPenIds = sharedPenIds.length > 0 ? sharedPenIds : fallbackPrimary;
  const thisShare = Number(normalized.percent || 0);

  if (!sourceEntry || !normalized.enabled || finalSelectedPenIds.length === 0 || thisShare <= 0) {
    return null;
  }

  const allocatedAlpha = Number(sourceEntry.alpha_kg || 0);
  const allocatedMixed = Number(sourceEntry.mixed_grains_kg || 0);
  const allocatedStraw = Number(sourceEntry.straw_kg || 0);
  const allocatedTotal = allocatedAlpha + allocatedMixed + allocatedStraw;
  const ratio = thisShare / 100;

  if (!Number.isFinite(ratio) || ratio <= 0 || allocatedTotal <= 0) {
    return {
      isShared: true,
      alphaKg: sourceEntry.alpha_kg > 0 ? String(Number(sourceEntry.alpha_kg).toFixed(2)) : '',
      alphaPricePerKg: sourceEntry.alpha_price_per_kg > 0 ? String(sourceEntry.alpha_price_per_kg) : '',
      mixedGrainsKg: sourceEntry.mixed_grains_kg > 0 ? String(Number(sourceEntry.mixed_grains_kg).toFixed(2)) : '',
      mixedGrainsPricePerKg: sourceEntry.mixed_grains_price_per_kg > 0 ? String(sourceEntry.mixed_grains_price_per_kg) : '',
      strawKg: sourceEntry.straw_kg > 0 ? String(Number(sourceEntry.straw_kg).toFixed(2)) : '',
      strawPricePerKg: sourceEntry.straw_price_per_kg > 0 ? String(sourceEntry.straw_price_per_kg) : '',
      selectedPenIds: finalSelectedPenIds
    };
  }

  return {
    isShared: true,
    alphaKg: allocatedAlpha > 0 ? String((allocatedAlpha / ratio).toFixed(2)) : '',
    alphaPricePerKg: sourceEntry.alpha_price_per_kg > 0 ? String(sourceEntry.alpha_price_per_kg) : '',
    mixedGrainsKg: allocatedMixed > 0 ? String((allocatedMixed / ratio).toFixed(2)) : '',
    mixedGrainsPricePerKg: sourceEntry.mixed_grains_price_per_kg > 0 ? String(sourceEntry.mixed_grains_price_per_kg) : '',
    strawKg: allocatedStraw > 0 ? String((allocatedStraw / ratio).toFixed(2)) : '',
    strawPricePerKg: sourceEntry.straw_price_per_kg > 0 ? String(sourceEntry.straw_price_per_kg) : '',
    selectedPenIds: finalSelectedPenIds
  };
}

export async function addBarnArea(areaData) {
  const currentAreas = await getBarnAreas();
  const nextLetter = String.fromCharCode(65 + currentAreas.length);
  const isNur = Boolean(areaData.is_nursery);

  let cleanName = (areaData.name || `Pen ${areaData.letter || nextLetter}`).replace(/\s*\[NURSERY\]/gi, '').trim();
  if (isNur) {
    cleanName = `${cleanName} [NURSERY]`.trim();
  }

  const newArea = {
    id: areaData.id || makeId('ba'),
    letter: areaData.letter || nextLetter,
    name: cleanName,
    order_index: areaData.order_index !== undefined ? areaData.order_index : currentAreas.length,
    is_nursery: isNur
  };

  const { data, error } = await supabase.from('barn_areas').insert([newArea]).select().single();
  if (error) {
    // Fail-safe: if is_nursery column doesn't exist in Supabase schema yet, retry without it
    if (error.message && error.message.includes('is_nursery')) {
      delete newArea.is_nursery;
      const retryRes = await supabase.from('barn_areas').insert([newArea]).select().single();
      if (retryRes.error) throw new Error(retryRes.error.message || 'Failed to add pen.');
      return retryRes.data;
    }
    console.error('Supabase addBarnArea error:', error);
    throw new Error(error.message || 'Failed to add pen.');
  }
  return data;
}

export async function updateBarnArea(id, updates) {
  const payload = { ...updates };
  if (payload.is_nursery !== undefined && payload.name) {
    let cleanName = payload.name.replace(/\s*\[NURSERY\]/gi, '').trim();
    if (payload.is_nursery) {
      cleanName = `${cleanName} [NURSERY]`.trim();
    }
    payload.name = cleanName;
  }

  const { data, error } = await supabase.from('barn_areas').update(payload).eq('id', id).select().single();
  if (error) {
    // Fail-safe: if is_nursery column doesn't exist in Supabase schema yet, retry without it
    if (error.message && error.message.includes('is_nursery')) {
      delete payload.is_nursery;
      const retryRes = await supabase.from('barn_areas').update(payload).eq('id', id).select().single();
      if (retryRes.error) throw new Error(retryRes.error.message || 'Failed to update pen area.');
      return retryRes.data;
    }
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
    shift: entryData.shift || null,
    destination: entryData.destination || 'for_sale',
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
  const goatCount = Number(entryData.goat_count) || 0;

  // alpha_kg, mixed_grains_kg, straw_kg = TOTAL kg for the WHOLE PEN (not per head)
  const alphaKg = Number(entryData.alpha_kg) || 0;
  const alphaPricePerKg = Number(entryData.alpha_price_per_kg) || 0;
  const mixedGrainsKg = Number(entryData.mixed_grains_kg) || 0;
  const mixedGrainsPricePerKg = Number(entryData.mixed_grains_price_per_kg) || 0;
  const strawKg = Number(entryData.straw_kg) || 0;
  const strawPricePerKg = Number(entryData.straw_price_per_kg) || 0;

  // total_weight = sum of all pen totals; daily_weight = per-head (total / goat_count)
  const totalWeight = parseFloat((alphaKg + mixedGrainsKg + strawKg).toFixed(3));
  const dailyWeight = goatCount > 0 ? parseFloat((totalWeight / goatCount).toFixed(4)) : null;

  // Auto-generate food_type from active components
  const isNur = Boolean(entryData.is_nursery || (entryData.pen && isNurseryPenCheck(entryData.pen)));
  const comp1Label = isNur ? 'Milk' : 'Alpha';

  const activeComponents = [];
  if (alphaKg > 0) activeComponents.push(comp1Label);
  if (mixedGrainsKg > 0) activeComponents.push('Mixed Grains');
  if (strawKg > 0) activeComponents.push('Straw');
  const foodType = activeComponents.length > 0 ? activeComponents.join(' + ') : (entryData.food_type || '');

  const normalized = normalizeSharedTroughMetadata(entryData);
  const cleanNotes = typeof entryData.notes === 'string' ? entryData.notes.trim() : '';
  const metadata = entryData.shared_trough_metadata || (normalized.enabled ? {
    enabled: normalized.enabled,
    pen_ids: normalized.penIds,
    percent: normalized.percent
  } : null);

  const newEntry = {
    id: `pfe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    barn_area_id: entryData.barn_area_id,
    date: entryData.date || new Date().toISOString(),
    food_type: foodType,
    daily_weight: dailyWeight,   // kg per goat head (derived)
    goat_count: goatCount,
    total_weight: totalWeight,   // total kg for the whole pen
    composition: entryData.composition || '',
    schedule: entryData.schedule || '',
    notes: cleanNotes,
    shared_trough_metadata: metadata,
    alpha_kg: alphaKg,
    alpha_price_per_kg: alphaPricePerKg,
    mixed_grains_kg: mixedGrainsKg,
    mixed_grains_price_per_kg: mixedGrainsPricePerKg,
    straw_kg: strawKg,
    straw_price_per_kg: strawPricePerKg,
  };

  const { data, error } = await supabase.from('pen_feeding_entries').insert([newEntry]).select().single();
  if (error) {
    console.error('Supabase addPenFeedingEntry error:', error);
    throw new Error(error.message || 'Failed to save pen feeding entry.');
  }
  return data;
}

export async function updatePenFeedingEntry(id, updates) {
  const normalized = normalizeSharedTroughMetadata(updates);
  const payload = {
    ...updates,
    notes: normalized.cleanNotes || updates.notes || '',
    shared_trough_metadata: updates.shared_trough_metadata ?? (
      normalized.enabled ? {
        enabled: normalized.enabled,
        pen_ids: normalized.penIds,
        percent: normalized.percent
      } : null
    ),
  };

  const { data, error } = await supabase
    .from('pen_feeding_entries')
    .update(payload)
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
    if (goatId) {
      query = query.or(`goat_id.eq.${goatId},goat_id.is.null,goat_id.eq.herd`);
    }
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
    status: eventData.status || (eventData.title?.toLowerCase().startsWith('scheduled') ? 'pending' : 'completed'),
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
    status: eventData.status || (eventData.title?.toLowerCase().startsWith('scheduled') ? 'pending' : 'completed'),
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

export function calculateNextDueDate(baseDateStr, frequency, customDays = 21) {
  const date = new Date(baseDateStr || Date.now());
  if (isNaN(date.getTime())) return null;

  switch (frequency) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1);
      break;
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'monthly':
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case 'every_2_months':
      date.setUTCMonth(date.getUTCMonth() + 2);
      break;
    case 'every_3_months':
      date.setUTCMonth(date.getUTCMonth() + 3);
      break;
    case 'every_6_months':
      date.setUTCMonth(date.getUTCMonth() + 6);
      break;
    case 'yearly':
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
    case 'custom':
      date.setUTCDate(date.getUTCDate() + (parseInt(customDays) || 21));
      break;
    default:
      return null;
  }
  return date.toISOString();
}

export function getBeirutDateTimeString(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const beirutDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Beirut' }));
  const yyyy = beirutDate.getFullYear();
  const mm = String(beirutDate.getMonth() + 1).padStart(2, '0');
  const dd = String(beirutDate.getDate()).padStart(2, '0');
  const hh = String(beirutDate.getHours()).padStart(2, '0');
  const min = String(beirutDate.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function getBeirutDateString(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const beirutDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Beirut' }));
  const yyyy = beirutDate.getFullYear();
  const mm = String(beirutDate.getMonth() + 1).padStart(2, '0');
  const dd = String(beirutDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatBeirutDisplay(dateInput, options = {}) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Beirut',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  });
}
