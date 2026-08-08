import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Bell, Syringe, Pill, Milk, Weight, Heart, X, Loader2, Trash2, Edit2 } from 'lucide-react';
import ReminderDetailModal from '../components/ReminderDetailModal';
import EditReminderModal from '../components/EditReminderModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function CalendarView({ goats = [], events = [], onAddTimelineEvent, onUpdateTimelineEvent, onDeleteTimelineEvent }) {
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
    setSelectedDateStr(formattedDate);
    setShowAddReminderModal(true);
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const targetGoat = goats.find((g) => g.id === targetGoatId);
    
    try {
      if (onAddTimelineEvent) {
        await onAddTimelineEvent({
          goat_id: targetGoatId === 'ALL' ? (goats[0]?.id || 'herd') : targetGoatId,
          type: selectedCategory.id,
          title: `Scheduled: ${reminderTitle || selectedCategory.label}`,
          date: new Date(selectedDateStr).toISOString(),
          notes: `Target: ${targetGoatId === 'ALL' ? 'Entire Herd' : targetGoat?.name} ${reminderNotes ? `• ${reminderNotes}` : ''}`
        });
      }
      handleModalClose();
      setReminderTitle('');
      setReminderNotes('');
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
    const hasReminder = events.some((ev) => ev.date && ev.date.startsWith(cellDateStr));
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Calendar & Task Reminders</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Tap any date cell to schedule a task reminder for a goat or the entire herd.
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
          <h3 style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bell size={16} color="var(--primary)" /> Scheduled Farm Reminders ({events.length})
          </h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddReminderModal(true)}>
            <Plus size={14} /> Add Task
          </button>
        </div>

        {events.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
            No upcoming reminders. Tap any date on the calendar above to schedule one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events
              .slice()
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((rem) => {
                const meta = getCategoryMeta(rem.type);

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
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      {/* DYNAMIC MATCHED ICON BADGE BACKGROUND & ICON COLOR */}
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                          display: 'grid',
                          placeItems: 'center',
                          lineHeight: 0,
                          flexShrink: 0
                        }}
                      >
                        {getReminderIcon(rem.type)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ fontSize: '13px', display: 'block', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rem.title}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rem.notes ? rem.notes : `Category: ${rem.type}`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: meta.color,
                          background: meta.bg,
                          border: `1px solid ${meta.border}`
                        }}
                      >
                        {formatReminderDate(rem.date)}
                      </span>

                      {onUpdateTimelineEvent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReminderToEdit(rem);
                          }}
                          style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Edit Task Reminder"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}

                      {onDeleteTimelineEvent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReminderToDelete(rem);
                          }}
                          style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Delete Task Reminder"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* REMINDER DETAIL POP-UP MODAL */}
      {selectedReminderForDetail && (
        <ReminderDetailModal
          reminder={selectedReminderForDetail}
          onClose={() => setSelectedReminderForDetail(null)}
          onEdit={(rem) => {
            setSelectedReminderForDetail(null);
            setReminderToEdit(rem);
          }}
          onDelete={onDeleteTimelineEvent ? (id) => onDeleteTimelineEvent(id) : undefined}
        />
      )}

      {/* EDIT REMINDER MODAL */}
      {reminderToEdit && (
        <EditReminderModal
          reminder={reminderToEdit}
          goats={goats}
          onClose={() => setReminderToEdit(null)}
          onSave={onUpdateTimelineEvent}
        />
      )}

      {/* DELETE REMINDER CONFIRMATION POPUP MODAL */}
      {reminderToDelete && (
        <DeleteConfirmModal
          title="Delete Task Reminder"
          message={`Are you sure you want to delete "${reminderToDelete.title}"?`}
          onClose={() => setReminderToDelete(null)}
          onConfirm={() => onDeleteTimelineEvent && onDeleteTimelineEvent(reminderToDelete.id)}
        />
      )}

      {/* SET REMINDER MODAL WITH SLIDE DOWN ANIMATION */}
      {showAddReminderModal && (
        <div className={`modal-overlay ${isModalClosing ? 'closing' : ''}`} onClick={handleModalClose}>
          <div className={`modal-content ${isModalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Set Task Reminder for {selectedDateStr}</h3>
              <button className="close-btn" onClick={handleModalClose} disabled={submitting}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder}>
              <div className="modal-body">
                
                {/* APPLIES TO TARGET GOAT CHIPS */}
                <div className="form-group">
                  <label className="form-label">Target Goat / Herd</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
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
                        cursor: 'pointer'
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
                          cursor: 'pointer'
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
                      <Loader2 size={16} className="spinner" /> Saving Task...
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
