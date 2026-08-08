import React, { useState, useEffect } from 'react';
import { ScanLine, Plus, Bell, BellRing, BellOff } from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission } from '../services/notificationService';

export default function Header({ onOpenScanner, onOpenAddGoat, showToast }) {
  const [notifPermission, setNotifPermission] = useState('default');

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleToggleNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      if (showToast) showToast('🔔 Web push notifications enabled for farm reminders!');
    } else if (perm === 'denied') {
      if (showToast) showToast('⚠️ Notification permission blocked in browser settings.');
    }
  };

  return (
    <header className="header">
      <div className="header-brand" style={{ display: 'flex', alignItems: 'center' }}>
        <h1 className="header-title" style={{ margin: 0, lineHeight: 1, fontSize: '20px', fontWeight: '800' }}>
          Beit Minerva
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleToggleNotifications}
          title={notifPermission === 'granted' ? 'Notifications Active' : 'Enable Web Notifications'}
          style={{ padding: '6px 8px' }}
        >
          {notifPermission === 'granted' ? (
            <BellRing size={16} color="#059669" />
          ) : notifPermission === 'denied' ? (
            <BellOff size={16} color="#dc2626" />
          ) : (
            <Bell size={16} color="var(--primary)" />
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
