import React, { useState } from 'react';
import { X, Loader2, Syringe, Pill, Milk, Weight, Heart, Bell, Scissors, Sparkles, Plus, Trash2, Users, Home, CheckSquare, Square } from 'lucide-react';
import { getBeirutDateTimeString } from '../services/goatService';

export default function EditReminderModal({ reminder, goats = [], barnAreas = [], onClose, onSave }) {
  const [isClosing, setIsClosing] = useState(false);

  const categories = [
    { id: 'Hoof Trimming', label: 'Hoof Trimming', icon: Scissors, color: '#0f766e', bg: '#f0fdfa' },
    { id: 'Vaccination', label: 'Vaccination', icon: Syringe, color: '#059669', bg: '#ecfdf5' },
    { id: 'Medication', label: 'Medication', icon: Pill, color: '#c2410c', bg: '#fff7ed' },
    { id: 'Milking Yield', label: 'Milking Yield', icon: Milk, color: '#0369a1', bg: '#f0f9ff' },
    { id: 'Weight Check', label: 'Weight Check', icon: Weight, color: '#7e22ce', bg: '#faf5ff' },
    { id: 'Pregnancy Check', label: 'Pregnancy & Birth', icon: Heart, color: '#be185d', bg: '#fdf2f8' },
    { id: 'General', label: 'General Task / Note', icon: Bell, color: '#059669', bg: '#ecfdf5' },
  ];

  const resolveCategoryId = () => {
    const rawType = reminder?.type || reminder?.category || reminder?.event_type || '';
    const title = String(reminder?.title || '').toLowerCase();

    const explicitType = String(rawType).trim().toLowerCase();
    if (explicitType === 'vaccination' || explicitType === 'vaccine' || title.includes('vaccination') || title.includes('vaccine')) return 'Vaccination';
    if (explicitType === 'medication' || explicitType === 'medicine' || title.includes('medication') || title.includes('medicine')) return 'Medication';
    if (explicitType === 'pregnancy check' || explicitType === 'pregnancy' || explicitType === 'pregnancy & birth' || title.includes('pregnancy') || title.includes('kidding') || title.includes('birth')) return 'Pregnancy Check';
    if (explicitType === 'milking' || explicitType === 'milking yield' || explicitType === 'milking schedule' || title.includes('milking')) return 'Milking Yield';
    if (explicitType === 'weight check' || explicitType === 'weight measurement' || explicitType === 'weight' || title.includes('weight')) return 'Weight Check';
    if (explicitType === 'hoof trimming' || explicitType === 'hoof' || title.includes('hoof')) return 'Hoof Trimming';
    if (explicitType === 'general' || explicitType === 'general task' || explicitType === 'task' || explicitType === 'note' || title.includes('general')) return 'General';

    return categories.find((c) => c.id === rawType)?.id || categories[0].id;
  };

  const getInitialReminderTitle = (categoryId) => {
    const rawTitle = reminder?.title ? reminder.title.replace(/^Scheduled:\s*/, '') : '';
    if (!rawTitle) return '';

    if (categoryId === 'General' || categoryId === 'Hoof Trimming') {
      return rawTitle
        .replace(/^Hoof Trimming(?:\s*&\s*Cutting)?\s*:\s*/, '')
        .replace(/^General\s*:\s*/, '')
        .replace(/^.*?:\s*/, '');
    }

    return '';
  };

  const initialCatId = resolveCategoryId();
  const initialCat = categories.find((c) => c.id === initialCatId) || categories[0];

  const formatLocalDatetime = (dateStr) => {
    if (!dateStr) return new Date().toISOString().slice(0, 16);
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Parse existing custom_fields
  const parsedFields = (() => {
    try {
      if (typeof reminder?.custom_fields === 'object' && reminder.custom_fields) return reminder.custom_fields;
      if (typeof reminder?.custom_fields === 'string') return JSON.parse(reminder.custom_fields);
    } catch (e) {}
    return {};
  })();

  const isScheduled = reminder?.title?.toLowerCase().startsWith('scheduled');

  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [reminderTitle, setReminderTitle] = useState(getInitialReminderTitle(initialCat.id));
  const [reminderDate, setReminderDate] = useState(formatLocalDatetime(reminder?.date));
  const [reminderNotes, setReminderNotes] = useState(reminder?.notes || '');
  const [urgency, setUrgency] = useState(parsedFields.urgency || 'normal');
  const [submitting, setSubmitting] = useState(false);

  // Vaccination / Medication medicine list
  const initMedicines = parsedFields.medicines_list?.length
    ? parsedFields.medicines_list.map((m, i) => ({ ...m, id: m.id || `med-${i}` }))
    : [{ id: 'med-1', name: '', dosage: '' }];
  const [medicines, setMedicines] = useState(initMedicines);

  // Pregnancy / Birth fields
  const [maleKidsCount, setMaleKidsCount] = useState(String(parsedFields.male_kids ?? '0'));
  const [femaleKidsCount, setFemaleKidsCount] = useState(String(parsedFields.female_kids ?? '0'));
  const [pregnancyNotes, setPregnancyNotes] = useState(() => {
    if (initialCatId === 'Pregnancy Check') {
      const titleText = String(reminder?.title || '');
      return titleText.replace(/^Kidding.*$/, '').replace(/^Pregnancy Check:\s*/, '').trim() || 'Confirmed pregnant';
    }
    return 'Confirmed pregnant';
  });

  // Milking / Weight simple values
  const [milkYield, setMilkYield] = useState(String(parsedFields.milk_liters ?? '3.5'));
  const [weightKg, setWeightKg] = useState(String(parsedFields.weight_kg ?? ''));

  const handleAddMedicine = () => {
    setMedicines((prev) => [...prev, { id: `med-${Date.now()}`, name: '', dosage: '' }]);
  };
  const handleRemoveMedicine = (id) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };
  const handleMedicineChange = (id, field, value) => {
    setMedicines((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
  };

  // Target Mode selection
  const initialTargetMode = parsedFields.target_mode || (reminder?.goat_id && reminder.goat_id !== 'herd' ? 'SINGLE' : 'HERD');
  const [targetMode, setTargetMode] = useState(initialTargetMode);
  const [selectedPenId, setSelectedPenId] = useState(parsedFields.target_pen_id || (barnAreas[0]?.id || ''));
  const [selectedGoatIds, setSelectedGoatIds] = useState(parsedFields.target_goat_ids || (reminder?.goat_id && reminder.goat_id !== 'herd' ? [reminder.goat_id] : goats.map((g) => g.id)));
  const [goatSearchTerm, setGoatSearchTerm] = useState('');

  const toggleGoatSelection = (id) => {
    setSelectedGoatIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setTimeout(() => { onClose(); }, 220);
  };

  const getFinalTargetGoatIds = () => {
    if (targetMode === 'HERD') return goats.map((g) => g.id);
    if (targetMode === 'PEN') return goats.filter((g) => g.area_id === selectedPenId).map((g) => g.id);
    if (targetMode === 'CUSTOM') return selectedGoatIds;
    if (targetMode === 'SINGLE') return selectedGoatIds.slice(0, 1);
    return [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const getTargetGoatsList = () => {
      if (targetMode === 'HERD') return goats;
      if (targetMode === 'PEN') return goats.filter((g) => g.area_id === selectedPenId);
      if (targetMode === 'CUSTOM') return goats.filter((g) => selectedGoatIds.includes(g.id));
      if (targetMode === 'SINGLE') {
        const selectedSingleId = selectedGoatIds[0] || reminder?.goat_id;
        const g = goats.find((x) => x.id === selectedSingleId);
        return g ? [g] : [];
      }
      return goats;
    };

    const targetList = getTargetGoatsList();
    const snapshotIds = targetList.map((g) => g.id);
    const isSingle = targetList.length === 1;
    const primaryGoatId = isSingle ? targetList[0].id : null;
    const resolvedTargetMode = isSingle ? 'SINGLE' : targetMode;

    const males = parseInt(maleKidsCount) || 0;
    const females = parseInt(femaleKidsCount) || 0;
    const totalKids = males + females;
    const titlePrefix = isScheduled ? 'Scheduled: ' : '';

    let eventTitle = reminderTitle.trim();
    let customFields = {
      ...parsedFields,
      target_mode: resolvedTargetMode,
      target_pen_id: resolvedTargetMode === 'PEN' ? selectedPenId : null,
      target_goat_ids: snapshotIds,
      urgency: urgency
    };

    if (selectedCategory.id === 'Vaccination' || selectedCategory.id === 'Medication') {
      const medSummary = medicines
        .filter((m) => m.name.trim())
        .map((m) => m.dosage.trim() ? `${m.name.trim()} (${m.dosage.trim()})` : m.name.trim())
        .join(', ');
      eventTitle = `${selectedCategory.id}: ${medSummary || reminderTitle.trim() || selectedCategory.label}`;
      customFields = { ...customFields, medicines_list: medicines };
    } else if (selectedCategory.id === 'Pregnancy Check') {
      if (totalKids > 0) {
        eventTitle = `Kidding / Birth: ${totalKids} Kids (${males} Male, ${females} Female)`;
      } else {
        eventTitle = `Pregnancy Check: ${pregnancyNotes || 'Healthy pregnancy'}`;
      }
      customFields = { ...customFields, male_kids: males, female_kids: females, total_kids: totalKids };
    } else if (selectedCategory.id === 'Milking Yield') {
      eventTitle = `Milking Yield: ${parseFloat(milkYield) || 0} L`;
      customFields = { ...customFields, milk_liters: parseFloat(milkYield) || 0 };
    } else if (selectedCategory.id === 'Weight Check') {
      eventTitle = `Weight Check: ${parseFloat(weightKg) || 0} kg`;
      customFields = { ...customFields, weight_kg: parseFloat(weightKg) || 0 };
    }

    if (!eventTitle) eventTitle = selectedCategory.label;

    try {
      if (onSave) {
        await onSave(reminder.id, {
          goat_id: primaryGoatId,
          type: selectedCategory.id,
          title: `${titlePrefix}${eventTitle}`,
          date: new Date(reminderDate).toISOString(),
          notes: reminderNotes.trim(),
          custom_fields: customFields
        });
      }
      handleAnimatedClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isVaccination = selectedCategory.id === 'Vaccination';
  const isMedication = selectedCategory.id === 'Medication';
  const medTheme = isVaccination
    ? { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' }
    : { bg: '#fff7ed', border: '#ffedd5', color: '#c2410c' };

  const totalKidsCount = (parseInt(maleKidsCount) || 0) + (parseInt(femaleKidsCount) || 0);

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleAnimatedClose} style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', fontFamily: "'Outfit', sans-serif" }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {isScheduled ? 'Edit Scheduled Task' : 'Edit Timeline Health Event'}
          </h3>
          <button className="close-btn" onClick={handleAnimatedClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* DATE & TIME PICKER */}
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* TARGET SELECTION UI (HERD, PEN, CUSTOM) */}
            <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Select Target Goats *</span>
                <span style={{ fontSize: '11px', color: 'var(--primary-dark)', fontWeight: '800' }}>
                  {targetMode === 'HERD' ? `Entire Herd (${goats.length} Goats)` :
                   targetMode === 'PEN' ? `Selected Pen (${goats.filter(g => g.area_id === selectedPenId).length} Goats)` :
                   targetMode === 'CUSTOM' ? `Custom Selection (${selectedGoatIds.length} Goats)` :
                   `Single Goat (${selectedGoatIds.length} Goat)`}
                </span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setTargetMode('HERD'); setSelectedGoatIds(goats.map(g => g.id)); }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    border: targetMode === 'HERD' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: targetMode === 'HERD' ? 'var(--primary-light)' : '#ffffff',
                    color: targetMode === 'HERD' ? 'var(--primary-dark)' : 'var(--text-main)',
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

              {/* PEN SELECTION PICKER */}
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
                      onClick={() => setSelectedGoatIds(goats.map(g => g.id))}
                      style={{ padding: '6px 8px', fontSize: '11px', flexShrink: 0 }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedGoatIds([])}
                      style={{ padding: '6px 8px', fontSize: '11px', flexShrink: 0 }}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#ffffff', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    {goats.filter(g => {
                      if (!goatSearchTerm.trim()) return true;
                      const q = goatSearchTerm.trim().toLowerCase();
                      return g.name.toLowerCase().includes(q) || g.tag_id.toLowerCase().includes(q);
                    }).map((g) => {
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

            {/* CATEGORY CUSTOM CARDS GRID */}
            <div className="form-group">
              <label className="form-label">Event Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory.id === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => !submitting && setSelectedCategory(cat)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border-color)',
                        background: isSelected ? cat.bg : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        textAlign: 'center'
                      }}
                    >
                      <Icon size={16} color={cat.color} />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isSelected ? cat.color : 'var(--text-main)', lineHeight: 1.1 }}>
                        {cat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VACCINATION / MEDICATION MEDICINE LIST */}
            {(isVaccination || isMedication) && (
              <div className="form-group" style={{ background: medTheme.bg, padding: '12px', borderRadius: '12px', border: `1px solid ${medTheme.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ color: medTheme.color, margin: 0, fontWeight: '800' }}>
                    {isVaccination ? 'Vaccines Administered *' : 'Medications Administered *'}
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={handleAddMedicine}
                    style={{ fontSize: '11px', fontWeight: '800', background: '#ffffff', color: medTheme.color, border: `1px solid ${medTheme.border}`, padding: '3px 8px' }}
                  >
                    <Plus size={12} /> Add Another
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {medicines.map((med, index) => (
                    <div key={med.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <div style={{ flex: 2 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={isVaccination ? 'e.g. CD&T Booster, Rabies' : 'e.g. Dewormer, Penicillin'}
                          value={med.name}
                          onChange={(e) => handleMedicineChange(med.id, 'name', e.target.value)}
                          required={index === 0}
                          disabled={submitting}
                          style={{ padding: '7px 10px', fontSize: '12px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Dose (optional)"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(med.id, 'dosage', e.target.value)}
                          disabled={submitting}
                          style={{ padding: '7px 10px', fontSize: '12px' }}
                        />
                      </div>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(med.id)}
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

            {/* PREGNANCY CHECK & BIRTH / KIDDING */}
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
                      <Sparkles size={16} color="#be185d" /> Kids Born / Delivered
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
                      <input type="number" min="0" className="form-input" placeholder="0" value={maleKidsCount} onChange={(e) => setMaleKidsCount(e.target.value)} disabled={submitting} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px', color: '#be185d' }}>Female Kids</label>
                      <input type="number" min="0" className="form-input" placeholder="0" value={femaleKidsCount} onChange={(e) => setFemaleKidsCount(e.target.value)} disabled={submitting} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MILKING YIELD */}
            {selectedCategory.id === 'Milking Yield' && (
              <div className="form-group" style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                <label className="form-label" style={{ color: '#0369a1' }}>Milk Yield (Liters) *</label>
                <input type="number" step="0.1" min="0" className="form-input" placeholder="e.g. 3.5" value={milkYield} onChange={(e) => setMilkYield(e.target.value)} required disabled={submitting} />
              </div>
            )}

            {/* WEIGHT CHECK */}
            {selectedCategory.id === 'Weight Check' && (
              <div className="form-group" style={{ background: '#faf5ff', padding: '12px', borderRadius: '12px', border: '1px solid #f3e8ff' }}>
                <label className="form-label" style={{ color: '#7e22ce' }}>Measured Weight (kg) *</label>
                <input type="number" step="0.5" min="0" className="form-input" placeholder="e.g. 48.5" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} required disabled={submitting} />
              </div>
            )}

            {/* GENERAL / HOOF TRIMMING TITLE */}
            {(selectedCategory.id === 'General' || selectedCategory.id === 'Hoof Trimming') && (
              <div className="form-group">
                <label className="form-label">Title / Description *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hoof Trimming, Pasture move..."
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            )}

            {/* TASK URGENCY / PRIORITY */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Task Priority & Urgency</span>
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'capitalize', color: urgency === 'urgent' ? '#dc2626' : urgency === 'high' ? '#d97706' : 'var(--text-muted)' }}>
                  {urgency} Priority
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {[
                  { id: 'normal', label: 'Normal', activeStyle: { background: '#f1f5f9', color: '#334155', border: '1.5px solid #cbd5e1' } },
                  { id: 'high', label: 'High', activeStyle: { background: '#fffbeb', color: '#b45309', border: '1.5px solid #fde68a' } },
                  { id: 'urgent', label: 'Urgent', activeStyle: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5' } }
                ].map((lvl) => {
                  const isSelected = urgency === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setUrgency(lvl.id)}
                      disabled={submitting}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        border: isSelected ? lvl.activeStyle.border : '1px solid var(--border-color)',
                        background: isSelected ? lvl.activeStyle.background : '#ffffff',
                        color: isSelected ? lvl.activeStyle.color : 'var(--text-muted)'
                      }}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes & Instructions</label>
              <textarea
                className="form-textarea"
                placeholder="Enter specific instructions or observations..."
                value={reminderNotes}
                onChange={(e) => setReminderNotes(e.target.value)}
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
                <><Loader2 size={16} className="spinner" /> Saving Changes...</>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
