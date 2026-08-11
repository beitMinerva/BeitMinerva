import React, { useState, useRef } from 'react';
import BarcodeSVG from './BarcodeSVG';
import GoatMetricsChart from './GoatMetricsChart';
import DeleteConfirmModal from './DeleteConfirmModal';
import EventDetailModal from './EventDetailModal';
import EditReminderModal from './EditReminderModal';
import CustomRepeatPicker from './CustomRepeatPicker';
import { ArrowLeft, Tag, MapPin, Plus, Edit2, Trash2, Bell, ArrowRightLeft, Clock, Syringe, Pill, Milk, Weight, Heart, Scissors, X, Loader2, RotateCw } from 'lucide-react';
import { calculateGoatAge, formatBeirutDisplay, getBeirutDateString, isNurseryPenCheck } from '../services/goatService';

export function getRepeatLabel(event) {
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

  switch (frequency) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'every_2_months': return 'Every 2 Months';
    case 'every_3_months': return 'Every 3 Months';
    case 'every_6_months': return 'Every 6 Months';
    case 'yearly': return 'Yearly';
    case 'custom': return `Every ${days} Days`;
    default: return 'One-time Task';
  }
}

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
  barnAreas = [],
  events = [],
  allEvents = [],
  onClose,
  onEdit,
  onAddEvent,
  onSaveReminder,
  onTransferArea,
  onUpdateEvent,
  onDeleteEvent,
  onDeleteGoat,
  onCompleteTask
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [showDeleteGoatModal, setShowDeleteGoatModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null);

  // REMINDER MODAL STATE DIRECTLY IN GOAT PROFILE
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isReminderModalClosing, setIsReminderModalClosing] = useState(false);
  const [reminderCategory, setReminderCategory] = useState('Vaccination');
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderRepeatFrequency, setReminderRepeatFrequency] = useState('none');
  const [reminderCustomRepeatDays, setReminderCustomRepeatDays] = useState('60');

  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);

  const area = barnAreas.find((a) => a.id === goat.area_id);
  const areaName = area ? (area.name || `Pen ${area.letter}`) : 'Unassigned';
  const ageStr = calculateGoatAge(goat.birth_date);
  const genderLabel = goat.gender === 'Doe' ? 'Female' : goat.gender === 'Buck' ? 'Male' : (goat.gender || 'Female');
  const neuteredLabel = goat.neutered_status || 'Intact';
  const isBaby = Boolean(area && isNurseryPenCheck(area));

  const reminderCategories = [
    { id: 'Vaccination', label: 'Vaccination Booster', icon: Syringe, color: '#059669', bg: '#ecfdf5' },
    { id: 'Medication', label: 'Medication', icon: Pill, color: '#c2410c', bg: '#fff7ed' },
    { id: 'Hoof Trimming', label: 'Hoof Trimming', icon: Scissors, color: '#0f766e', bg: '#f0fdfa' },
    { id: 'Milking', label: 'Milking Schedule', icon: Milk, color: '#0369a1', bg: '#f0f9ff' },
    { id: 'Weight Check', label: 'Weight Check', icon: Weight, color: '#7e22ce', bg: '#faf5ff' },
    { id: 'Pregnancy Check', label: 'Pregnancy Check', icon: Heart, color: '#be185d', bg: '#fdf2f8' },
    { id: 'General', label: 'General Task', icon: Bell, color: '#059669', bg: '#ecfdf5' },
  ];

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 360);
  };

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
      if (onSaveReminder) {
        await onSaveReminder({
          goat_id: goat.id,
          type: reminderCategory,
          title: `Scheduled: ${reminderTitle || reminderCategory}`,
          date: new Date(reminderDate).toISOString(),
          notes: `Target: ${goat.name} (${goat.tag_id})${reminderNotes ? ` • ${reminderNotes}` : ''}`,
          custom_fields: {
            repeat_frequency: reminderRepeatFrequency,
            custom_repeat_days: reminderCustomRepeatDays
          }
        });
      }
      handleReminderModalClose();
      setReminderTitle('');
      setReminderNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingReminder(false);
    }
  };

  // Touch Swipe / Pull Down Gestures
  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop <= 5) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
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
      case 'Hoof Trimming': return { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' };
      case 'Transfer': return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    }
  };

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
          transition: pullY === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
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
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Back to Herd
          </button>

          <div style={{ display: 'flex', gap: '6px', marginLeft: "3px" }}>
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
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(goat)}>
              <Edit2 size={13} /> Edit
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onAddEvent(goat)}>
              <Plus size={14} /> Log Event
            </button>
          </div>
        </div>

        {/* FULL PAGE CONTENT HUB */}
        <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '16px 16px 40px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* GOAT TITLE & BARCODE TAG */}
          <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                  <Tag size={12} />
                  {goat.tag_id}
                </span>
                <span className={`badge ${getStatusBadgeClass(goat.status)}`}>
                  {goat.status}
                </span>
                {isBaby && (
                  <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: '800' }}>
                    Baby
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px 0' }}>{goat.name}</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 6px 0' }}>
                {goat.breed} • {genderLabel} ({neuteredLabel})
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary)', fontWeight: '700' }}>
                <MapPin size={14} />
                <span>{areaName}</span>
              </div>
            </div>

            {/* 1D Barcode Renderer */}
            <div style={{ background: 'white', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <BarcodeSVG value={goat.tag_id} width={130} height={36} />
            </div>
          </div>

          {/* GOAT SPECS CARDS */}
          <div className="card" style={{ padding: '14px', background: '#f8fafc' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', textAlign: 'center' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '700' }}>GENDER</span>
                <strong style={{ fontSize: '13px' }}>{genderLabel}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '700' }}>STATUS</span>
                <strong style={{ fontSize: '13px' }}>{neuteredLabel}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '700' }}>AGE</span>
                <strong style={{ fontSize: '13px' }}>{ageStr}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '700' }}>WEIGHT</span>
                <strong style={{ fontSize: '13px' }}>{goat.weight ? `${goat.weight} kg` : 'N/A'}</strong>
              </div>
            </div>

            {goat.notes && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: '700' }}>NOTES & HEALTH DETAILS</span>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-main)' }}>{goat.notes}</p>
              </div>
            )}
          </div>

          {/* INTERACTIVE PERFORMANCE METRICS CHART */}
          <GoatMetricsChart goat={goat} events={events} />

          {/* ACTION BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => onAddEvent(goat)}>
              <Plus size={14} /> Log Event
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowReminderModal(true)}>
              <Bell size={14} color="var(--primary)" /> Add Reminder
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => onTransferArea(goat)}>
              <ArrowRightLeft size={14} /> Move Pen
            </button>
          </div>

          {/* UPCOMING SCHEDULED REMINDERS CARD FOR THIS GOAT */}
          {(() => {
            const pool = allEvents.length > 0 ? allEvents : events;
            const upcoming = pool
              .filter((ev) => {
                if (ev.status === 'completed') return false;
                const isScheduled =
                  ev.status === 'pending' ||
                  ev.is_scheduled === true ||
                  (ev.title && ev.title.toLowerCase().startsWith('scheduled')) ||
                  (typeof ev.custom_fields === 'object' && (ev.custom_fields?.is_scheduled || (ev.custom_fields?.repeat_frequency && ev.custom_fields.repeat_frequency !== 'none'))) ||
                  (typeof ev.custom_fields === 'string' && (ev.custom_fields.includes('"is_scheduled":true') || (ev.custom_fields.includes('repeat_frequency') && !ev.custom_fields.includes('"repeat_frequency":"none"'))));

                if (!isScheduled) return false;
                if (ev.goat_id === goat.id) return true;

                // Evaluate exact snapshot of target goat IDs (insulates newly created goats!)
                let targetIds = null;
                if (typeof ev.custom_fields === 'object' && ev.custom_fields) {
                  targetIds = ev.custom_fields.target_goat_ids || null;
                } else if (typeof ev.custom_fields === 'string') {
                  try {
                    const parsed = JSON.parse(ev.custom_fields);
                    if (parsed) targetIds = parsed.target_goat_ids || null;
                  } catch (e) {}
                }

                if (Array.isArray(targetIds)) {
                  return targetIds.includes(goat.id);
                }

                if (!ev.goat_id || ev.goat_id === 'herd' || (ev.notes && (ev.notes.includes('Target: Entire Herd') || ev.notes.includes('Entire Herd')))) return true;
                if (area && ev.notes && (ev.notes.includes(`Target: Pen ${area.letter}`) || ev.notes.includes(`Pen ${area.letter}`))) return true;
                return false;
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (upcoming.length === 0) return null;

            return (
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', margin: 0 }}>
                    <Bell size={17} color="var(--primary)" /> Upcoming Scheduled Tasks ({upcoming.length})
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {upcoming.map((task) => {
                    const catStyle = getCategoryBadgeStyle(task.type);

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedEventForDetail(task)}
                        style={{
                          background: '#ffffff',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          border: '1px solid var(--border-color)',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block', lineHeight: 1.2 }}>
                                {task.title}
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
                                  display: 'inline-block'
                                }}
                              >
                                {task.type}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  color: '#0369a1',
                                  background: '#f0f9ff',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  border: '1px solid #e0f2fe',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <RotateCw size={10} color="#0369a1" />
                                {getRepeatLabel(task)}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--primary-border)' }}>
                              {formatBeirutDisplay(task.date)}
                            </span>
                          </div>
                        </div>

                        {task.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0', lineHeight: 1.3 }}>
                            {task.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* CLEAN SIMPLE TIMELINE CARDS (HISTORICAL COMPLETED EVENTS ONLY) */}
          {(() => {
            const historyEvents = events.filter((ev) => {
              if (ev.status === 'pending' || ev.is_scheduled === true) return false;
              if (ev.title && ev.title.toLowerCase().startsWith('scheduled')) return false;

              if (ev.goat_id === goat.id) return true;

              let targetIds = null;
              if (typeof ev.custom_fields === 'object' && ev.custom_fields) {
                targetIds = ev.custom_fields.target_goat_ids || null;
              } else if (typeof ev.custom_fields === 'string') {
                try {
                  const parsed = JSON.parse(ev.custom_fields);
                  if (parsed) targetIds = parsed.target_goat_ids || null;
                } catch (e) {}
              }

              if (Array.isArray(targetIds)) {
                return targetIds.includes(goat.id);
              }

              if (!ev.goat_id || ev.goat_id === 'herd' || (ev.notes && (ev.notes.includes('Target: Entire Herd') || ev.notes.includes('Entire Herd')))) return true;
              if (area && ev.notes && (ev.notes.includes(`Target: Pen ${area.letter}`) || ev.notes.includes(`Pen ${area.letter}`))) return true;
              return false;
            });

            return (
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={17} color="var(--primary)" /> Timeline History ({historyEvents.length})
                  </h3>
                  <button className="btn btn-outline btn-sm" onClick={() => onAddEvent(goat)}>
                    <Plus size={13} /> Add
                  </button>
                </div>

                {historyEvents.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
                    No completed timeline events recorded for {goat.name}. Click "Log Event" above to record weight progression, milking yields, or vaccinations.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {historyEvents.map((ev) => {
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {formatBeirutDisplay(ev.date)}
                          </span>
                          {onUpdateEvent && ev.type !== 'Transfer' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventToEdit(ev);
                              }}
                              style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#059669', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Edit Timeline Entry"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {onDeleteEvent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventToDelete(ev);
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
        );
      })()}
        </div>
      </div>

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
                  <label className="form-label">Repeat Schedule</label>
                  <CustomRepeatPicker
                    repeatFrequency={reminderRepeatFrequency}
                    customRepeatDays={reminderCustomRepeatDays}
                    onChangeRepeat={(freq, days) => { setReminderRepeatFrequency(freq); setReminderCustomRepeatDays(days); }}
                    disabled={savingReminder}
                  />
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
                  <label className="form-label">Notes & Instructions</label>
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

      {/* EVENT DETAIL VIEW MODAL */}
      {selectedEventForDetail && (
        <EventDetailModal
          event={selectedEventForDetail}
          goat={goat}
          onClose={() => setSelectedEventForDetail(null)}
          onEdit={onUpdateEvent ? (ev) => { setSelectedEventForDetail(null); setEventToEdit(ev); } : undefined}
          onDelete={onDeleteEvent ? (id) => onDeleteEvent(id) : undefined}
          onCompleteTask={onCompleteTask ? (rem) => onCompleteTask(rem) : undefined}
        />
      )}

      {eventToEdit && (
        <EditReminderModal
          reminder={eventToEdit}
          onClose={() => setEventToEdit(null)}
          onSave={async (id, updates) => {
            if (onUpdateEvent) await onUpdateEvent(id, updates);
            setEventToEdit(null);
          }}
        />
      )}

      {/* DELETE EVENT CONFIRMATION POPUP MODAL */}
      {eventToDelete && (
        <DeleteConfirmModal
          title="Delete Timeline Record"
          message={`Are you sure you want to delete "${eventToDelete.title || eventToDelete.type}" from ${goat.name}'s timeline?`}
          onConfirm={async () => {
            const idToDelete = eventToDelete?.id;
            setEventToDelete(null);
            if (idToDelete && onDeleteEvent) await onDeleteEvent(idToDelete);
          }}
        />
      )}

      {/* DELETE GOAT CONFIRMATION MODAL */}
      {showDeleteGoatModal && (
        <DeleteConfirmModal
          title={`Delete ${goat.name}`}
          message={`Are you sure you want to permanently delete ${goat.name} (${goat.tag_id})? This will remove all their records and timeline history.`}
          onClose={() => setShowDeleteGoatModal(false)}
          onConfirm={() => {
            setShowDeleteGoatModal(false);
            if (onDeleteGoat) onDeleteGoat(goat.id);
          }}
        />
      )}
    </>
  );
}
