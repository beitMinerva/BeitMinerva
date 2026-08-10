import React, { useState } from 'react';
import { X, Calendar, FileText, Trash2, Tag, Edit2, CheckCircle, Users } from 'lucide-react';
import { formatBeirutDisplay } from '../services/goatService';

export default function ReminderDetailModal({ reminder, goats = [], barnAreas = [], onClose, onEdit, onDelete, onCompleteTask }) {
  const [isClosing, setIsClosing] = useState(false);

  if (!reminder) return null;

  const handleAnimatedClose = (callback) => {
    setIsClosing(true);
    setTimeout(() => {
      if (callback) callback();
      onClose();
    }, 220);
  };

  const getTargetGoatsList = () => {
    let customFields = {};
    if (typeof reminder.custom_fields === 'object' && reminder.custom_fields) {
      customFields = reminder.custom_fields;
    } else if (typeof reminder.custom_fields === 'string') {
      try {
        customFields = JSON.parse(reminder.custom_fields) || {};
      } catch (e) {}
    }

    const targetGoatIds = customFields.target_goat_ids || [];
    if (targetGoatIds.length > 0) {
      return goats.filter((g) => targetGoatIds.includes(g.id));
    }

    if (reminder.goat_id && reminder.goat_id !== 'herd') {
      const g = goats.find((x) => x.id === reminder.goat_id);
      if (g) return [g];
    }

    return goats;
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

  const getTargetSummary = () => {
    let customFields = {};
    if (typeof reminder.custom_fields === 'object' && reminder.custom_fields) {
      customFields = reminder.custom_fields;
    } else if (typeof reminder.custom_fields === 'string') {
      try {
        customFields = JSON.parse(reminder.custom_fields) || {};
      } catch (e) {}
    }

    const targetMode = customFields.target_mode || (reminder.goat_id === 'herd' || !reminder.goat_id ? 'HERD' : 'SINGLE');
    const targetGoatIds = customFields.target_goat_ids || [];
    const penId = customFields.target_pen_id;

    if (targetMode === 'SINGLE' && reminder.goat_id && reminder.goat_id !== 'herd') {
      const g = goats.find((x) => x.id === reminder.goat_id);
      if (g) return `Goat ${g.tag_id} (${g.name})`;
    }

    if (targetMode === 'PEN' && penId) {
      const pen = barnAreas.find((p) => p.id === penId);
      const penName = pen ? `Pen ${pen.letter}` : 'Pen';
      const count = targetGoatIds.length;
      return `${penName} (${count} ${count === 1 ? 'Goat' : 'Goats'})`;
    }

    if (targetMode === 'CUSTOM') {
      const count = targetGoatIds.length;
      return `Custom Selection (${count} ${count === 1 ? 'Goat' : 'Goats'})`;
    }

    const count = targetGoatIds.length || goats.length;
    return `Entire Herd (${count} ${count === 1 ? 'Goat' : 'Goats'})`;
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            <Tag size={13} color="var(--primary)" />
            <span>Applied To: <strong>{getTargetSummary()}</strong></span>
          </div>

          {/* SCHEDULED DATE CARD */}
          <div className="card" style={{ padding: '12px', marginBottom: '14px', background: catStyle.bg, border: `1px solid ${catStyle.color}40` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} color={catStyle.color} />
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block' }}>SCHEDULED DATE</span>
                <strong style={{ fontSize: '14px', color: catStyle.color }}>
                  {formatBeirutDisplay(reminder.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </strong>
              </div>
            </div>
          </div>

          {/* NOTES & INSTRUCTIONS */}
          <div style={{ marginBottom: '14px' }}>
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
                minHeight: '50px'
              }}
            >
              {reminder.notes ? reminder.notes : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No additional notes entered for this task reminder.</span>}
            </div>
          </div>

          {/* TARGET GOATS LIST */}
          {(() => {
            const targetGoats = getTargetGoatsList();
            if (targetGoats.length === 0) return null;

            return (
              <div style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} color="var(--primary)" /> Goats Included ({targetGoats.length})
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '110px', overflowY: 'auto', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  {targetGoats.map((g) => (
                    <span
                      key={g.id}
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        background: '#ecfdf5',
                        color: 'var(--primary-dark)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--primary-border)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <strong>{g.tag_id}</strong> ({g.name})
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
          {onCompleteTask && reminder.status !== 'completed' && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#059669', color: '#ffffff', gap: '6px', fontWeight: '700' }}
              onClick={() => {
                handleAnimatedClose(() => onCompleteTask(reminder));
              }}
            >
              <CheckCircle size={15} /> Log Event
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
      </div>
    </div>
  );
}
