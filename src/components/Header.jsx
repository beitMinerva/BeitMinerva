import React from 'react';
import { ScanLine, Plus } from 'lucide-react';

export default function Header({ onOpenScanner, onOpenAddGoat }) {
  return (
    <header className="header">
      <div className="header-brand" style={{ display: 'flex', alignItems: 'center' }}>
        <h1 className="header-title" style={{ margin: 0, lineHeight: 1, fontSize: '20px', fontWeight: '800' }}>
          Beit Minerva
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={onOpenScanner}
        >
          <ScanLine size={15} />
          <span>Scan Barcode</span>
        </button>
        <button 
          className="btn btn-primary btn-sm"
          onClick={onOpenAddGoat}
        >
          <Plus size={15} />
          <span>Add Goat</span>
        </button>
      </div>
    </header>
  );
}
