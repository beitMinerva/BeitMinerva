import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Bell, Syringe, Pill, Milk, Weight, Heart, X, Loader2, Trash2, Edit2, RotateCw } from 'lucide-react';
import ReminderDetailModal from '../components/ReminderDetailModal';
import EditReminderModal from '../components/EditReminderModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export function getRepeatFrequency(event) {
  if (!event) return 'none';
  if (typeof event.custom_fields === 'object' && event.custom_fields?.repeat_frequency) {
    return event.custom_fields.repeat_frequency;
  }
  if (typeof event.custom_fields === 'string') {
    try {
      const parsed = JSON.parse(event.custom_fields);
      if (parsed?.repeat_frequency) return parsed.repeat_frequency;
    } catch (e) {}
  }
  return event.repeat_frequency || 'none';
}

export function getRepeatLabel(repeatCode) {
  switch (repeatCode) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'every_3_months': return 'Every 3 Months';
    case 'every_6_months': return 'Every 6 Months';
    case 'yearly': return 'Yearly';
    default: return null;
  }
}

export function doesEventOccurOnDate(event, targetDateStr) {
  if (!event || !event.date) return false;
  const startDateStr = event.date.split('T')[0];
  if (startDateStr === targetDateStr) return true;

  const repeat = getRepeatFrequency(event);
  if (!repeat || repeat === 'none') return false;

  const startDate = new Date(startDateStr + 'T00:00:00');
  const targetDate = new Date(targetDateStr + 'T00:00:00');

  if (targetDate < startDate) return false;

  if (repeat === 'daily') return true;

  if (repeat === 'weekly') {
    const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % 7 === 0;
  }

  if (repeat === 'monthly') {
    return targetDate.getDate() === startDate.getDate();
  }

  if (repeat === 'every_3_months') {
    const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
    return targetDate.getDate() === startDate.getDate() && monthsDiff >= 0 && monthsDiff % 3 === 0;
  }

  if (repeat === 'every_6_months') {
    const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
    return targetDate.getDate() === startDate.getDate() && monthsDiff >= 0 && monthsDiff % 6 === 0;
  }

  if (repeat === 'yearly') {
    return targetDate.getDate() === startDate.getDate() && targetDate.getMonth() === startDate.getMonth();
  }

  return false;
}

