import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DeleteConfirmModal({ title = 'Delete Item', message = 'Are you sure you want to delete this item? This action cannot be undone.', onClose, onConfirm }) {
  const [isClosing, setIsClosing] = useState(false);

  const handleAnimatedClose = (callback) => {
    setIsClosing(true);
    setTimeout(() => {
      if (callback) callback();
      onClose();
    }, 220);
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={() => handleAnimatedClose()}>
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
            <AlertTriangle size={18} color="#ef4444" /> {title}
          </h3>
          <button className="close-btn" onClick={() => handleAnimatedClose()}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
            {message}
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => handleAnimatedClose()}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: '#ef4444', color: 'white' }}
            onClick={() => {
              handleAnimatedClose(() => onConfirm());
            }}
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}
