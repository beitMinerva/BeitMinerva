import React, { useState } from 'react';
import { X, Loader2, Syringe, Pill, Milk, Weight, Heart, FileText, Scissors, Check, Users, Home, CheckSquare, Square, Search, Plus, Trash2, Sparkles, RotateCw } from 'lucide-react';
import CustomRepeatPicker from './CustomRepeatPicker';

export default function AddEventModal({ goat, goats = [], barnAreas = [], onClose, onSave }) {
  const [isClosing, setIsClosing] = useState(false);

  const categories = [
    { id: 'Hoof Trimming', label: 'Hoof Trimming / Cutting', icon: Scissors, color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
    { id: 'Vaccination', label: 'Vaccination', icon: Syringe, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { id: 'Medication', label: 'Medication', icon: Pill, color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
    { id: 'Milking Yield', label: 'Milking Yield', icon: Milk, color: '#0369a1', bg: '#f0f9ff', border: '#e0f2fe' },
    { id: 'Weight Check', label: 'Weight Measurement', icon: Weight, color: '#7e22ce', bg: '#faf5ff', border: '#f3e8ff' },
    { id: 'Pregnancy Check', label: 'Pregnancy & Birth', icon: Heart, color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' },
    { id: 'General', label: 'General Task / Note', icon: FileText, color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  ];

  // Target Mode: 'SINGLE', 'ALL', 'PEN', 'CUSTOM'
  const [targetMode, setTargetMode] = useState(goat ? 'SINGLE' : 'ALL');
  const [selectedPenId, setSelectedPenId] = useState(barnAreas[0]?.id || '');
  const [selectedGoatIds, setSelectedGoatIds] = useState(
    goat ? [goat.id] : goats.map((g) => g.id)
  );
  const [goatSearchTerm, setGoatSearchTerm] = useState('');

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [milkYieldLiters, setMilkYieldLiters] = useState('3.5');
  const [weightKg, setWeightKg] = useState(goat?.weight || '45.0');

  // Recurrence / Repeat Frequency
  const [repeatFrequency, setRepeatFrequency] = useState('every_2_months');
  const [customRepeatDays, setCustomRepeatDays] = useState('60');

  // Dynamic multi-medicine / vaccine list with empty optional dosage by default
  const [medicines, setMedicines] = useState([
    { id: 'med-1', name: '', dosage: '' }
  ]);

  // Pregnancy & Birth specific states
  const [pregnancyNotes, setPregnancyNotes] = useState('Confirmed pregnant');
  const [maleKidsCount, setMaleKidsCount] = useState('0');
  const [femaleKidsCount, setFemaleKidsCount] = useState('0');

  const [generalTitle, setGeneralTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    if (cat.id === 'Hoof Trimming') {
      setRepeatFrequency('every_2_months');
    }
    // Reset medicine list when switching categories
    setMedicines([{ id: `med-${Date.now()}`, name: '', dosage: '' }]);
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

    let eventTitle = '';
    const males = parseInt(maleKidsCount) || 0;
    const females = parseInt(femaleKidsCount) || 0;
    const totalKids = males + females;

    if (selectedCategory.id === 'Hoof Trimming') {
      eventTitle = 'Hoof Trimming & Cutting';
    } else if (selectedCategory.id === 'Milking Yield') {
      eventTitle = `Milking Yield: ${milkYieldLiters} L`;
    } else if (selectedCategory.id === 'Weight Check') {
      eventTitle = `Weight Logged: ${weightKg} kg`;
    } else if (selectedCategory.id === 'Vaccination' || selectedCategory.id === 'Medication') {
      const validMeds = medicines.filter((m) => m.name.trim().length > 0);
      const medSummary = validMeds
        .map((m) => {
          const doseStr = m.dosage.trim() ? ` (${m.dosage.trim()})` : '';
          return `${m.name.trim()}${doseStr}`;
        })
        .join(', ');
      eventTitle = `${selectedCategory.id}: ${medSummary || 'Log'}`;
    } else if (selectedCategory.id === 'Pregnancy Check') {
      if (totalKids > 0) {
        eventTitle = `Kidding / Birth: ${totalKids} Kids (${males} Male, ${females} Female)`;
      } else {
        eventTitle = `Pregnancy Check: ${pregnancyNotes || 'Healthy pregnancy'}`;
      }
    } else {
      eventTitle = generalTitle.trim() || 'General Note';
    }

    const payload = targetGoatsList.map((g) => ({
      goat_id: g.id,
      type: selectedCategory.id,
      title: eventTitle,
      date: new Date(date).toISOString(),
      notes: notes.trim(),
      custom_fields: {
        male_kids: males,
        female_kids: females,
        total_kids: totalKids,
        medicines_list: medicines,
        repeat_frequency: repeatFrequency,
        custom_repeat_days: customRepeatDays
      }
    }));

    try {
      if (payload.length === 1) {
        await onSave(payload[0]);
      } else {
        await onSave(payload);
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
              {goat ? `Log Event: ${goat.name} (${goat.tag_id})` : 'Log Health Event / Vaccine'}
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
                    <CheckSquare size={13} /> Custom Select
                  </button>
                </div>

                {targetMode === 'PEN' && (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {barnAreas.map((pen) => {
                      const count = goats.filter((g) => g.area_id === pen.id).length;
                      const isSel = selectedPenId === pen.id;
                      return (
                        <button
                          key={pen.id}
                          type="button"
                          onClick={() => setSelectedPenId(pen.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: isSel ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                            background: isSel ? 'var(--primary)' : '#ffffff',
                            color: isSel ? '#ffffff' : 'var(--text-main)',
                            fontWeight: '800',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                        >
                          Pen {pen.letter} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {targetMode === 'CUSTOM' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <div className="search-input-wrapper" style={{ flex: 1, margin: 0 }}>
                        <Search size={13} className="search-icon" />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Search goats..."
                          value={goatSearchTerm}
                          onChange={(e) => setGoatSearchTerm(e.target.value)}
                          style={{ padding: '6px 10px 6px 28px', fontSize: '11px' }}
                        />
                      </div>

                      <button type="button" className="btn btn-xs btn-outline" onClick={handleSelectAllCustom}>Select All</button>
                      <button type="button" className="btn btn-xs btn-outline" onClick={handleDeselectAllCustom}>Clear</button>
                    </div>

                    <div style={{ maxHeight: '140px', overflowY: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '6px' }}>
                      {searchedGoats.map((g) => {
                        const isSel = selectedGoatIds.includes(g.id);
                        return (
                          <div
                            key={g.id}
                            onClick={() => toggleGoatSelection(g.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: isSel ? 'var(--primary-light)' : 'transparent',
                              cursor: 'pointer',
                              marginBottom: '2px'
                            }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: '800', color: isSel ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                              {g.tag_id} - {g.name}
                            </span>
                            {isSel ? <CheckSquare size={13} color="var(--primary)" /> : <Square size={13} color="var(--text-muted)" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EVENT CATEGORY SELECTOR */}
            <div className="form-group">
              <label className="form-label">Event Category *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory.id === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${cat.color}` : '1.5px solid var(--border-color)',
                        background: isSelected ? cat.bg : '#ffffff',
                        color: isSelected ? cat.color : 'var(--text-main)',
                        fontWeight: isSelected ? '800' : '600',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left'
                      }}
                    >
                      <Icon size={16} color={cat.color} />
                      <span style={{ lineHeight: 1.2 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CATEGORY SPECIFIC FIELDS */}
            {selectedCategory.id === 'Hoof Trimming' && (
              <div style={{ background: '#fef3c7', border: '1.5px solid #fde68a', padding: '12px', borderRadius: '14px', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Scissors size={15} /> Hoof Trimming & Maintenance
                </span>
                <p style={{ fontSize: '11px', color: '#92400e', margin: 0 }}>
                  Trimming hooves prevents infection and foot rot. Recommended schedule: Every 2 months.
                </p>
              </div>
            )}

            {(isVaccination || isMedication) && (
              <div style={{ background: medTheme.bg, border: `1.5px solid ${medTheme.border}`, padding: '12px', borderRadius: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: medTheme.color }}>
                    {isVaccination ? 'Vaccines List' : 'Medicines List'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={handleAddMedicineRow}
                    style={{ background: '#ffffff', fontSize: '11px', fontWeight: '800', color: medTheme.color, borderColor: medTheme.border }}
                  >
                    <Plus size={12} /> Add Another
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {medicines.map((med, idx) => (
                    <div key={med.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={isVaccination ? 'Vaccine Name (e.g. CD&T)' : 'Medicine Name (e.g. Penicillin)'}
                        value={med.name}
                        onChange={(e) => handleMedicineChange(med.id, 'name', e.target.value)}
                        style={{ flex: 2, background: '#ffffff' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Dose (optional)"
                        value={med.dosage}
                        onChange={(e) => handleMedicineChange(med.id, 'dosage', e.target.value)}
                        style={{ flex: 1, background: '#ffffff' }}
                      />
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(med.id)}
                          style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', color: '#ef4444', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedCategory.id === 'Milking Yield' && (
              <div className="form-group">
                <label className="form-label">Milk Yield (Liters) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={milkYieldLiters}
                  onChange={(e) => setMilkYieldLiters(e.target.value)}
                  placeholder="3.5"
                  required
                />
              </div>
            )}

            {selectedCategory.id === 'Weight Check' && (
              <div className="form-group">
                <label className="form-label">Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="45.0"
                  required
                />
              </div>
            )}

            {selectedCategory.id === 'Pregnancy Check' && (
              <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ color: '#be185d' }}>Pregnancy Status / Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pregnancyNotes}
                    onChange={(e) => setPregnancyNotes(e.target.value)}
                    placeholder="e.g. Confirmed pregnant, due in April"
                  />
                </div>

                <div style={{ borderTop: '1px dashed #fbcfe8', margin: '10px 0' }} />
                <label className="form-label" style={{ color: '#be185d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={14} color="#be185d" /> Kids Born (if birthing event)
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Male Kids</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={maleKidsCount}
                      onChange={(e) => setMaleKidsCount(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Female Kids</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={femaleKidsCount}
                      onChange={(e) => setFemaleKidsCount(e.target.value)}
                    />
                  </div>
                </div>

                {totalKidsCount > 0 && (
                  <p style={{ fontSize: '11px', fontWeight: '800', color: '#be185d', marginTop: '8px', margin: 0 }}>
                    ✨ Total {totalKidsCount} mini goats will be logged!
                  </p>
                )}
              </div>
            )}

            {selectedCategory.id === 'General' && (
              <div className="form-group">
                <label className="form-label">Task Title / Summary *</label>
                <input
                  type="text"
                  className="form-input"
                  value={generalTitle}
                  onChange={(e) => setGeneralTitle(e.target.value)}
                  placeholder="e.g. Barn cleaning, Deworming..."
                  required
                />
              </div>
            )}

            {/* DATE & RECURRENCE PICKER */}
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Recurrence / Repeat Schedule</label>
              <CustomRepeatPicker
                repeatFrequency={repeatFrequency}
                customRepeatDays={customRepeatDays}
                onChangeRepeat={(freq, days) => {
                  setRepeatFrequency(freq);
                  setCustomRepeatDays(days);
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea
                className="form-input"
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional event details..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleAnimatedClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="spinner" /> : `Log Event (${activeTargetCount})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
