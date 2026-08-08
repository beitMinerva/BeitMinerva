import React, { useState } from 'react';
import { X, Wheat, Scale, Clock, Sparkles, History, Calendar } from 'lucide-react';

export function parsePenFeeding(infoStr) {
  if (!infoStr) {
    return {
      current: { food_type: '', daily_weight: '', composition: '', schedule: '', notes: '' },
      history: []
    };
  }

  if (typeof infoStr === 'object' && infoStr !== null) {
    return {
      current: infoStr.current || { food_type: infoStr.food_type || '', daily_weight: infoStr.daily_weight || '', composition: infoStr.composition || '', schedule: infoStr.schedule || '', notes: infoStr.notes || '' },
      history: Array.isArray(infoStr.history) ? infoStr.history : []
    };
  }

  try {
    const parsed = JSON.parse(infoStr);
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.current || parsed.history) {
        return {
          current: parsed.current || { food_type: '', daily_weight: '', composition: '', schedule: '', notes: '' },
          history: Array.isArray(parsed.history) ? parsed.history : []
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
        history: []
      };
    }
  } catch (e) {}

  return {
    current: { food_type: String(infoStr), daily_weight: '', composition: '', schedule: '', notes: '' },
    history: []
  };
}

export default function PenFeedingHistoryModal({ pen, onClose, onOpenEditForm }) {
  const parsed = parsePenFeeding(pen?.feeding_info || pen?.note);
  const currentRation = parsed.current;
  const historyList = parsed.history;

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return 'Past Log';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
                Pen {pen?.letter} Feeding History & Timeline
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
                    handleClose();
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

                {currentRation.schedule && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} color="var(--primary)" /> <strong>Schedule:</strong> {currentRation.schedule}
                  </div>
                )}

                {currentRation.notes && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                    💡 {currentRation.notes}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {item.food_type}
                      </strong>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {formatDateLabel(item.date)}
                      </span>
                    </div>

                    {item.daily_weight && (
                      <span style={{ fontSize: '11px', color: 'var(--primary-dark)', fontWeight: '700' }}>
                        Weight: {item.daily_weight}
                      </span>
                    )}

                    {item.composition && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Composition: {item.composition}
                      </span>
                    )}

                    {item.notes && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Notes: {item.notes}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '14px' }}>
          <button className="btn btn-secondary" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
