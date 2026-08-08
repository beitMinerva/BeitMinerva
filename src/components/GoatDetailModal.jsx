import React, { useState, useRef } from 'react';
import { ArrowLeft, Trash2, Pencil, Calendar, Heart, Weight, Milk, Syringe, Pill, Plus, ChevronRight, X, Loader2, ArrowRightLeft, Edit2 } from 'lucide-react';
import GoatMetricsChart from './GoatMetricsChart';
import DeleteConfirmModal from './DeleteConfirmModal';
import EditReminderModal from './EditReminderModal';
import EventDetailModal from './EventDetailModal';

export function formatBeirutDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function GoatDetailModal({
  goat,
  events = [],
  barnAreas = [],
  onClose,
  onEditGoat,
  onDeleteGoat,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRequireAdmin,
  onTransferArea
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [showDeleteGoatModal, setShowDeleteGoatModal] = useState(false);

  // Event Detail, Edit & Delete States
  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);

  // Quick Task Reminder Modal State directly in Goat Profile
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isReminderModalClosing, setIsReminderModalClosing] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderCategory, setReminderCategory] = useState('Vaccination');
  const [reminderNotes, setReminderNotes] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const [pullY, setPullY] = useState(0);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current > 0) {
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        setPullY(delta);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 60) {
      handleAnimatedClose();
    } else {
      setPullY(0);
    }
    touchStartY.current = 0;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Healthy': return 'badge-healthy';
      case 'Under Treatment': return 'badge-treatment';
      case 'Pregnant': return 'badge-pregnant';
      case 'Dry': return 'badge-dry';
      case 'Quarantine': return 'badge-quarantine';
      default: return 'badge-healthy';
    }
  };

  const getCategoryBadgeStyle = (type) => {
    switch (type) {
      case 'Vaccination': return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'Medication': return { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' };
      case 'Milking Yield':
      case 'Milking': return { bg: '#f0f9ff', color: '#0369a1', border: '#e0f2fe' };
      case 'Weight Check': return { bg: '#faf5ff', color: '#7e22ce', border: '#f3e8ff' };
      case 'Pregnancy Check': return { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' };
      case 'Transfer': return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    }
  };

  const currentBarnArea = barnAreas.find((b) => b.id === goat?.area_id) || { letter: 'A', name: 'Pen A' };

  const handleReminderModalClose = () => {
    setIsReminderModalClosing(true);
    setTimeout(() => {
      setShowReminderModal(false);
      setIsReminderModalClosing(false);
    }, 220);
  };

  const handleSaveReminderSubmit = async (e) => {
    e.preventDefault();
    setSavingReminder(true);

    try {
      if (onAddEvent) {
        await onAddEvent({
          goat_id: goat.id,
          type: reminderCategory,
          title: `Scheduled: ${reminderTitle.trim()}`,
          date: new Date(reminderDate + 'T09:00:00').toISOString(),
          notes: reminderNotes.trim()
        });
      }
      handleReminderModalClose();
      setReminderTitle('');
      setReminderDate('');
      setReminderNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingReminder(false);
    }
  };

  const reminderCategories = [
    { id: 'Vaccination', label: 'Vaccination Booster', icon: Syringe, color: '#059669', bg: '#ecfdf5' },
    { id: 'Medication', label: 'Medication Dose', icon: Pill, color: '#c2410c', bg: '#fff7ed' },
    { id: 'Milking', label: 'Milking Schedule', icon: Milk, color: '#0369a1', bg: '#f0f9ff' },
    { id: 'Weight Check', label: 'Weight Check', icon: Weight, color: '#7e22ce', bg: '#faf5ff' },
    { id: 'Pregnancy Check', label: 'Pregnancy Check', icon: Heart, color: '#be185d', bg: '#fdf2f8' },
  ];

  return (
    <>
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`full-page-animate ${isClosing ? 'full-page-close-animate' : ''}`}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#ffffff',
          zIndex: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
          transition: pullY === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          fontFamily: "'Outfit', sans-serif"
        }}
      >
        {/* PULL DOWN HANDLE BAR */}
        <div style={{ padding: '8px 0 2px 0', display: 'flex', justifyContent: 'center', background: '#ffffff', cursor: 'grab' }}>
          <div style={{ width: '42px', height: '5px', borderRadius: '9999px', background: '#cbd5e1' }} />
        </div>

        {/* FULL PAGE HEADER */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#ffffff',
            borderBottom: '1px solid var(--border-color)',
            padding: '8px 16px 12px 16px',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            zIndex: 10
          }}
        >
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleAnimatedClose}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Outfit', sans-serif" }}
          >
            <ArrowLeft size={16} /> Back to Herd
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            {onDeleteGoat && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDeleteGoatModal(true)}
                style={{ color: '#dc2626', borderColor: '#fee2e2', padding: '6px 9px' }}
                title="Delete Goat Record"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const action = () => onEditGoat(goat);
                if (onRequireAdmin) onRequireAdmin(action);
                else action();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Outfit', sans-serif" }}
            >
              <Pencil size={13} /> Edit Profile
            </button>
          </div>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* PROFILE SUMMARY CARD */}
          <div className="card" style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            {goat.photo_url ? (
              <img
                src={goat.photo_url}
                alt={goat.name}
                style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary-dark)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '32px',
                  fontWeight: '800'
                }}
              >
                {goat.name ? goat.name[0].toUpperCase() : 'G'}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {goat.name}
                </h1>
                <span className={`badge ${getStatusBadgeClass(goat.status)}`} style={{ fontSize: '11px' }}>
                  {goat.status}
                </span>
              </div>

              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-dark)', display: 'block' }}>
                Tag: {goat.tag_id}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                {goat.breed} • {goat.gender} • Barn Pen {currentBarnArea.letter}
              </span>
            </div>
          </div>

          {/* QUICK ACTIONS BAR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              className="btn btn-primary btn-full"
              onClick={() => {
                const action = () => onAddEvent(goat);
                if (onRequireAdmin) onRequireAdmin(action);
                else action();
              }}
              style={{ padding: '10px', fontSize: '13px' }}
            >
              <Plus size={16} /> Log Health Event
            </button>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => {
                const action = () => setShowReminderModal(true);
                if (onRequireAdmin) onRequireAdmin(action);
                else action();
              }}
              style={{ padding: '10px', fontSize: '13px' }}
            >
              <Calendar size={16} /> Schedule Task
            </button>
          </div>

          {/* GOAT METRICS PROGRESSION CHART */}
          <GoatMetricsChart events={events} />

          {/* TIMELINE EVENT HISTORY */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Goat Timeline History ({events.length})</span>
            </h3>

            {events.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
                No timeline events recorded for {goat.name}. Click "Log Health Event" above to record weight progression, milking yields, or vaccinations.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {events.map((ev) => {
                  const catStyle = getCategoryBadgeStyle(ev.type);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventForDetail(ev)}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block', lineHeight: 1.2 }}>
                            {ev.title || ev.type}
                          </strong>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              color: catStyle.color,
                              background: catStyle.bg,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              border: `1px solid ${catStyle.border}`,
                              display: 'inline-block',
                              marginTop: '4px'
                            }}
                          >
                            {ev.type}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {formatBeirutDateTime(ev.date)}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const action = () => setEventToEdit(ev);
                              if (onRequireAdmin) onRequireAdmin(action);
                              else action();
                            }}
                            style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Edit Timeline Entry"
                          >
                            <Edit2 size={13} />
                          </button>

                          {onDeleteEvent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const action = () => setEventToDelete(ev);
                                if (onRequireAdmin) onRequireAdmin(action);
                                else action();
                              }}
                              style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Delete Timeline Entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {ev.notes && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ev.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EVENT DETAIL POPUP MODAL */}
      {selectedEventForDetail && (
        <EventDetailModal
          event={selectedEventForDetail}
          goat={goat}
          onClose={() => setSelectedEventForDetail(null)}
          onEdit={(ev) => {
            setSelectedEventForDetail(null);
            const action = () => setEventToEdit(ev);
            if (onRequireAdmin) onRequireAdmin(action);
            else action();
          }}
          onDelete={(eventId) => {
            setSelectedEventForDetail(null);
            const action = () => setEventToDelete(selectedEventForDetail);
            if (onRequireAdmin) onRequireAdmin(action);
            else action();
          }}
        />
      )}

      {/* EDIT TIMELINE EVENT MODAL */}
      {eventToEdit && (
        <EditReminderModal
          reminder={eventToEdit}
          goats={[goat]}
          onClose={() => setEventToEdit(null)}
          onSave={async (eventId, updates) => {
            if (onUpdateEvent) {
              await onUpdateEvent(eventId, updates);
            }
            setEventToEdit(null);
          }}
        />
      )}

      {/* TASK REMINDER POP-UP MODAL DIRECTLY IN GOAT PROFILE */}
      {showReminderModal && (
        <div className={`modal-overlay ${isReminderModalClosing ? 'closing' : ''}`} onClick={handleReminderModalClose} style={{ zIndex: 110 }}>
          <div className={`modal-content ${isReminderModalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Schedule Task Reminder</h3>
              <button className="close-btn" onClick={handleReminderModalClose} disabled={savingReminder}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReminderSubmit}>
              <div className="modal-body">
                <div className="form-group" style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', display: 'block' }}>TARGET GOAT</span>
                  <strong style={{ fontSize: '13px', color: 'var(--primary-dark)' }}>{goat.name} ({goat.tag_id})</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Reminder Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    required
                    disabled={savingReminder}
                  />
                </div>

                {/* CATEGORY CUSTOM CARDS GRID */}
                <div className="form-group">
                  <label className="form-label">Reminder Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {reminderCategories.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = reminderCategory === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => !savingReminder && setReminderCategory(cat.id)}
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
                    placeholder="e.g. CD&T Vaccination Booster, Deworming..."
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    required
                    disabled={savingReminder}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Vet Instructions</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Enter specific instructions or dosages..."
                    value={reminderNotes}
                    onChange={(e) => setReminderNotes(e.target.value)}
                    disabled={savingReminder}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleReminderModalClose} disabled={savingReminder}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingReminder}>
                  {savingReminder ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Saving...
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

      {/* DELETE GOAT CONFIRM MODAL */}
      {showDeleteGoatModal && (
        <DeleteConfirmModal
          title="Delete Goat Record"
          message={`Are you sure you want to delete ${goat.name} (${goat.tag_id})? This will remove all their health records.`}
          onClose={() => setShowDeleteGoatModal(false)}
          onConfirm={() => {
            setShowDeleteGoatModal(false);
            handleAnimatedClose();
            if (onDeleteGoat) onDeleteGoat(goat.id);
          }}
        />
      )}

      {/* DELETE EVENT CONFIRM MODAL */}
      {eventToDelete && (
        <DeleteConfirmModal
          title="Delete Timeline Entry"
          message={`Are you sure you want to delete "${eventToDelete.title || eventToDelete.type}"?`}
          onClose={() => setEventToDelete(null)}
          onConfirm={async () => {
            if (onDeleteEvent) {
              await onDeleteEvent(eventToDelete.id);
            }
            setEventToDelete(null);
          }}
        />
      )}
    </>
  );
}
