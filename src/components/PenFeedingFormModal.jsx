import React, { useState } from 'react';
import { X, Loader2, Wheat, Scale, Clock, FileText, Users, Sparkles, Share2, Layers, Check, Info, Plus, Milk } from 'lucide-react';
import { parsePenFeeding } from './PenFeedingHistoryModal';
import { getBeirutDateTimeString, isNurseryPenCheck, normalizeSharedTroughMetadata } from '../services/goatService';

export default function PenFeedingFormModal({ pen, barnAreas = [], goats = [], onClose, onSave, latestFeedingEntry = null, feedingEntries = [] }) {
  const parsed = parsePenFeeding(pen?.feeding_info || pen?.note);
  
  // Use latest entry from DB if available, otherwise use parsed current ration
  const currentRation = latestFeedingEntry ? {
    alpha_kg: latestFeedingEntry.alpha_kg || 0,
    alpha_price_per_kg: latestFeedingEntry.alpha_price_per_kg || 0,
    mixed_grains_kg: latestFeedingEntry.mixed_grains_kg || 0,
    mixed_grains_price_per_kg: latestFeedingEntry.mixed_grains_price_per_kg || 0,
    straw_kg: latestFeedingEntry.straw_kg || 0,
    straw_price_per_kg: latestFeedingEntry.straw_price_per_kg || 0,
    schedule: latestFeedingEntry.schedule || '',
    notes: latestFeedingEntry.notes || ''
  } : parsed.current;

  // Helper: Parse shared trough info from notes and reconstruct if needed
  // Handles both new format: [Shared Trough: area-1,area-2 · 50% share]
  // AND old format: [Shared Trough with Pen MLK · 50% share]
  const initializeSharedTroughState = () => {
    const sourceEntry = latestFeedingEntry || { notes: currentRation.notes || '' };
    const normalized = normalizeSharedTroughMetadata(sourceEntry);
    const sharedPenIds = (normalized.penIds || []).filter(id => barnAreas.some(p => p.id === id));
    const thisShare = Number(normalized.percent || 0);

    if (latestFeedingEntry && sharedPenIds.length > 0 && thisShare > 0) {
      const allocatedAlpha = latestFeedingEntry.alpha_kg || 0;
      const allocatedMixed = latestFeedingEntry.mixed_grains_kg || 0;
      const allocatedStraw = latestFeedingEntry.straw_kg || 0;
      const allocatedTotal = allocatedAlpha + allocatedMixed + allocatedStraw;
      const originalTotal = allocatedTotal / (thisShare / 100);
      const ratio = thisShare / 100;

      if (ratio > 0 && originalTotal > 0) {
        const reconstructedAlpha = allocatedAlpha / ratio;
        const reconstructedMixed = allocatedMixed / ratio;
        const reconstructedStraw = allocatedStraw / ratio;

        return {
          isShared: true,
          alphaKg: reconstructedAlpha > 0 ? String(reconstructedAlpha.toFixed(2)) : '',
          alphaPricePerKg: latestFeedingEntry.alpha_price_per_kg > 0 ? String(latestFeedingEntry.alpha_price_per_kg) : '',
          mixedGrainsKg: reconstructedMixed > 0 ? String(reconstructedMixed.toFixed(2)) : '',
          mixedGrainsPricePerKg: latestFeedingEntry.mixed_grains_price_per_kg > 0 ? String(latestFeedingEntry.mixed_grains_price_per_kg) : '',
          strawKg: reconstructedStraw > 0 ? String(reconstructedStraw.toFixed(2)) : '',
          strawPricePerKg: latestFeedingEntry.straw_price_per_kg > 0 ? String(latestFeedingEntry.straw_price_per_kg) : '',
          selectedPenIds: sharedPenIds
        };
      }
    }

    return null;
  };
  
  const sharedTroughInit = initializeSharedTroughState();

  // Primary Pen Goat Count
  const primaryPenGoatCount = goats.filter(g => g.area_id === pen?.id).length;

  // Use actual persisted per-head daily_weight values when reopening the form,
  // rather than defaulting every pen to a magic 2.5 kg/goat.
  const allBarnPens = barnAreas.length > 0 ? barnAreas : [pen];
  const getLatestDailyWeightForPen = (penId) => {
    const penEntry = (feedingEntries || []).filter(entry => (entry.barn_area_id || entry.area_id) === penId)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];

    const savedRate = Number(penEntry?.daily_weight ?? latestFeedingEntry?.daily_weight ?? 0);
    return Number.isFinite(savedRate) && savedRate > 0 ? savedRate : 2.5;
  };

  const initialTargetRates = Object.fromEntries(
    allBarnPens.map(p => [p.id, String(getLatestDailyWeightForPen(p.id))])
  );

  // Shared Trough State
  const [isSharedTrough, setIsSharedTrough] = useState(sharedTroughInit?.isShared || false);
  const [selectedSharedPenIds, setSelectedSharedPenIds] = useState(sharedTroughInit?.selectedPenIds || [pen?.id]);
  const [targetRates, setTargetRates] = useState(initialTargetRates);

  // 3 Feed components: TOTAL kg for the whole trough / pen
  const [alphaKg, setAlphaKg] = useState(sharedTroughInit?.alphaKg || (currentRation.alpha_kg > 0 ? String(currentRation.alpha_kg) : ''));
  const [alphaPricePerKg, setAlphaPricePerKg] = useState(sharedTroughInit?.alphaPricePerKg || (currentRation.alpha_price_per_kg > 0 ? String(currentRation.alpha_price_per_kg) : ''));
  const [mixedGrainsKg, setMixedGrainsKg] = useState(sharedTroughInit?.mixedGrainsKg || (currentRation.mixed_grains_kg > 0 ? String(currentRation.mixed_grains_kg) : ''));
  const [mixedGrainsPricePerKg, setMixedGrainsPricePerKg] = useState(sharedTroughInit?.mixedGrainsPricePerKg || (currentRation.mixed_grains_price_per_kg > 0 ? String(currentRation.mixed_grains_price_per_kg) : ''));
  const [strawKg, setStrawKg] = useState(sharedTroughInit?.strawKg || (currentRation.straw_kg > 0 ? String(currentRation.straw_kg) : ''));
  const [strawPricePerKg, setStrawPricePerKg] = useState(sharedTroughInit?.strawPricePerKg || (currentRation.straw_price_per_kg > 0 ? String(currentRation.straw_price_per_kg) : ''));

  const [schedule, setSchedule] = useState(currentRation.schedule || '');
  const [notes, setNotes] = useState(() => {
    const normalized = normalizeSharedTroughMetadata(latestFeedingEntry || currentRation);
    return normalized.cleanNotes || (currentRation.notes || '');
  });
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
        const sharedPenIds = isMultiPenShared
          ? activePens.map(p => p.id).join(',')
          : '';

        for (const item of allocatedPenData) {
          let finalNote = notes.trim();
          const metadata = isMultiPenShared ? {
            enabled: true,
            pen_ids: activePens.map(p => p.id),
            pen_names: activePens.map(p => p.name || p.letter || p.id),
            percent: Number((item.ratio * 100).toFixed(1))
          } : null;

          if (isMultiPenShared) {
            finalNote = finalNote;
          }

          const feedingData = {
            alpha_kg: item.alphaAllocated,
            alpha_price_per_kg: Number(alphaPricePerKg) || 0,
            mixed_grains_kg: item.mixedAllocated,
            mixed_grains_price_per_kg: Number(mixedGrainsPricePerKg) || 0,
            straw_kg: item.strawAllocated,
            straw_price_per_kg: Number(strawPricePerKg) || 0,
            schedule: schedule.trim(),
            notes: finalNote,
            shared_trough_metadata: metadata,
            date: new Date(feedingDate).toISOString()
          };
          await onSave(item.pen.id, feedingData);
        }
      }
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isNursery = isNurseryPenCheck(pen);

  const FEED_COMPONENTS = [
    {
      key: 'alpha',
      label: isNursery ? 'Milk' : 'Alpha',
      subtitle: isNursery ? 'Milk / Milk Replacer' : 'Alfalfa Hay',
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

  const otherBarnPens = allBarnPens.filter(p => p.id !== pen?.id && !isNurseryPenCheck(p));

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

            {/* NURSERY DEDICATED BANNER OR SHARED TROUGH TOGGLE */}
            {isNursery ? (
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1.5px solid #bae6fd',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e0f2fe', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Milk size={18} color="#0284c7" />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0369a1', fontWeight: '800', display: 'block', lineHeight: 1.2 }}>
                    Nursery Pen Feeding (Dedicated)
                  </strong>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
                    Kids feeding uses Milk (L) & Starter Feed (kg). Dedicated pen feed (never shared).
                  </span>
                </div>
              </div>
            ) : otherBarnPens.length > 0 && (
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
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="#059669" />
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: '800', display: 'block', lineHeight: 1.2 }}>
                        Pen {pen?.letter} Target Rate
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                        {primaryPenGoatCount} goats · Est. Intake: {allocatedPenData[0]?.totalAllocatedKg || 0} kg
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      Rate:
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      placeholder="2.5"
                      value={targetRates[pen?.id] !== undefined ? targetRates[pen?.id] : '2.5'}
                      onChange={(e) => handleTargetRateChange(pen?.id, e.target.value)}
                      disabled={submitting}
                      style={{ fontSize: '12px', fontWeight: '700', padding: '4px 8px', height: '28px', width: '75px', background: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>kg/goat</span>
                  </div>
                </div>

                {/* EXPECTED COMPONENTS BREAKDOWN & COST DISPLAY */}
                {allocatedPenData[0] && totalKgPen > 0 && (
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                        Expected Component Breakdown:
                      </span>
                      {totalKgPen > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          {[
                            totalAlpha > 0 ? `${((totalAlpha / totalKgPen) * 100).toFixed(0)}% ${isNursery ? 'Milk' : 'Alpha'}` : null,
                            totalMixed > 0 ? `${((totalMixed / totalKgPen) * 100).toFixed(0)}% Grains` : null,
                            totalStraw > 0 ? `${((totalStraw / totalKgPen) * 100).toFixed(0)}% Straw` : null,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {allocatedPenData[0].alphaAllocated > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#047857', background: '#f0fdf4', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px' }}>
                          {isNursery ? 'Milk' : 'Alpha'}: {allocatedPenData[0].alphaAllocated} kg
                        </span>
                      )}
                      {allocatedPenData[0].mixedAllocated > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#047857', background: '#f0fdf4', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px' }}>
                          Mixed Grains: {allocatedPenData[0].mixedAllocated} kg
                        </span>
                      )}
                      {allocatedPenData[0].strawAllocated > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#047857', background: '#f0fdf4', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px' }}>
                          Straw: {allocatedPenData[0].strawAllocated} kg
                        </span>
                      )}
                    </div>
                  </div>
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
                    : `Feed Components (Pen ${pen?.letter})`}
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
                {sharedTroughInit?.isShared && (
                  <span style={{ fontSize: '10px', fontWeight: '600', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>
                    LOCKED (Shared Trough)
                  </span>
                )}
              </label>
              {sharedTroughInit?.isShared ? (
                <div
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Add free-choice mineral block & fresh water daily."
                  style={{
                    fontWeight: '600',
                    padding: '10px 12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#6b7280',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {notes}
                </div>
              ) : (
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Add free-choice mineral block & fresh water daily."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  style={{ fontWeight: '600' }}
                />
              )}
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
