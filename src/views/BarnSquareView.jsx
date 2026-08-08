import React, { useState } from 'react';
import { Search, Plus, ArrowRightLeft } from 'lucide-react';
import GoatCard from '../components/GoatCard';

export default function BarnSquareView({
  goats = [],
  barnAreas = [],
  onSelectGoat,
  onOpenAddGoat,
  onTransferGoatArea
}) {
  const pens = [
    { id: 'area-1', letter: 'A', name: 'Pen A' },
    { id: 'area-2', letter: 'B', name: 'Pen B' },
    { id: 'area-3', letter: 'C', name: 'Pen C' },
    { id: 'area-4', letter: 'D', name: 'Pen D' },
    { id: 'area-5', letter: 'E', name: 'Pen E' },
    { id: 'area-6', letter: 'F', name: 'Pen F' },
  ];

  const [selectedPenId, setSelectedPenId] = useState(pens[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [transferringGoat, setTransferringGoat] = useState(null);

  const selectedPen = pens.find((p) => p.id === selectedPenId) || pens[0];
  const goatsInSelectedPen = goats.filter((g) => g.area_id === selectedPenId);

  // Search filtered goats
  const searchedGoats = goats.filter((g) => {
    if (!searchTerm.trim()) return false;
    const q = searchTerm.trim().toLowerCase();
    return g.name.toLowerCase().includes(q) || g.tag_id.toLowerCase().includes(q) || g.breed.toLowerCase().includes(q);
  });

  const handleTransferSubmit = async (targetAreaId) => {
    if (!transferringGoat) return;
    const targetArea = pens.find((p) => p.id === targetAreaId);
    const sourceArea = pens.find((p) => p.id === transferringGoat.area_id);
    await onTransferGoatArea(
      transferringGoat.id,
      targetAreaId,
      sourceArea ? sourceArea.name : '',
      targetArea ? targetArea.name : ''
    );
    setTransferringGoat(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Clean Full-Width Search Input Bar */}
      <div className="search-input-wrapper" style={{ width: '100%' }}>
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="form-input"
          placeholder="Search ear tag ID, name, or breed..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Instant Search Results */}
      {searchTerm.trim() && (
        <div className="card" style={{ padding: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-muted)' }}>
            Search Results ({searchedGoats.length})
          </h3>
          {searchedGoats.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No goats found matching "{searchTerm}".</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchedGoats.map((g) => (
                <GoatCard key={g.id} goat={g} barnAreas={pens} onClick={onSelectGoat} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6 CAPITAL LETTER PENS GRID (A, B, C, D, E, F) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Barn Pens (A–F)</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{goats.length} total goats</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {pens.map((pen) => {
            const penGoats = goats.filter((g) => g.area_id === pen.id);
            const isSelected = pen.id === selectedPenId;

            return (
              <div
                key={pen.id}
                onClick={() => setSelectedPenId(pen.id)}
                style={{
                  background: isSelected ? 'var(--primary-gradient)' : '#ffffff',
                  color: isSelected ? 'white' : 'var(--text-main)',
                  border: isSelected ? '2px solid var(--primary-dark)' : '2px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '20px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justify: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? 'var(--primary-glow)' : 'var(--shadow-sm)'
                }}
              >
                <span style={{ fontSize: '38px', fontWeight: '800', lineHeight: '1', fontFamily: 'Outfit, sans-serif' }}>
                  {pen.letter}
                </span>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    marginTop: '6px',
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                    color: isSelected ? 'white' : 'var(--text-main)',
                    padding: '2px 9px',
                    borderRadius: '9999px'
                  }}
                >
                  {penGoats.length} goats
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED PEN GOATS DRAWER */}
      {selectedPen && (
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                Pen {selectedPen.letter}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {goatsInSelectedPen.length} goats inside pen
              </span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onOpenAddGoat}>
              <Plus size={14} /> Register Goat Here
            </button>
          </div>

          {goatsInSelectedPen.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '14px 0', textAlign: 'center' }}>
              Pen {selectedPen.letter} is currently empty.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {goatsInSelectedPen.map((g) => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <GoatCard goat={g} barnAreas={pens} onClick={onSelectGoat} />
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    title="Move Goat"
                    onClick={() => setTransferringGoat(g)}
                    style={{ padding: '8px 10px', flexShrink: 0 }}
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reassign Pen Dialog */}
      {transferringGoat && (
        <div className="modal-overlay" onClick={() => setTransferringGoat(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>
              Move {transferringGoat.name} ({transferringGoat.tag_id})
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Select target pen (A–F):
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {pens.map((pen) => (
                <button
                  key={pen.id}
                  className="btn btn-secondary"
                  style={{
                    padding: '12px',
                    borderColor: transferringGoat.area_id === pen.id ? 'var(--primary)' : 'var(--border-color)',
                    background: transferringGoat.area_id === pen.id ? 'var(--primary-light)' : '#ffffff'
                  }}
                  onClick={() => handleTransferSubmit(pen.id)}
                >
                  <span style={{ fontWeight: '800', fontSize: '16px' }}>Pen {pen.letter}</span>
                </button>
              ))}
            </div>

            <button className="btn btn-secondary btn-full" onClick={() => setTransferringGoat(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
