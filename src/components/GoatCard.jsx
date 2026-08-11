import React from 'react';
import { Tag, MapPin } from 'lucide-react';
import { calculateGoatAge, isNurseryPenCheck } from '../services/goatService';

export function isBabyGoat(goat, barnAreas = []) {
  if (!goat) return false;
  const area = barnAreas.find((a) => a.id === goat.area_id);
  return Boolean(area && isNurseryPenCheck(area));
}

export default function GoatCard({ goat, barnAreas = [], onClick }) {
  const area = barnAreas.find((a) => a.id === goat.area_id);
  const areaName = area ? `Pen ${area.letter}` : 'Unassigned';
  const ageStr = calculateGoatAge(goat.birth_date);
  const genderLabel = goat.gender === 'Doe' ? 'Female' : goat.gender === 'Buck' ? 'Male' : (goat.gender || 'Female');
  const isBaby = isBabyGoat(goat, barnAreas);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Healthy': return 'badge-healthy';
      case 'Under Treatment': return 'badge-treatment';
      case 'Pregnant': return 'badge-pregnant';
      case 'Dry': return 'badge-dry';
      case 'Quarantine':
      case 'Sick': return 'badge-quarantine';
      default: return 'badge-healthy';
    }
  };

  return (
    <div
      className="card goat-card"
      onClick={() => onClick(goat)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        padding: '12px 14px',
        borderRadius: '12px'
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span className="badge" style={{ background: '#f1f5f9', color: '#334155', fontSize: '11px' }}>
            <Tag size={11} />
            {goat.tag_id}
          </span>
          <span className={`badge ${getStatusBadgeClass(goat.status)}`}>
            {goat.status}
          </span>
          {isBaby && (
            <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '10px', fontWeight: '800' }}>
              Baby
            </span>
          )}
        </div>

        <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '2px 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {goat.name}
        </h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>{goat.breed} ({genderLabel})</span>
          <span>•</span>
          <span>{ageStr}</span>
          {goat.weight && (
            <>
              <span>•</span>
              <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{goat.weight} kg</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary)', fontWeight: '700', flexShrink: 0, paddingLeft: '8px' }}>
        <MapPin size={13} />
        <span>{areaName}</span>
      </div>
    </div>
  );
}
