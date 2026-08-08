import React, { useState } from 'react';
import { RotateCw, Check, X, Calendar, Sparkles, Plus, Minus, Clock, CalendarDays, Sliders, RefreshCw } from 'lucide-react';

export default function CustomRepeatPicker({
  repeatFrequency = 'none',
  customRepeatDays = '21',
  onChangeRepeat,
  disabled = false
}) {
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const options = [
    { id: 'none', label: 'One-Time Event', desc: 'No repeating schedule', icon: Calendar },
    { id: 'daily', label: 'Every Day', desc: 'Repeats daily', icon: Clock },
    { id: 'weekly', label: 'Every Week', desc: 'Repeats every 7 days', icon: CalendarDays },
    { id: 'monthly', label: 'Every Month', desc: 'Repeats monthly on date', icon: Calendar },
    { id: 'every_2_months', label: 'Every 2 Months', desc: 'Recommended for Hoof Trimming', icon: RotateCw },
    { id: 'every_3_months', label: 'Every 3 Months', desc: 'Quarterly schedule', icon: RotateCw },
    { id: 'every_6_months', label: 'Every 6 Months', desc: 'Bi-annual schedule', icon: RefreshCw },
    { id: 'yearly', label: 'Every Year', desc: 'Annual booster / checkup', icon: Sparkles },
    { id: 'custom', label: 'Custom Days Interval', desc: 'Specify any number of days', icon: Sliders },
  ];

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
    }, 220);
  };

  const getButtonDisplayLabel = () => {
    if (repeatFrequency === 'custom') {
      const days = parseInt(customRepeatDays) || 21;
      return `Custom: Every ${days} Days`;
    }
    const found = options.find((o) => o.id === repeatFrequency);
    return found ? found.label : 'One-Time Event';
  };

  const handleSelectOption = (optId) => {
    onChangeRepeat(optId, customRepeatDays);
  };

  const handleCustomDaysChange = (val) => {
    onChangeRepeat('custom', val);
  };

  const adjustCustomDays = (delta) => {
    const current = parseInt(customRepeatDays) || 21;
    const next = Math.max(1, current + delta);
    onChangeRepeat('custom', String(next));
  };

  return (
    <>
      <div
        onClick={() => !disabled && setShowModal(true)}
        style={{
          background: repeatFrequency !== 'none' ? '#ecfdf5' : '#ffffff',
          border: repeatFrequency !== 'none' ? '2px solid var(--primary-border)' : '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: "'Outfit', sans-serif"
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <RotateCw size={18} color={repeatFrequency !== 'none' ? 'var(--primary-dark)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: '700', color: repeatFrequency !== 'none' ? 'var(--primary-dark)' : 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>
            {getButtonDisplayLabel()}
          </span>
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            color: 'var(--primary-dark)',
            background: '#ffffff',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid var(--primary-border)',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0,
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          Change
        </span>
      </div>

      {/* CUSTOM REPEAT PICKER MODAL POPUP */}
      {showModal && (
        <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose} style={{ zIndex: 120, fontFamily: "'Outfit', sans-serif" }}>
          <div
            className={`modal-content ${isClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '16px', fontFamily: "'Outfit', sans-serif" }}
          >
            <div className="modal-header" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCw size={18} color="var(--primary)" />
                <h3 className="modal-title" style={{ fontSize: '16px', fontFamily: "'Outfit', sans-serif" }}>Select Repeat Schedule</h3>
              </div>
              <button className="close-btn" onClick={handleClose}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '2px' }}>
              {options.map((opt) => {
                const isSelected = repeatFrequency === opt.id;
                const Icon = opt.icon;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    style={{
                      background: isSelected ? '#ecfdf5' : '#ffffff',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      gap: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: isSelected ? 'var(--primary-light)' : '#f8fafc',
                          display: 'grid',
                          placeItems: 'center',
                          border: isSelected ? '1px solid var(--primary-border)' : '1px solid var(--border-color)',
                          flexShrink: 0
                        }}
                      >
                        <Icon size={18} color={isSelected ? 'var(--primary-dark)' : 'var(--text-muted)'} style={{ display: 'block', margin: 'auto' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '13px', display: 'block', color: isSelected ? 'var(--primary-dark)' : 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>
                          {opt.label}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
                          {opt.desc}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#dcfce7',
                          border: '1px solid #86efac',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          marginRight: '2px'
                        }}
                      >
                        <Check size={14} color="#166534" strokeWidth={2.2} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CUSTOM DAYS INPUT SECTION - CLEAN WITHOUT PREFILTERS */}
            {repeatFrequency === 'custom' && (
              <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1.5px solid var(--primary-border)', borderRadius: '12px', padding: '12px', fontFamily: "'Outfit', sans-serif" }}>
                <label className="form-label" style={{ color: 'var(--primary-dark)', marginBottom: '8px', fontFamily: "'Outfit', sans-serif" }}>
                  Repeat Every (Number of Days):
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => adjustCustomDays(-1)}
                    style={{ width: '38px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={customRepeatDays}
                    onChange={(e) => handleCustomDaysChange(e.target.value)}
                    style={{ textAlign: 'center', fontWeight: '800', fontSize: '16px', height: '38px', flex: 1, fontFamily: "'Outfit', sans-serif" }}
                  />

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => adjustCustomDays(1)}
                    style={{ width: '38px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={handleClose}
              style={{ marginTop: '14px', height: '42px', fontFamily: "'Outfit', sans-serif" }}
            >
              Done & Apply Schedule
            </button>
          </div>
        </div>
      )}
    </>
  );
}
