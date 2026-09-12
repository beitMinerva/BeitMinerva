import React, { useState } from 'react';
import { X, Trash2, UserMinus, Calendar, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { formatBeirutDisplay } from '../services/goatService';

export default function DeleteEventModal({
  event,
  currentGoat = null,
  goats = [],
  barnAreas = [],
  onClose,
  onDeleteAll,
  onRemoveFromGoat
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'single' | 'all' | null

  if (!event) return null;

  const handleAnimatedClose = (callback) => {
    setIsClosing(true);
    setTimeout(() => {
      if (callback) callback();
      onClose();
    }, 220);
  };

  // Extract target goats info
  let customFields = {};
  if (typeof event.custom_fields === 'object' && event.custom_fields) {
    customFields = event.custom_fields;
  } else if (typeof event.custom_fields === 'string') {
    try {
      customFields = JSON.parse(event.custom_fields) || {};
    } catch (e) {
      customFields = {};
    }
  }

  const targetGoatIds = customFields.target_goat_ids;
  let targetCount = 1;
  let targetSummary = '1 goat';

  if (Array.isArray(targetGoatIds) && targetGoatIds.length > 0) {
    targetCount = targetGoatIds.length;
    targetSummary = `${targetCount} goats`;
  } else if (!event.goat_id || event.goat_id === 'herd') {
    targetCount = goats.length || 1;
    targetSummary = `Entire herd (${targetCount} goats)`;
  } else if (event.goat_id && event.goat_id.startsWith('pen-')) {
    const pen = barnAreas.find((p) => p.id === event.goat_id);
    targetSummary = pen ? `Pen ${pen.letter}` : 'Pen';
    targetCount = 2; // multi-goat pen
  } else {
    targetCount = 1;
    const g = currentGoat || goats.find((x) => x.id === event.goat_id);
    targetSummary = g ? `${g.tag_id} (${g.name})` : '1 goat';
  }

  const isMultiGoat = currentGoat && targetCount > 1;
  const isScheduled = event.status === 'pending' || event.is_scheduled === true || event.title?.toLowerCase().startsWith('scheduled');

  const handleRemoveSingle = async () => {
    if (!currentGoat || !onRemoveFromGoat) return;
    setLoadingAction('single');
    try {
      await onRemoveFromGoat(event.id, currentGoat.id);
      handleAnimatedClose();
    } catch (err) {
      setLoadingAction(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!onDeleteAll) return;
    setLoadingAction('all');
    try {
      await onDeleteAll(event.id);
      handleAnimatedClose();
    } catch (err) {
      setLoadingAction(null);
    }
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={() => handleAnimatedClose()} style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div
        className={`modal-content ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', fontFamily: "'Outfit', sans-serif" }}
      >
        <div className="modal-header" style={{ paddingBottom: '12px' }}>
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800', color: '#b91c1c' }}>
            <AlertCircle size={18} color="#b91c1c" />
            {isScheduled ? 'Delete Task Reminder' : 'Delete Event Record'}
          </h3>
          <button className="close-btn" onClick={() => handleAnimatedClose()} disabled={!!loadingAction}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '4px 0 16px 0' }}>
          {/* EVENT SUMMARY CARD */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px' }}>
              {event.title || event.type}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} color="var(--primary)" />
                {formatBeirutDisplay(event.date)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={13} color="var(--primary)" />
                {targetSummary}
              </span>
            </div>
          </div>

          {isMultiGoat ? (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                This record applies to <strong>{targetCount} goats</strong>. Choose how you would like to delete it:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* OPTION 1: REMOVE FOR THIS GOAT ONLY */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <UserMinus size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                        Remove from {currentGoat.name} only
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                        Keeps the record intact for the other {targetCount - 1} goats and removes it only from this goat's timeline.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveSingle}
                    disabled={!!loadingAction}
                    style={{
                      marginTop: '4px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: loadingAction ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {loadingAction === 'single' ? (
                      <>
                        <Loader2 size={14} className="spinner" /> Removing...
                      </>
                    ) : (
                      <>
                        <UserMinus size={14} /> Remove for {currentGoat.name}
                      </>
                    )}
                  </button>
                </div>

                {/* OPTION 2: DELETE FOR ALL GOATS */}
                <div
                  style={{
                    background: '#fff5f5',
                    border: '1.5px solid #fecaca',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>
                        Delete for all {targetCount} goats
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '2px', lineHeight: 1.4 }}>
                        Permanently removes this entry from the database for all goats included in the event.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={!!loadingAction}
                    style={{
                      marginTop: '4px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #dc2626',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: loadingAction ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {loadingAction === 'all' ? (
                      <>
                        <Loader2 size={14} className="spinner" /> Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} /> Delete for All {targetCount} Goats
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {currentGoat
                  ? `Are you sure you want to permanently delete this record from ${currentGoat.name}'s (${currentGoat.tag_id}) timeline? This action cannot be undone.`
                  : 'Are you sure you want to permanently delete this event record? This action cannot be undone.'}
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleAnimatedClose()}
                  disabled={!!loadingAction}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#dc2626', color: '#ffffff', gap: '6px', fontWeight: '700' }}
                  onClick={handleDeleteAll}
                  disabled={!!loadingAction}
                >
                  {loadingAction === 'all' ? (
                    <>
                      <Loader2 size={14} className="spinner" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Yes, Delete Record
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {isMultiGoat && (
          <div className="modal-footer" style={{ justifyContent: 'center', paddingTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleAnimatedClose()}
              disabled={!!loadingAction}
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
