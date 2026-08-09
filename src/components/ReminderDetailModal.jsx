import React, { useState } from 'react';
import { X, Calendar, FileText, Trash2, Tag, Edit2, CheckCircle } from 'lucide-react';

export default function ReminderDetailModal({ reminder, onClose, onEdit, onDelete, onCompleteTask }) {
  const [isClosing, setIsClosing] = useState(false);

  if (!reminder) return null;

  const handleAnimatedClose = (callback) => {
    setIsClosing(true);
    setTimeout(() => {
      if (callback) callback();
      onClose();
    }, 220);
  };

  const getCategoryColor = (type) => {
    switch (type) {
      case 'Vaccination': return { color: '#059669', bg: '#ecfdf5' };
      case 'Medication': return { color: '#c2410c', bg: '#fff7ed' };
      case 'Milking Yield':
      case 'Milking': return { color: '#0369a1', bg: '#f0f9ff' };
      case 'Weight Check': return { color: '#7e22ce', bg: '#faf5ff' };
      case 'Pregnancy Check': return { color: '#be185d', bg: '#fdf2f8' };
      default: return { color: '#059669', bg: '#ecfdf5' };
    }
  };

  const catStyle = getCategoryColor(reminder.type);

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={() => handleAnimatedClose()}>
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: catStyle.color,
                background: catStyle.bg,
                padding: '3px 9px',
                borderRadius: '9999px',
                border: `1px solid ${catStyle.color}`
              }}
            >
              {reminder.type || 'Task Reminder'}
            </span>
          </div>

          <button className="close-btn" onClick={() => handleAnimatedClose()}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 12px 0', color: 'var(--text-main)' }}>
            {reminder.title}
          </h2>

          {reminder.notes && reminder.notes.includes('Target:') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              <Tag size={13} color="var(--primary)" />
              <span>{reminder.notes.split('•')[0]}</span>
            </div>
          )}

          {/* SCHEDULED DATE CARD */}
          <div className="card" style={{ padding: '12px', marginBottom: '14px', background: catStyle.bg, border: `1px solid ${catStyle.color}40` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} color={catStyle.color} />
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block' }}>SCHEDULED DATE</span>
                <strong style={{ fontSize: '14px', color: catStyle.color }}>
                  {new Date(reminder.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </strong>
              </div>
            </div>
          </div>

          {/* NOTES & INSTRUCTIONS */}
          <div style={{ marginBottom: '10px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} color="var(--text-muted)" /> Instructions & Details
            </label>
            <div
              style={{
                background: '#ffffff',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                color: 'var(--text-main)',
                minHeight: '60px'
              }}
            >
              {reminder.notes ? reminder.notes : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No additional notes entered for this task reminder.</span>}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {onCompleteTask && reminder.status !== 'completed' && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#059669', color: '#ffffff', gap: '6px', fontWeight: '700' }}
                onClick={() => {
                  handleAnimatedClose(() => onCompleteTask(reminder));
                }}
              >
                <CheckCircle size={15} /> Complete & Log Event
              </button>
            )}

            {onEdit && reminder.type !== 'Transfer' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  handleAnimatedClose(() => onEdit(reminder));
                }}
              >
                <Edit2 size={13} /> Edit
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="btn"
                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}
                onClick={() => {
                  handleAnimatedClose(() => onDelete(reminder));
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>

          <button type="button" className="btn btn-secondary" onClick={() => handleAnimatedClose()}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
