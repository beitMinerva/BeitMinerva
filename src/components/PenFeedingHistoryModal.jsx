import React, { useState, useMemo } from 'react';
import { X, Wheat, Scale, Clock, Sparkles, History, Calendar, Milk, TrendingUp, Filter, Pencil, Trash2, Loader2, FileText } from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';
import { isMilkingEvent, getEventMetricValue } from '../utils/metricEventUtils';
import { getBeirutDateTimeString, formatBeirutDisplay } from '../services/goatService';

export function parsePenFeeding(infoStr) {
  if (!infoStr) {
    return {
      current: { food_type: '', daily_weight: '', composition: '', schedule: '', notes: '', alpha_kg: 0, alpha_price_per_kg: 0, mixed_grains_kg: 0, mixed_grains_price_per_kg: 0, straw_kg: 0, straw_price_per_kg: 0 },
      history: [],
      milk_tracking: []
    };
  }

  if (typeof infoStr === 'object' && infoStr !== null) {
    return {
      current: infoStr.current || { food_type: infoStr.food_type || '', daily_weight: infoStr.daily_weight || '', composition: infoStr.composition || '', schedule: infoStr.schedule || '', notes: infoStr.notes || '', alpha_kg: infoStr.alpha_kg || 0, alpha_price_per_kg: infoStr.alpha_price_per_kg || 0, mixed_grains_kg: infoStr.mixed_grains_kg || 0, mixed_grains_price_per_kg: infoStr.mixed_grains_price_per_kg || 0, straw_kg: infoStr.straw_kg || 0, straw_price_per_kg: infoStr.straw_price_per_kg || 0 },
      history: Array.isArray(infoStr.history) ? infoStr.history : [],
      milk_tracking: Array.isArray(infoStr.milk_tracking) ? infoStr.milk_tracking : []
    };
  }

  try {
    const parsed = JSON.parse(infoStr);
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.current || parsed.history || parsed.milk_tracking) {
        return {
          current: parsed.current || { food_type: '', daily_weight: '', composition: '', schedule: '', notes: '', alpha_kg: 0, alpha_price_per_kg: 0, mixed_grains_kg: 0, mixed_grains_price_per_kg: 0, straw_kg: 0, straw_price_per_kg: 0 },
          history: Array.isArray(parsed.history) ? parsed.history : [],
          milk_tracking: Array.isArray(parsed.milk_tracking) ? parsed.milk_tracking : []
        };
      }
      return {
        current: {
          food_type: parsed.food_type || '',
          daily_weight: parsed.daily_weight || '',
          composition: parsed.composition || '',
          schedule: parsed.schedule || '',
          notes: parsed.notes || ''
        },
        history: [],
        milk_tracking: []
      };
    }
  } catch (e) {}

  return {
    current: { food_type: String(infoStr), daily_weight: '', composition: '', schedule: '', notes: '' },
    history: [],
    milk_tracking: []
  };
}

