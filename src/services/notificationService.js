// Web Notifications Service & Due Tasks Checker for Goat Farm Management (iOS Safari & Android PWA Compatible)
import { supabase } from '../config/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BP0hZFBqEATCuSp6r9q52vA7sqGhb0Hkc7j1Keix9hBApQsDjcWX3pKdW9fJfK9FXlbNe0TA2WAJDQ38CvHBL_w';
const PUSH_SERVER_URL = import.meta.env.VITE_PUSH_SERVER_URL || 'http://localhost:3001';

export function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (window.navigator.standalone === true) || window.matchMedia('(display-mode: standalone)').matches;
}

export function isNotificationSupported() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window || ('serviceWorker' in navigator && 'PushManager' in window);
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  if ('Notification' in window) return Notification.permission;
  return 'default';
}

export function getNotificationDiagnostics() {
  return {
    permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
    standalone: isStandalone(),
    serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    pushManager: typeof window !== 'undefined' && 'PushManager' in window,
    controller: typeof navigator !== 'undefined' && navigator.serviceWorker ? !!navigator.serviceWorker.controller : false,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  };
}

export async function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const swPath = baseUrl.endsWith('/') ? `${baseUrl}sw.js` : `${baseUrl}/sw.js`;
      const reg = await navigator.serviceWorker.register(swPath, { scope: baseUrl });
      return reg;
    } catch (err) {
      console.warn('Service Worker registration notice:', err);
    }
  }
  return null;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';

  if ('Notification' in window && typeof Notification.requestPermission === 'function') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return 'denied';
    }
  }
  return 'unsupported';
}

// Convert Base64 VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe device to Web Push notifications (Assumes permission already granted)
 */
export async function subscribeToPushNotifications() {
  if (!isNotificationSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    return { success: false, reason: `permission_${permission}` };
  }

  try {
    const baseUrl = import.meta.env.BASE_URL || '/';
    let reg = await registerServiceWorker();
    if (!reg && 'serviceWorker' in navigator) {
      reg = await navigator.serviceWorker.getRegistration(baseUrl);
    }

    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
      reg = await navigator.serviceWorker.getRegistration(baseUrl);
    }

    if (!reg || !reg.pushManager) {
      return { success: false, reason: 'no_push_manager' };
    }

    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    const subJson = subscription.toJSON();

    if (subJson.endpoint) {
      const { error: dbErr } = await supabase.from('push_subscriptions').upsert({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });

      if (dbErr) {
        console.warn('Supabase push_subscriptions upsert notice:', dbErr.message);
        return { success: false, reason: dbErr.message };
      }
    }

    return { success: true, subscription: subJson };
  } catch (err) {
    console.error('Error subscribing to push notifications:', err);
    return { success: false, reason: err.message || String(err) };
  }
}

/**
 * Unsubscribe device from Web Push
 */
