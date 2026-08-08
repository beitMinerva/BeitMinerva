import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';

export default function CameraScanner({ onScanSuccess }) {
  const scannerRef = useRef(null);
  const [html5Qrcode, setHtml5Qrcode] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const elementId = '1d-barcode-reader';
    
    // Strict 1D Barcode Formats Configuration
    const formatsToSupport = [
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.CODABAR
    ];

    const qrcodeInstance = new Html5Qrcode(elementId, {
      formatsToSupport,
      verbose: false
    });
    setHtml5Qrcode(qrcodeInstance);

    const startScanner = async () => {
      try {
        const config = {
          fps: 15,
          // Horizontal 1D Ear Tag Barcode Viewfinder Box
          qrbox: { width: 280, height: 110 },
          aspectRatio: 2.2
        };

        await qrcodeInstance.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (onScanSuccess) {
              onScanSuccess(decodedText.trim().toUpperCase());
            }
          },
          (errorMessage) => {
            // Ignore frame decode noise
          }
        );
        setIsScanning(true);
        setErrorMsg(null);
      } catch (err) {
        console.warn('Camera access warning:', err);
        setErrorMsg('Unable to access camera. Please check permissions or enter ear tag ID manually below.');
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      if (qrcodeInstance.isScanning) {
        qrcodeInstance.stop().catch((e) => console.warn('Scanner cleanup warning:', e));
      }
    };
  }, [onScanSuccess]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '2px solid var(--primary-border)',
          background: '#000000',
          position: 'relative',
          minHeight: '200px',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div id="1d-barcode-reader" style={{ width: '100%' }} />

        {/* 1D RED LASER ALIGNMENT LINE FOR EAR TAG BARCODES */}
        {isScanning && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '10%',
              right: '10%',
              height: '2px',
              background: '#ef4444',
              boxShadow: '0 0 8px #ef4444',
              pointerEvents: 'none',
              zIndex: 10,
              transform: 'translateY(-50%)'
            }}
          />
        )}
      </div>

      {errorMsg ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', background: '#fff7ed', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', border: '1px solid #ffedd5' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      ) : (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Camera size={14} color="var(--primary)" />
          Align the red laser line over the goat's ear tag 1D barcode.
        </p>
      )}
    </div>
  );
}
