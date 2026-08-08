import React, { useState } from 'react';
import { X, Loader2, Wheat, Scale, Clock, FileText, Sparkles } from 'lucide-react';

export function parsePenFeeding(infoStr) {
  if (!infoStr) {
    return {
      food_type: '',
      daily_weight: '',
      composition: '',
      schedule: '',
      notes: ''
    };
  }

  if (typeof infoStr === 'object' && infoStr !== null) {
    return {
      food_type: infoStr.food_type || '',
      daily_weight: infoStr.daily_weight || '',
      composition: infoStr.composition || '',
      schedule: infoStr.schedule || '',
      notes: infoStr.notes || ''
    };
  }

  try {
    const parsed = JSON.parse(infoStr);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        food_type: parsed.food_type || '',
        daily_weight: parsed.daily_weight || '',
        composition: parsed.composition || '',
        schedule: parsed.schedule || '',
        notes: parsed.notes || ''
      };
    }
  } catch (e) {}

  return {
    food_type: String(infoStr),
    daily_weight: '',
    composition: '',
    schedule: '',
    notes: ''
  };
}

export default function PenFeedingModal({ pen, onClose, onSave }) {
  const initial = parsePenFeeding(pen?.feeding_info || pen?.note);

  const [foodType, setFoodType] = useState(initial.food_type);
  const [dailyWeight, setDailyWeight] = useState(initial.daily_weight);
  const [composition, setComposition] = useState(initial.composition);
  const [schedule, setSchedule] = useState(initial.schedule);
  const [notes, setNotes] = useState(initial.notes);

  const [isClosing, setIsClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const feedingData = {
      food_type: foodType.trim(),
      daily_weight: dailyWeight.trim(),
      composition: composition.trim(),
      schedule: schedule.trim(),
      notes: notes.trim()
    };

    try {
      await onSave(pen.id, JSON.stringify(feedingData));
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose} style={{ zIndex: 110, fontFamily: "'Outfit', sans-serif" }}>
      <div
        className={`modal-content ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: '18px', fontFamily: "'Outfit', sans-serif" }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'grid', placeItems: 'center' }}>
              <Wheat size={18} color="#047857" />
            </div>
            <h2 className="modal-title" style={{ fontSize: '17px', fontFamily: "'Outfit', sans-serif" }}>
              Feeding Ration & Nutrition (Pen {pen?.letter})
            </h2>
          </div>
          <button className="close-btn" onClick={handleClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* FOOD TYPE & NAME */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Wheat size={14} color="var(--primary)" /> Food Name & Feed Type *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Premium Alfalfa Hay & Grain Mix"
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* DAILY QUANTITY / WEIGHT */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Scale size={14} color="var(--primary)" /> Daily Feed Weight / Quantity (kg)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 4.5 kg / head / day"
                value={dailyWeight}
                onChange={(e) => setDailyWeight(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* RATION COMPOSITION */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={14} color="var(--primary)" /> Ration Composition & Ingredients
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. 60% Alfalfa Hay, 25% Oats/Barley, 15% Protein Pellets"
                value={composition}
                onChange={(e) => setComposition(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* FEEDING SCHEDULE */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={14} color="var(--primary)" /> Feeding Schedule & Timing
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Twice Daily: 07:00 AM & 05:00 PM"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* SPECIAL NOTES */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileText size={14} color="var(--primary)" /> Special Nutrition & Vet Notes
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Add free-choice mineral block & fresh water daily. Calcium boost for lactating does."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '14px' }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="spinner" /> Saving Ration...
                </>
              ) : (
                'Save Feeding Ration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