export default function CalendarView({
  goats = [],
  events = [],
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

  // Form State for new reminder
  const [targetGoatId, setTargetGoatId] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderRepeat, setReminderRepeat] = useState('none');

  const handleModalClose = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setShowAddReminderModal(false);
      setIsModalClosing(false);
    }, 220);
  };

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
      setSelectedDateStr(null); // Toggle filter off if clicked again
    } else {
      setSelectedDateStr(formattedDate);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const targetGoat = goats.find((g) => g.id === targetGoatId);

    const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];

    try {
      if (onAddTimelineEvent) {
        await onAddTimelineEvent({
          goat_id: targetGoatId === 'ALL' ? (goats[0]?.id || 'herd') : targetGoatId,
          type: selectedCategory.id,
          title: `Scheduled: ${reminderTitle || selectedCategory.label}`,
          date: new Date(targetDate + 'T09:00:00').toISOString(),
          notes: `Target: ${targetGoatId === 'ALL' ? 'Entire Herd' : targetGoat?.name} ${reminderNotes ? `• ${reminderNotes}` : ''}`,
          custom_fields: { repeat_frequency: reminderRepeat }
        });
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
    const hasReminder = events.some((ev) => doesEventOccurOnDate(ev, cellDateStr));
    const isToday = cellDateStr === new Date().toISOString().split('T')[0];
    const isSelected = cellDateStr === selectedDateStr;

    calendarCells.push({
      key: `day-${d}`,
      dayNum: d,
      dateStr: cellDateStr,
      isCurrentMonth: true,
      hasReminder,
      isToday,
      isSelected
    });
  }

  // Filter events by selected date (including recurring instances!)
  const displayEvents = selectedDateStr
    ? events.filter((ev) => doesEventOccurOnDate(ev, selectedDateStr))
    : events;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Calendar & Task Reminders</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Tap any date cell to view or schedule task reminders for that day.
        </p>
      </div>

      {/* FULL MONTH CALENDAR */}
      <div className="calendar-container">
        <div className="calendar-header">
          <h3 className="calendar-month-title">{monthNames[month]} {year}</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-secondary btn-sm" onClick={prevMonth} aria-label="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth} aria-label="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="calendar-weekdays">
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
                style={{ cursor: 'pointer' }}
              >
                <span>{cell.dayNum}</span>
                {cell.hasReminder && <div className="reminder-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* SCHEDULED REMINDERS LIST WITH CLEAN SIMPLE UNIFORM CARDS */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Bell size={16} color="var(--primary)" />
              {selectedDateStr
                ? `Events for ${new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (${displayEvents.length})`
                : `All Scheduled Reminders (${events.length})`}
            </h3>
            {selectedDateStr && (
              <button
                className="btn btn-link btn-xs"
                onClick={() => setSelectedDateStr(null)}
                style={{ fontSize: '11px', color: 'var(--primary)', padding: 0, marginTop: '2px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '700' }}
              >
                ← Show All Dates
              </button>
            )}
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
          >
            <Plus size={14} /> Add Task
          </button>
        </div>

        {displayEvents.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
            {selectedDateStr
              ? `No reminders scheduled for ${new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. Tap "+ Add Task" to schedule one.`
              : 'No upcoming reminders. Tap any date on the calendar above to view or schedule one.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayEvents
              .slice()
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((rem) => {
                const meta = getCategoryMeta(rem.type);
                const repeatLabel = getRepeatLabel(getRepeatFrequency(rem));

                return (
                  <div
                    key={rem.id}
                    onClick={() => setSelectedReminderForDetail(rem)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease'
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
                          <strong style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                            {rem.title}
                          </strong>
                          {repeatLabel && (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <RotateCw size={10} /> {repeatLabel}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                          borderRadius: '6px'
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
          title="Delete Scheduled Reminder"
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

      {/* ADD TASK MODAL */}
      {showAddReminderModal && (
        <div className={`modal-overlay ${isModalClosing ? 'closing' : ''}`} onClick={handleModalClose}>
          <div className={`modal-content ${isModalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Schedule Farm Task / Reminder</h2>
              <button className="close-btn" onClick={handleModalClose} disabled={submitting}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder}>
              <div className="modal-body">
                {/* GOAT TARGET SELECTOR */}
                <div className="form-group">
                  <label className="form-label">Target Goat or Herd</label>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    <span
                      onClick={() => !submitting && setTargetGoatId('ALL')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: targetGoatId === 'ALL' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        background: targetGoatId === 'ALL' ? 'var(--primary-light)' : '#ffffff',
                        color: targetGoatId === 'ALL' ? 'var(--primary-dark)' : 'var(--text-main)',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      Entire Herd (All Goats)
                    </span>
                    {goats.map((g) => (
                      <span
                        key={g.id}
                        onClick={() => !submitting && setTargetGoatId(g.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: targetGoatId === g.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: targetGoatId === g.id ? 'var(--primary-light)' : '#ffffff',
                          color: targetGoatId === g.id ? 'var(--primary-dark)' : 'var(--text-main)',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {g.name} ({g.tag_id})
                      </span>
                    ))}
                  </div>
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

                <div className="form-group">
                  <label className="form-label">Repeat Schedule (Recurring Event)</label>
                  <select
                    className="form-select"
                    value={reminderRepeat}
                    onChange={(e) => setReminderRepeat(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="none">One-time event (No repeat)</option>
                    <option value="daily">Repeat Daily</option>
                    <option value="weekly">Repeat Weekly</option>
                    <option value="monthly">Repeat Monthly</option>
                    <option value="every_3_months">Repeat Every 3 Months</option>
                    <option value="every_6_months">Repeat Every 6 Months</option>
                    <option value="yearly">Repeat Yearly (Annual)</option>
                  </select>
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
