import React, { useState } from 'react';
import { X, Loader2, Syringe, Pill, Milk, Weight, Heart, FileText, Scissors, Check, Users, Home, CheckSquare, Square, Search, Plus, Trash2, Sparkles } from 'lucide-react';
import CustomRepeatPicker from './CustomRepeatPicker';
import { calculateNextDueDate } from '../services/goatService';

export default function AddEventModal({ goat, goats = [], barnAreas = [], onClose, onSave, taskToComplete = null, initialMode = 'LOG', initialDate = null }) {
  const [isClosing, setIsClosing] = useState(false);

  const categories = [
    { id: 'Hoof Trimming', label: 'Hoof Trimming', icon: Scissors, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
    { id: 'Vaccination', label: 'Vaccination', icon: Syringe, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { id: 'Medication', label: 'Medication', icon: Pill, color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
    { id: 'Milking Yield', label: 'Milking Yield', icon: Milk, color: '#0369a1', bg: '#f0f9ff', border: '#e0f2fe' },
    { id: 'Weight Check', label: 'Weight Measurement', icon: Weight, color: '#7e22ce', bg: '#faf5ff', border: '#f3e8ff' },
    { id: 'Pregnancy Check', label: 'Pregnancy & Birth', icon: Heart, color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' },
    { id: 'General', label: 'General Task / Note', icon: FileText, color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  ];

  // Match initial category if taskToComplete is provided
  const initialCategory = taskToComplete
    ? categories.find((c) => c.id === taskToComplete.type) || categories[0]
    : categories[0];

  // Resolve initial target goat / pen if taskToComplete is provided
  const getInitialTargetMode = () => {
    if (goat) return 'SINGLE';
    if (taskToComplete) {
      if (taskToComplete.goat_id && taskToComplete.goat_id !== 'herd' && !taskToComplete.goat_id.startsWith('pen-')) {
        return 'SINGLE';
      }
      if (taskToComplete.notes && taskToComplete.notes.includes('Target: Pen')) {
        return 'PEN';
      }
      return 'ALL';
    }
    return 'ALL';
  };

  const getInitialSelectedGoatIds = () => {
    if (goat) return [goat.id];
    if (taskToComplete && taskToComplete.goat_id && taskToComplete.goat_id !== 'herd' && !taskToComplete.goat_id.startsWith('pen-')) {
      return [taskToComplete.goat_id];
    }
    return goats.map((g) => g.id);
  };

  const getInitialPenId = () => {
    if (taskToComplete && taskToComplete.notes && taskToComplete.notes.includes('Target: Pen')) {
      const match = taskToComplete.notes.match(/Target:\s*Pen\s*([A-F0-9-]+)/i);
      if (match) {
        const pen = barnAreas.find((p) => p.letter === match[1] || p.id === match[1]);
        if (pen) return pen.id;
      }
    }
    return barnAreas[0]?.id || '';
  };

  const getInitialMedicines = () => {
    if (taskToComplete) {
      let custom = taskToComplete.custom_fields;
      if (typeof custom === 'string') {
        try { custom = JSON.parse(custom); } catch (e) {}
      }
      if (custom && Array.isArray(custom.medicines_list) && custom.medicines_list.length > 0) {
        return custom.medicines_list;
      }
    }
    return [{ id: 'med-1', name: '', dosage: '' }];
  };

  const getInitialCustomField = (key, fallback) => {
    if (taskToComplete) {
      let custom = taskToComplete.custom_fields;
      if (typeof custom === 'string') {
        try { custom = JSON.parse(custom); } catch (e) {}
      }
      if (custom && custom[key] !== undefined && custom[key] !== null) {
        return String(custom[key]);
      }
    }
    return fallback;
  };

  // Entry Mode: 'LOG' (completed event log) vs 'SCHEDULE' (future task reminder)
  const [entryMode, setEntryMode] = useState(taskToComplete ? 'LOG' : initialMode);

  // Target Mode: 'SINGLE', 'ALL', 'PEN', 'CUSTOM'
  const [targetMode, setTargetMode] = useState(getInitialTargetMode());
  const [selectedPenId, setSelectedPenId] = useState(getInitialPenId());
  const [selectedGoatIds, setSelectedGoatIds] = useState(getInitialSelectedGoatIds());
  const [goatSearchTerm, setGoatSearchTerm] = useState('');

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [milkYieldLiters, setMilkYieldLiters] = useState(getInitialCustomField('milk_liters', '3.5'));
  const [weightKg, setWeightKg] = useState(getInitialCustomField('weight_kg', goat?.weight || '45.0'));

  // Dynamic multi-medicine / vaccine list with empty optional dosage by default
  const [medicines, setMedicines] = useState(getInitialMedicines());

  // Pregnancy & Birth specific states
  const [pregnancyNotes, setPregnancyNotes] = useState(getInitialCustomField('pregnancy_notes', 'Confirmed pregnant'));
  const [maleKidsCount, setMaleKidsCount] = useState(getInitialCustomField('male_kids', '0'));
  const [femaleKidsCount, setFemaleKidsCount] = useState(getInitialCustomField('female_kids', '0'));

  const getInitialDateStr = () => {
    if (initialDate) {
      if (initialDate.includes('T')) return initialDate.slice(0, 16);
      return `${initialDate}T09:00`;
    }
    const now = new Date();
    const beirutNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Beirut' }));
    const yyyy = beirutNow.getFullYear();
    const mm = String(beirutNow.getMonth() + 1).padStart(2, '0');
    const dd = String(beirutNow.getDate()).padStart(2, '0');
    const hh = String(beirutNow.getHours()).padStart(2, '0');
    const min = String(beirutNow.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const [generalTitle, setGeneralTitle] = useState(taskToComplete?.title ? taskToComplete.title.replace(/^Scheduled:\s*/i, '') : '');
  const [date, setDate] = useState(getInitialDateStr());
  const [notes, setNotes] = useState(taskToComplete?.notes ? taskToComplete.notes : '');
  const [submitting, setSubmitting] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState('none');
  const [customRepeatDays, setCustomRepeatDays] = useState('60');

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    // Reset medicine list when switching categories
    setMedicines([{ id: `med-${Date.now()}`, name: '', dosage: '' }]);
    // Default recurrence for hoof trimming
    setRepeatFrequency(cat.id === 'Hoof Trimming' ? 'every_2_months' : 'none');
  };

  const handleAddMedicineRow = () => {
    setMedicines((prev) => [...prev, { id: `med-${Date.now()}`, name: '', dosage: '' }]);
  };

  const handleRemoveMedicineRow = (id) => {
    if (medicines.length === 1) return;
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMedicineChange = (id, field, value) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Determine target goat list based on mode
  const getTargetGoats = () => {
    if (targetMode === 'SINGLE' && goat) {
      return [goat];
    }
    if (targetMode === 'ALL') {
      return goats;
    }
    if (targetMode === 'PEN') {
      return goats.filter((g) => g.area_id === selectedPenId);
    }
    if (targetMode === 'CUSTOM') {
      return goats.filter((g) => selectedGoatIds.includes(g.id));
    }
    return goats;
  };

  const toggleGoatSelection = (goatId) => {
    setSelectedGoatIds((prev) =>
      prev.includes(goatId) ? prev.filter((id) => id !== goatId) : [...prev, goatId]
    );
  };

  const handleSelectAllCustom = () => {
    setSelectedGoatIds(goats.map((g) => g.id));
  };

  const handleDeselectAllCustom = () => {
    setSelectedGoatIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetGoatsList = getTargetGoats();

    if (targetGoatsList.length === 0) {
      alert('Please select at least one goat for this event.');
      return;
    }

    setSubmitting(true);

    let eventTitle = selectedCategory.label;
    const males = parseInt(maleKidsCount) || 0;
    const females = parseInt(femaleKidsCount) || 0;
    const totalKids = males + females;

    const isSchedulingTask = initialMode === 'SCHEDULE';

    if (selectedCategory.id === 'Vaccination' || selectedCategory.id === 'Medication') {
      const medSummary = medicines
        .filter((m) => m.name.trim())
        .map((m) => {
          const doseStr = m.dosage.trim();
          return doseStr ? `${m.name.trim()} (${doseStr})` : m.name.trim();
        })
        .join(', ');
      if (medSummary) {
        eventTitle = `${selectedCategory.id}: ${medSummary}`;
      } else if (generalTitle.trim()) {
        eventTitle = `${selectedCategory.id}: ${generalTitle.trim()}`;
      } else {
        eventTitle = selectedCategory.label;
      }
    } else if (selectedCategory.id === 'Hoof Trimming') {
      eventTitle = generalTitle.trim() ? `Hoof Trimming: ${generalTitle.trim()}` : 'Hoof Trimming & Cutting';
    } else if (selectedCategory.id === 'Milking Yield' || selectedCategory.id === 'Milking') {
      const val = parseFloat(milkYieldLiters) || 0;
      eventTitle = val > 0 ? `Milking Yield: ${val} L` : (generalTitle.trim() || 'Milking Schedule');
    } else if (selectedCategory.id === 'Weight Check') {
      const val = parseFloat(weightKg) || 0;
      eventTitle = val > 0 ? `Weight Logged: ${val} kg` : (generalTitle.trim() || 'Weight Check');
    } else if (selectedCategory.id === 'Pregnancy Check') {
      if (totalKids > 0) {
        eventTitle = `Kidding / Birth: ${totalKids} Kids (${males} Male, ${females} Female)`;
      } else {
        eventTitle = `Pregnancy Check: ${pregnancyNotes || generalTitle.trim() || 'Healthy pregnancy'}`;
      }
    } else {
      eventTitle = generalTitle.trim() || 'General Note';
    }

    // Create 1 single clean event record with exact snapshot of target goat IDs
    const isSingleGoat = targetGoatsList.length === 1;
    const primaryGoatId = isSingleGoat ? targetGoatsList[0].id : null;
    const snapshotGoatIds = targetGoatsList.map((g) => g.id);
    const resolvedTargetMode = isSingleGoat ? 'SINGLE' : targetMode;

    const payloadEvent = {
      goat_id: primaryGoatId,
      type: selectedCategory.id,
      title: eventTitle,
      date: new Date(date).toISOString(),
      status: isSchedulingTask ? 'pending' : 'completed',
      notes: notes.trim(),
      custom_fields: {
        target_mode: resolvedTargetMode,
        target_pen_id: resolvedTargetMode === 'PEN' ? selectedPenId : null,
        target_goat_ids: snapshotGoatIds,
        male_kids: males,
        female_kids: females,
        total_kids: totalKids,
        medicines_list: medicines,
        repeat_frequency: repeatFrequency,
        custom_repeat_days: customRepeatDays
      }
    };

    try {
      await onSave(payloadEvent);

      // If user logged a completed event BUT set a repeat schedule, also create the 1 single future reminder task with extracted title!
      if (!isSchedulingTask && repeatFrequency && repeatFrequency !== 'none') {
        const nextDueDate = calculateNextDueDate(date, repeatFrequency, customRepeatDays);
        if (nextDueDate) {
          const futurePayloadEvent = {
            goat_id: primaryGoatId,
            type: selectedCategory.id,
            title: eventTitle,
            date: nextDueDate,
            status: 'pending',
            notes: notes.trim(),
            custom_fields: {
              is_scheduled: true,
              status: 'pending',
              target_mode: targetMode,
              target_pen_id: targetMode === 'PEN' ? selectedPenId : null,
              target_goat_ids: snapshotGoatIds,
              medicines_list: medicines,
              repeat_frequency: repeatFrequency,
              custom_repeat_days: customRepeatDays
            }
          };
          await onSave(futurePayloadEvent);
        }
      }

      handleAnimatedClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const searchedGoats = goats.filter((g) => {
    if (!goatSearchTerm.trim()) return true;
    const q = goatSearchTerm.trim().toLowerCase();
    return g.name.toLowerCase().includes(q) || g.tag_id.toLowerCase().includes(q) || (g.breed || '').toLowerCase().includes(q);
  });

  const activeTargetCount = getTargetGoats().length;
  const totalKidsCount = (parseInt(maleKidsCount) || 0) + (parseInt(femaleKidsCount) || 0);

  const isVaccination = selectedCategory.id === 'Vaccination';
  const isMedication = selectedCategory.id === 'Medication';

  const medTheme = isVaccination
    ? { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' }
    : { bg: '#fff7ed', border: '#ffedd5', color: '#c2410c' };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleAnimatedClose} style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', fontFamily: "'Outfit', sans-serif" }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Syringe size={18} color="var(--primary)" />
            <h2 className="modal-title" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {initialMode === 'SCHEDULE'
                ? `Schedule Task: ${selectedCategory.label}`
                : taskToComplete
                ? `Log Event: ${selectedCategory.label}`
                : goat
                ? `Log Event: ${goat.name} (${goat.tag_id})`
                : 'Log Health Event / Vaccine'}
            </h2>
          </div>
          <button className="close-btn" onClick={handleAnimatedClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* TARGET SELECTOR (IF NOT PRE-SELECTED SINGLE GOAT) */}
            {!goat && (
              <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Apply Event To *</label>
                  <span style={{ fontSize: '11px', fontWeight: '800', background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '2px 8px', borderRadius: '9999px' }}>
                    {activeTargetCount} {activeTargetCount === 1 ? 'Goat' : 'Goats'} Selected
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setTargetMode('ALL')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '800',
                      border: targetMode === 'ALL' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: targetMode === 'ALL' ? 'var(--primary-light)' : '#ffffff',
                      color: targetMode === 'ALL' ? 'var(--primary-dark)' : 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '4px'
                    }}
                  >
                    <Users size={13} /> Entire Herd
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetMode('PEN')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '800',
                      border: targetMode === 'PEN' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: targetMode === 'PEN' ? 'var(--primary-light)' : '#ffffff',
                      color: targetMode === 'PEN' ? 'var(--primary-dark)' : 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '4px'
                    }}
                  >
                    <Home size={13} /> By Barn Pen
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetMode('CUSTOM')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '800',
                      border: targetMode === 'CUSTOM' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: targetMode === 'CUSTOM' ? 'var(--primary-light)' : '#ffffff',
                      color: targetMode === 'CUSTOM' ? 'var(--primary-dark)' : 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckSquare size={13} /> Select Specific
                  </button>
                </div>

                {/* ENTIRE HERD PREVIEW */}
                {targetMode === 'ALL' && (
                  <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-dark)', display: 'block', marginBottom: '6px' }}>
                      Selected Herd ({goats.length} Goats):
                    </span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxHeight: '90px', overflowY: 'auto' }}>
                      {goats.map((g) => (
                        <span
                          key={g.id}
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            background: '#f1f5f9',
                            color: 'var(--text-main)',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {g.tag_id} / {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* PEN SELECTION PICKER & GOAT LIST */}
                {targetMode === 'PEN' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {barnAreas.map((pen) => {
                        const isSelected = selectedPenId === pen.id;
                        const penGoatCount = goats.filter((g) => g.area_id === pen.id).length;

                        return (
                          <button
                            key={pen.id}
                            type="button"
                            onClick={() => setSelectedPenId(pen.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                              background: isSelected ? 'var(--primary-gradient)' : '#ffffff',
                              color: isSelected ? '#ffffff' : 'var(--text-main)',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            Pen {pen.letter} ({penGoatCount})
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-dark)', display: 'block', marginBottom: '6px' }}>
                        Goats in Selected Pen ({goats.filter((g) => g.area_id === selectedPenId).length}):
                      </span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxHeight: '90px', overflowY: 'auto' }}>
                        {goats.filter((g) => g.area_id === selectedPenId).map((g) => (
                          <span
                            key={g.id}
                            style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              background: '#ecfdf5',
                              color: 'var(--primary-dark)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--primary-border)'
                            }}
                          >
                            {g.tag_id} / {g.name}
                          </span>
                        ))}
                        {goats.filter((g) => g.area_id === selectedPenId).length === 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No goats assigned to this pen.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CUSTOM GOAT CHECKBOX SELECTION LIST */}
                {targetMode === 'CUSTOM' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search tag ID or name..."
                        value={goatSearchTerm}
                        onChange={(e) => setGoatSearchTerm(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleSelectAllCustom}
                        style={{ padding: '6px 8px', fontSize: '11px', flexShrink: 0 }}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleDeselectAllCustom}
                        style={{ padding: '6px 8px', fontSize: '11px', flexShrink: 0 }}
                      >
                        Clear
                      </button>
                    </div>

                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#ffffff', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      {searchedGoats.map((g) => {
                        const isChecked = selectedGoatIds.includes(g.id);

                        return (
                          <div
                            key={g.id}
                            onClick={() => toggleGoatSelection(g.id)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '8px',
                              border: isChecked ? '1px solid var(--primary-border)' : '1px solid var(--border-color)',
                              background: isChecked ? 'var(--primary-light)' : '#f8fafc',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px'
                            }}
                          >
                            <div style={{ color: isChecked ? 'var(--primary)' : 'var(--text-light)' }}>
                              {isChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                            </div>
                            <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <strong style={{ display: 'block', fontSize: '11px' }}>{g.tag_id}</strong>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{g.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EVENT CATEGORY CARDS SELECTOR */}
            <div className="form-group">
              <label className="form-label">Select Event Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory.id === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => !submitting && handleSelectCategory(cat)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border-color)',
                        background: isSelected ? cat.bg : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        textAlign: 'center',
                        transition: 'all 0.18s ease',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '4px', right: '4px', background: cat.color, borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} color="#ffffff" />
                        </div>
                      )}
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isSelected ? '#ffffff' : cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={cat.color} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isSelected ? cat.color : 'var(--text-main)', lineHeight: 1.1 }}>
                        {cat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MULTI-MEDICINE & MULTI-VACCINE DYNAMIC LIST FORM (FOR LOGGING & SCHEDULING) */}
            {(isVaccination || isMedication) && (
              <div className="form-group" style={{ background: medTheme.bg, padding: '12px', borderRadius: '12px', border: `1px solid ${medTheme.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ color: medTheme.color, margin: 0, fontWeight: '800' }}>
                    {isVaccination ? 'Vaccines to Administer (Optional)' : 'Medications to Administer (Optional)'}
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={handleAddMedicineRow}
                    style={{ fontSize: '11px', fontWeight: '800', background: '#ffffff', color: medTheme.color, border: `1px solid ${medTheme.border}`, padding: '3px 8px' }}
                  >
                    <Plus size={12} /> Add Another {isVaccination ? 'Vaccine' : 'Medicine'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {medicines.map((med, index) => (
                    <div key={med.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <div style={{ flex: 2 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={isVaccination ? 'e.g. CD&T Booster, Rabies, FMD' : 'e.g. Dewormer, Penicillin'}
                          value={med.name}
                          onChange={(e) => handleMedicineChange(med.id, 'name', e.target.value)}
                          required={index === 0 && initialMode !== 'SCHEDULE'}
                          disabled={submitting}
                          style={{ padding: '7px 10px', fontSize: '12px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Dose (e.g. 1 ML)"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(med.id, 'dosage', e.target.value)}
                          disabled={submitting}
                          style={{ padding: '7px 10px', fontSize: '12px' }}
                        />
                      </div>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(med.id)}
                          style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#ef4444', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Remove row"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PREDEFINED CATEGORY STRUCTURED FIELDS (ONLY WHEN LOGGING COMPLETED EVENTS) */}
            {initialMode !== 'SCHEDULE' && (
              <>
                {selectedCategory.id === 'Milking Yield' && (
                  <div className="form-group" style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                    <label className="form-label" style={{ color: '#0369a1' }}>Milk Yield (Liters) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 3.5"
                      value={milkYieldLiters}
                      onChange={(e) => setMilkYieldLiters(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}

                {selectedCategory.id === 'Weight Check' && (
                  <div className="form-group" style={{ background: '#faf5ff', padding: '12px', borderRadius: '12px', border: '1px solid #f3e8ff' }}>
                    <label className="form-label" style={{ color: '#7e22ce' }}>Measured Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 48.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}

                {/* PREGNANCY CHECK & BIRTH / KIDDING FORM FIELDS */}
                {selectedCategory.id === 'Pregnancy Check' && (
                  <div className="form-group" style={{ background: '#fdf2f8', padding: '12px', borderRadius: '12px', border: '1px solid #fbcfe8', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ color: '#be185d' }}>Pregnancy Status / Stage Notes</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Confirmed pregnant - Due late September"
                        value={pregnancyNotes}
                        onChange={(e) => setPregnancyNotes(e.target.value)}
                        disabled={submitting}
                      />
                    </div>

                    <div style={{ borderTop: '1px solid #fbcfe8', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ color: '#be185d', margin: 0, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Sparkles size={16} color="#be185d" /> Kids Born / Delivered (If Birthing Event)
                        </label>
                        {totalKidsCount > 0 && (
                          <span style={{ fontSize: '11px', fontWeight: '800', background: '#be185d', color: 'white', padding: '2px 8px', borderRadius: '9999px' }}>
                            {totalKidsCount} {totalKidsCount === 1 ? 'Kid' : 'Kids'} Total
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px', color: '#be185d' }}>Male Kids</label>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            placeholder="0"
                            value={maleKidsCount}
                            onChange={(e) => setMaleKidsCount(e.target.value)}
                            disabled={submitting}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px', color: '#be185d' }}>Female Kids</label>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            placeholder="0"
                            value={femaleKidsCount}
                            onChange={(e) => setFemaleKidsCount(e.target.value)}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* REMINDER TITLE INPUT (WHEN SCHEDULING OR GENERAL CATEGORY) */}
            {(initialMode === 'SCHEDULE' || selectedCategory.id === 'General') && (
              <div className="form-group">
                <label className="form-label">Task Reminder Title / Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`e.g. ${selectedCategory.label}`}
                  value={generalTitle}
                  onChange={(e) => setGeneralTitle(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}

            {/* DATE & TIME PICKER */}
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* REPEAT / RECURRENCE */}
            <div className="form-group">
              <label className="form-label">Repeat Schedule</label>
              <CustomRepeatPicker
                repeatFrequency={repeatFrequency}
                customRepeatDays={customRepeatDays}
                onChangeRepeat={(freq, days) => { setRepeatFrequency(freq); setCustomRepeatDays(days); }}
                disabled={submitting}
              />
            </div>

            {/* NOTES */}
            <div className="form-group">
              <label className="form-label">Additional Notes & Vet Instructions</label>
              <textarea
                className="form-textarea"
                placeholder="Enter specific instructions or observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleAnimatedClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="spinner" /> Saving...
                </>
              ) : (
                'Save Health Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
