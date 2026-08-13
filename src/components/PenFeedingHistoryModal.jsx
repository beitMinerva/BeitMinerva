import React, { useState, useMemo } from 'react';
import { X, Wheat, Scale, Clock, Sparkles, History, Calendar, Milk, TrendingUp, Filter, Pencil, Trash2, Loader2, FileText } from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';
import { isMilkingEvent, getEventMetricValue } from '../utils/metricEventUtils';
import { getBeirutDateTimeString, getBeirutDateString, formatBeirutDisplay, isNurseryPenCheck } from '../services/goatService';

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

function PenMilkChart({ entries = [], groupBy = 'day' }) {
  if (!entries || entries.length === 0) return null;

  const getBucketKey = (dateInput, mode) => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    const beirutDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Beirut' }));
    const yyyy = beirutDate.getFullYear();
    const mm = String(beirutDate.getMonth() + 1).padStart(2, '0');
    const dd = String(beirutDate.getDate()).padStart(2, '0');

    if (mode === 'entry') return `${yyyy}-${mm}-${dd}T${String(beirutDate.getHours()).padStart(2, '0')}:${String(beirutDate.getMinutes()).padStart(2, '0')}`;
    if (mode === 'day') return `${yyyy}-${mm}-${dd}`;
    if (mode === 'month') return `${yyyy}-${mm}`;
    if (mode === 'year') return `${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatBucketLabel = (bucketKey, mode) => {
    if (!bucketKey) return 'Unknown';

    if (mode === 'entry') {
      const datePart = bucketKey.slice(0, 10);
      return datePart.slice(5);
    }
    if (mode === 'day') {
      return bucketKey.slice(5);
    }
    if (mode === 'month') {
      const [year, month] = bucketKey.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleString('en-US', { timeZone: 'Asia/Beirut', month: 'short', year: '2-digit' });
    }
    if (mode === 'year') {
      return bucketKey;
    }
    return bucketKey.slice(5);
  };

  const grouped = (() => {
    const map = new Map();

    entries.forEach((entry) => {
      const amount = Number(entry.amount_liters ?? entry.milk_liters ?? entry.amount ?? 0);
      if (!Number.isFinite(amount)) return;

      const bucketKey = getBucketKey(entry.date || entry.created_at || new Date(), groupBy);
      if (!bucketKey) return;

      const current = map.get(bucketKey) || {
        key: bucketKey,
        value: 0,
        label: formatBucketLabel(bucketKey, groupBy)
      };

      current.value += amount;
      map.set(bucketKey, current);
    });

    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  })();

  if (grouped.length === 0) return null;

  const values = grouped.map((item) => item.value);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1 || 10;

  const getX = (index) => {
    if (values.length === 1) return 150;
    return 24 + (index / (values.length - 1)) * (300 - 48);
  };

  const getY = (value) => {
    if (maxVal === minVal) return 60;
    return 120 - 24 - ((value - minVal) / (maxVal - minVal)) * (120 - 24 * 2);
  };

  const points = grouped.map((item, index) => `${getX(index)},${getY(item.value)}`).join(' ');

  return (
    <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '12px', padding: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '6px' }}>Pen Milk Trend</div>
      <svg width="100%" height="120" viewBox="0 0 300 120">
        <line x1={24} y1={24} x2={276} y2={24} stroke="var(--border-color)" strokeDasharray="3 3" />
        <line x1={24} y1={60} x2={276} y2={60} stroke="var(--border-color)" strokeDasharray="3 3" />
        <line x1={24} y1={96} x2={276} y2={96} stroke="var(--border-color)" />
        {grouped.length > 1 && <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {grouped.map((item, index) => {
          const x = getX(index);
          const y = getY(item.value);
          return (
            <g key={item.key || `${item.label}-${index}`}>
              <circle cx={x} cy={y} r="3" fill="var(--primary-dark)" />
              <text x={x + 6} y={y - 8} fontSize="9" fontWeight="700" fill="var(--primary-dark)">
                {item.value.toFixed(1)} L
              </text>
              <text x={x - 10} y={116} fontSize="7" fontWeight="700" fill="var(--text-muted)">
                {item.label}
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
  const [feedingEntryToDelete, setFeedingEntryToDelete] = useState(null);
  const [milkChartGroup, setMilkChartGroup] = useState('day');

  const handleStartEditFeedingEntry = (item) => {
    if (onOpenEditForm) {
      onOpenEditForm(pen, item);
      return;
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
    const uniqueDays = Math.max(1, new Set(filteredMilkingEntries.map(e => getBeirutDateString(e.date || e.created_at))).size);
    const dailyAvg = total / uniqueDays;
    const penAverage = dailyAvg / goatCount;
    return { total, dailyAvg, penAverage, count: values.length, goatCount, uniqueDays };
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
                      <input type="number" step="any" min="0" className="form-input" value={milkAmount} onChange={(e) => setMilkAmount(e.target.value)} placeholder="e.g. 12.5" disabled={submittingMilk} required />
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
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-dark)' }}>Pen Milk Yield Summary</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>{milkingSummary.total.toFixed(1)} L Total</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{milkingSummary.goatCount} goats · {milkingSummary.uniqueDays} {milkingSummary.uniqueDays === 1 ? 'day' : 'days'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-main)', fontWeight: '700' }}>
                    <span>Daily Yield (Summed): {milkingSummary.dailyAvg.toFixed(1)} L/day</span>
                    <span style={{ color: 'var(--primary-dark)', fontWeight: '800' }}>{milkingSummary.penAverage.toFixed(2)} L/goat/day</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>Chart group:</span>
                {[
                  { id: 'entry', label: 'By Entry' },
                  { id: 'day', label: 'By Day' },
                  { id: 'month', label: 'By Month' },
                  { id: 'year', label: 'By Year' }
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMilkChartGroup(option.id)}
                    style={{
                      background: milkChartGroup === option.id ? 'var(--primary-light)' : '#ffffff',
                      color: milkChartGroup === option.id ? 'var(--primary-dark)' : 'var(--text-muted)',
                      border: milkChartGroup === option.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '10px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <PenMilkChart entries={filteredMilkingEntries} groupBy={milkChartGroup} />

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
                              const destStyles = {
                                for_sale: { label: 'Sale', color: '#15803d', bg: '#f0fdf4', border: '#a7f3d0' },
                                home_use: { label: 'Home Use', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                                farm_use: { label: 'Farm Use', color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
                              };
                              const dest = item.destination || 'for_sale';
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
                    {(currentRation.food_type || '').replace(/\bAlpha\b/gi, isNurseryPenCheck(pen) ? 'Milk' : 'Alpha')}
                  </strong>
                  {currentRation.daily_weight && (
                    <span style={{ fontSize: '11px', fontWeight: '800', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '9999px' }}>
                      <Scale size={10} style={{ display: 'inline', marginRight: '3px' }} /> {currentRation.daily_weight}
                    </span>
                  )}
                </div>

                {currentRation.composition && (
                  <div style={{ fontSize: '11px', background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    <strong>Composition:</strong> {(currentRation.composition || '').replace(/\bAlpha\b/gi, isNurseryPenCheck(pen) ? 'Milk' : 'Alpha')}
                  </div>
                )}

                {/* Feed components breakdown */}
                {(currentRation.alpha_kg > 0 || currentRation.mixed_grains_kg > 0 || currentRation.straw_kg > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                      { label: isNurseryPenCheck(pen) ? 'Milk' : 'Alpha', kg: currentRation.alpha_kg, price: currentRation.alpha_price_per_kg },
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
                            {(item.food_type || '').replace(/\bAlpha\b/g, isNurseryPenCheck(pen) ? 'Milk' : 'Alpha')}
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
                              { label: isNurseryPenCheck(pen) ? 'Milk' : 'Alpha', kg: item.alpha_kg, price: item.alpha_price_per_kg },
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
