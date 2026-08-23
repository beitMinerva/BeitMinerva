import React from 'react';
import { ScanLine, Plus, Bell, BellRing, AlertCircle } from 'lucide-react';
import { isIOS, isStandalone } from '../services/notificationService';

export default function Header({
  onOpenScanner,
  onOpenAddGoat,
  onOpenNotifications,
  alerts = [],
  showToast
}) {
  const urgentCount = alerts.filter((a) => a.severity === 'urgent').length;
  const totalAlertsCount = alerts.length;

  return (
    <header className="header">
      <div className="header-brand" style={{ display: 'flex', alignItems: 'center' }}>
        <h1 className="header-title" style={{ margin: 0, lineHeight: 1, fontSize: '20px', fontWeight: '800' }}>
          Beit Minerva
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* NOTIFICATION CENTER BUTTON WITH DYNAMIC BADGE */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenNotifications}
          title={totalAlertsCount > 0 ? `${totalAlertsCount} Farm Alerts` : 'Farm Alerts & Notifications'}
          style={{
            padding: '6px 9px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: urgentCount > 0 ? '#fef2f2' : totalAlertsCount > 0 ? '#f0fdf4' : '#ffffff',
            borderColor: urgentCount > 0 ? '#fca5a5' : totalAlertsCount > 0 ? '#86efac' : 'var(--border-color)'
          }}
        >
          {urgentCount > 0 ? (
            <AlertCircle size={17} color="#dc2626" />
          ) : totalAlertsCount > 0 ? (
            <BellRing size={17} color="var(--primary)" />
          ) : (
            <Bell size={17} color="var(--text-muted)" />
          )}

          {totalAlertsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: urgentCount > 0 ? '#dc2626' : 'var(--primary, #2e7d32)',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '800',
                minWidth: '17px',
                height: '17px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}
            >
              {totalAlertsCount > 9 ? '9+' : totalAlertsCount}
            </span>
          )}
        </button>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={onOpenScanner}
        >
          <ScanLine size={15} />
          <span>Scan</span>
        </button>

        <button 
          className="btn btn-primary btn-sm"
          onClick={onOpenAddGoat}
        >
          <Plus size={15} />
          <span>Add Goat</span>
        </button>
      </div>
    </header>
  );
}

