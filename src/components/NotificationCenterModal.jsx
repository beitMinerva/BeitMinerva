import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HeartPulse,
  Wheat,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Send
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  sendTestNotification
} from '../services/notificationService';

export default function NotificationCenterModal({
  alerts = [],
  onClose,
  onCompleteTask,
  onSelectGoat,
  onSelectPen,
  onDismissAlert,
  onDismissAllAlerts,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'URGENT' | 'TASKS' | 'HEALTH' | 'BARN'
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission());
  const [enablingPush, setEnablingPush] = useState(false);

  const handleEnablePush = async () => {
    setEnablingPush(true);
    try {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        await subscribeToPushNotifications();
        if (showToast) showToast('Push Notifications enabled.');
      } else if (perm === 'denied') {
        if (showToast) showToast('Notifications blocked in browser settings.');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast(`Failed to enable notifications: ${err.message || err}`);
    } finally {
      setEnablingPush(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const sent = await sendTestNotification();
      if (sent && showToast) {
        showToast('Test notification sent to your device.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter alerts by tab
  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === 'URGENT') return alert.severity === 'urgent';
    if (activeTab === 'TASKS') return alert.category === 'Tasks';
    if (activeTab === 'HEALTH') return alert.category === 'Health' || alert.category === 'Reproduction' || alert.category === 'Safety';
    if (activeTab === 'BARN') return alert.category === 'Barn';
    return true;
  });

  const urgentCount = alerts.filter((a) => a.severity === 'urgent').length;
  const tasksCount = alerts.filter((a) => a.category === 'Tasks').length;
  const healthCount = alerts.filter((a) => a.category === 'Health' || a.category === 'Reproduction' || a.category === 'Safety').length;
  const barnCount = alerts.filter((a) => a.category === 'Barn').length;

  const getAlertIcon = (alert) => {
    switch (alert.type) {
      case 'OVERDUE_TASK':
        return <AlertTriangle size={18} color="#dc2626" />;
      case 'TODAY_TASK':
        return <Clock size={18} color="#d97706" />;
      case 'UPCOMING_TASK':
        return <Calendar size={18} color="#2563eb" />;
      case 'KIDDING_DUE':
      case 'KIDDING_SOON':
      case 'DRY_OFF_DUE':
        return <HeartPulse size={18} color="#7c3aed" />;
      case 'MEDICATION_WITHDRAWAL':
        return <ShieldAlert size={18} color="#dc2626" />;
      case 'SICK_WATCHLIST':
        return <HeartPulse size={18} color="#ea580c" />;
      case 'MISSING_FEED':
        return <Wheat size={18} color="#16a34a" />;
      default:
        return <Bell size={18} color="var(--primary)" />;
    }
  };

  const getSeverityBadgeStyle = (severity) => {
    switch (severity) {
      case 'urgent':
        return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      case 'warning':
        return { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' };
      default:
        return { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' };
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 140,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        padding: '12px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '18px',
          background: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          fontFamily: "'Outfit', 'Inter', sans-serif"
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary-light, #dcfce7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary, #2e7d32)'
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-main)' }}>
                Farm Alerts & Tasks
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {alerts.length === 0 ? 'All caught up' : `${alerts.length} active notification(s)`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {alerts.length > 0 && onDismissAllAlerts && (
              <button
                type="button"
                onClick={onDismissAllAlerts}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              className="close-btn"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PUSH NOTIFICATION PROMPT / STATUS BAR */}
        <div
          style={{
            padding: '8px 16px',
            background: notifPermission === 'granted' ? '#f8fafc' : '#fefce8',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}
        >
          {notifPermission === 'granted' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d' }}>
              <CheckCircle2 size={14} />
              <span style={{ fontWeight: '600' }}>Device Push Active</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a16207' }}>
              <AlertTriangle size={14} />
              <span>Enable push notifications to receive daily alerts</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            {notifPermission === 'granted' ? (
              <button
                type="button"
                onClick={handleTestNotification}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Send size={10} /> Test
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={enablingPush}
                style={{
                  background: 'var(--primary, #2e7d32)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {enablingPush ? 'Enabling...' : 'Enable Push'}
              </button>
            )}
          </div>
        </div>

        {/* FILTER TABS */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            overflowX: 'auto',
            background: '#ffffff'
          }}
        >
          {[
            { id: 'ALL', label: `All (${alerts.length})` },
            { id: 'URGENT', label: `Urgent (${urgentCount})`, hidden: urgentCount === 0 },
            { id: 'TASKS', label: `Tasks (${tasksCount})` },
            { id: 'HEALTH', label: `Health & Breeding (${healthCount})` },
            { id: 'BARN', label: `Barn (${barnCount})` }
          ].filter(t => !t.hidden).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--primary, #2e7d32)' : '#f1f5f9',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ALERTS LIST CONTAINER */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {filteredAlerts.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: 'var(--primary, #2e7d32)'
                }}
              >
                <Sparkles size={28} />
              </div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                All Caught Up!
              </h4>
              <p style={{ margin: 0, fontSize: '12px', maxWidth: '280px' }}>
                No active notifications or overdue tasks right now. The farm is running smoothly!
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const badgeStyle = getSeverityBadgeStyle(alert.severity);

              return (
                <div
                  key={alert.id}
                  style={{
                    background: alert.severity === 'urgent' ? '#fffdfd' : '#ffffff',
                    border: alert.severity === 'urgent' ? '1.5px solid #fca5a5' : '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: alert.severity === 'urgent' ? '#fee2e2' : '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                      >
                        {getAlertIcon(alert)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                              ...badgeStyle
                            }}
                          >
                            {alert.severity}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {alert.category}
                          </span>
                        </div>
                        <h4
                          style={{
                            margin: '4px 0 2px 0',
                            fontSize: '13px',
                            fontWeight: '800',
                            color: alert.severity === 'urgent' ? '#b91c1c' : 'var(--text-main)'
                          }}
                        >
                          {alert.title}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    {onDismissAlert && (
                      <button
                        type="button"
                        onClick={() => onDismissAlert(alert.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                        title="Dismiss"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* QUICK ACTION BUTTONS */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      marginTop: '4px',
                      paddingTop: '6px',
                      borderTop: '1px dashed #f1f5f9'
                    }}
                  >
                    {alert.actionType === 'COMPLETE_TASK' && onCompleteTask && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          onCompleteTask(alert.event);
                          onClose();
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle2 size={12} /> {alert.actionLabel || 'Mark Done'}
                      </button>
                    )}

                    {alert.actionType === 'VIEW_GOAT' && onSelectGoat && alert.goatId && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => {
                          onSelectGoat(alert.goatId);
                          onClose();
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {alert.actionLabel || 'View Goat'} <ChevronRight size={12} />
                      </button>
                    )}

                    {alert.actionType === 'OPEN_PEN' && onSelectPen && alert.penId && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          onSelectPen(alert.penId);
                          onClose();
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Wheat size={12} /> {alert.actionLabel || 'Log Feed'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
