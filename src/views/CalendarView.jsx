import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Bell, Syringe, Pill, Milk, Weight, Heart, X, Loader2, Trash2, Edit2, RotateCw, Users, Home, CheckSquare, Square, Search, Filter, History } from 'lucide-react';
import ReminderDetailModal from '../components/ReminderDetailModal';
import EditReminderModal from '../components/EditReminderModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import CustomRepeatPicker from '../components/CustomRepeatPicker';

export function getRepeatFrequency(event) {
  if (!event) return { frequency: 'none', days: 21 };

  let frequency = 'none';
  let days = 21;

  if (typeof event.custom_fields === 'object' && event.custom_fields) {
    frequency = event.custom_fields.repeat_frequency || 'none';
    days = parseInt(event.custom_fields.custom_repeat_days) || 21;
  } else if (typeof event.custom_fields === 'string') {
    try {
      const parsed = JSON.parse(event.custom_fields);
      if (parsed) {
        frequency = parsed.repeat_frequency || 'none';
        days = parseInt(parsed.custom_repeat_days) || 21;
      }
    } catch (e) {}
  } else if (event.repeat_frequency) {
    frequency = event.repeat_frequency;
  }

  return { frequency, days };
}

export function getRepeatLabel(event) {
  const { frequency, days } = getRepeatFrequency(event);
  switch (frequency) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'every_3_months': return 'Every 3 Months';
    case 'every_6_months': return 'Every 6 Months';
    case 'yearly': return 'Yearly';
    case 'custom': return `Every ${days} Days`;
    default: return null;
  }
}

export function getEventTargetBadge(event, goats = [], barnAreas = []) {
  if (!event) return { label: 'Single Goat', icon: Users, bg: '#f1f5f9', color: '#334155' };
  const notes = event.notes || '';

  if (event.goat_id === 'herd' || notes.includes('Target: Entire Herd') || notes.includes('Entire Herd')) {
    return { label: 'Entire Herd', icon: Users, bg: '#f1f5f9', color: '#334155' };
  }

  const goat = goats.find((g) => g.id === event.goat_id);
  if (goat) {
    const pen = barnAreas.find((p) => p.id === goat.area_id);
    return {
      label: `${goat.tag_id} (${goat.name})`,
      penLetter: pen ? pen.letter : null,
      icon: null,
      bg: '#ecfdf5',
      color: '#047857'
    };
  }

  if (notes.includes('Target: Pen') || notes.includes('By Barn Pen')) {
    return { label: 'Barn Pen', icon: Home, bg: '#e0f2fe', color: '#0369a1' };
  }

  return { label: 'Goat Record', icon: null, bg: '#f1f5f9', color: '#334155' };
}

export function doesEventOccurOnDate(event, targetDateStr) {
  if (!event || !event.date) return false;
  const startDateStr = event.date.split('T')[0];
  if (startDateStr === targetDateStr) return true;

  const { frequency, days } = getRepeatFrequency(event);
  if (!frequency || frequency === 'none') return false;

  const startDate = new Date(startDateStr + 'T00:00:00');
  const targetDate = new Date(targetDateStr + 'T00:00:00');

  if (targetDate < startDate) return false;

  if (frequency === 'daily') return true;

  if (frequency === 'weekly') {
    const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % 7 === 0;
  }

  if (frequency === 'custom') {
    const customDays = days > 0 ? days : 21;
    const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % customDays === 0;
  }

  if (frequency === 'monthly') {
    return targetDate.getDate() === startDate.getDate();
  }

  if (frequency === 'every_3_months') {
    const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
    return targetDate.getDate() === startDate.getDate() && monthsDiff >= 0 && monthsDiff % 3 === 0;
  }

  if (frequency === 'every_6_months') {
    const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
    return targetDate.getDate() === startDate.getDate() && monthsDiff >= 0 && monthsDiff % 6 === 0;
  }

  if (frequency === 'yearly') {
    return targetDate.getDate() === startDate.getDate() && targetDate.getMonth() === startDate.getMonth();
  }

  return false;
}

