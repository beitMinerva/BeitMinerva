import React, { useState, useMemo } from 'react';
import { TrendingUp, Filter, Calendar } from 'lucide-react';

export default function GoatMetricsChart({ goat, events = [] }) {
  const [metric, setMetric] = useState('weight'); // 'weight' or 'milking'
  const [timeRange, setTimeRange] = useState('ALL'); // 'ALL', '1Y', '6M', '30D', 'CUSTOM'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract date & value pairs for selected metric
  const chartData = useMemo(() => {
    if (!goat) return [];
    let rawPoints = [];

    if (metric === 'weight') {
      const weightEvents = (events || []).filter(
        (e) => e.type === 'Weight Check' || (e.title && (e.title.toLowerCase().includes('weight') || e.title.toLowerCase().includes('kg')))
      );
      
      rawPoints = weightEvents.map((e) => {
        const numMatch = e.title ? e.title.match(/(\d+(\.\d+)?)/) : null;
        const val = numMatch ? parseFloat(numMatch[1]) : (goat?.weight || 45);
        return { date: new Date(e.date), timestamp: new Date(e.date).getTime(), val, label: `${val} kg` };
      });

      // Always include current goat weight if available
      if (goat?.weight && !rawPoints.some(p => p.val === goat.weight)) {
        const createTime = new Date(goat.created_at || Date.now()).getTime();
        rawPoints.unshift({ date: new Date(createTime), timestamp: createTime, val: goat.weight, label: `${goat.weight} kg` });
      }
    } else if (metric === 'milking') {
      const milkEvents = (events || []).filter(
        (e) => e.type === 'Milking Yield' || e.type === 'Milking' || (e.title && (e.title.toLowerCase().includes('milk') || e.title.toLowerCase().includes('l')))
      );

      rawPoints = milkEvents.map((e) => {
        const numMatch = e.title ? e.title.match(/(\d+(\.\d+)?)/) : null;
        const val = numMatch ? parseFloat(numMatch[1]) : 3.0;
        return { date: new Date(e.date), timestamp: new Date(e.date).getTime(), val, label: `${val} L` };
      });
    }

    // Sort chronologically
    const sorted = rawPoints.sort((a, b) => a.timestamp - b.timestamp);

    // Apply Time Range Filter
    const now = Date.now();

    if (timeRange === '30D') {
      const cutoff = now - 30 * 24 * 60 * 60 * 1000;
      return sorted.filter((p) => p.timestamp >= cutoff);
    }
    if (timeRange === '6M') {
      const cutoff = now - 180 * 24 * 60 * 60 * 1000;
      return sorted.filter((p) => p.timestamp >= cutoff);
    }
    if (timeRange === '1Y') {
      const cutoff = now - 365 * 24 * 60 * 60 * 1000;
      return sorted.filter((p) => p.timestamp >= cutoff);
    }
    if (timeRange === 'CUSTOM') {
      let filtered = sorted;
      if (startDate) {
        const startTs = new Date(startDate).getTime();
        filtered = filtered.filter((p) => p.timestamp >= startTs);
      }
      if (endDate) {
        const endTs = new Date(endDate).getTime() + 24 * 60 * 60 * 1000; // end of day
        filtered = filtered.filter((p) => p.timestamp <= endTs);
      }
      return filtered;
    }

    return sorted;
  }, [metric, timeRange, startDate, endDate, events, goat?.weight, goat?.created_at]);

  if (!goat) return null;

  return (
    <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
      {/* HEADER WITH METRIC TABS & TIME RANGE FILTERS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <TrendingUp size={16} color="var(--primary)" /> Growth & Yield Performance
          </h4>

          {/* Metric Selector Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={`btn btn-sm ${metric === 'weight' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMetric('weight')}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Weight
            </button>
            <button
              type="button"
              className={`btn btn-sm ${metric === 'milking' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMetric('milking')}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Milking
            </button>
          </div>
        </div>

        {/* Time Range Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={11} /> Period:
          </span>
          {[
            { id: 'ALL', label: 'All Time' },
            { id: '1Y', label: '1 Year' },
            { id: '6M', label: '6 Months' },
            { id: '30D', label: '30 Days' },
            { id: 'CUSTOM', label: 'Custom Range' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeRange(t.id)}
              style={{
                background: timeRange === t.id ? 'var(--primary-light)' : '#ffffff',
                color: timeRange === t.id ? 'var(--primary-dark)' : 'var(--text-muted)',
                border: timeRange === t.id ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '10px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CUSTOM DATE RANGE INPUT FIELDS */}
        {timeRange === 'CUSTOM' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={10} /> From Date
              </label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={10} /> To Date
              </label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              />
            </div>
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '14px 0', textAlign: 'center' }}>
          No {metric} entries recorded for the selected period ({timeRange}).
        </p>
      ) : (
        <ChartSVG chartData={chartData} key={`${metric}-${timeRange}-${startDate}-${endDate}-${chartData.length}`} />
      )}
    </div>
  );
}

// Inner SVG Chart Renderer Component
function ChartSVG({ chartData }) {
  const svgWidth = 320;
  const svgHeight = 140;
  const padding = 30;

  const vals = chartData.map((d) => d.val);
  const minVal = Math.min(...vals) * 0.9;
  const maxVal = Math.max(...vals) * 1.1 || (minVal > 0 ? minVal * 1.2 : 10);

  const getX = (index) => {
    if (chartData.length === 1) return svgWidth / 2;
    return padding + (index / (chartData.length - 1)) * (svgWidth - padding * 2);
  };

  const getY = (val) => {
    if (maxVal === minVal) return svgHeight / 2;
    return svgHeight - padding - ((val - minVal) / (maxVal - minVal)) * (svgHeight - padding * 2);
  };

  const pathPoints = chartData.map((d, i) => `${getX(i)},${getY(d.val)}`).join(' L ');
  const pathD = `M ${pathPoints}`;

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Horizontal Gridlines */}
        <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#e2e8f0" />

        {/* Trend Line Curve */}
        {chartData.length > 1 && (
          <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Data Points */}
        {chartData.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.val)} r="4.5" fill="var(--primary)" stroke="#ffffff" strokeWidth="2" />
            <text
              x={getX(i)}
              y={getY(d.val) - 8}
              textAnchor="middle"
              fontSize="9"
              fontWeight="800"
              fill="var(--text-main)"
            >
              {d.label}
            </text>
            <text
              x={getX(i)}
              y={svgHeight - 8}
              textAnchor="middle"
              fontSize="8"
              fill="var(--text-muted)"
            >
              {d.date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
