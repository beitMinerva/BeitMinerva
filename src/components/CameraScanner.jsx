import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Search, AlertCircle, Camera, RefreshCw } from 'lucide-react';

export default function CameraScanner({ onScanSuccess }) {
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrcodeScanner = null;
    const elementId = 'reader-element';

    const startScanner = async () => {
      try {
        setErrorMsg('');
        html5QrcodeScanner = new Html5Qrcode(elementId);
        scannerRef.current = html5QrcodeScanner;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        await html5QrcodeScanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (decodedText) {
              stopScanner();
              onScanSuccess(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore frame parse errors
          }
        );
        setIsScanning(true);
      } catch (err) {
        console.warn('Camera scan start error:', err);
        setErrorMsg('Camera access unavailable or permission denied. Use manual tag lookup below.');
        setIsScanning(false);
      }
    };

    startScanner();

    const stopScanner = () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error('Stop scanner error:', e));
      }
    };

    return () => {
      stopScanner();
    };
  }, [onScanSuccess]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
        <Camera size={22} color="#2e7d32" />
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Scan Goat Tag / QR Code</h2>
      </div>

      <div
        id="reader-element"
        style={{
          width: '100%',
          maxWidth: '350px',
          minHeight: '260px',
          margin: '0 auto 16px auto',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#0f172a',
          border: '2px dashed var(--primary)'
        }}
      ></div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ margin: '20px 0 10px 0', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Or enter Tag ID / Barcode manually:
        </p>

        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="e.g. GT-101"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Find
          </button>
        </form>
      </div>
    </div>
  );
}
