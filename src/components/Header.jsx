import React, { useState, useEffect } from 'react';
import { ScanLine, Plus, Bell, BellRing, BellOff, X, Smartphone, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission, sendTestNotification, subscribeToPushNotifications, isIOS, isStandalone } from '../services/notificationService';

export default function Header({ onOpenScanner, onOpenAddGoat, showToast }) {
  const [notifPermission, setNotifPermission] = useState('default');
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const isIPhone = isIOS();
  const isAppStandalone = isStandalone();

  useEffect(() => {
    const perm = getNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      // Auto-sync Web Push token to Supabase for devices with existing permission
      subscribeToPushNotifications().catch(() => {});
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        const subResult = await subscribeToPushNotifications();
        if (showToast) showToast('Web Push & Background Notifications active');
        await sendTestNotification();
      } else if (perm === 'denied') {
        if (showToast) showToast('Notification permission blocked in browser settings');
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestBackgroundPush = async () => {
    try {
      if (showToast) showToast('📡 Requesting background push from server...');
      const PUSH_SERVER_URL = import.meta.env.VITE_PUSH_SERVER_URL || 'http://localhost:3001';
      const res = await fetch(`${PUSH_SERVER_URL}/api/send-test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (showToast) showToast(`✅ Background push sent to ${data.sentCount} active device(s)!`);
      } else {
        if (showToast) showToast(`⚠️ Server notice: ${data.reason || 'Failed to send'}`);
      }
    } catch (err) {
      if (showToast) showToast('ℹ️ Local server (localhost) is on your laptop. Run "curl -X POST http://localhost:3001/api/send-test" from your laptop to push to this phone!');
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center' }}>
          <h1 className="header-title" style={{ margin: 0, lineHeight: 1, fontSize: '20px', fontWeight: '800' }}>
            Beit Minerva
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowNotifModal(true)}
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

      {/* PROFESSIONAL FARM NOTIFICATION SETTINGS MODAL */}
      {showNotifModal && (
        <div className="modal-overlay" onClick={() => setShowNotifModal(false)} style={{ zIndex: 120 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px', borderRadius: '16px' }}>
            <div className="modal-header" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BellRing size={20} color="#059669" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Farm Notifications</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Automated background task reminders</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowNotifModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* STATUS CARD */}
              <div style={{
                background: notifPermission === 'granted' ? '#f0fdf4' : notifPermission === 'denied' ? '#fef2f2' : '#fefce8',
                border: notifPermission === 'granted' ? '1px solid #bbf7d0' : notifPermission === 'denied' ? '1px solid #fecaca' : '1px solid #fef08a',
                padding: '14px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {notifPermission === 'granted' ? (
                  <CheckCircle size={24} color="#16a34a" style={{ flexShrink: 0 }} />
                ) : notifPermission === 'denied' ? (
                  <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0 }} />
                ) : (
                  <Bell size={24} color="#ca8a04" style={{ flexShrink: 0 }} />
                )}
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block', fontWeight: '700' }}>
                    {notifPermission === 'granted' ? 'Push Notifications Active' : notifPermission === 'denied' ? 'Notifications Blocked' : 'Notifications Not Enabled'}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
                    {notifPermission === 'granted'
                      ? 'Your device is registered for 24/7 background task reminders.'
                      : notifPermission === 'denied'
                      ? 'Notifications are disabled in browser settings. Please allow notifications to receive alerts.'
                      : 'Enable notifications to receive alerts for scheduled vaccinations, medications, and farm tasks.'}
                  </span>
                </div>
              </div>

              {/* IOS SAFARI INSTRUCTIONS */}
              {isIPhone && !isAppStandalone && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>
                    <Smartphone size={16} /> iOS Setup (iPhone & iPad)
                  </div>
                  <p style={{ fontSize: '12px', color: '#0c4a6e', margin: 0, lineHeight: 1.4 }}>
                    To receive background push alerts when the app is closed:
                  </p>
                  <ol style={{ fontSize: '12px', color: '#0c4a6e', margin: '6px 0 0 18px', padding: 0, lineHeight: '1.5' }}>
                    <li>Tap the <strong>Share button (⬆️)</strong> in Safari.</li>
                    <li>Select <strong>Add to Home Screen (+)</strong>.</li>
                    <li>Open the app from your Home Screen & tap <strong>Enable Notifications</strong>.</li>
                  </ol>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleEnableNotifications}
                  disabled={isSubscribing}
                  style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '12px', fontWeight: '600' }}
                >
                  <BellRing size={16} />
                  {isSubscribing
                    ? 'Syncing Push Token...'
                    : notifPermission === 'granted'
                    ? 'Re-Sync Push Token'
                    : 'Enable Push Notifications'}
                </button>

                {notifPermission === 'granted' && (
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      const sent = await sendTestNotification();
                      if (sent && showToast) {
                        showToast('Test notification sent to device');
                      }
                    }}
                    style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '13px' }}
                  >
                    <Send size={15} /> Send Test Device Alert
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
