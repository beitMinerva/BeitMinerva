import React, { useState } from 'react';
import { Search, ClipboardPlus } from 'lucide-react';
import GoatCard from '../components/GoatCard';

export default function GoatsView({ goats = [], barnAreas = [], onSelectGoat, onOpenLogEvent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const statuses = ['All', 'Healthy', 'Under Treatment', 'Pregnant', 'Dry', 'Quarantine'];

  const filteredGoats = goats.filter((goat) => {
    const matchesSearch =
      goat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goat.tag_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goat.breed.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'All' || goat.status === selectedStatus;

    return matchesSearch && matchesStatus;
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
