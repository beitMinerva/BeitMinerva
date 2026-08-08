import React, { useState } from 'react';
import { X, Loader2, Syringe, Pill, Milk, Weight, Heart, FileText, Check } from 'lucide-react';

export default function AddEventModal({ goat, onClose, onSave }) {
  const [isClosing, setIsClosing] = useState(false);

  const categories = [
    { id: 'Milking Yield', label: 'Milking Yield', icon: Milk, color: '#0369a1', bg: '#f0f9ff' },
    { id: 'Weight Check', label: 'Weight Measurement', icon: Weight, color: '#7e22ce', bg: '#faf5ff' },
    { id: 'Vaccination', label: 'Vaccination', icon: Syringe, color: '#059669', bg: '#ecfdf5' },
    { id: 'Medication', label: 'Medication', icon: Pill, color: '#c2410c', bg: '#fff7ed' },
    { id: 'Pregnancy Check', label: 'Pregnancy Check', icon: Heart, color: '#be185d', bg: '#fdf2f8' },
    { id: 'General', label: 'General Task / Note', icon: FileText, color: '#475569', bg: '#f8fafc' },
  ];

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [milkYieldLiters, setMilkYieldLiters] = useState('3.5');
  const [weightKg, setWeightKg] = useState(goat?.weight || '45.0');
  const [medicineName, setMedicineName] = useState('');
  const [dosageMl, setDosageMl] = useState('2.0');
  const [pregnancyNotes, setPregnancyNotes] = useState('Healthy pregnancy progression');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    let eventTitle = selectedCategory.label;

    if (selectedCategory.id === 'Milking Yield') {
      const val = parseFloat(milkYieldLiters) || 0;
      eventTitle = `Milking Yield: ${val} L`;
    } else if (selectedCategory.id === 'Weight Check') {
      const val = parseFloat(weightKg) || 0;
      eventTitle = `Weight Logged: ${val} kg`;
    } else if (selectedCategory.id === 'Vaccination' || selectedCategory.id === 'Medication') {
      eventTitle = `${selectedCategory.id}: ${medicineName || 'Dose'} (${dosageMl} ml)`;
    } else if (selectedCategory.id === 'Pregnancy Check') {
      eventTitle = `Pregnancy Check: ${pregnancyNotes}`;
    } else {
      eventTitle = generalTitle.trim() || 'General Note';
    }

    try {
      await onSave({
        goat_id: goat.id,
        type: selectedCategory.id,
        title: eventTitle,
        date: new Date(date).toISOString(),
        notes: notes.trim()
      });
      handleAnimatedClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleAnimatedClose}>
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Log Event: {goat.name} ({goat.tag_id})</h2>
          <button className="close-btn" onClick={handleAnimatedClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* CUSTOM EVENT CATEGORY CARDS SELECTOR */}
            <div className="form-group">
              <label className="form-label">Select Event Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory.id === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => !submitting && setSelectedCategory(cat)}
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

            {(selectedCategory.id === 'Vaccination' || selectedCategory.id === 'Medication') && (
              <div className="form-group" style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="form-label" style={{ color: '#047857' }}>Medicine / Vaccine Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CD&T Booster, Dewormer"
                      value={medicineName}
                      onChange={(e) => setMedicineName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ color: '#047857' }}>Dose (ml)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      placeholder="2.0"
                      value={dosageMl}
                      onChange={(e) => setDosageMl(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedCategory.id === 'Pregnancy Check' && (
              <div className="form-group" style={{ background: '#fdf2f8', padding: '12px', borderRadius: '12px', border: '1px solid #fbcfe8' }}>
                <label className="form-label" style={{ color: '#be185d' }}>Pregnancy Status & Details</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Confirmed pregnant - Expected late Sept"
                  value={pregnancyNotes}
                  onChange={(e) => setPregnancyNotes(e.target.value)}
                  disabled={submitting}
                />
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
                  <Loader2 size={16} className="spinner" /> Saving Timeline Event...
                </>
              ) : (
                'Save Event Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
