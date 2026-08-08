import React, { useState } from 'react';
import CameraScanner from '../components/CameraScanner';
import { ScanLine, Search, ArrowRight } from 'lucide-react';

export default function ScannerView({ onScanSuccess }) {
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim().toUpperCase());
      setManualCode('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ScanLine size={20} color="var(--primary)" /> 1D Ear Tag Barcode Scanner
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Scan the 1D barcode ear tag attached to a goat to open its full profile record immediately.
        </p>
      </div>

      {/* CAMERA SCANNER WITH 1D LASER */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CameraScanner onScanSuccess={onScanSuccess} />
      </div>

      {/* MANUAL BARCODE ENTRY FALLBACK */}
      <div className="card" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px' }}>
          Manual Ear Tag Barcode Entry
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          If the ear tag barcode is dirty or damaged, type the ear tag ID below:
        </p>

        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Enter Ear Tag ID (e.g. GT-101)..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <span>Find Record</span>
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