function PenMilkChart({ entries = [] }) {
  if (!entries || entries.length === 0) return null;

  const values = entries
    .map((entry) => Number(entry.amount_liters ?? entry.milk_liters ?? entry.amount ?? 0))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return null;

  const svgWidth = 300;
  const svgHeight = 120;
  const padding = 24;
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1 || 10;

  const getX = (index) => {
    if (values.length === 1) return svgWidth / 2;
    return padding + (index / (values.length - 1)) * (svgWidth - padding * 2);
  };

  const getY = (value) => {
    if (maxVal === minVal) return svgHeight / 2;
    return svgHeight - padding - ((value - minVal) / (maxVal - minVal)) * (svgHeight - padding * 2);
  };

  const points = values.map((value, index) => `${getX(index)},${getY(value)}`).join(' ');

  return (
    <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '12px', padding: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '6px' }}>Pen Milk Trend</div>
      <svg width="100%" height="120" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="var(--border-color)" strokeDasharray="3 3" />
        <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="var(--border-color)" strokeDasharray="3 3" />
        <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="var(--border-color)" />
        {values.length > 1 && <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {values.map((value, index) => {
          const x = getX(index);
          const y = getY(value);
          return (
            <g key={`${value}-${index}`}>
              <circle cx={x} cy={y} r="3" fill="var(--primary-dark)" />
              <text x={x + 6} y={y - 8} fontSize="9" fontWeight="700" fill="var(--primary-dark)">
                {value.toFixed(1)} L
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function PenFeedingHistoryModal({
  pen,
  onClose,
  onOpenEditForm,
  goats = [],
  milkingEntries = [],
  feedingEntries = [],
  mode = 'feed',
  onSaveMilkEntry,
  onDeleteMilkEntry,
  onSaveFeedingEntry,
  onDeleteFeedingEntry
}) {
  const parsed = parsePenFeeding(pen?.feeding_info || pen?.note);

  const dbFeedingEntries = useMemo(() => {
    if (!Array.isArray(feedingEntries) || feedingEntries.length === 0) return [];
    return [...feedingEntries]
      .filter((e) => e.barn_area_id === pen?.id)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [feedingEntries, pen?.id]);

  const latestDbEntry = dbFeedingEntries[0];
  const currentRation = latestDbEntry ? {
    food_type: latestDbEntry.food_type || '',
    daily_weight: latestDbEntry.daily_weight ? `${latestDbEntry.daily_weight} kg` : '',
    composition: latestDbEntry.composition || '',
    schedule: latestDbEntry.schedule || '',
    notes: latestDbEntry.notes || '',
    alpha_kg: latestDbEntry.alpha_kg || 0,
    alpha_price_per_kg: latestDbEntry.alpha_price_per_kg || 0,
    mixed_grains_kg: latestDbEntry.mixed_grains_kg || 0,
    mixed_grains_price_per_kg: latestDbEntry.mixed_grains_price_per_kg || 0,
    straw_kg: latestDbEntry.straw_kg || 0,
    straw_price_per_kg: latestDbEntry.straw_price_per_kg || 0,
  } : parsed.current;

  const historyList = dbFeedingEntries.length > 0 ? dbFeedingEntries : parsed.history;
  const isMilkingMode = mode === 'milking' || mode === 'pen-milk';

  const [isClosing, setIsClosing] = useState(false);
  const [timeRange, setTimeRange] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [milkDate, setMilkDate] = useState(() => getBeirutDateTimeString());
  const [milkAmount, setMilkAmount] = useState('');
  const [milkNotes, setMilkNotes] = useState('');
  const [milkShift, setMilkShift] = useState('Morning');
  const [milkDestination, setMilkDestination] = useState('for_sale'); // 'for_sale' | 'home_use' | 'farm_use'
  const [submittingMilk, setSubmittingMilk] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);

  const [editingFeedingEntry, setEditingFeedingEntry] = useState(null);
  const [feedingFoodType, setFeedingFoodType] = useState('');
  const [feedingWeight, setFeedingWeight] = useState('');
  const [feedingComposition, setFeedingComposition] = useState('');
  const [feedingSchedule, setFeedingSchedule] = useState('');
  const [feedingNotes, setFeedingNotes] = useState('');
  const [feedingAlphaKg, setFeedingAlphaKg] = useState('');
  const [feedingAlphaPrice, setFeedingAlphaPrice] = useState('');
  const [feedingMixedKg, setFeedingMixedKg] = useState('');
  const [feedingMixedPrice, setFeedingMixedPrice] = useState('');
  const [feedingStrawKg, setFeedingStrawKg] = useState('');
  const [feedingStrawPrice, setFeedingStrawPrice] = useState('');
  const [feedingEntryToDelete, setFeedingEntryToDelete] = useState(null);
  const [submittingFeeding, setSubmittingFeeding] = useState(false);

  const handleStartEditFeedingEntry = (item) => {
    setEditingFeedingEntry(item);
    setFeedingFoodType(item.food_type || '');
    setFeedingWeight(item.daily_weight || '');
    setFeedingComposition(item.composition || '');
    setFeedingSchedule(item.schedule || '');
    setFeedingNotes(item.notes || '');
    setFeedingAlphaKg(item.alpha_kg || '');
    setFeedingAlphaPrice(item.alpha_price_per_kg || '');
    setFeedingMixedKg(item.mixed_grains_kg || '');
    setFeedingMixedPrice(item.mixed_grains_price_per_kg || '');
    setFeedingStrawKg(item.straw_kg || '');
    setFeedingStrawPrice(item.straw_price_per_kg || '');
  };

  const handleCancelEditFeedingEntry = () => {
    setEditingFeedingEntry(null);
  };

  const handleSaveEditedFeedingEntry = async (e) => {
    e.preventDefault();
    if (!editingFeedingEntry || !onSaveFeedingEntry) return;
    setSubmittingFeeding(true);
    try {
      await onSaveFeedingEntry(pen.id, {
        food_type: feedingFoodType.trim(),
        daily_weight: feedingWeight,
        composition: feedingComposition.trim(),
        schedule: feedingSchedule.trim(),
        notes: feedingNotes.trim(),
        date: editingFeedingEntry.date || new Date().toISOString(),
        alpha_kg: Number(feedingAlphaKg) || 0,
        alpha_price_per_kg: Number(feedingAlphaPrice) || 0,
        mixed_grains_kg: Number(feedingMixedKg) || 0,
        mixed_grains_price_per_kg: Number(feedingMixedPrice) || 0,
        straw_kg: Number(feedingStrawKg) || 0,
        straw_price_per_kg: Number(feedingStrawPrice) || 0,
      }, editingFeedingEntry.id);
      setEditingFeedingEntry(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFeeding(false);
    }
  };

  const confirmDeleteFeedingEntry = async () => {
    if (!feedingEntryToDelete || !onDeleteFeedingEntry) return;
    try {
      await onDeleteFeedingEntry(feedingEntryToDelete.id);
      setFeedingEntryToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const penMilkEntries = useMemo(() => {
    if (!isMilkingMode) return [];
    const sourceEntries = Array.isArray(milkingEntries) ? milkingEntries : [];
    return [...sourceEntries].sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
  }, [isMilkingMode, milkingEntries]);

  const filteredMilkingEntries = useMemo(() => {
    if (!isMilkingMode) return [];
    const now = Date.now();
    const filtered = (penMilkEntries || []).filter((item) => {
      const itemTime = new Date(item.date).getTime();
      if (Number.isNaN(itemTime)) return false;

      if (timeRange === '30D') {
        return itemTime >= now - 30 * 24 * 60 * 60 * 1000;
      }
      if (timeRange === '6M') {
        return itemTime >= now - 180 * 24 * 60 * 60 * 1000;
      }
      if (timeRange === '1Y') {
        return itemTime >= now - 365 * 24 * 60 * 60 * 1000;
      }
      if (timeRange === 'CUSTOM') {
        let pass = true;
        if (startDate) pass = pass && itemTime >= new Date(startDate).getTime();
        if (endDate) pass = pass && itemTime <= new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
        return pass;
      }
      return true;
    });

    return filtered.sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
  }, [isMilkingMode, penMilkEntries, timeRange, startDate, endDate]);

  const milkingSummary = useMemo(() => {
    if (!isMilkingMode || filteredMilkingEntries.length === 0) return null;
    const values = filteredMilkingEntries.map((item) => {
      const amount = Number(item.amount_liters ?? item.milk_liters ?? item.amount ?? getEventMetricValue(item, 'milking', 0));
      return Number.isFinite(amount) ? amount : 0;
    }).filter((value) => Number.isFinite(value));
    if (values.length === 0) return null;
    const total = values.reduce((sum, value) => sum + value, 0);
    const goatCount = goats.filter((g) => g.area_id === pen?.id).length || 1;
    const penAverage = total / goatCount;
    return { total, penAverage, count: values.length, goatCount };
  }, [filteredMilkingEntries, goats, pen?.id, isMilkingMode]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleSaveMilkEntry = async (e) => {
    e.preventDefault();
    if (!onSaveMilkEntry || !pen) return;
    setSubmittingMilk(true);
    try {
      await onSaveMilkEntry(pen.id, {
        date: new Date(milkDate).toISOString(),
        amount_liters: Number(milkAmount) || 0,
        shift: milkShift,
        destination: milkDestination,
        notes: milkNotes.trim()
      }, editingEntry?.id || null);
      setMilkDate(getBeirutDateTimeString());
      setMilkAmount('');
      setMilkNotes('');
      setMilkShift('Morning');
      setMilkDestination('for_sale');
      setEditingEntry(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingMilk(false);
    }
  };

  const handleStartEditEntry = (item) => {
    const amount = Number(item.amount_liters ?? item.milk_liters ?? item.amount ?? 0);
    setEditingEntry(item);
    setMilkDate(getBeirutDateTimeString(item.date || item.created_at || new Date()));
    setMilkAmount(String(amount));
    setMilkShift(item.shift || 'Morning');
    setMilkDestination(item.destination || 'for_sale');
    setMilkNotes(item.notes || '');
  };

  const handleCancelEditEntry = () => {
    setEditingEntry(null);
    setMilkDate(getBeirutDateTimeString());
    setMilkAmount('');
    setMilkNotes('');
    setMilkShift('Morning');
    setMilkDestination('for_sale');
  };

  const handleDeleteEntry = async (item) => {
    if (!onDeleteMilkEntry) return;
    setEntryToDelete(item);
  };

  const confirmDeleteEntry = async () => {
    if (!onDeleteMilkEntry || !entryToDelete) return;
    await onDeleteMilkEntry(entryToDelete.id || null);
    if (editingEntry?.id === entryToDelete.id) {
      handleCancelEditEntry();
    }
    setEntryToDelete(null);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return 'Past Log';
    return formatBeirutDisplay(dateStr);
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose} style={{ zIndex: 110, fontFamily: "'Outfit', sans-serif" }}>
      <div
        className={`modal-content ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: '18px', fontFamily: "'Outfit', sans-serif" }}
      >
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'grid', placeItems: 'center' }}>
              <History size={18} color="#047857" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '17px', fontFamily: "'Outfit', sans-serif", margin: 0 }}>
                {isMilkingMode ? `Pen ${pen?.letter} Milk Tracking` : `Pen ${pen?.letter} Feeding History & Timeline`}
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {pen?.name || `Pen ${pen?.letter}`}
              </span>
            </div>
          </div>

          <button className="close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto' }}>
          {isMilkingMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Milk size={16} color="var(--primary)" />
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-dark)' }}>Track milk for the whole pen here, separate from goat-level records.</span>
              </div>

              {!editingEntry && (
                <form onSubmit={handleSaveMilkEntry} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* SHIFT & DESTINATION SELECTORS */}
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Shift</label>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      {['Morning', 'Evening', 'Night'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setMilkShift(s)}
                          style={{
                            flex: 1,
                            padding: '5px 0',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            border: milkShift === s ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                            background: milkShift === s ? 'var(--primary-light)' : '#f8fafc',
                            color: milkShift === s ? 'var(--primary-dark)' : 'var(--text-muted)'
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Milk Purpose</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { id: 'for_sale', label: 'For Sale', desc: 'Adds to Revenue' },
                        { id: 'home_use', label: 'Home Use', desc: 'No Revenue' },
                        { id: 'farm_use', label: 'Kid Feeding', desc: 'No Revenue' }
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setMilkDestination(d.id)}
                          style={{
                            flex: 1,
                            padding: '5px 2px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            border: milkDestination === d.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                            background: milkDestination === d.id ? 'var(--primary-light)' : '#f8fafc',
                            color: milkDestination === d.id ? 'var(--primary-dark)' : 'var(--text-muted)'
                          }}
                          title={d.desc}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Date & Time</label>
                      <input type="datetime-local" className="form-input" value={milkDate} onChange={(e) => setMilkDate(e.target.value)} disabled={submittingMilk} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Milk (L)</label>
                      <input type="number" step="0.1" min="0" className="form-input" value={milkAmount} onChange={(e) => setMilkAmount(e.target.value)} placeholder="e.g. 12.5" disabled={submittingMilk} required />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Notes (optional)</label>
                    <input type="text" className="form-input" value={milkNotes} onChange={(e) => setMilkNotes(e.target.value)} placeholder="Any notes..." disabled={submittingMilk} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={submittingMilk}>
                      {submittingMilk ? <><Loader2 size={14} className="spinner" /> Saving...</> : 'Save Pen Milk'}
                    </button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={11} /> Period:
                </span>
                {[
                  { id: 'ALL', label: 'All Time' },
                  { id: '1Y', label: '1 Year' },
                  { id: '6M', label: '6 Months' },
                  { id: '30D', label: '30 Days' },
                  { id: 'CUSTOM', label: 'Custom Range' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeRange(t.id)}
                    style={{ background: timeRange === t.id ? 'var(--primary-light)' : '#ffffff', color: timeRange === t.id ? 'var(--primary-dark)' : 'var(--text-muted)', border: timeRange === t.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)', borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {timeRange === 'CUSTOM' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={10} /> From Date
                    </label>
                    <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '4px 8px', fontSize: '12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={10} /> To Date
                    </label>
                    <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '4px 8px', fontSize: '12px' }} />
                  </div>
                </div>
              )}

              {milkingSummary && (
                <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} color="var(--primary)" />
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-dark)' }}>Pen Milk Summary</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>{milkingSummary.total.toFixed(1)} L</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{milkingSummary.goatCount} goats</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avg. per goat: {milkingSummary.penAverage.toFixed(1)} L</span>
                </div>
              )}

              <PenMilkChart entries={filteredMilkingEntries} />

              {filteredMilkingEntries.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '10px 0' }}>
                  No pen milk entries logged for Pen {pen?.letter} yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredMilkingEntries.map((item) => {
                    const amount = Number(item.amount_liters ?? item.milk_liters ?? item.amount ?? 0);
                    return (
                      <div key={item.id || `${item.date}-${amount}`} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                              {amount.toFixed(1)} L
                            </strong>
                            {item.shift && (() => {
                              const shiftColors = { Morning: '#f59e0b', Evening: '#8b5cf6', Night: '#1e40af' };
                              const shiftBg = { Morning: '#fffbeb', Evening: '#f5f3ff', Night: '#eff6ff' };
                              return (
                                <span style={{ fontSize: '9px', fontWeight: '800', color: shiftColors[item.shift], background: shiftBg[item.shift], border: `1px solid ${shiftColors[item.shift]}30`, borderRadius: '5px', padding: '1px 6px' }}>
                                  {item.shift}
                                </span>
                              );
                            })()}
                            {(() => {
                              const dest = item.destination || 'for_sale';
                              const destStyles = {
                                for_sale: { label: '🏷️ Sale', color: '#15803d', bg: '#f0fdf4', border: '#a7f3d0' },
                                home_use: { label: '🏠 Home', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                                farm_use: { label: '🍼 Farm', color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
                              };
                              const style = destStyles[dest] || destStyles.for_sale;
                              return (
                                <span style={{ fontSize: '9px', fontWeight: '800', color: style.color, background: style.bg, border: `1px solid ${style.border}`, borderRadius: '5px', padding: '1px 6px' }}>
                                  {style.label}
                                </span>
                              );
                            })()}
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {formatDateLabel(item.date || item.created_at)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--primary-dark)', fontWeight: '700' }}>
                            Pen milk entry
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" onClick={() => handleStartEditEntry(item)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                              <Pencil size={13} />
                            </button>
                            <button type="button" onClick={() => handleDeleteEntry(item)} style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0 }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {item.notes && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.notes}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* CURRENT RATION CARD */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid var(--primary-border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Wheat size={14} color="var(--primary)" /> Active Feed Ration
              </span>
              {onOpenEditForm && (
                <button
                  className="btn btn-primary btn-xs"
                  onClick={() => {
                    onOpenEditForm(pen);
                  }}
                  style={{ fontSize: '11px', padding: '4px 10px', fontWeight: '800' }}
                >
                  Change Feed
                </button>
              )}
            </div>

            {currentRation.food_type ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                    {currentRation.food_type}
                  </strong>
                  {currentRation.daily_weight && (
                    <span style={{ fontSize: '11px', fontWeight: '800', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '9999px' }}>
                      <Scale size={10} style={{ display: 'inline', marginRight: '3px' }} /> {currentRation.daily_weight}
                    </span>
                  )}
                </div>

                {currentRation.composition && (
                  <div style={{ fontSize: '11px', background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    <strong>Composition:</strong> {currentRation.composition}
                  </div>
                )}

                {/* Feed components breakdown */}
                {(currentRation.alpha_kg > 0 || currentRation.mixed_grains_kg > 0 || currentRation.straw_kg > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                      { label: 'Alpha', kg: currentRation.alpha_kg, price: currentRation.alpha_price_per_kg },
                      { label: 'Mixed Grains', kg: currentRation.mixed_grains_kg, price: currentRation.mixed_grains_price_per_kg },
                      { label: 'Straw', kg: currentRation.straw_kg, price: currentRation.straw_price_per_kg },
                    ].filter(c => c.kg > 0).map(c => (
                      <div key={c.label} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>{c.label}</span>
                        <span style={{ fontSize: '11px', color: 'var(--primary-dark)', fontWeight: '700' }}>
                          {c.kg} kg pen total {c.price > 0 ? `· $${c.price}/kg` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {currentRation.schedule && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} color="var(--primary)" /> <strong>Schedule:</strong> {currentRation.schedule}
                  </div>
                )}

                {currentRation.notes && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px', background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <FileText size={13} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{currentRation.notes}</span>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                No feed ration configured for Pen {pen?.letter} yet. Click "Change Feed" to set one.
              </p>
            )}
          </div>

              {/* CHRONOLOGICAL FEEDING TIMELINE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <History size={15} color="var(--primary)" /> Previous Feeding Timeline ({historyList.length})
            </h4>

                {historyList.length === 0 ? (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                    No previous feeding history logged for Pen {pen?.letter}.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid var(--border-color)', paddingLeft: '12px', marginLeft: '6px' }}>
                    {historyList.map((item) => (
                      <div
                        key={item.id || item.date}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                            {item.food_type}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {formatDateLabel(item.date)}
                            </span>
                            {item.id && (
                              <div style={{ display: 'flex', gap: '6px', marginLeft: '2px' }}>
                                <button type="button" onClick={() => handleStartEditFeedingEntry(item)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }} title="Edit Feed Log">
                                  <Pencil size={13} />
                                </button>
                                <button type="button" onClick={() => setFeedingEntryToDelete(item)} style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0 }} title="Delete Feed Log">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {item.daily_weight && (
                          <span style={{ fontSize: '11px', color: 'var(--primary-dark)', fontWeight: '700' }}>
                            Weight: {item.daily_weight} {typeof item.daily_weight === 'number' || !String(item.daily_weight).includes('kg') ? 'kg' : ''}
                          </span>
                        )}

                        {(item.alpha_kg > 0 || item.mixed_grains_kg > 0 || item.straw_kg > 0) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                            {[
                              { label: 'Alpha', kg: item.alpha_kg, price: item.alpha_price_per_kg },
                              { label: 'Mixed Grains', kg: item.mixed_grains_kg, price: item.mixed_grains_price_per_kg },
                              { label: 'Straw', kg: item.straw_kg, price: item.straw_price_per_kg },
                            ].filter(c => c.kg > 0).map(c => (
                              <span key={c.label} style={{ fontSize: '10px', fontWeight: '700', color: 'var(--primary-dark)', background: '#f0fdf4', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '5px' }}>
                                {c.label}: {c.kg}kg {c.price > 0 ? `@$${c.price}/kg` : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.composition && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Composition: {item.composition}
                          </span>
                        )}

                        {item.notes && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={10} color="var(--primary)" /> {item.notes}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '14px' }}>
          <button className="btn btn-secondary" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>

      {/* EDIT FEEDING ENTRY MODAL */}
      {editingFeedingEntry && (
        <div className="modal-overlay" onClick={handleCancelEditFeedingEntry} style={{ zIndex: 130, fontFamily: "'Outfit', sans-serif" }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '18px', fontFamily: "'Outfit', sans-serif" }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ fontFamily: "'Outfit', sans-serif", margin: 0 }}>Edit Feed Log</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Update feeding record for Pen {pen?.letter}</span>
              </div>
              <button className="close-btn" onClick={handleCancelEditFeedingEntry} disabled={submittingFeeding}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedFeedingEntry} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Food Name / Feed Type *</label>
                <input type="text" className="form-input" value={feedingFoodType} onChange={(e) => setFeedingFoodType(e.target.value)} placeholder="Alfalfa Hay, Grain Mix..." disabled={submittingFeeding} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Daily Weight (kg)</label>
                  <input type="number" step="0.1" className="form-input" value={feedingWeight} onChange={(e) => setFeedingWeight(e.target.value)} placeholder="e.g. 15.0" disabled={submittingFeeding} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Schedule / Timing</label>
                  <input type="text" className="form-input" value={feedingSchedule} onChange={(e) => setFeedingSchedule(e.target.value)} placeholder="Twice daily..." disabled={submittingFeeding} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Composition / Formula</label>
                <input type="text" className="form-input" value={feedingComposition} onChange={(e) => setFeedingComposition(e.target.value)} placeholder="70% Alfalfa, 30% Grain" disabled={submittingFeeding} />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Notes</label>
                <input type="text" className="form-input" value={feedingNotes} onChange={(e) => setFeedingNotes(e.target.value)} placeholder="Ration notes..." disabled={submittingFeeding} />
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)' }}>Feed Components — Pen Totals (kg) & Price ($/kg)</span>
                {[
                  { label: 'Alpha', kg: feedingAlphaKg, setKg: setFeedingAlphaKg, price: feedingAlphaPrice, setPrice: setFeedingAlphaPrice },
                  { label: 'Mixed Grains', kg: feedingMixedKg, setKg: setFeedingMixedKg, price: feedingMixedPrice, setPrice: setFeedingMixedPrice },
                  { label: 'Straw', kg: feedingStrawKg, setKg: setFeedingStrawKg, price: feedingStrawPrice, setPrice: setFeedingStrawPrice },
                ].map(c => (
                  <div key={c.label} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>{c.label}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Total kg (Pen)</label>
                        <input type="number" step="0.1" min="0" className="form-input" value={c.kg} onChange={(e) => c.setKg(e.target.value)} disabled={submittingFeeding} placeholder="0.0" />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>$/kg</label>
                        <input type="number" step="0.01" min="0" className="form-input" value={c.price} onChange={(e) => c.setPrice(e.target.value)} disabled={submittingFeeding} placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEditFeedingEntry} disabled={submittingFeeding}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingFeeding}>
                  {submittingFeeding ? <><Loader2 size={14} className="spinner" /> Saving...</> : 'Save Feed Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE FEEDING CONFIRM MODAL */}
      {feedingEntryToDelete && (
        <DeleteConfirmModal
          title="Delete Feed Log"
          message="Are you sure you want to delete this feeding record?"
          onClose={() => setFeedingEntryToDelete(null)}
          onConfirm={confirmDeleteFeedingEntry}
        />
      )}

      {editingEntry && (
        <div className="modal-overlay" onClick={handleCancelEditEntry} style={{ zIndex: 130, fontFamily: "'Outfit', sans-serif" }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '18px', fontFamily: "'Outfit', sans-serif" }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ fontFamily: "'Outfit', sans-serif", margin: 0 }}>Edit Pen Milk Entry</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Update this pen-level milk log</span>
              </div>
              <button className="close-btn" onClick={handleCancelEditEntry} disabled={submittingMilk}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMilkEntry} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {/* SHIFT & DESTINATION SELECTORS */}
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Shift</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  {['Morning', 'Evening', 'Night'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMilkShift(s)}
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        border: milkShift === s ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                        background: milkShift === s ? 'var(--primary-light)' : '#f8fafc',
                        color: milkShift === s ? 'var(--primary-dark)' : 'var(--text-muted)'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Milk Purpose (Financial Profit Option)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'for_sale', label: '🏷️ For Sale', desc: 'Adds to Revenue' },
                    { id: 'home_use', label: '🏠 Home Use', desc: 'No Revenue' },
                    { id: 'farm_use', label: '🍼 Kid Feeding', desc: 'No Revenue' }
                  ].map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setMilkDestination(d.id)}
                      style={{
                        flex: 1,
                        padding: '5px 2px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        border: milkDestination === d.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                        background: milkDestination === d.id ? 'var(--primary-light)' : '#f8fafc',
                        color: milkDestination === d.id ? 'var(--primary-dark)' : 'var(--text-muted)'
                      }}
                      title={d.desc}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Date & Time</label>
                  <input type="datetime-local" className="form-input" value={milkDate} onChange={(e) => setMilkDate(e.target.value)} disabled={submittingMilk} required />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Milk (L)</label>
                  <input type="number" step="0.1" min="0" className="form-input" value={milkAmount} onChange={(e) => setMilkAmount(e.target.value)} placeholder="e.g. 12.5" disabled={submittingMilk} required />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Notes (optional)</label>
                <input type="text" className="form-input" value={milkNotes} onChange={(e) => setMilkNotes(e.target.value)} placeholder="Any notes..." disabled={submittingMilk} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEditEntry} disabled={submittingMilk}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingMilk}>
                  {submittingMilk ? <><Loader2 size={14} className="spinner" /> Saving...</> : 'Update Pen Milk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {entryToDelete && (
        <DeleteConfirmModal
          title="Delete Pen Milk Entry"
          message="This will remove this milk entry from the pen record."
          onClose={() => setEntryToDelete(null)}
          onConfirm={confirmDeleteEntry}
        />
      )}
    </div>
  );
}
