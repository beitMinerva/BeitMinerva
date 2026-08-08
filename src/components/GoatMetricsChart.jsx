import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

export default function GoatMetricsChart({ goat, events = [] }) {
  const [metric, setMetric] = useState('weight'); // 'weight' or 'milking'

  // Extract date & value pairs for selected metric
  const getChartData = () => {
    if (metric === 'weight') {
      const weightEvents = events.filter(
        (e) => e.type === 'Weight Check' || e.title.toLowerCase().includes('weight') || e.title.toLowerCase().includes('kg')
      );
      
      const points = weightEvents.map((e) => {
        const numMatch = e.title.match(/(\d+(\.\d+)?)/);
        const val = numMatch ? parseFloat(numMatch[1]) : (goat.weight || 45);
        return { date: new Date(e.date), val, label: `${val} kg` };
      });

      // Always include current goat weight if available
      if (goat.weight && !points.some(p => p.val === goat.weight)) {
        points.unshift({ date: new Date(goat.created_at || Date.now()), val: goat.weight, label: `${goat.weight} kg` });
      }

      return points.sort((a, b) => a.date - b.date);
    }

    if (metric === 'milking') {
      const milkEvents = events.filter(
        (e) => e.type === 'Milking Yield' || e.type === 'Milking' || e.title.toLowerCase().includes('milk') || e.title.toLowerCase().includes('l')
      );

      const points = milkEvents.map((e) => {
        const numMatch = e.title.match(/(\d+(\.\d+)?)/);
        const val = numMatch ? parseFloat(numMatch[1]) : 3.0;
        return { date: new Date(e.date), val, label: `${val} L` };
      });

      return points.sort((a, b) => a.date - b.date);
    }

    return [];
  };

  const chartData = getChartData();

  if (chartData.length === 0) {
    return (
      <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} color="var(--primary)" /> Growth & Yield Performance
          </h4>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className={`btn btn-sm ${metric === 'weight' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMetric('weight')}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Weight
            </button>
            <button
              className={`btn btn-sm ${metric === 'milking' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMetric('milking')}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Milking
            </button>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '8px 0', textAlign: 'center' }}>
          No {metric} progression entries recorded yet.
        </p>
      </div>
    );
  }

  // Calculate SVG Chart Dimensions & Coordinates
  const svgWidth = 320;
  const svgHeight = 130;
  const padding = 26;

  const minVal = Math.min(...chartData.map((d) => d.val)) * 0.9;
  const maxVal = Math.max(...chartData.map((d) => d.val)) * 1.1 || minVal + 10;

  const getX = (index) => {
    if (chartData.length === 1) return svgWidth / 2;
    return padding + (index / (chartData.length - 1)) * (svgWidth - padding * 2);
  };

  const getY = (val) => {
    return svgHeight - padding - ((val - minVal) / (maxVal - minVal)) * (svgHeight - padding * 2);
  };

  const pathPoints = chartData.map((d, i) => `${getX(i)},${getY(d.val)}`).join(' L ');
  const pathD = `M ${pathPoints}`;

  return (
    <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} color="var(--primary)" /> Growth & Yield Performance
        </h4>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`btn btn-sm ${metric === 'weight' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMetric('weight')}
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            Weight
          </button>
          <button
            className={`btn btn-sm ${metric === 'milking' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMetric('milking')}
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            Milking
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {/* Horizontal Gridlines */}
          <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#e2e8f0" strokeDasharray="3 3" />
          <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#e2e8f0" strokeDasharray="3 3" />
          <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#e2e8f0" />

          {/* Trend Line Curve */}
          {chartData.length > 1 && (
            <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
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
    </div>
  );
}
