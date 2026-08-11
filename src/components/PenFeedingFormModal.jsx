import React, { useState } from 'react';
import { X, Loader2, Wheat, Scale, Clock, FileText, Users, Sparkles, Share2, Check } from 'lucide-react';
import { parsePenFeeding } from './PenFeedingHistoryModal';
import { getBeirutDateTimeString } from '../services/goatService';

export default function PenFeedingFormModal({ pen, barnAreas = [], goats = [], onClose, onSave }) {
  const parsed = parsePenFeeding(pen?.feeding_info || pen?.note);
  const currentRation = parsed.current;

  // Primary Pen Goat Count
  const primaryPenGoatCount = goats.filter(g => g.area_id === pen?.id).length;

  // Shared Trough State
  const [isSharedTrough, setIsSharedTrough] = useState(false);
  const [selectedSharedPenIds, setSelectedSharedPenIds] = useState([pen?.id]);
  const [targetRates, setTargetRates] = useState({ [pen?.id]: '2.5' });

  // 3 Feed components: TOTAL kg for the whole trough / pen
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

  // Toggle pen in shared trough selection
  const handleToggleSharedPen = (penId) => {
    if (penId === pen?.id) return; // Primary pen is always included
    if (selectedSharedPenIds.includes(penId)) {
      setSelectedSharedPenIds(prev => prev.filter(id => id !== penId));
    } else {
      setSelectedSharedPenIds(prev => [...prev, penId]);
      if (!targetRates[penId]) {
        setTargetRates(prev => ({ ...prev, [penId]: '2.0' }));
      }
    }
  };

  // Update target consumption rate for a pen
  const handleTargetRateChange = (penId, val) => {
    setTargetRates(prev => ({ ...prev, [penId]: val }));
  };

  // Active pens in shared trough calculation
  const allBarnPens = barnAreas.length > 0 ? barnAreas : [pen];
  const activePens = allBarnPens.filter(p =>
    isSharedTrough ? (selectedSharedPenIds.includes(p.id) || p.id === pen?.id) : p.id === pen?.id
  );

  // Totals input by farmer into the trough
  const totalAlpha = Number(alphaKg) || 0;
  const totalMixed = Number(mixedGrainsKg) || 0;
  const totalStraw = Number(strawKg) || 0;
  const totalKgPen = totalAlpha + totalMixed + totalStraw;
  const totalCostPen = totalAlpha * (Number(alphaPricePerKg) || 0)
    + totalMixed * (Number(mixedGrainsPricePerKg) || 0)
    + totalStraw * (Number(strawPricePerKg) || 0);

  // Calculate target need & proportional share per pen
  const groupPenMetrics = activePens.map(p => {
    const count = goats.filter(g => g.area_id === p.id).length;
    const targetRate = parseFloat(targetRates[p.id] !== undefined ? targetRates[p.id] : '2.5') || 0;
    const targetNeed = count * targetRate;
    return { pen: p, count, targetRate, targetNeed };
  });

  const totalGroupGoats = groupPenMetrics.reduce((sum, item) => sum + item.count, 0);
  const combinedTargetNeed = groupPenMetrics.reduce((sum, item) => sum + item.targetNeed, 0);

  const allocatedPenData = groupPenMetrics.map(item => {
    let ratio = 0;
    if (combinedTargetNeed > 0) {
      ratio = item.targetNeed / combinedTargetNeed;
    } else if (totalGroupGoats > 0) {
      ratio = item.count / totalGroupGoats;
    } else if (groupPenMetrics.length > 0) {
      ratio = 1 / groupPenMetrics.length;
    }

    const alphaAllocated = parseFloat((totalAlpha * ratio).toFixed(3));
    const mixedAllocated = parseFloat((totalMixed * ratio).toFixed(3));
    const strawAllocated = parseFloat((totalStraw * ratio).toFixed(3));
    const totalAllocatedKg = parseFloat((totalKgPen * ratio).toFixed(3));
    const perHeadKg = item.count > 0 ? (totalAllocatedKg / item.count) : null;

    return {
      ...item,
      ratio,
      alphaAllocated,
      mixedAllocated,
      strawAllocated,
      totalAllocatedKg,
      perHeadKg
    };
  });

  const perHeadKgPrimary = primaryPenGoatCount > 0 ? totalKgPen / primaryPenGoatCount : null;
  const perHeadCostPrimary = primaryPenGoatCount > 0 ? totalCostPen / primaryPenGoatCount : null;

  const handleSaveRation = async (e) => {
    e.preventDefault();
    if (totalKgPen <= 0) {
      alert('Please enter at least one feed component quantity.');
      return;
    }
    setSubmitting(true);

    try {
      if (onSave) {
        if (!isSharedTrough || allocatedPenData.length <= 1) {
          // Single Pen Entry
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
          await onSave(pen.id, feedingData);
        } else {
          // Shared Trough Multi-Pen Proportional Allocation
          const sharedPenNames = activePens.map(p => `Pen ${p.letter}`).join(' & ');
          for (const item of allocatedPenData) {
            const ratioPct = (item.ratio * 100).toFixed(1);
            const sharedNoteTag = `[Shared Trough with ${sharedPenNames} · ${ratioPct}% share]`;
            const finalNote = notes.trim() ? `${sharedNoteTag} ${notes.trim()}` : sharedNoteTag;

            const feedingData = {
              alpha_kg: item.alphaAllocated,
              alpha_price_per_kg: Number(alphaPricePerKg) || 0,
              mixed_grains_kg: item.mixedAllocated,
              mixed_grains_price_per_kg: Number(mixedGrainsPricePerKg) || 0,
              straw_kg: item.strawAllocated,
              straw_price_per_kg: Number(strawPricePerKg) || 0,
              schedule: schedule.trim(),
              notes: finalNote,
              date: new Date(feedingDate).toISOString()
            };
            await onSave(item.pen.id, feedingData);
          }
        }
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

  const otherBarnPens = allBarnPens.filter(p => p.id !== pen?.id);

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose} style={{ zIndex: 110, fontFamily: "'Outfit', sans-serif" }}>
      <div
        className={`modal-content ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', width: '100%', padding: '18px', borderRadius: '16px', fontFamily: "'Outfit', sans-serif" }}
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
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={11} /> {primaryPenGoatCount} goats in Pen {pen?.letter}
                {isSharedTrough && activePens.length > 1 && ` · (${totalGroupGoats} total in ${activePens.length} shared pens)`}
              </span>
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

            {/* SHARED TROUGH TOGGLE SECTION */}
            {otherBarnPens.length > 0 && (
              <div
                style={{
                  background: isSharedTrough ? '#f0fdf4' : '#f8fafc',
                  border: isSharedTrough ? '1.5px solid var(--primary-border)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Share2 size={15} color={isSharedTrough ? 'var(--primary-dark)' : 'var(--text-muted)'} />
                    <strong style={{ fontSize: '13px', fontWeight: '800', color: isSharedTrough ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                      Shared Feed Trough
                    </strong>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px', fontSize: '11px', fontWeight: '700', color: 'var(--primary-dark)' }}>
                    <input
                      type="checkbox"
                      checked={isSharedTrough}
                      onChange={(e) => setIsSharedTrough(e.target.checked)}
                      disabled={submitting}
                      style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                    />
                    <span>{isSharedTrough ? 'Shared Active' : 'Enable Shared Trough'}</span>
                  </label>
                </div>

                {isSharedTrough && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                      Select other pens sharing this feeder trough. Feed will be allocated proportionally based on target rates & headcounts.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {allBarnPens.map(p => {
                        const count = goats.filter(g => g.area_id === p.id).length;
                        const isPrimary = p.id === pen?.id;
                        const isSelected = selectedSharedPenIds.includes(p.id) || isPrimary;
                        const allocatedInfo = allocatedPenData.find(d => d.pen.id === p.id);

                        return (
                          <div
                            key={p.id}
                            style={{
                              background: isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)',
                              border: isSelected ? '1px solid #a7f3d0' : '1px solid var(--border-color)',
                              borderRadius: '10px',
                              padding: '8px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isPrimary ? 'default' : 'pointer', flex: 1 }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSharedPen(p.id)}
                                  disabled={isPrimary || submitting}
                                  style={{ accentColor: '#059669' }}
                                />
                                <div>
                                  <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                                    Pen {p.letter} {p.name && p.name !== `Pen ${p.letter}` ? `(${p.name})` : ''}
                                  </strong>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                    {count} goats
                                  </span>
                                </div>
                              </label>

                              {isSelected && allocatedInfo && (
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                  {(allocatedInfo.ratio * 100).toFixed(1)}% Share
                                </span>
                              )}
                            </div>

                            {isSelected && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '22px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  Target Rate:
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  className="form-input"
                                  placeholder="2.5"
                                  value={targetRates[p.id] !== undefined ? targetRates[p.id] : '2.5'}
                                  onChange={(e) => handleTargetRateChange(p.id, e.target.value)}
                                  disabled={submitting}
                                  style={{ fontSize: '11px', padding: '3px 6px', height: '26px', width: '70px' }}
                                />
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>kg/goat target</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FEED COMPONENTS CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                  <Scale size={14} color="var(--primary)" />
                  {isSharedTrough && activePens.length > 1
                    ? `Feed Components (Total put into Shared Trough)`
                    : `Feed Components (Total kg for Pen ${pen?.letter})`}
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
                        {isSharedTrough && activePens.length > 1 ? 'Total Trough kg' : 'Total kg (Pen)'}
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
                </div>
              ))}

              {/* PEN TOTAL & ALLOCATION SUMMARY CARD */}
              {totalKgPen > 0 && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid var(--primary-border)', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={14} color="var(--primary)" />
                      {isSharedTrough && activePens.length > 1 ? 'Total Trough Dump:' : 'Pen Total Feed:'}
                    </span>
                    <strong style={{ fontSize: '16px', fontWeight: '900', color: 'var(--primary-dark)' }}>
                      {totalKgPen.toFixed(1)} kg {totalCostPen > 0 && `· $${totalCostPen.toFixed(2)}`}
                    </strong>
                  </div>

                  {!isSharedTrough || activePens.length <= 1 ? (
                    primaryPenGoatCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Per goat ({primaryPenGoatCount} goats):</span>
                        <strong style={{ color: 'var(--primary-dark)' }}>
                          {perHeadKgPrimary.toFixed(2)} kg/head {perHeadCostPrimary > 0 && `· $${perHeadCostPrimary.toFixed(3)}/head`}
                        </strong>
                      </div>
                    )
                  ) : (
                    <div style={{ borderTop: '1px dashed #a7f3d0', paddingTop: '6px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857' }}>
                        Proportional Feed Allocation Breakdown ({totalGroupGoats} total goats):
                      </span>
                      {allocatedPenData.map(item => (
                        <div key={item.pen.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                          <span>
                            <strong>Pen {item.pen.letter}</strong> ({item.count} goats @ {item.targetRate} kg target):
                          </span>
                          <strong style={{ color: '#047857' }}>
                            {item.totalAllocatedKg.toFixed(2)} kg ({(item.ratio * 100).toFixed(1)}%) {item.perHeadKg ? `· ${item.perHeadKg.toFixed(2)} kg/goat` : ''}
                          </strong>
                        </div>
                      ))}
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
              {submitting ? <Loader2 size={16} className="spinner" /> : (isSharedTrough && activePens.length > 1 ? `Save Shared Feed (${activePens.length} Pens)` : 'Save Feed Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
