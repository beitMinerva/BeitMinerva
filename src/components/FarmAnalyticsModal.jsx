import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, TrendingUp, Milk, Wheat, DollarSign, Activity, Award, BarChart2, PieChart, Sliders, Calendar } from 'lucide-react';
import { getPenMilkEntries, getPenFeedingEntries, getTimelineEvents, getBeirutDateString, isNurseryPenCheck } from '../services/goatService';

// Standalone helper function for daily feed carryover calculation (exported for testing)
export function calculateDailyFeedCarryover({
  feedingEntries = [],
  barnAreas = [],
  timeRange = '30',
  customStartDate = '',
  customEndDate = '',
  alphaPricePerKg = 0.55,
  mixedGrainsPricePerKg = 0.40,
  strawPricePerKg = 0.20
}) {
  if (!feedingEntries || feedingEntries.length === 0) {
    return { totalFeedKg: 0, totalFeedCost: 0, penFeedPerformanceMap: {}, totalRangeDays: 1 };
  }

  const getFeedKg = (e) => {
    const alphaKg = parseFloat(e.alpha_kg) || 0;
    const mixedKg = parseFloat(e.mixed_grains_kg) || 0;
    const strawKg = parseFloat(e.straw_kg) || 0;
    if (alphaKg > 0 || mixedKg > 0 || strawKg > 0) {
      return alphaKg + mixedKg + strawKg;
    }
    if (parseFloat(e.total_weight) > 0) {
      return parseFloat(e.total_weight);
    }
    const perHead = parseFloat(e.daily_weight) || 0;
    const count = parseFloat(e.goat_count) || 1;
    return perHead * count;
  };

  const getFeedEntryCost = (e) => {
    const alphaKg = parseFloat(e.alpha_kg) || 0;
    const alphaPrice = parseFloat(e.alpha_price_per_kg) || parseFloat(alphaPricePerKg) || 0;
    const mixedKg = parseFloat(e.mixed_grains_kg) || 0;
    const mixedPrice = parseFloat(e.mixed_grains_price_per_kg) || parseFloat(mixedGrainsPricePerKg) || 0;
    const strawKg = parseFloat(e.straw_kg) || 0;
    const strawPrice = parseFloat(e.straw_price_per_kg) || parseFloat(strawPricePerKg) || 0;

    const hasComponents = alphaKg > 0 || mixedKg > 0 || strawKg > 0;
    if (hasComponents) {
      return (alphaKg * alphaPrice + mixedKg * mixedPrice + strawKg * strawPrice);
    }
    const totalKg = getFeedKg(e);
    const avgPrice = ((parseFloat(alphaPricePerKg)||0.55) + (parseFloat(mixedGrainsPricePerKg)||0.40) + (parseFloat(strawPricePerKg)||0.20)) / 3;
    return (totalKg * avgPrice);
  };

  const end = timeRange === 'custom' && customEndDate ? new Date(customEndDate) : new Date();
  end.setHours(23, 59, 59, 999);

  let start = new Date(end);
  if (timeRange === 'custom' && customStartDate) {
    start = new Date(customStartDate);
  } else if (timeRange === 'all') {
    const earliest = feedingEntries.reduce((earliestDate, entry) => {
      const d = new Date(entry.date);
      return d < earliestDate ? d : earliestDate;
    }, new Date());
    start = earliest;
  } else {
    const days = parseInt(timeRange) || 30;
    start.setDate(start.getDate() - (days - 1));
  }
  start.setHours(0, 0, 0, 0);

  const dayList = [];
  let curr = new Date(start);
  while (curr <= end) {
    dayList.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const sortedEntries = [...feedingEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const allPens = barnAreas.length > 0 ? barnAreas : Array.from(new Set(feedingEntries.map(e => e.barn_area_id))).map(id => ({ id }));

  let grandTotalKg = 0;
  let grandTotalCost = 0;
  const penMap = {};
  allPens.forEach(p => { penMap[p.id] = { feedKg: 0, feedCost: 0, daysCount: 0 }; });

  dayList.forEach(day => {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    allPens.forEach(p => {
      const penEntries = sortedEntries.filter(e => e.barn_area_id === p.id && new Date(e.date) <= dayEnd);
      const activeEntry = penEntries[penEntries.length - 1];

      if (activeEntry) {
        const kg = getFeedKg(activeEntry);
        const cost = getFeedEntryCost(activeEntry);
        grandTotalKg += kg;
        grandTotalCost += cost;

        if (penMap[p.id]) {
          penMap[p.id].feedKg += kg;
          penMap[p.id].feedCost += cost;
          penMap[p.id].daysCount += 1;
        }
      }
    });
  });

  return { totalFeedKg: grandTotalKg, totalFeedCost: grandTotalCost, penFeedPerformanceMap: penMap, totalRangeDays: Math.max(1, dayList.length) };
}

// Standalone helper for Monthly Snapshots with daily feed carryover (exported for testing)
export function calculateMonthlySnapshots({
  milkEntries = [],
  feedingEntries = [],
  timelineEvents = [],
  barnAreas = [],
  milkPricePerLiter = 1.1,
  alphaPricePerKg = 0.55,
  mixedGrainsPricePerKg = 0.40,
  strawPricePerKg = 0.20
}) {
  const monthsMap = {};
  const now = new Date();

  const getMonthObj = (year, monthZeroIndexed) => {
    const key = `${year}-${String(monthZeroIndexed + 1).padStart(2, '0')}`;
    if (!monthsMap[key]) {
      monthsMap[key] = {
        key,
        year,
        monthZeroIndexed,
        milk: 0,
        sellableMilk: 0,
        feed: 0,
        feedCost: 0,
        salesRevenue: 0,
        sessions: 0
      };
    }
    return monthsMap[key];
  };

  milkEntries.forEach(e => {
    const d = new Date(e.date);
    const mObj = getMonthObj(d.getFullYear(), d.getMonth());
    const liters = parseFloat(e.amount_liters) || 0;
    mObj.milk += liters;
    if (e.destination !== 'home_use' && e.destination !== 'farm_use') {
      mObj.sellableMilk += liters;
    }
    mObj.sessions += 1;
  });

  timelineEvents.forEach(e => {
    if (e.type !== 'Sale') return;
    const d = new Date(e.date);
    const mObj = getMonthObj(d.getFullYear(), d.getMonth());
    const val = parseFloat(e.custom_fields?.sale_price || e.custom_fields?.price || 0);
    mObj.salesRevenue += val;
  });

  feedingEntries.forEach(e => {
    const d = new Date(e.date);
    getMonthObj(d.getFullYear(), d.getMonth());
  });
  getMonthObj(now.getFullYear(), now.getMonth());

  const sortedMonthKeys = Object.keys(monthsMap).sort((a, b) => a.localeCompare(b));

  sortedMonthKeys.forEach(key => {
    const mObj = monthsMap[key];
    const year = mObj.year;
    const month = mObj.monthZeroIndexed;

    const lastDayOfMonth = new Date(year, month + 1, 0);
    const endDayNum = (year === now.getFullYear() && month === now.getMonth())
      ? now.getDate()
      : lastDayOfMonth.getDate();

    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDayNum).padStart(2, '0')}`;

    const feedResult = calculateDailyFeedCarryover({
      feedingEntries,
      barnAreas,
      timeRange: 'custom',
      customStartDate: startStr,
      customEndDate: endStr,
      alphaPricePerKg,
      mixedGrainsPricePerKg,
      strawPricePerKg
    });

    mObj.feed = feedResult.totalFeedKg;
    mObj.feedCost = feedResult.totalFeedCost;
  });

  return sortedMonthKeys.map(key => {
    const v = monthsMap[key];
    const [year, month] = key.split('-');
    const label = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleString('en-US', { month: 'short', year: '2-digit' });
    const milkRevenue = v.sellableMilk * (parseFloat(milkPricePerLiter) || 1.1);
    const feedCost = v.feedCost || 0;
    const grossIncome = milkRevenue + v.salesRevenue;
    const netProfit = grossIncome - feedCost;
    const fce = v.feed > 0 ? (v.milk / v.feed) : null;
    return { key, label, milk: v.milk, sellableMilk: v.sellableMilk, feed: v.feed, sessions: v.sessions, milkRevenue, feedCost, grossIncome, netProfit, fce };
  });
}

export default function FarmAnalyticsModal({
  goats = [],
  barnAreas = [],
  milkEntries: propMilkEntries = [],
  feedingEntries: propFeedingEntries = [],
  timelineEvents: propTimelineEvents = [],
  onClose
}) {
  const [timeRange, setTimeRange] = useState('30'); // '7', '30', '90', 'custom', 'all'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getBeirutDateString(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => getBeirutDateString(new Date()));

  const [milkEntries, setMilkEntries] = useState(propMilkEntries);
  const [feedingEntries, setFeedingEntries] = useState(propFeedingEntries);
  const [timelineEvents, setTimelineEvents] = useState(propTimelineEvents);
  const [loading, setLoading] = useState(false);

  // Editable farm economic parameters
  const [milkPricePerLiter, setMilkPricePerLiter] = useState(1.1);
  const [alphaPricePerKg, setAlphaPricePerKg] = useState(0.55);
  const [mixedGrainsPricePerKg, setMixedGrainsPricePerKg] = useState(0.40);
  const [strawPricePerKg, setStrawPricePerKg] = useState(0.20);
  const [showPriceSettings, setShowPriceSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'monthly'

  useEffect(() => {
    if (propMilkEntries.length > 0 || propFeedingEntries.length > 0 || propTimelineEvents.length > 0) {
      setMilkEntries(propMilkEntries);
      setFeedingEntries(propFeedingEntries);
      setTimelineEvents(propTimelineEvents);
      setLoading(false);
      return;
    }

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
  }, [propMilkEntries, propFeedingEntries, propTimelineEvents]);

  const filterByTimeRange = (entries, dateKey = 'date') => {
    if (timeRange === 'all') return entries;
    if (timeRange === 'custom') {
      if (!customStartDate || !customEndDate) return entries;
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return entries.filter(e => {
        const d = new Date(e[dateKey]);
        return d >= start && d <= end;
      });
    }
    const days = parseInt(timeRange) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return entries.filter(e => new Date(e[dateKey]) >= cutoff);
  };

  const filteredMilk = filterByTimeRange(milkEntries, 'date');
  const filteredFeed = filterByTimeRange(feedingEntries, 'date');
  const filteredEvents = filterByTimeRange(timelineEvents, 'date');

  let daysInRange = 30;
  if (timeRange === 'custom' && customStartDate && customEndDate) {
    const diffTime = Math.abs(new Date(customEndDate) - new Date(customStartDate));
    daysInRange = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  } else if (timeRange === 'all') {
    daysInRange = Math.max(1, Math.ceil((new Date() - new Date(milkEntries[milkEntries.length - 1]?.date || Date.now())) / (1000 * 60 * 60 * 24)));
  } else {
    daysInRange = parseInt(timeRange) || 30;
  }

  // 1. MILK PRODUCTION & YIELD METRICS
  const penMilkVolume = filteredMilk.reduce((sum, e) => sum + (parseFloat(e.amount_liters) || 0), 0);
  const goatMilkEvents = filteredEvents.filter(e => e.type === 'Milking');
  const individualMilkVolume = goatMilkEvents.reduce((sum, e) => sum + (parseFloat(e.custom_fields?.amount_liters) || 0), 0);
  const totalMilkVolume = penMilkVolume + individualMilkVolume;

  // Commercial / Sellable milk (excludes Home Use & Kid Feeding entries)
  const penSellableMilk = filteredMilk
    .filter(e => e.destination !== 'home_use' && e.destination !== 'farm_use')
    .reduce((sum, e) => sum + (parseFloat(e.amount_liters) || 0), 0);
  const goatSellableMilk = goatMilkEvents
    .filter(e => e.custom_fields?.destination !== 'home_use' && e.custom_fields?.destination !== 'farm_use')
    .reduce((sum, e) => sum + (parseFloat(e.custom_fields?.amount_liters) || 0), 0);
  const sellableMilkVolume = penSellableMilk + goatSellableMilk;

  const activeMilkingDoes = goats.filter(g => {
    const gen = (g.gender || '').toLowerCase();
    const isFemale = gen.includes('female') || gen.includes('doe') || gen === 'f';
    return isFemale && g.status !== 'Dry' && g.status !== 'Quarantine';
  });
  const milkingDoeCount = activeMilkingDoes.length || 1;

  // Active days on which milking occurred
  const milkDatesSet = new Set([
    ...filteredMilk.map(m => getBeirutDateString(m.date)),
    ...goatMilkEvents.map(e => getBeirutDateString(e.date))
  ]);
  const activeMilkingDays = Math.max(1, milkDatesSet.size);

  const dailyAverageMilk = totalMilkVolume / activeMilkingDays;
  const milkYieldPerActiveDoe = dailyAverageMilk / Math.max(1, milkingDoeCount);

  // 2. FEED CONSUMPTION & DYNAMIC CUMULATIVE CARRYOVER METRICS
  const { totalFeedKg, totalFeedCost, penFeedPerformanceMap, totalRangeDays } = React.useMemo(() => {
    return calculateDailyFeedCarryover({
      feedingEntries,
      barnAreas,
      timeRange,
      customStartDate,
      customEndDate,
      alphaPricePerKg,
      mixedGrainsPricePerKg,
      strawPricePerKg
    });
  }, [feedingEntries, barnAreas, timeRange, customStartDate, customEndDate, alphaPricePerKg, mixedGrainsPricePerKg, strawPricePerKg]);

  const feedCostPerLiter = totalMilkVolume > 0 ? (totalFeedCost / totalMilkVolume).toFixed(2) : '0.00';

  // 3. SCIENTIFIC FEED METRICS: FCE vs FCR
  const fceEfficiency = totalFeedKg > 0 ? (totalMilkVolume / totalFeedKg).toFixed(2) : '0.00'; // L milk / kg feed
  const fcrRatio = totalMilkVolume > 0 ? (totalFeedKg / totalMilkVolume).toFixed(2) : '0.00'; // kg feed / L milk

  // 4. FINANCIAL MARGIN (MILK REVENUE + GOAT SALES REVENUE - FEED EXPENSE)
  const goatSalesEvents = filteredEvents.filter(e => e.type === 'Sale');
  const totalGoatSalesRevenue = goatSalesEvents.reduce((sum, e) => sum + (parseFloat(e.custom_fields?.sale_price) || 0), 0);
  const milkRevenue = sellableMilkVolume * (parseFloat(milkPricePerLiter) || 1.1);
  const estimatedGrossRevenue = milkRevenue + totalGoatSalesRevenue;
  const feedMargin = estimatedGrossRevenue - totalFeedCost;

  // 5. NORMALIZED PEN COMPARISON (Active Milking Days & Active Feeding Days)
  const penPerformance = barnAreas.map(area => {
    const penGoats = goats.filter(g => g.area_id === area.id);
    const penGoatIds = new Set(penGoats.map(g => g.id));
    const goatCount = penGoats.length || 1;

    // 1. Pen-level milk entries
    const penMilkEntries = filteredMilk.filter(m => m.barn_area_id === area.id);
    const penMilkDirect = penMilkEntries.reduce((sum, m) => sum + (parseFloat(m.amount_liters) || 0), 0);

    // 2. Individual goat milking events for goats in this pen
    const goatMilkEvents = filteredEvents.filter(e => e.type === 'Milking' && penGoatIds.has(e.goat_id));
    const goatMilkDirect = goatMilkEvents.reduce((sum, e) => sum + (parseFloat(e.custom_fields?.amount_liters) || 0), 0);

    const penMilk = penMilkDirect + goatMilkDirect;

    const penFeedData = penFeedPerformanceMap[area.id] || { feedKg: 0, feedCost: 0, daysCount: totalRangeDays };
    const penFeed = penFeedData.feedKg;

    // Active days on which milk was actually logged for this pen
    const milkDatesSet = new Set([
      ...penMilkEntries.map(m => getBeirutDateString(m.date)),
      ...goatMilkEvents.map(e => getBeirutDateString(e.date))
    ]);
    const penMilkDays = Math.max(1, milkDatesSet.size);
    const penFeedDays = Math.max(1, penFeedData.daysCount);

    const milkPerGoatDay = (penMilk / penMilkDays) / goatCount;
    const feedPerGoatDay = (penFeed / penFeedDays) / goatCount;
    const penFCE = penFeed > 0 ? (penMilk / penFeed).toFixed(2) : '0.00';

    return {
      id: area.id,
      name: (area.name || '').replace(/\s*\[NURSERY\]/gi, '').trim(),
      isNursery: isNurseryPenCheck(area),
      milkLiters: penMilk,
      feedKg: penFeed,
      goatCount: penGoats.length,
      milkPerGoatDay: milkPerGoatDay.toFixed(2),
      feedPerGoatDay: feedPerGoatDay.toFixed(2),
      fce: penFCE
    };
  }).sort((a, b) => parseFloat(b.milkPerGoatDay) - parseFloat(a.milkPerGoatDay));

  // 6. HERD STATUS PIE CHART DATA (PURE SVG)
  const statusCounts = {
    Healthy: goats.filter(g => g.status === 'Healthy').length,
    Pregnant: goats.filter(g => g.status === 'Pregnant').length,
    Dry: goats.filter(g => g.status === 'Dry').length,
    'Under Treatment': goats.filter(g => g.status === 'Under Treatment').length,
    Quarantine: goats.filter(g => g.status === 'Quarantine').length,
    Sold: goats.filter(g => g.status === 'Sold').length
  };

  const statusColors = {
    Healthy: '#2E7D32',
    Pregnant: '#0284c7',
    Dry: '#8b5cf6',
    'Under Treatment': '#dc2626',
    Quarantine: '#d97706',
    Sold: '#15803d'
  };

  const totalGoatsCount = goats.length || 1;
  const pieSegments = [];
  let cumulativeAngle = 0;

  Object.entries(statusCounts).forEach(([status, count]) => {
    if (count > 0) {
      const percentage = count / totalGoatsCount;
      const angle = percentage * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = 100 + 80 * Math.cos(startRad);
      const y1 = 100 + 80 * Math.sin(startRad);
      const x2 = 100 + 80 * Math.cos(endRad);
      const y2 = 100 + 80 * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;
      const pathData = count === totalGoatsCount
        ? 'M 100 20 A 80 80 0 1 1 99.99 20 Z'
        : `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

      pieSegments.push({ status, count, percentage: Math.round(percentage * 100), color: statusColors[status], pathData });
    }
  });

  // MONTHLY BREAKDOWN — group ALL entries by calendar month with daily feed carryover
  const monthlyData = React.useMemo(() => {
    return calculateMonthlySnapshots({
      milkEntries,
      feedingEntries,
      timelineEvents,
      barnAreas,
      milkPricePerLiter,
      alphaPricePerKg,
      mixedGrainsPricePerKg,
      strawPricePerKg
    });
  }, [milkEntries, feedingEntries, timelineEvents, barnAreas, milkPricePerLiter, alphaPricePerKg, mixedGrainsPricePerKg, strawPricePerKg]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
      >
        {/* STICKY HEADER */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-color)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back
          </button>

          {/* TAB SWITCHER */}
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
            {[{ id: 'overview', label: 'Overview' }, { id: 'monthly', label: 'Monthly' }].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '800',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === t.id ? '#ffffff' : 'transparent',
                  color: activeTab === t.id ? 'var(--primary-dark)' : 'var(--text-muted)',
                  boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPriceSettings(!showPriceSettings)}
            style={{
              borderRadius: '12px',
              fontSize: '11px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: showPriceSettings ? 'var(--primary-light)' : '#ffffff',
              borderColor: showPriceSettings ? 'var(--primary-border)' : 'var(--border-color)',
              color: showPriceSettings ? 'var(--primary-dark)' : 'var(--text-main)',
              fontWeight: '700'
            }}
          >
            <Sliders size={13} /> Milk Price (${milkPricePerLiter.toFixed(2)}/L)
          </button>
        </div>

        {/* MAIN SCROLLABLE CONTENT */}
        <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* MILK PRICE SETTING PANEL */}
          {showPriceSettings && (
            <div className="card" style={{ padding: '14px 16px', background: '#ffffff', border: '1.5px solid var(--primary-border)', borderRadius: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', display: 'block' }}>Milk Selling Price ($/L)</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Used to calculate commercial milk revenue & net profit</span>
                </div>
                <div style={{ width: '120px', flexShrink: 0 }}>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={milkPricePerLiter}
                    onChange={(e) => setMilkPricePerLiter(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--primary)',
                      fontSize: '14px',
                      fontWeight: '800',
                      background: '#f0fdf4',
                      color: 'var(--primary-dark)',
                      textAlign: 'right'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <>
              {/* TIME RANGE SELECTOR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {[
                      { id: '7', label: '7 Days' },
                      { id: '30', label: '30 Days' },
                      { id: '90', label: '90 Days' },
                      { id: 'custom', label: 'Custom Range' },
                      { id: 'all', label: 'All Time' }
                    ].map(r => (
                      <button key={r.id} type="button" onClick={() => setTimeRange(r.id)} style={{ borderRadius: '20px', fontSize: '11px', padding: '5px 12px', fontWeight: timeRange === r.id ? '800' : '600', border: timeRange === r.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)', background: timeRange === r.id ? 'var(--primary-light)' : '#ffffff', color: timeRange === r.id ? 'var(--primary-dark)' : 'var(--text-main)', cursor: 'pointer' }}>{r.label}</button>
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Herd: <strong>{goats.length} Goats</strong> ({milkingDoeCount} Females)</span>
                </div>
                {timeRange === 'custom' && (
                  <div className="card" style={{ padding: '12px 14px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Calendar size={18} color="var(--primary)" />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Start Date</span>
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ width: '100%', fontSize: '12px', fontWeight: '700', padding: '6px 10px', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#ffffff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>End Date</span>
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ width: '100%', fontSize: '12px', fontWeight: '700', padding: '6px 10px', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#ffffff' }} />
                    </div>
                  </div>
                )}
              </div>

              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Activity className="animate-spin" size={28} style={{ margin: '0 auto 10px auto' }} />
                  <p style={{ fontSize: '13px' }}>Processing farm analytics...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* KPI CARDS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div className="card" style={{ padding: '12px', borderLeft: '4px solid #0284c7', background: '#f0f9ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' }}>Milk Harvest</span>
                        <Milk size={16} color="#0284c7" />
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#0c4a6e' }}>{totalMilkVolume.toFixed(1)} <span style={{ fontSize: '11px', fontWeight: '600' }}>L</span></div>
                      <div style={{ fontSize: '10px', color: '#0369a1', marginTop: '2px', fontWeight: '700' }}>{milkYieldPerActiveDoe.toFixed(2)} L/female/day</div>
                    </div>

                    <div className="card" style={{ padding: '12px', borderLeft: '4px solid #d97706', background: '#fffbeb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase' }}>Feed Intake</span>
                        <Wheat size={16} color="#d97706" />
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#78350f' }}>{totalFeedKg.toFixed(1)} <span style={{ fontSize: '11px', fontWeight: '600' }}>kg</span></div>
                      <div style={{ fontSize: '10px', color: '#b45309', marginTop: '2px', fontWeight: '700' }}>${totalFeedCost.toFixed(2)} cost</div>
                    </div>

                    <div className="card" style={{ padding: '12px', borderLeft: '4px solid #8b5cf6', background: '#f5f3ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>Gross Income</span>
                        <TrendingUp size={16} color="#8b5cf6" />
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#4c1d95' }}>${estimatedGrossRevenue.toFixed(2)}</div>
                      <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '2px', fontWeight: '700' }}>${milkRevenue.toFixed(0)} milk + ${totalGoatSalesRevenue.toFixed(0)} sales</div>
                    </div>

                    <div className="card" style={{ padding: '12px', borderLeft: feedMargin >= 0 ? '4px solid #16a34a' : '4px solid #dc2626', background: feedMargin >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: feedMargin >= 0 ? '#15803d' : '#b91c1c', textTransform: 'uppercase' }}>Net Profit</span>
                        <DollarSign size={16} color={feedMargin >= 0 ? '#16a34a' : '#dc2626'} />
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: feedMargin >= 0 ? '#14532d' : '#991b1b' }}>{feedMargin >= 0 ? '+' : ''}${feedMargin.toFixed(2)}</div>
                      <div style={{ fontSize: '10px', color: feedMargin >= 0 ? '#15803d' : '#b91c1c', marginTop: '2px', fontWeight: '700' }}>Gross Income - Feed Expense</div>
                    </div>
                  </div>

                  {/* PEN COMPARISON TABLE */}
                  <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                      <Award size={16} color="var(--primary)" /> Normalized Barn Pen Comparison
                    </h3>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <thead>
                          <tr style={{ background: 'var(--primary-light)', borderBottom: '1.5px solid var(--primary-border)', color: 'var(--primary-dark)' }}>
                            <th style={{ padding: '10px 14px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Barn Area</th>
                            <th style={{ padding: '10px 14px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goats</th>
                            <th style={{ padding: '10px 14px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Milk / Goat / Day</th>
                            <th style={{ padding: '10px 14px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Feed / Goat / Day</th>
                            <th style={{ padding: '10px 14px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Efficiency (FCE)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {penPerformance.map((pen, idx) => (
                            <tr key={pen.id} style={{ borderBottom: idx === penPerformance.length - 1 ? 'none' : '1px solid var(--border-color)', background: '#ffffff' }}>
                              <td style={{ padding: '12px 14px', fontWeight: '800', color: 'var(--text-main)' }}>{pen.name}</td>
                              <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: '600' }}>{pen.goatCount} goats</td>
                              <td style={{ padding: '12px 14px', fontWeight: '800', color: 'var(--text-main)' }}>{pen.milkPerGoatDay} L/goat/day</td>
                              <td style={{ padding: '12px 14px', color: 'var(--text-main)', fontWeight: '600' }}>{pen.feedPerGoatDay} kg/goat/day</td>
                              <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-main)' }}>{pen.fce} L milk / kg feed</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* HERD STATUS DONUT */}
                  <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                      <PieChart size={16} color="var(--primary)" /> Herd Status Distribution
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                        <svg width="160" height="160" viewBox="0 0 200 200">
                          {pieSegments.map(seg => (
                            <path key={seg.status} d={seg.pathData} fill={seg.color} stroke="#ffffff" strokeWidth="2" />
                          ))}
                          <circle cx="100" cy="100" r="48" fill="#ffffff" />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                          <strong style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', display: 'block', lineHeight: 1 }}>{goats.length}</strong>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Goats</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
                        {Object.entries(statusCounts).map(([status, count]) => (
                          <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColors[status] }} />
                              <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{status}</span>
                            </div>
                            <strong style={{ color: 'var(--text-main)' }}>{count} ({Math.round((count / totalGoatsCount) * 100)}%)</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== MONTHLY TAB ===== */}
          {activeTab === 'monthly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* DISCLAIMER NOTE */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <BarChart2 size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  All months shown using recorded data. "Per goat" metrics are omitted here â€” goat pen assignments are not tracked historically, so those numbers would be inaccurate.
                </p>
              </div>

              {monthlyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <BarChart2 size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <p style={{ fontSize: '13px' }}>No milk or feed data recorded yet.</p>
                </div>
              ) : (
                <>
                  {/* MONTH CARDS */}
                  {[...monthlyData].reverse().map((m, idx) => {
                    const prevMonth = monthlyData[monthlyData.length - 2 - idx];
                    const milkDelta = prevMonth ? m.milk - prevMonth.milk : null;
                    const profitDelta = prevMonth ? m.netProfit - prevMonth.netProfit : null;
                    return (
                      <div key={m.key} className="card" style={{ padding: '14px 16px' }}>
                        {/* MONTH HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>{m.label}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{m.sessions} milk sessions</span>
                          </div>
                          {milkDelta !== null && (
                            <span style={{ fontSize: '11px', fontWeight: '800', color: milkDelta >= 0 ? '#16a34a' : '#dc2626', background: milkDelta >= 0 ? '#f0fdf4' : '#fef2f2', padding: '2px 8px', borderRadius: '6px' }}>
                              {milkDelta >= 0 ? '+' : ''}{milkDelta.toFixed(1)} L vs prev
                            </span>
                          )}
                        </div>

                        {/* METRIC GRID */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {/* MILK */}
                          <div style={{ background: '#f0f9ff', borderRadius: '10px', padding: '10px 12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Milk</span>
                            <span style={{ fontSize: '16px', fontWeight: '900', color: '#0c4a6e' }}>{m.milk.toFixed(1)} L</span>
                            <span style={{ fontSize: '10px', color: '#0369a1', display: 'block' }}>${m.milkRevenue.toFixed(0)} revenue</span>
                          </div>

                          {/* FEED */}
                          <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '10px 12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Feed</span>
                            <span style={{ fontSize: '16px', fontWeight: '900', color: '#78350f' }}>{m.feed.toFixed(1)} kg</span>
                            <span style={{ fontSize: '10px', color: '#b45309', display: 'block' }}>${m.feedCost.toFixed(0)} cost</span>
                          </div>

                          {/* FCE */}
                          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Feed Efficiency</span>
                            {m.fce !== null ? (
                              <><span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{m.fce.toFixed(2)}</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>L milk / kg feed</span></>
                            ) : <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No feed data</span>}
                          </div>

                          {/* NET PROFIT */}
                          <div style={{ background: m.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '10px', padding: '10px 12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: m.netProfit >= 0 ? '#15803d' : '#b91c1c', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Net Profit</span>
                            <span style={{ fontSize: '16px', fontWeight: '900', color: m.netProfit >= 0 ? '#14532d' : '#991b1b' }}>{m.netProfit >= 0 ? '+' : ''}${m.netProfit.toFixed(0)}</span>
                            {profitDelta !== null && (
                              <span style={{ fontSize: '10px', color: profitDelta >= 0 ? '#15803d' : '#b91c1c', display: 'block' }}>{profitDelta >= 0 ? '+' : ''}${profitDelta.toFixed(0)} vs prev</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
