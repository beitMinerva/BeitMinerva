import React from 'react';
import CameraScanner from '../components/CameraScanner';

export default function ScannerView({ onScanSuccess }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <CameraScanner onScanSuccess={onScanSuccess} />
    </div>
  );
}