export async function unsubscribeFromPushNotifications() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return { success: true };

    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Notify push server & delete from Supabase
      try {
        await fetch(`${PUSH_SERVER_URL}/api/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint })
        });
      } catch (err) {}

      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }

    return { success: true };
  } catch (err) {
    console.error('Error unsubscribing from Web Push:', err);
    return { success: false, error: err.message };
  }
}

export async function sendBrowserNotification(title, body, options = {}) {
  if (!isNotificationSupported()) return null;

  const currentPerm = getNotificationPermission();
  if (currentPerm !== 'granted') return null;

  // Primary method for iOS Safari 16.4+ and PWA: ServiceWorker showNotification
  if ('serviceWorker' in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await registerServiceWorker();
      }

      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: options.tag || 'goat-farm-reminder',
          renotify: true,
          ...options
        });
        return true;
      }
    } catch (swErr) {
      console.warn('SW showNotification fallback:', swErr);
    }
  }

  // Fallback to window Notification API (Desktop / Chrome)
  if ('Notification' in window) {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: options.tag || 'goat-farm-reminder',
        renotify: true,
        ...options
      });

      if (options.onClickUrl) {
        notification.onclick = () => {
          window.focus();
          if (options.onClickUrl) window.location.href = options.onClickUrl;
        };
      }

      return notification;
    } catch (err) {
      console.error('Failed to trigger window Notification:', err);
    }
  }

  return null;
}

export async function sendTestNotification() {
  const perm = await requestNotificationPermission();
  if (perm === 'granted') {
    // Also trigger background push subscription for iOS
    await subscribeToPushNotifications();

    return await sendBrowserNotification('Beit Minerva Farm', 'Notifications active & working on your device!', {
      tag: `test-notif-${Date.now()}`
    });
  }
  return false;
}

export async function checkUpcomingTasksAndNotify(events = [], goats = []) {
  if (!events || events.length === 0) return [];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Daily rate-limit: Only show in-app notification summary once per day to prevent spam
  const lastNotifyDate = localStorage.getItem('last_inapp_notify_date');
  if (lastNotifyDate === todayStr) {
    return [];
  }

  const overdueTasks = [];
  const todayTasks = [];

  events.forEach((ev) => {
    // ONLY genuine scheduled tasks count (historical recorded health/milking/birth logs are ignored)
    const isPendingScheduledTask =
      ev.is_scheduled === true ||
      ev.status === 'pending' ||
      ev.type === 'Scheduled Task' ||
      (ev.title && ev.title.toLowerCase().startsWith('scheduled')) ||
      (ev.custom_fields && (ev.custom_fields.is_scheduled || (ev.custom_fields.repeat_frequency && ev.custom_fields.repeat_frequency !== 'none')));

    if (!isPendingScheduledTask) return;

    const eventDateStr = ev.date?.split('T')[0];
    if (!eventDateStr) return;

    const goatName = ev.goat_id
      ? goats.find((g) => g.id === ev.goat_id)?.name || 'Goat'
      : 'Herd';

    const cleanTitle = ev.title?.replace(/^Scheduled:\s*/i, '') || ev.type || 'Task';

    if (eventDateStr < todayStr) {
      overdueTasks.push({ event: ev, cleanTitle, goatName, type: 'OVERDUE' });
    } else if (eventDateStr === todayStr) {
      todayTasks.push({ event: ev, cleanTitle, goatName, type: 'TODAY' });
    }
  });

  const totalDue = overdueTasks.length + todayTasks.length;

  if (totalDue > 0 && getNotificationPermission() === 'granted') {
    let title = 'Beit Minerva Farm';
    let body = '';

    if (todayTasks.length > 0 && overdueTasks.length > 0) {
      title = `Farm Tasks Alert (${todayTasks.length} Due Today, ${overdueTasks.length} Overdue)`;
      body = `• ${todayTasks[0].cleanTitle} (${todayTasks[0].goatName})\n+ ${overdueTasks.length} overdue task(s)`;
    } else if (todayTasks.length > 0) {
      if (todayTasks.length === 1) {
        title = `Task Due Today: ${todayTasks[0].cleanTitle}`;
        body = `Scheduled for ${todayTasks[0].goatName}.`;
      } else {
        title = `${todayTasks.length} Farm Tasks Due Today`;
        body = `• ${todayTasks[0].cleanTitle} (${todayTasks[0].goatName})\n• ${todayTasks[1].cleanTitle} (${todayTasks[1].goatName})`;
      }
    } else if (overdueTasks.length > 0) {
      if (overdueTasks.length === 1) {
        title = `Overdue Task: ${overdueTasks[0].cleanTitle}`;
        body = `Requires attention for ${overdueTasks[0].goatName}.`;
      } else {
        title = `${overdueTasks.length} Overdue Farm Tasks`;
        body = `• ${overdueTasks[0].cleanTitle} (${overdueTasks[0].goatName})`;
      }
    }

    // Send SINGLE clean summary notification
    sendBrowserNotification(title, body, { tag: `farm-daily-summary-${todayStr}` });
    localStorage.setItem('last_inapp_notify_date', todayStr);
  }

  return [...overdueTasks, ...todayTasks];
}