export default function CalendarView({
  goats = [],
  events = [],
  barnAreas = [],
  onRequireAdmin,
  onAddTimelineEvent,
  onUpdateTimelineEvent,
  onDeleteTimelineEvent
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal, Edit & Delete States
  const [selectedReminderForDetail, setSelectedReminderForDetail] = useState(null);
  const [reminderToEdit, setReminderToEdit] = useState(null);
  const [reminderToDelete, setReminderToDelete] = useState(null);

  const categories = [
    { id: 'Vaccination', label: 'Vaccination Booster', icon: Syringe, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { id: 'Medication', label: 'Medication', icon: Pill, color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
    { id: 'Milking', label: 'Milking Schedule', icon: Milk, color: '#0369a1', bg: '#f0f9ff', border: '#e0f2fe' },
    { id: 'Weight Check', label: 'Weight Measurement', icon: Weight, color: '#7e22ce', bg: '#faf5ff', border: '#f3e8ff' },
    { id: 'Pregnancy Check', label: 'Pregnancy Check', icon: Heart, color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' },
    { id: 'General', label: 'General Task', icon: Bell, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  ];

  // Target Goat Selection States (Entire Herd / Pen / Custom)
  const [targetMode, setTargetMode] = useState('ALL'); // 'ALL' | 'PEN' | 'CUSTOM'
  const [selectedPenId, setSelectedPenId] = useState(barnAreas[0]?.id || 'area-1');
  const [selectedGoatIds, setSelectedGoatIds] = useState(goats.map((g) => g.id));
  const [goatSearchTerm, setGoatSearchTerm] = useState('');

  // Form State for new reminder
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderRepeat, setReminderRepeat] = useState('none');
  const [reminderCustomDays, setReminderCustomDays] = useState('21');

  const handleModalClose = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setShowAddReminderModal(false);
      setIsModalClosing(false);
    }, 220);
  };

  const getTargetGoats = () => {
    if (targetMode === 'ALL') return goats;
    if (targetMode === 'PEN') return goats.filter((g) => g.area_id === selectedPenId);
    if (targetMode === 'CUSTOM') return goats.filter((g) => selectedGoatIds.includes(g.id));
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

  const searchedGoats = goats.filter((g) => {
    if (!goatSearchTerm.trim()) return true;
    const q = goatSearchTerm.trim().toLowerCase();
    return g.name.toLowerCase().includes(q) || g.tag_id.toLowerCase().includes(q) || (g.breed || '').toLowerCase().includes(q);
  });

  const activeTargetCount = getTargetGoats().length;

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (dayNum) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    if (selectedDateStr === formattedDate) {
      setSelectedDateStr(null);
    } else {
      setSelectedDateStr(formattedDate);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    const targetGoatsList = getTargetGoats();
    if (targetGoatsList.length === 0) {
      alert('Please select at least one goat for this task reminder.');
      return;
    }

    setSubmitting(true);
    const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];

    const payload = targetGoatsList.map((g) => ({
      goat_id: g.id,
      type: selectedCategory.id,
      title: `Scheduled: ${reminderTitle || selectedCategory.label}`,
      date: new Date(targetDate + 'T09:00:00').toISOString(),
      notes: `Target: ${g.name} (${g.tag_id}) ${reminderNotes ? `• ${reminderNotes}` : ''}`,
      custom_fields: {
        repeat_frequency: reminderRepeat,
        custom_repeat_days: parseInt(reminderCustomDays) || 21
      }
    }));

    try {
      if (onAddTimelineEvent) {
        await onAddTimelineEvent(payload.length === 1 ? payload[0] : payload);
      }
      handleModalClose();
      setReminderTitle('');
      setReminderNotes('');
      setReminderRepeat('none');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryMeta = (type) => {
    const found = categories.find((c) => c.id === type || (type === 'Milking Yield' && c.id === 'Milking'));
    if (found) return found;
    return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: Bell };
  };

  const getReminderIcon = (type) => {
    const meta = getCategoryMeta(type);
    const Icon = meta.icon;
    return <Icon size={18} color={meta.color} />;
  };

  const formatReminderDate = (dateStr) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const eventDateStr = new Date(dateStr).toISOString().split('T')[0];
    if (eventDateStr === todayStr) return 'Today';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Build Calendar Cells
  const calendarCells = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarCells.push({ key: `blank-${i}`, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = events.filter((ev) => doesEventOccurOnDate(ev, cellDateStr));

    const hasScheduled = dayEvents.some((ev) =>
      ev.title?.toLowerCase().startsWith('scheduled') || getRepeatFrequency(ev).frequency !== 'none'
    );
    const hasLogged = dayEvents.some((ev) =>
      !ev.title?.toLowerCase().startsWith('scheduled') && getRepeatFrequency(ev).frequency === 'none'
    );

    const isToday = cellDateStr === new Date().toISOString().split('T')[0];
    const isSelected = cellDateStr === selectedDateStr;

    calendarCells.push({
      key: `day-${d}`,
      dayNum: d,
      dateStr: cellDateStr,
      isCurrentMonth: true,
      hasScheduled,
      hasLogged,
      isToday,
      isSelected
    });
  }

  // Filter events by selected date
  const dateEvents = selectedDateStr
    ? events.filter((ev) => doesEventOccurOnDate(ev, selectedDateStr))
    : events;

  // Separate Scheduled Tasks vs Logged Health Events History
  const scheduledEvents = dateEvents.filter((ev) =>
    ev.title?.toLowerCase().startsWith('scheduled') ||
    getRepeatFrequency(ev).frequency !== 'none'
  );

  const loggedEvents = dateEvents.filter((ev) =>
    !ev.title?.toLowerCase().startsWith('scheduled') &&
    getRepeatFrequency(ev).frequency === 'none'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Outfit', sans-serif" }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}>Calendar & Event Records</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
          Tap any date cell on the calendar to filter tasks and recorded health events per goat or herd.
        </p>
      </div>

      {/* FULL MONTH CALENDAR WITH DISTINCT COLORED DOT INDICATORS */}
      <div className="calendar-container">
        <div className="calendar-header">
          <h3 className="calendar-month-title" style={{ fontFamily: "'Outfit', sans-serif" }}>{monthNames[month]} {year}</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-secondary btn-sm" onClick={prevMonth} aria-label="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth} aria-label="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* CALENDAR LEGEND */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '11px', fontWeight: '700' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669' }} />
            Scheduled Task
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0284c7' }} />
            Logged Event History
          </div>
        </div>

        <div className="calendar-weekdays" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="calendar-days-grid">
          {calendarCells.map((cell) => {
            if (!cell.isCurrentMonth) {
              return <div key={cell.key} className="calendar-day-cell other-month" />;
            }

            return (
              <div
                key={cell.key}
                onClick={() => handleDateClick(cell.dayNum)}
                className={`calendar-day-cell ${cell.isToday ? 'today' : ''} ${cell.isSelected ? 'selected' : ''}`}
                style={{ cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px' }}
              >
                <span style={{ lineHeight: 1 }}>{cell.dayNum}</span>

                {/* DISTINCT COLORED DOT INDICATORS */}
                <div style={{ display: 'flex', gap: '3px', marginTop: '2px', alignItems: 'center', justifyContent: 'center', minHeight: '6px' }}>
                  {cell.hasScheduled && (
                    <div
                      title="Scheduled Task"
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#059669',
                        boxShadow: '0 0 4px rgba(5,150,105,0.4)'
                      }}
                    />
                  )}
                  {cell.hasLogged && (
                    <div
                      title="Logged Health Event"
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#0284c7',
                        boxShadow: '0 0 4px rgba(2,132,199,0.4)'
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDateStr && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', border: '1px solid var(--primary-border)', padding: '8px 12px', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-dark)' }}>
            Showing records for {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            className="btn btn-secondary btn-xs"
            onClick={() => setSelectedDateStr(null)}
            style={{ fontSize: '11px', fontWeight: '700' }}
          >
            Show All Dates
          </button>
        </div>
      )}

      {/* SECTION 1: SCHEDULED FARM REMINDERS & TASKS CARD */}
      <div className="card" style={{ padding: '16px', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              <Bell size={16} color="var(--primary)" /> Scheduled Farm Tasks & Reminders ({scheduledEvents.length})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Upcoming & recurring task schedules
            </span>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (onRequireAdmin) {
                onRequireAdmin(() => setShowAddReminderModal(true));
              } else {
                setShowAddReminderModal(true);
              }
            }}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            <Plus size={14} /> Schedule Task
          </button>
        </div>

        {scheduledEvents.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
            No scheduled tasks found. Tap "+ Schedule Task" to add a reminder.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scheduledEvents
              .slice()
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((rem) => {
                const meta = getCategoryMeta(rem.type);
                const repeatLabel = getRepeatLabel(rem);
                const targetBadge = getEventTargetBadge(rem, goats, barnAreas);

                return (
                  <div
                    key={rem.id}
                    onClick={() => setSelectedReminderForDetail(rem)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      background: '#ffffff',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getReminderIcon(rem.type)}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>
                            {rem.title}
                          </strong>

                          {/* REPEAT BADGE */}
                          {repeatLabel && (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <RotateCw size={10} /> {repeatLabel}
                            </span>
                          )}

                          {/* TARGET BADGE */}
                          {targetBadge && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                background: targetBadge.bg,
                                color: targetBadge.color,
                                padding: '1px 7px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              {targetBadge.label}
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Outfit', sans-serif" }}>
                          {rem.notes || rem.type}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          background: '#f1f5f9',
                          color: 'var(--text-main)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontFamily: "'Outfit', sans-serif"
                        }}
                      >
                        {formatReminderDate(rem.date)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* SECTION 2: COMPLETED & LOGGED HEALTH EVENTS HISTORY CARD */}
      <div className="card" style={{ padding: '16px', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              <History size={16} color="var(--primary)" /> Recorded Health & Herd Events History ({loggedEvents.length})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Completed vaccines, medications, milkings, weights, & pregnancy checks
            </span>
          </div>
        </div>

        {loggedEvents.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
            No recorded health events found for this selection.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loggedEvents
              .slice()
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((rem) => {
                const meta = getCategoryMeta(rem.type);
                const targetBadge = getEventTargetBadge(rem, goats, barnAreas);

                return (
                  <div
                    key={rem.id}
                    onClick={() => setSelectedReminderForDetail(rem)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      background: '#ffffff',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getReminderIcon(rem.type)}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>
                            {rem.title}
                          </strong>

                          {/* TARGET BADGE */}
                          {targetBadge && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                background: targetBadge.bg,
                                color: targetBadge.color,
                                padding: '1px 7px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              {targetBadge.label}
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Outfit', sans-serif" }}>
                          {rem.notes || rem.type}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          background: '#f1f5f9',
                          color: 'var(--text-main)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontFamily: "'Outfit', sans-serif"
                        }}
                      >
                        {formatReminderDate(rem.date)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedReminderForDetail && (
        <ReminderDetailModal
          reminder={selectedReminderForDetail}
          goat={goats.find((g) => g.id === selectedReminderForDetail.goat_id)}
          onClose={() => setSelectedReminderForDetail(null)}
          onEdit={(rem) => {
            if (onRequireAdmin) {
              onRequireAdmin(() => {
                setSelectedReminderForDetail(null);
                setReminderToEdit(rem);
              });
            } else {
              setSelectedReminderForDetail(null);
              setReminderToEdit(rem);
            }
          }}
          onDelete={(rem) => {
            if (onRequireAdmin) {
              onRequireAdmin(() => {
                setSelectedReminderForDetail(null);
                setReminderToDelete(rem);
              });
            } else {
              setSelectedReminderForDetail(null);
              setReminderToDelete(rem);
            }
          }}
        />
      )}

      {/* EDIT MODAL */}
      {reminderToEdit && (
        <EditReminderModal
          reminder={reminderToEdit}
          goats={goats}
          onClose={() => setReminderToEdit(null)}
          onSave={async (eventId, updates) => {
            if (onUpdateTimelineEvent) {
              await onUpdateTimelineEvent(eventId, updates);
            }
            setReminderToEdit(null);
          }}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {reminderToDelete && (
        <DeleteConfirmModal
          title="Delete Event / Task"
          message={`Are you sure you want to delete "${reminderToDelete.title || reminderToDelete.type}"?`}
          onClose={() => setReminderToDelete(null)}
          onConfirm={async () => {
            if (onDeleteTimelineEvent) {
              await onDeleteTimelineEvent(reminderToDelete.id);
            }
            setReminderToDelete(null);
          }}
        />
      )}

      {/* ADD TASK MODAL WITH RICH BATCH TARGET SELECTOR */}
      {showAddReminderModal && (
        <div className={`modal-overlay ${isModalClosing ? 'closing' : ''}`} onClick={handleModalClose}>
          <div className={`modal-content ${isModalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', fontFamily: "'Outfit', sans-serif" }}>
            <div className="modal-header">
              <h2 className="modal-title">Schedule Farm Task / Reminder</h2>
              <button className="close-btn" onClick={handleModalClose} disabled={submitting}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder}>
              <div className="modal-body">
                {/* TARGET GOAT SELECTOR (HERD / PEN / CUSTOM) */}
                <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Apply To Goats *</label>
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

                {/* CATEGORY CUSTOM CARDS GRID */}
                <div className="form-group">
                  <label className="form-label">Reminder Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory.id === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => !submitting && setSelectedCategory(cat)}
                          style={{
                            padding: '10px 6px',
                            borderRadius: '12px',
                            border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border-color)',
                            background: isSelected ? cat.bg : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            textAlign: 'center'
                          }}
                        >
                          <Icon size={16} color={cat.color} />
                          <span style={{ fontSize: '11px', fontWeight: '800', color: isSelected ? cat.color : 'var(--text-main)', lineHeight: 1.1 }}>
                            {cat.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reminder Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CD&T Booster Dose, Deworming..."
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* REPEAT FREQUENCY */}
                <div className="form-group">
                  <label className="form-label">Repeat Schedule (Recurring Event)</label>
                  <CustomRepeatPicker
                    repeatFrequency={reminderRepeat}
                    customRepeatDays={reminderCustomDays}
                    onChangeRepeat={(freq, days) => {
                      setReminderRepeat(freq);
                      if (days) setReminderCustomDays(days);
                    }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Instructions</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Enter specific instructions or dosages..."
                    value={reminderNotes}
                    onChange={(e) => setReminderNotes(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleModalClose} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Scheduling...
                    </>
                  ) : (
                    'Save Task Reminder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
