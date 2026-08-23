import React, { useState } from 'react';
import { Search, ClipboardPlus, MapPin } from 'lucide-react';
import GoatCard from '../components/GoatCard';
import { isNurseryPenCheck } from '../services/goatService';

export default function GoatsView({ goats = [], barnAreas = [], onSelectGoat, onOpenLogEvent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedPenId, setSelectedPenId] = useState('All');

  const statuses = ['All', 'Healthy', 'Under Treatment', 'Pregnant', 'Dry', 'Quarantine'];
  const genders = ['All', 'Female', 'Male', 'Other'];

  const filteredGoats = goats.filter((goat) => {
    const matchesSearch =
      (goat.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goat.tag_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goat.breed || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'All' || goat.status === selectedStatus;
    const matchesPen = selectedPenId === 'All' || goat.area_id === selectedPenId;

    const matchesGender = (() => {
      if (selectedGender === 'All') return true;
      const g = (goat.gender || '').toLowerCase();
      if (selectedGender === 'Female') return g.includes('female') || g.includes('doe') || g === 'f';
      if (selectedGender === 'Male') return !g.includes('female') && (g.includes('male') || g.includes('buck') || g === 'm');
      if (selectedGender === 'Other') return g.includes('other') || (!g.includes('female') && !g.includes('doe') && !g.includes('male') && !g.includes('buck'));
      return true;
    })();

    return matchesSearch && matchesStatus && matchesGender && matchesPen;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Clean Full Width Search Bar */}
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

      {/* Filter Bar: Pen, Gender & Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Pen Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <MapPin size={12} /> Pen:
          </span>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            <button
              type="button"
              onClick={() => setSelectedPenId('All')}
              style={{
                borderRadius: '20px',
                fontSize: '11px',
                padding: '4px 12px',
                fontWeight: selectedPenId === 'All' ? '800' : '600',
                border: selectedPenId === 'All' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                background: selectedPenId === 'All' ? 'var(--primary-light)' : '#ffffff',
                color: selectedPenId === 'All' ? 'var(--primary-dark)' : 'var(--text-main)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              All Pens
            </button>
            {barnAreas.map((area) => {
              const isSelected = selectedPenId === area.id;
              const isNur = isNurseryPenCheck(area);
              const count = goats.filter(g => g.area_id === area.id).length;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedPenId(area.id)}
                  style={{
                    borderRadius: '20px',
                    fontSize: '11px',
                    padding: '4px 12px',
                    fontWeight: isSelected ? '800' : '600',
                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : '#ffffff',
                    color: isSelected ? 'var(--primary-dark)' : 'var(--text-main)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Pen {area.letter} ({count}) {isNur ? '(Nursery)' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Gender Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Gender:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {genders.map((gender) => {
              const isSelected = selectedGender === gender;
              return (
                <button
                  key={gender}
                  type="button"
                  onClick={() => setSelectedGender(gender)}
                  style={{
                    borderRadius: '20px',
                    fontSize: '11px',
                    padding: '4px 12px',
                    fontWeight: isSelected ? '800' : '600',
                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : '#ffffff',
                    color: isSelected ? 'var(--primary-dark)' : 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {gender}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {statuses.map((status) => (
            <button
              key={status}
              className={`btn btn-sm ${selectedStatus === status ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedStatus(status)}
              style={{ whiteSpace: 'nowrap', borderRadius: '9999px', fontSize: '11px', padding: '4px 10px' }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Herd List Count & Record Event Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '800' }}>
          Herd Directory ({filteredGoats.length})
        </h2>
        {onOpenLogEvent && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenLogEvent}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <ClipboardPlus size={14} /> Record Event
          </button>
        )}
      </div>

      {/* Goat Cards */}
      {filteredGoats.length === 0 ? (
        <div className="card" style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '13px' }}>No goats match your filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredGoats.map((goat) => (
            <GoatCard
              key={goat.id}
              goat={goat}
              barnAreas={barnAreas}
              onClick={onSelectGoat}
            />
          ))}
        </div>
      )}
    </div>
  );
}
