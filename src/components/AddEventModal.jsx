import React, { useState } from 'react';
import { X, Loader2, Syringe, Pill, Milk, Weight, Heart, FileText, Check, Users, Home, CheckSquare, Square, Search, Plus, Trash2, Sparkles } from 'lucide-react';

export default function AddEventModal({ goat, goats = [], barnAreas = [], onClose, onSave }) {
  const [isClosing, setIsClosing] = useState(false);

  const categories = [
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

    let eventTitle = selectedCategory.label;
    const males = parseInt(maleKidsCount) || 0;
    const females = parseInt(femaleKidsCount) || 0;
    const totalKids = males + females;

    if (selectedCategory.id === 'Milking Yield') {
      const val = parseFloat(milkYieldLiters) || 0;
      eventTitle = `Milking Yield: ${val} L`;
    } else if (selectedCategory.id === 'Weight Check') {
      const val = parseFloat(weightKg) || 0;
      eventTitle = `Weight Logged: ${val} kg`;
    } else if (selectedCategory.id === 'Vaccination' || selectedCategory.id === 'Medication') {
      const medSummary = medicines
        .filter((m) => m.name.trim())
        .map((m) => {
          const doseStr = m.dosage.trim();
          return doseStr ? `${m.name.trim()} (${doseStr} ml)` : m.name.trim();
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
        medicines_list: medicines
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
                          {g.tag_id} • {g.name}
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
                            {g.tag_id} • {g.name}
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

            {/* PREDEFINED CATEGORY STRUCTURED FIELDS */}
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

            {/* MULTI-MEDICINE & MULTI-VACCINE DYNAMIC LIST FORM */}
            {(isVaccination || isMedication) && (
              <div className="form-group" style={{ background: medTheme.bg, padding: '12px', borderRadius: '12px', border: `1px solid ${medTheme.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ color: medTheme.color, margin: 0, fontWeight: '800' }}>
                    {isVaccination ? 'Vaccines Administered *' : 'Medications Administered *'}
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

            {selectedCategory.id === 'General' && (
              <div className="form-group">
                <label className="form-label">Activity Summary *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hoof trimming, Pasture move..."
                  value={generalTitle}
                  onChange={(e) => setGeneralTitle(e.target.value)}
                  required
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
