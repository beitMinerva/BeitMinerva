import React, { useState } from 'react';
import { X, Download, Tag } from 'lucide-react';
import BarcodeSVG from './BarcodeSVG';

export default function BarcodeSaveModal({ tagId, onClose, onDownload }) {
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
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={18} color="var(--primary)" /> Save Printable Barcode
          </h3>
          <button className="close-btn" onClick={() => handleAnimatedClose()}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
            Do you want to save and download the printable barcode image for ear tag <strong>{tagId}</strong>?
          </p>

          <div
            style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '2px dashed var(--primary-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <BarcodeSVG value={tagId} width={200} height={54} />
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            This will download a high-resolution PNG image ready for ear tag printing vendors.
          </p>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={() => handleAnimatedClose()}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              handleAnimatedClose(() => onDownload());
            }}
          >
            <Download size={15} /> Download Barcode Image
          </button>
        </div>
      </div>
    </div>
  );
}
