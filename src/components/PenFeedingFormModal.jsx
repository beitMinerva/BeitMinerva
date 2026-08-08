import React, { useState } from 'react';
import { X, Loader2, Wheat, Scale, Clock, Sparkles, FileText } from 'lucide-react';
import { parsePenFeeding } from './PenFeedingHistoryModal';

export default function PenFeedingFormModal({ pen, onClose, onSave }) {
  const parsed = parsePenFeeding(pen?.feeding_info || pen?.note);
  const currentRation = parsed.current;
  const historyList = parsed.history;

  const [foodType, setFoodType] = useState(currentRation.food_type);
  const [dailyWeight, setDailyWeight] = useState(currentRation.daily_weight);
  const [composition, setComposition] = useState(currentRation.composition);
  const [schedule, setSchedule] = useState(currentRation.schedule);
  const [notes, setNotes] = useState(currentRation.notes);

  const [isClosing, setIsClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleSaveRation = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const newRation = {
      food_type: foodType.trim(),
      daily_weight: dailyWeight.trim(),
      composition: composition.trim(),
      schedule: schedule.trim(),
      notes: notes.trim(),
      updated_at: new Date().toISOString()
    };

    const newHistoryEntry = {
      id: `feed-log-${Date.now()}`,
      date: new Date().toISOString(),
      food_type: foodType.trim(),
      daily_weight: dailyWeight.trim(),
      composition: composition.trim(),
      notes: notes.trim()
    };

    const updatedPayload = {
      current: newRation,
      history: [newHistoryEntry, ...historyList].slice(0, 30)
    };

    try {
      await onSave(pen.id, JSON.stringify(updatedPayload));
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
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'grid', placeItems: 'center' }}>
              <Wheat size={18} color="#047857" />
            </div>
            <h2 className="modal-title" style={{ fontSize: '17px', fontFamily: "'Outfit', sans-serif", margin: 0 }}>
              Change Feed (Pen {pen?.letter})
            </h2>
          </div>

          <button className="close-btn" onClick={handleClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveRation}>
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
                <FileText size={14} color="var(--primary)" /> Special Notes & Instructions
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Add free-choice mineral block & fresh water daily."
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
              {submitting ? <Loader2 size={16} className="spinner" /> : 'Save Feed Ration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
