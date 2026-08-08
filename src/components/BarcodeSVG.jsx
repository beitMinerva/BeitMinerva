import React, { useState, useRef } from 'react';
import BarcodeSaveModal from './BarcodeSaveModal';

export function downloadBarcodePNG(tagId) {
  const cleanId = (tagId || 'TAG').replace(/[^a-zA-Z0-9-]/g, '_');
  const svgElement = document.getElementById(`barcode-svg-${cleanId}`);
  
  if (!svgElement) return;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = 600;
    canvas.height = 200;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 20, 20, 560, 160);

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `EarTag_Barcode_${cleanId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

export default function BarcodeSVG({ value = 'GT-101', width = 140, height = 40, disableModalTrigger = false }) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const timerRef = useRef(null);
  const cleanTag = (value || 'TAG').toUpperCase().trim();
  const elementId = `barcode-svg-${cleanTag.replace(/[^a-zA-Z0-9-]/g, '_')}`;

  // Simple Code39 barcode generator logic
  const patterns = {
    '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
    '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
    'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
    'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
    'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
    'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
    '-': '100101011011', '*': '100101101101'
  };

  const codeStr = `*${cleanTag}*`;
  let bitPattern = '';
  for (let char of codeStr) {
    bitPattern += (patterns[char] || patterns['*']) + '0';
  }

  const barWidth = width / bitPattern.length;

  const triggerModal = () => {
    if (!disableModalTrigger) {
      setShowSaveModal(true);
    }
  };

  const handleTouchStart = () => {
    if (disableModalTrigger) return;
    timerRef.current = setTimeout(() => {
      triggerModal();
    }, 450); // 450ms long press
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  return (
    <>
      <svg
        id={elementId}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#ffffff', cursor: disableModalTrigger ? 'default' : 'pointer', display: 'block', borderRadius: '6px' }}
        onClick={triggerModal}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        title={disableModalTrigger ? undefined : "Hold or tap to save barcode image"}
      >
        <rect width={width} height={height} fill="#ffffff" />
        <g fill="#0f172a">
          {bitPattern.split('').map((bit, index) => {
            if (bit === '1') {
              return (
                <rect
                  key={index}
                  x={index * barWidth}
                  y={4}
                  width={barWidth + 0.2}
                  height={height - 16}
                />
              );
            }
            return null;
          })}
        </g>
        <text
          x={width / 2}
          y={height - 3}
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fontFamily="monospace"
          fill="#0f172a"
        >
          {cleanTag}
        </text>
      </svg>

      {showSaveModal && (
        <BarcodeSaveModal tagId={cleanTag} onClose={() => setShowSaveModal(false)} />
      )}
    </>
  );
}
