import React, { useState } from 'react';
import { Home, ArrowRightLeft, Baby, Milk, Shield, Heart, Activity, Sun, Check } from 'lucide-react';
import GoatCard from '../components/GoatCard';

export default function BarnView({
  goats = [],
  barnAreas = [],
  onSelectGoat,
  onTransferGoatArea
}) {
  const [selectedAreaId, setSelectedAreaId] = useState(barnAreas[0]?.id || 'area-1');
  const [transferringGoat, setTransferringGoat] = useState(null);
  const [animatingId, setAnimatingId] = useState(null);

  const getAreaIcon = (iconName) => {
    switch (iconName) {
      case 'Baby': return <Baby size={18} color="#0284c7" />;
      case 'Milk': return <Milk size={18} color="#15803d" />;
      case 'Shield': return <Shield size={18} color="#d97706" />;
      case 'Heart': return <Heart size={18} color="#7e22ce" />;
      case 'Activity': return <Activity size={18} color="#b91c1c" />;
      case 'Sun': return <Sun size={18} color="#c2410c" />;
      default: return <Home size={18} color="#15803d" />;
    }
  };

  const selectedArea = barnAreas.find((a) => a.id === selectedAreaId) || barnAreas[0];
  const goatsInSelectedArea = goats.filter((g) => g.area_id === selectedAreaId);

  const handleSelectArea = (id) => {
    setAnimatingId(id);
    setSelectedAreaId(id);
    setTimeout(() => setAnimatingId(null), 350);
  };

  const handleTransferSubmit = async (targetAreaId) => {
    if (!transferringGoat) return;
    const targetArea = barnAreas.find((a) => a.id === targetAreaId);
    const sourceArea = barnAreas.find((a) => a.id === transferringGoat.area_id);
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
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Barn Area Manager</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Interactive 6-area layout. Tap an area card to view or transfer goats.
        </p>
      </div>

      {/* Clean Animated 6-Area Barn Pen Grid */}
      <div className="barn-grid">
        {barnAreas.map((area, idx) => {
          const areaGoats = goats.filter((g) => g.area_id === area.id);
          const isSelected = area.id === selectedAreaId;
          const isAnimating = area.id === animatingId;

          return (
            <div
              key={area.id}
              onClick={() => handleSelectArea(area.id)}
              className={`barn-pen-card ${isSelected ? 'active' : ''} ${isAnimating ? 'animating' : ''}`}
            >
              <div className="barn-pen-indicator" />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  AREA #{idx + 1}
                </span>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: isSelected ? 'white' : 'var(--text-main)',
                    padding: '2px 8px',
                    borderRadius: '9999px'
                  }}
                >
                  {areaGoats.length} Goats
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {getAreaIcon(area.icon)}
                <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                  {area.name}
                </h3>
              </div>

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px 0', minHeight: '26px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {area.description}
              </p>

              {/* Goat Avatars */}
              <div style={{ display: 'flex', gap: '-4px', overflow: 'hidden' }}>
                {areaGoats.slice(0, 4).map((g) => (
                  <img
                    key={g.id}
                    src={g.photo_url}
                    alt={g.name}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '2px solid white',
                      objectFit: 'cover'
                    }}
                  />
                ))}
                {areaGoats.length > 4 && (
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '4px' }}>
                    +{areaGoats.length - 4}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Pen Detail Section */}
      {selectedArea && (
        <div className="card" style={{ padding: '16px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getAreaIcon(selectedArea.icon)}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{selectedArea.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {goatsInSelectedArea.length} goats currently assigned
                </span>
              </div>
            </div>
          </div>

          {goatsInSelectedArea.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
              No goats currently assigned to this area.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {goatsInSelectedArea.map((g) => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <GoatCard goat={g} barnAreas={barnAreas} onClick={onSelectGoat} />
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    title="Transfer Goat"
                    onClick={() => setTransferringGoat(g)}
                    style={{ padding: '8px 10px', flexShrink: 0 }}
                  >
                    <ArrowRightLeft size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reassign Dialog */}
      {transferringGoat && (
        <div className="modal-overlay" onClick={() => setTransferringGoat(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
              Transfer {transferringGoat.name} ({transferringGoat.tag_id})
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Select target barn area:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {barnAreas.map((area) => (
                <button
                  key={area.id}
                  className="btn btn-secondary"
                  style={{
                    justifyContent: 'flex-start',
                    padding: '10px 12px',
                    borderColor: transferringGoat.area_id === area.id ? 'var(--primary)' : 'var(--border-color)',
                    background: transferringGoat.area_id === area.id ? 'var(--primary-light)' : 'var(--bg-card)'
                  }}
                  onClick={() => handleTransferSubmit(area.id)}
                >
                  {getAreaIcon(area.icon)}
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>{area.name}</span>
                  {transferringGoat.area_id === area.id && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>
                      Current
                    </span>
                  )}
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
