import React, { useState } from 'react';
import { X, Loader2, Wheat, Scale, Clock, FileText, Users, Sparkles } from 'lucide-react';
import { parsePenFeeding } from './PenFeedingHistoryModal';
import { getBeirutDateTimeString } from '../services/goatService';

export default function PenFeedingFormModal({ pen, onClose, onSave, goats = [] }) {
  const parsed = parsePenFeeding(pen?.feeding_info || pen?.note);
  const currentRation = parsed.current;

  // Goat count for this pen
  const penGoatCount = goats.filter(g => g.area_id === pen?.id).length;

  // 3 feed components: TOTAL kg for the whole pen
  const [alphaKg, setAlphaKg] = useState(currentRation.alpha_kg > 0 ? String(currentRation.alpha_kg) : '');
  const [alphaPricePerKg, setAlphaPricePerKg] = useState(currentRation.alpha_price_per_kg > 0 ? String(currentRation.alpha_price_per_kg) : '');
  const [mixedGrainsKg, setMixedGrainsKg] = useState(currentRation.mixed_grains_kg > 0 ? String(currentRation.mixed_grains_kg) : '');
  const [mixedGrainsPricePerKg, setMixedGrainsPricePerKg] = useState(currentRation.mixed_grains_price_per_kg > 0 ? String(currentRation.mixed_grains_price_per_kg) : '');
  const [strawKg, setStrawKg] = useState(currentRation.straw_kg > 0 ? String(currentRation.straw_kg) : '');
  const [strawPricePerKg, setStrawPricePerKg] = useState(currentRation.straw_price_per_kg > 0 ? String(currentRation.straw_price_per_kg) : '');

  const [schedule, setSchedule] = useState(currentRation.schedule || '');
  const [notes, setNotes] = useState(currentRation.notes || '');
  const [feedingDate, setFeedingDate] = useState(() => getBeirutDateTimeString());

  const [isClosing, setIsClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { onClose(); }, 220);
  };

  // Pen totals
  const totalAlpha = Number(alphaKg) || 0;
  const totalMixed = Number(mixedGrainsKg) || 0;
  const totalStraw = Number(strawKg) || 0;
  const totalKgPen = totalAlpha + totalMixed + totalStraw;
  const totalCostPen = totalAlpha * (Number(alphaPricePerKg) || 0)
    + totalMixed * (Number(mixedGrainsPricePerKg) || 0)
    + totalStraw * (Number(strawPricePerKg) || 0);

  const perHeadKg = penGoatCount > 0 ? totalKgPen / penGoatCount : null;
  const perHeadCost = penGoatCount > 0 ? totalCostPen / penGoatCount : null;

  const handleSaveRation = async (e) => {
    e.preventDefault();
    if (totalKgPen <= 0) {
      alert('Please enter at least one feed component quantity.');
      return;
    }
    setSubmitting(true);

    const feedingData = {
      alpha_kg: totalAlpha,
      alpha_price_per_kg: Number(alphaPricePerKg) || 0,
      mixed_grains_kg: totalMixed,
      mixed_grains_price_per_kg: Number(mixedGrainsPricePerKg) || 0,
      straw_kg: totalStraw,
      straw_price_per_kg: Number(strawPricePerKg) || 0,
      schedule: schedule.trim(),
      notes: notes.trim(),
      date: new Date(feedingDate).toISOString()
    };

    try {
      if (onSave) {
        await onSave(pen.id, feedingData);
      }
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const FEED_COMPONENTS = [
    {
      key: 'alpha',
      label: 'Alpha',
      subtitle: 'Alfalfa Hay',
      kg: alphaKg,
      setKg: setAlphaKg,
      price: alphaPricePerKg,
      setPrice: setAlphaPricePerKg,
      totalKg: totalAlpha,
    },
    {
      key: 'mixedGrains',
      label: 'Mixed Grains',
      subtitle: 'Grain & Pellets',
      kg: mixedGrainsKg,
      setKg: setMixedGrainsKg,
      price: mixedGrainsPricePerKg,
      setPrice: setMixedGrainsPricePerKg,
      totalKg: totalMixed,
    },
    {
      key: 'straw',
      label: 'Straw',
      subtitle: 'Roughage Straw',
      kg: strawKg,
      setKg: setStrawKg,
      price: strawPricePerKg,
      setPrice: setStrawPricePerKg,
      totalKg: totalStraw,
    }
  ];

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose} style={{ zIndex: 110, fontFamily: "'Outfit', sans-serif" }}>
      <div
        className={`modal-content ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '100%', padding: '18px', borderRadius: '16px', fontFamily: "'Outfit', sans-serif" }}
      >
        {/* HEADER */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'grid', placeItems: 'center' }}>
              <Wheat size={18} color="#047857" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '17px', fontFamily: "'Outfit', sans-serif", margin: 0, fontWeight: '800' }}>
                Log Pen Feeding — Pen {pen?.letter}
              </h2>
              {penGoatCount > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={11} /> {penGoatCount} goats in this pen
                </span>
              )}
            </div>
          </div>
          <button className="close-btn" onClick={handleClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveRation}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* DATE & TIME */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={14} color="var(--primary)" /> Date & Time (Beirut Time) *
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={feedingDate}
                onChange={(e) => setFeedingDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* FEED COMPONENTS CARDS - CLEAN WHITE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                  <Scale size={14} color="var(--primary)" /> Feed Components (Total kg for Pen {pen?.letter})
                </label>
              </div>

              {FEED_COMPONENTS.map((comp) => (
                <div
                  key={comp.key}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '800' }}>{comp.label}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({comp.subtitle})</span>
                    </div>

                    {comp.totalKg > 0 && Number(comp.price) > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-dark)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--primary-border)' }}>
                        ${(comp.totalKg * Number(comp.price)).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                        Total kg (Pen)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="form-input"
                        placeholder="e.g. 18.0"
                        value={comp.kg}
                        onChange={(e) => comp.setKg(e.target.value)}
                        disabled={submitting}
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                        Price ($/kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder="e.g. 0.40"
                        value={comp.price}
                        onChange={(e) => comp.setPrice(e.target.value)}
                        disabled={submitting}
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {comp.totalKg > 0 && penGoatCount > 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                      <span>Per goat share: <strong>{(comp.totalKg / penGoatCount).toFixed(2)} kg/head</strong></span>
                      {Number(comp.price) > 0 && (
                        <span style={{ color: 'var(--primary-dark)', fontWeight: '700' }}>
                          ${((comp.totalKg * Number(comp.price)) / penGoatCount).toFixed(3)}/head
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* PEN TOTAL SUMMARY CARD */}
              {totalKgPen > 0 && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid var(--primary-border)', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={14} color="var(--primary)" /> Pen Total Feed:
                    </span>
                    <strong style={{ fontSize: '16px', fontWeight: '900', color: 'var(--primary-dark)' }}>
                      {totalKgPen.toFixed(1)} kg {totalCostPen > 0 && `· $${totalCostPen.toFixed(2)}`}
                    </strong>
                  </div>
                  {penGoatCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Per goat ({penGoatCount} goats):</span>
                      <strong style={{ color: 'var(--primary-dark)' }}>
                        {perHeadKg.toFixed(2)} kg/head {perHeadCost > 0 && `· $${perHeadCost.toFixed(3)}/head`}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FEEDING SCHEDULE */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={14} color="var(--primary)" /> Feeding Schedule & Timing
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 7:00 AM & 2:00 PM & 9:00 PM"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* SPECIAL NOTES */}
            <div className="form-group" style={{ margin: 0 }}>
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
              {submitting ? <Loader2 size={16} className="spinner" /> : 'Save Feed Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
