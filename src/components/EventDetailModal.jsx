import React, { useState } from 'react';
import { X, Calendar, Clock, FileText, Trash2, Tag, Edit2, CheckCircle, Users } from 'lucide-react';
import { formatBeirutDisplay } from '../services/goatService';

export default function EventDetailModal({ event, goat, goats = [], barnAreas = [], onClose, onEdit, onDelete, onCompleteTask }) {
  const [isClosing, setIsClosing] = useState(false);

  if (!event) return null;

  const handleAnimatedClose = (callback) => {
    setIsClosing(true);
    setTimeout(() => {
      if (callback) callback();
      onClose();
    }, 220);
  };

  const getTargetSummary = () => {
    let customFields = {};
    if (typeof event.custom_fields === 'object' && event.custom_fields) {
      customFields = event.custom_fields;
    } else if (typeof event.custom_fields === 'string') {
      try {
        customFields = JSON.parse(event.custom_fields) || {};
      } catch (e) {}
    }

    const targetMode = customFields.target_mode || (event.goat_id === 'herd' || !event.goat_id ? 'HERD' : 'SINGLE');
    const targetGoatIds = customFields.target_goat_ids || [];
    const penId = customFields.target_pen_id;

    if (targetMode === 'SINGLE') {
      const g = goat || goats.find((x) => x.id === event.goat_id);
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

  const getTargetGoatsList = () => {
    let customFields = {};
    if (typeof event.custom_fields === 'object' && event.custom_fields) {
      customFields = event.custom_fields;
    } else if (typeof event.custom_fields === 'string') {
      try {
        customFields = JSON.parse(event.custom_fields) || {};
      } catch (e) {}
    }

    const targetGoatIds = customFields.target_goat_ids || [];
    if (targetGoatIds.length > 0) {
      return goats.filter((g) => targetGoatIds.includes(g.id));
    }

    if (goat) return [goat];
    if (event.goat_id && event.goat_id !== 'herd') {
      const g = goats.find((x) => x.id === event.goat_id);
      if (g) return [g];
    }

    return goats;
  };

  const dateObj = new Date(event.date);
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = dateObj.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });

  const getCategoryColor = (type) => {
    switch (type) {
      case 'Vaccination': return '#059669';
      case 'Medication': return '#c2410c';
      case 'Milking Yield':
      case 'Milking': return '#0369a1';
      case 'Weight Check': return '#7e22ce';
      case 'Pregnancy Check': return '#be185d';
      case 'Hoof Trimming': return '#0f766e';
      case 'Transfer': return '#059669';
      default: return '#475569';
    }
  };

  const catColor = getCategoryColor(event.type);

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={() => handleAnimatedClose()} style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', fontFamily: "'Outfit', sans-serif" }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: catColor,
                background: '#f8fafc',
                padding: '3px 9px',
                borderRadius: '9999px',
                border: `1px solid ${catColor}`
              }}
            >
              {event.type}
            </span>
          </div>

          <button className="close-btn" onClick={() => handleAnimatedClose()}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 12px 0', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>
            {event.title || event.type}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            <Tag size={13} color="var(--primary)" />
            <span>Applied To: <strong>{getTargetSummary()}</strong></span>
          </div>

          {/* EXACT DATE & TIME CONTAINER */}
          <div className="card" style={{ padding: '12px', marginBottom: '14px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Calendar size={16} color="var(--primary)" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                {formattedDate}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={16} color="var(--primary)" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                {formattedTime}
              </span>
            </div>
          </div>

          {/* NOTES & INSTRUCTIONS */}
          <div style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} color="var(--text-muted)" /> Notes & Details
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
              {event.notes ? event.notes : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No additional notes entered for this event.</span>}
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
          {onCompleteTask && event.status !== 'completed' && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#059669', color: '#ffffff', gap: '6px', fontWeight: '700' }}
              onClick={() => {
                handleAnimatedClose(() => onCompleteTask(event));
              }}
            >
              <CheckCircle size={15} /> Log Event
            </button>
          )}

          {onEdit && event.type !== 'Transfer' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                handleAnimatedClose(() => onEdit(event));
              }}
            >
              <Edit2 size={13} /> Edit Event
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              className="btn"
              style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}
              onClick={() => {
                handleAnimatedClose(() => onDelete(event.id));
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
