import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Milk, Wheat, DollarSign, Activity, Calendar, ShieldAlert, Award, ChevronRight, BarChart2 } from 'lucide-react';
import { getPenMilkEntries, getPenFeedingEntries, getTimelineEvents, formatBeirutDisplay } from '../services/goatService';

export default function FarmAnalyticsModal({ goats = [], barnAreas = [], onClose }) {
  const [timeRange, setTimeRange] = useState('30'); // '7', '30', '90', 'all'
  const [milkEntries, setMilkEntries] = useState([]);
  const [feedingEntries, setFeedingEntries] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom economic parameters for goat farming
  const milkPricePerLiter = 1.25; // $1.25 per liter
  const feedCostPerKg = 0.45;     // $0.45 per kg

  useEffect(() => {
    async function loadAnalyticsData() {
      setLoading(true);
      try {
        const [milkData, feedData, eventsData] = await Promise.all([
          getPenMilkEntries(),
          getPenFeedingEntries(),
          getTimelineEvents()
        ]);
        setMilkEntries(milkData || []);
        setFeedingEntries(feedData || []);
        setTimelineEvents(eventsData || []);
      } catch (err) {
        console.error('Error loading analytics data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalyticsData();
  }, []);

  // Filter data by selected time range
  const filterByTimeRange = (entries, dateKey = 'date') => {
    if (timeRange === 'all') return entries;
    const days = parseInt(timeRange) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return entries.filter(e => new Date(e[dateKey]) >= cutoff);
  };

  const filteredMilk = filterByTimeRange(milkEntries, 'date');
  const filteredFeed = filterByTimeRange(feedingEntries, 'date');
  const filteredEvents = filterByTimeRange(timelineEvents, 'date');

  // 1. CALCULATE MILK METRICS
  const totalMilkLiters = filteredMilk.reduce((sum, e) => sum + (parseFloat(e.amount_liters) || 0), 0);
  
  // Individual goat milk events in timeline
  const goatMilkEvents = filteredEvents.filter(e => e.type === 'Milking');
  const totalGoatMilkLiters = goatMilkEvents.reduce((sum, e) => sum + (parseFloat(e.custom_fields?.amount_liters) || 0), 0);
  const combinedMilkLiters = totalMilkLiters + totalGoatMilkLiters;

  const activeMilkingDoesCount = goats.filter(g => (g.gender === 'Female' || g.gender === 'Doe') && g.status !== 'Dry' && g.status !== 'Quarantine').length || 1;
  const daysInRange = timeRange === 'all' ? Math.max(1, Math.ceil((new Date() - new Date(milkEntries[milkEntries.length - 1]?.date || Date.now())) / (1000 * 60 * 60 * 24))) : parseInt(timeRange);
  
  const dailyAverageMilk = combinedMilkLiters / Math.max(1, daysInRange);
  const avgMilkPerDoePerDay = dailyAverageMilk / Math.max(1, activeMilkingDoesCount);

  // 2. CALCULATE FEED METRICS
  const totalFeedKg = filteredFeed.reduce((sum, e) => sum + (parseFloat(e.amount_kg) || 0), 0);
  const dailyAverageFeed = totalFeedKg / Math.max(1, daysInRange);
  const estimatedFeedCost = totalFeedKg * feedCostPerKg;

  // 3. FEED CONVERSION RATIO (FCR): Milk Liters ÷ Feed Kg
  const fcrRatio = totalFeedKg > 0 ? (combinedMilkLiters / totalFeedKg).toFixed(2) : '0.00';

  // 4. FINANCIAL PROJECTIONS
  const estimatedGrossRevenue = combinedMilkLiters * milkPricePerLiter;
  const estimatedNetMargin = estimatedGrossRevenue - estimatedFeedCost;

  // 5. PEN PERFORMANCE COMPARISON
  const penPerformance = barnAreas.map(area => {
    const penMilk = filteredMilk.filter(m => m.barn_area_id === area.id).reduce((sum, m) => sum + (parseFloat(m.amount_liters) || 0), 0);
    const penFeed = filteredFeed.filter(f => f.barn_area_id === area.id).reduce((sum, f) => sum + (parseFloat(f.amount_kg) || 0), 0);
    const penGoats = goats.filter(g => g.area_id === area.id);
    const penFCR = penFeed > 0 ? (penMilk / penFeed).toFixed(2) : '0.00';
    return {
      id: area.id,
      name: area.name,
      milkLiters: penMilk,
      feedKg: penFeed,
      goatCount: penGoats.length,
      fcr: penFCR
    };
  }).sort((a, b) => b.milkLiters - a.milkLiters);

  // 6. HERD DEMOGRAPHICS & HEALTH COMPLIANCE
  const healthyCount = goats.filter(g => g.status === 'Healthy').length;
  const treatmentCount = goats.filter(g => g.status === 'Under Treatment').length;
  const pregnantCount = goats.filter(g => g.status === 'Pregnant').length;
  const dryCount = goats.filter(g => g.status === 'Dry').length;
  const quarantineCount = goats.filter(g => g.status === 'Quarantine').length;

  const femaleCount = goats.filter(g => (g.gender || '').toLowerCase().includes('female') || (g.gender || '').toLowerCase().includes('doe')).length;
  const maleCount = goats.filter(g => (g.gender || '').toLowerCase().includes('male') || (g.gender || '').toLowerCase().includes('buck')).length;
  const otherGenderCount = goats.length - femaleCount - maleCount;

  // Hoof Trimming Compliance (3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentlyTrimmedGoatIds = new Set(
    timelineEvents
      .filter(e => e.type === 'Hoof Trimming' || e.title?.toLowerCase().includes('hoof'))
      .filter(e => new Date(e.date) >= threeMonthsAgo)
      .map(e => e.goat_id)
  );
  const hoofCompliancePct = goats.length > 0 ? Math.round((recentlyTrimmedGoatIds.size / goats.length) * 100) : 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}
      >
        {/* HEADER */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <h2 className="modal-title" style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={22} color="var(--primary)" /> Farm Business Analytics & Smart Metrics
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Production yields, feed efficiency ratios, and financial projections.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* TIME RANGE CONTROLS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: '7', label: 'Last 7 Days' },
              { id: '30', label: 'Last 30 Days' },
              { id: '90', label: 'Last 90 Days' },
              { id: 'all', label: 'All Time' }
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTimeRange(r.id)}
                style={{
                  borderRadius: '20px',
                  fontSize: '11px',
                  padding: '5px 12px',
                  fontWeight: timeRange === r.id ? '800' : '600',
                  border: timeRange === r.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                  background: timeRange === r.id ? 'var(--primary-light)' : '#ffffff',
                  color: timeRange === r.id ? 'var(--primary-dark)' : 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Active Herd: <strong>{goats.length} Goats</strong> ({activeMilkingDoesCount} Milking Does)
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Activity className="animate-spin" size={28} style={{ margin: '0 auto 10px auto' }} />
            <p style={{ fontSize: '13px' }}>Calculating business metrics & yield ratios...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* EXECUTIVE SUMMARY KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              {/* MILK KPI */}
              <div className="card" style={{ padding: '14px', borderLeft: '4px solid #0284c7', background: '#f0f9ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' }}>Total Milk</span>
                  <Milk size={18} color="#0284c7" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#0c4a6e' }}>
                  {combinedMilkLiters.toFixed(1)} <span style={{ fontSize: '13px', fontWeight: '600' }}>L</span>
                </div>
                <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '4px', fontWeight: '600' }}>
                  {dailyAverageMilk.toFixed(1)} L/day • {avgMilkPerDoePerDay.toFixed(2)} L/doe/day
                </div>
              </div>

              {/* FEED KPI */}
              <div className="card" style={{ padding: '14px', borderLeft: '4px solid #d97706', background: '#fffbeb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase' }}>Feed Consumed</span>
                  <Wheat size={18} color="#d97706" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#78350f' }}>
                  {totalFeedKg.toFixed(1)} <span style={{ fontSize: '13px', fontWeight: '600' }}>kg</span>
                </div>
                <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px', fontWeight: '600' }}>
                  {dailyAverageFeed.toFixed(1)} kg/day • Est. ${estimatedFeedCost.toFixed(2)}
                </div>
              </div>

              {/* FEED CONVERSION RATIO (FCR) */}
              <div className="card" style={{ padding: '14px', borderLeft: '4px solid #16a34a', background: '#f0fdf4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', textTransform: 'uppercase' }}>Feed Efficiency (FCR)</span>
                  <TrendingUp size={18} color="#16a34a" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#14532d' }}>
                  {fcrRatio} <span style={{ fontSize: '12px', fontWeight: '700' }}>L/kg</span>
                </div>
                <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px', fontWeight: '600' }}>
                  {parseFloat(fcrRatio) >= 1.2 ? '🟢 High Production Efficiency' : '🟡 Moderate Feed Ratio'}
                </div>
              </div>

              {/* NET MARGIN KPI */}
              <div className="card" style={{ padding: '14px', borderLeft: '4px solid #8b5cf6', background: '#f5f3ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#6d28d9', textTransform: 'uppercase' }}>Est. Net Margin</span>
                  <DollarSign size={18} color="#8b5cf6" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#4c1d95' }}>
                  ${estimatedNetMargin.toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: '#6d28d9', marginTop: '4px', fontWeight: '600' }}>
                  Revenue: ${estimatedGrossRevenue.toFixed(2)}
                </div>
              </div>
            </div>

            {/* BARN PEN PERFORMANCE TABLE & FCR COMPARISON */}
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} color="var(--primary)" /> Pen-by-Pen Production & Efficiency Breakdown
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px' }}>Barn Area</th>
                      <th style={{ padding: '8px' }}>Goats</th>
                      <th style={{ padding: '8px' }}>Milk (L)</th>
                      <th style={{ padding: '8px' }}>Feed (kg)</th>
                      <th style={{ padding: '8px' }}>Efficiency (L/kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penPerformance.map(pen => (
                      <tr key={pen.id} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                        <td style={{ padding: '8px', fontWeight: '800', color: 'var(--text-main)' }}>{pen.name}</td>
                        <td style={{ padding: '8px' }}>{pen.goatCount} goats</td>
                        <td style={{ padding: '8px', fontWeight: '700', color: '#0284c7' }}>{pen.milkLiters.toFixed(1)} L</td>
                        <td style={{ padding: '8px', color: '#d97706' }}>{pen.feedKg.toFixed(1)} kg</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '11px',
                            background: parseFloat(pen.fcr) > 1.2 ? '#dcfce7' : '#fef9c3',
                            color: parseFloat(pen.fcr) > 1.2 ? '#15803d' : '#a16207'
                          }}>
                            {pen.fcr} L/kg
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HERD COMPOSITION & COMPLIANCE SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* HERD STATUS BREAKDOWN */}
              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>Herd Status Distribution</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🟢 Healthy:</span>
                    <strong>{healthyCount} goats ({Math.round((healthyCount / (goats.length || 1)) * 100)}%)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🌸 Pregnant:</span>
                    <strong>{pregnantCount} goats</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🌾 Dry:</span>
                    <strong>{dryCount} goats</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>💊 Under Treatment:</span>
                    <strong style={{ color: '#dc2626' }}>{treatmentCount} goats</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ Quarantine:</span>
                    <strong style={{ color: '#d97706' }}>{quarantineCount} goats</strong>
                  </div>
                </div>
              </div>

              {/* COMPLIANCE & RISK SCORECARD */}
              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={16} color="var(--primary)" /> Health & Compliance Indicators
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Hoof Trimming Compliance (3 Mo):</span>
                      <strong>{hoofCompliancePct}%</strong>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${hoofCompliancePct}%`, background: hoofCompliancePct >= 80 ? '#16a34a' : '#d97706' }} />
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Gender Demographics:</span>
                      <strong>{femaleCount} Female • {maleCount} Male {otherGenderCount > 0 ? `• ${otherGenderCount} Other` : ''}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
