import React, { useState } from 'react';
import { X, Loader2, Wheat, Scale, Clock, FileText, Users, Sparkles, Share2, Layers, Check, Info, Plus } from 'lucide-react';
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

    const penTargetIntake = item.targetNeed; // count * targetRate
    const alphaProp = totalKgPen > 0 ? (totalAlpha / totalKgPen) : 0;
    const mixedProp = totalKgPen > 0 ? (totalMixed / totalKgPen) : 0;
    const strawProp = totalKgPen > 0 ? (totalStraw / totalKgPen) : 0;

    const alphaAllocated = parseFloat((penTargetIntake * alphaProp).toFixed(3));
    const mixedAllocated = parseFloat((penTargetIntake * mixedProp).toFixed(3));
    const strawAllocated = parseFloat((penTargetIntake * strawProp).toFixed(3));
    const totalAllocatedKg = parseFloat((penTargetIntake).toFixed(3));
    const perHeadKg = item.count > 0 ? parseFloat((totalAllocatedKg / item.count).toFixed(3)) : null;

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
        const isMultiPenShared = isSharedTrough && activePens.length > 1;

        if (!isMultiPenShared) {
          // Single Pen Entry — save exact entered component weights
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
            const finalNote = notes.trim() ? `${sharedNoteTag} ${notes.trim()}` : notes.trim();

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
        style={{ maxWidth: '520px', width: '100%', fontFamily: "'Outfit', sans-serif" }}
      >
        {/* HEADER */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#ecfdf5', border: '1.5px solid #a7f3d0', display: 'grid', placeItems: 'center' }}>
              <Wheat size={20} color="#047857" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '18px', fontFamily: "'Outfit', sans-serif", margin: 0, fontWeight: '800', color: '#0f172a' }}>
                Log Pen Feeding — Pen {pen?.letter}
              </h2>
              <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: '600' }}>
                <Users size={13} color="#059669" /> {primaryPenGoatCount} goats in Pen {pen?.letter}
                {isSharedTrough && activePens.length > 1 && ` · (${totalGroupGoats} total in ${activePens.length} shared pens)`}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveRation} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* DATE & TIME */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#334155' }}>
                <Clock size={14} color="#059669" /> Date & Time (Beirut Time) *
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={feedingDate}
                onChange={(e) => setFeedingDate(e.target.value)}
                required
                disabled={submitting}
                style={{ fontWeight: '600' }}
              />
            </div>

            {/* SHARED TROUGH TOGGLE SECTION - PREMIUM CARD */}
            {otherBarnPens.length > 0 && (
              <div
                style={{
                  background: isSharedTrough ? '#f0fdf4' : '#ffffff',
                  border: isSharedTrough ? '2px solid #059669' : '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: isSharedTrough ? '0 4px 12px rgba(5,150,105,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isSharedTrough ? '#dcfce7' : '#f1f5f9', display: 'grid', placeItems: 'center' }}>
                      <Share2 size={16} color={isSharedTrough ? '#047857' : '#64748b'} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
                        Shared Feed Trough
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                        Feed multiple pens sharing the same trough
                      </span>
                    </div>
                  </div>

                  {/* VISUALLY VIBRANT TOGGLE SWITCH */}
                  <button
                    type="button"
                    onClick={() => setIsSharedTrough(!isSharedTrough)}
                    disabled={submitting}
                    style={{
                      background: isSharedTrough ? '#059669' : '#cbd5e1',
                      border: 'none',
                      borderRadius: '9999px',
                      width: '46px',
                      height: '26px',
                      padding: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transform: isSharedTrough ? 'translateX(20px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  </button>
                </div>

                {isSharedTrough && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px', borderTop: '1px solid #dcfce7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontSize: '11px', fontWeight: '700' }}>
                      <Info size={13} color="#059669" /> Select pens sharing this trough to auto-calculate proportional feed shares:
                    </div>

                    {/* VIBRANT INTERACTIVE PEN CARDS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {allBarnPens.map(p => {
                        const count = goats.filter(g => g.area_id === p.id).length;
                        const isPrimary = p.id === pen?.id;
                        const isSelected = selectedSharedPenIds.includes(p.id) || isPrimary;
                        const allocatedInfo = allocatedPenData.find(d => d.pen.id === p.id);

                        return (
                          <div
                            key={p.id}
                            onClick={() => !isPrimary && handleToggleSharedPen(p.id)}
                            style={{
                              background: '#ffffff',
                              border: isSelected ? '2px solid #059669' : '1.5px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '10px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              cursor: isPrimary ? 'default' : 'pointer',
                              boxShadow: isSelected ? '0 2px 8px rgba(5,150,105,0.08)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                {/* CUSTOM VIBRANT CHECKBOX BUTTON */}
                                <div
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '7px',
                                    background: isSelected ? '#059669' : '#ffffff',
                                    border: isSelected ? '2px solid #059669' : '2px solid #cbd5e1',
                                    display: 'grid',
                                    placeItems: 'center',
                                    transition: 'all 0.15s ease',
                                    flexShrink: 0
                                  }}
                                >
                                  {isSelected ? (
                                    <Check size={14} color="#ffffff" strokeWidth={3} />
                                  ) : (
                                    <Plus size={12} color="#94a3b8" strokeWidth={2.5} />
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flexWrap: 'nowrap' }}>
                                  <strong style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                    Pen {p.letter}{p.name && p.name !== `Pen ${p.letter}` ? ` · ${p.name}` : ''}
                                  </strong>

                                  {isPrimary ? (
                                    <span style={{ fontSize: '10px', fontWeight: '800', background: '#dcfce7', color: '#047857', padding: '1px 5px', borderRadius: '4px', border: '1px solid #a7f3d0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                      This Pen
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                      {count} goats
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && allocatedInfo && (
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857', background: '#ecfdf5', padding: '3px 7px', borderRadius: '6px', border: '1.5px solid #a7f3d0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {(allocatedInfo.ratio * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>

                            {isSelected && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '30px', borderTop: '1px dashed #f1f5f9', paddingTop: '6px', flexWrap: 'nowrap' }}
                              >
                                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  Rate:
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className="form-input"
                                  placeholder="2.5"
                                  value={targetRates[p.id] !== undefined ? targetRates[p.id] : '2.5'}
                                  onChange={(e) => handleTargetRateChange(p.id, e.target.value)}
                                  disabled={submitting}
                                  style={{ fontSize: '12px', fontWeight: '700', padding: '4px 8px', height: '28px', width: '75px', background: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                                />
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>kg/goat target</span>
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

            {!isSharedTrough && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="#059669" />
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: '800', display: 'block', lineHeight: 1.2 }}>
                      Pen {pen?.letter} Total Feed
                    </strong>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                      {primaryPenGoatCount} goats · Total Feed: {totalKgPen} kg {perHeadKgPrimary !== null ? `(${perHeadKgPrimary.toFixed(2)} kg/goat)` : ''}
                    </span>
                  </div>
                </div>

                {perHeadCostPrimary !== null && perHeadCostPrimary > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    ${perHeadCostPrimary.toFixed(2)}/goat
                  </span>
                )}
              </div>
            )}

            {/* FEED COMPONENTS CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: '700', color: '#334155' }}>
                  <Scale size={15} color="#059669" />
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
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>{comp.label}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>({comp.subtitle})</span>
                    </div>

                    {comp.totalKg > 0 && Number(comp.price) > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                        ${(comp.totalKg * Number(comp.price)).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '3px' }}>
                        {isSharedTrough && activePens.length > 1 ? 'Total Trough kg' : 'Total kg (Pen)'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="form-input"
                        placeholder="e.g. 18.0"
                        value={comp.kg}
                        onChange={(e) => comp.setKg(e.target.value)}
                        disabled={submitting}
                        style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '3px' }}>
                        Price ($/kg)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="form-input"
                        placeholder="e.g. 0.40"
                        value={comp.price}
                        onChange={(e) => comp.setPrice(e.target.value)}
                        disabled={submitting}
                        style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* PEN TOTAL & ALLOCATION SUMMARY CARD */}
              {totalKgPen > 0 && (
                <div style={{ background: '#f0fdf4', border: '2px solid #a7f3d0', borderRadius: '14px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#047857', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={15} color="#059669" />
                      {isSharedTrough && activePens.length > 1 ? 'Total Trough Feed:' : 'Pen Total Feed:'}
                    </span>
                    <strong style={{ fontSize: '17px', fontWeight: '900', color: '#047857' }}>
                      {totalKgPen.toFixed(1)} kg {totalCostPen > 0 && `· $${totalCostPen.toFixed(2)}`}
                    </strong>
                  </div>

                  {!isSharedTrough || activePens.length <= 1 ? (
                    primaryPenGoatCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                        <span>Per goat ({primaryPenGoatCount} goats):</span>
                        <strong style={{ color: '#047857', fontWeight: '800' }}>
                          {perHeadKgPrimary.toFixed(2)} kg/head {perHeadCostPrimary > 0 && `· $${perHeadCostPrimary.toFixed(3)}/head`}
                        </strong>
                      </div>
                    )
                  ) : (
                    <div style={{ borderTop: '1px dashed #a7f3d0', paddingTop: '8px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#047857', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Layers size={14} color="#047857" /> Proportional Feed Allocation ({totalGroupGoats} total goats):
                      </span>
                      {allocatedPenData.map(item => (
                        <div key={item.pen.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#334155', fontWeight: '600' }}>
                            <strong style={{ color: '#0f172a' }}>Pen {item.pen.letter}</strong> ({item.count} goats @ {item.targetRate} kg target):
                          </span>
                          <strong style={{ color: '#047857', fontWeight: '800' }}>
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
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#334155' }}>
                <Clock size={14} color="#059669" /> Feeding Schedule & Timing
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 7:00 AM & 2:00 PM & 9:00 PM"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                disabled={submitting}
                style={{ fontWeight: '600' }}
              />
            </div>

            {/* SPECIAL NOTES */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#334155' }}>
                <FileText size={14} color="#059669" /> Special Notes & Instructions
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Add free-choice mineral block & fresh water daily."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                style={{ fontWeight: '600' }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting} style={{ fontWeight: '700' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontWeight: '800' }}>
              {submitting ? <Loader2 size={16} className="spinner" /> : (isSharedTrough && activePens.length > 1 ? `Save Shared Feed (${activePens.length} Pens)` : 'Save Feed Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
