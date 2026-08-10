import React from 'react';
import { formatBeirutDisplay } from '../services/goatService';
import {
  ClipboardList,
  Heart,
  Activity,
  Syringe,
  ScanLine,
  Plus,
  ArrowRight,
  ShieldCheck,
  Milk,
  Weight,
  BarChart3,
  Calendar,
  Pill
} from 'lucide-react';
import GoatCard from '../components/GoatCard';

export default function DashboardView({
  goats = [],
  barnAreas = [],
  recentEvents = [],
  onSelectGoat,
  onOpenScanner,
  onOpenAddGoat,
  onNavigateTab
}) {
  const totalGoats = goats.length;
  const healthyGoats = goats.filter((g) => g.status === 'Healthy').length;
  const pregnantGoats = goats.filter((g) => g.status === 'Pregnant').length;
  const treatmentGoats = goats.filter((g) => g.status === 'Under Treatment' || g.status === 'Quarantine');

  const milkingDoes = goats.filter((g) => g.area_id === 'area-2' || g.gender === 'Female');
  const recentlyAddedGoats = [...goats].slice(0, 3);

  const todayMilkingEvents = recentEvents.filter(
    (e) => e.type === 'Milking'
  );
  const totalTodayMilkYield = 18.5; // Liters summary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #2e7d32 0%, #15803d 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85 }}>
              Farm Management
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '2px 0 4px 0' }}>Herd Overview</h2>
            <p style={{ fontSize: '13px', opacity: 0.9 }}>
              {totalGoats} registered goats across 6 barn areas.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button
            className="btn"
            style={{ background: 'white', color: '#2e7d32', fontWeight: '600' }}
            onClick={onOpenScanner}
          >
            <ScanLine size={16} />
            <span>Scan Ear Tag Barcode</span>
          </button>
          <button
            className="btn"
            style={{ background: 'rgba(255, 255, 255, 0.18)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)' }}
            onClick={onOpenAddGoat}
          >
            <Plus size={16} />
            <span>Add Goat</span>
          </button>
        </div>
      </div>

      {/* Actionable Today's Tasks */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="var(--primary)" /> Today's Action Items
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formatBeirutDisplay(new Date(), { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Task 1 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              background: 'var(--bg-subtle)',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Pill size={18} color="#c2410c" />
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>Medication Due</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Daisy (GT-104) hoof treatment
                </span>
              </div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigateTab('goats')}>
              View
            </button>
          </div>

          {/* Task 2 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              background: 'var(--bg-subtle)',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Syringe size={18} color="#15803d" />
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>Vaccinations Scheduled</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  CD&T booster for nursery kids
                </span>
              </div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => onNavigateTab('goats')}>
              Action
            </button>
          </div>

          {/* Task 3 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              background: 'var(--bg-subtle)',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Milk size={18} color="#0369a1" />
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>Today's Milking Yield</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {totalTodayMilkYield} Liters recorded ({milkingDoes.length} female goats)
                </span>
              </div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigateTab('goats')}>
              Log Yield
            </button>
          </div>
        </div>
      </div>

      {/* Distribution Progress Bars */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={16} color="var(--primary)" /> Barn Distribution
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('barn')}>
            Barn Map <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {barnAreas.map((area) => {
            const count = goats.filter((g) => g.area_id === area.id).length;
            const percentage = totalGoats > 0 ? Math.round((count / totalGoats) * 100) : 0;
            return (
              <div key={area.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{area.name}</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{count} goats ({percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'var(--primary)',
                      borderRadius: '3px'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recently Added List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Recent Goats</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('goats')}>
            View All
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recentlyAddedGoats.map((goat) => (
            <GoatCard
              key={goat.id}
              goat={goat}
              barnAreas={barnAreas}
              onClick={onSelectGoat}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
