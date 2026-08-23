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

/**
 * Generates dynamic, intelligent farm alerts based on current herd, tasks, health, and barn state.
 */
export function generateDynamicFarmAlerts({
  events = [],
  goats = [],
  barnAreas = [],
  feedingEntries = [],
  milkingEntries = [],
  dismissedAlertIds = []
} = {}) {
  const alerts = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

  const dismissedSet = new Set(dismissedAlertIds || []);

  // 1. SCHEDULED TASKS & REMINDERS (Overdue, Due Today, Due within 3 days)
  (events || []).forEach((ev) => {
    if (ev.status === 'completed') return;

    const isPendingScheduledTask =
      ev.is_scheduled === true ||
      ev.status === 'pending' ||
      ev.type === 'Scheduled Task' ||
      (ev.title && ev.title.toLowerCase().startsWith('scheduled')) ||
      (ev.custom_fields && (ev.custom_fields.is_scheduled || (ev.custom_fields.repeat_frequency && ev.custom_fields.repeat_frequency !== 'none')));

    if (!isPendingScheduledTask) return;

    const eventDateStr = ev.date?.split('T')[0];
    if (!eventDateStr) return;

    const targetGoat = ev.goat_id && ev.goat_id !== 'herd' && !ev.goat_id.startsWith('pen-')
      ? goats.find((g) => g.id === ev.goat_id)
      : null;

    const goatName = targetGoat ? targetGoat.name : (ev.goat_id === 'herd' ? 'Entire Herd' : (ev.goat_id?.startsWith('pen-') ? `Pen ${ev.goat_id.replace('pen-', '')}` : 'Herd'));
    const cleanTitle = ev.title?.replace(/^Scheduled:\s*/i, '') || ev.type || 'Task';
    const alertId = `task-${ev.id}`;

    if (dismissedSet.has(alertId)) return;

    const rawCustom = typeof ev.custom_fields === 'string'
      ? (() => { try { return JSON.parse(ev.custom_fields); } catch { return {}; } })()
      : (ev.custom_fields || {});
    const taskUrgency = rawCustom.urgency || 'normal';

    const urgencyPrefix = taskUrgency === 'urgent' ? '[Urgent] ' : (taskUrgency === 'high' ? '[High Priority] ' : '');

    if (eventDateStr < todayStr) {
      alerts.push({
        id: alertId,
        type: 'OVERDUE_TASK',
        category: 'Tasks',
        severity: 'urgent',
        urgency: taskUrgency,
        title: `${urgencyPrefix}Overdue: ${cleanTitle}`,
        description: `Scheduled for ${goatName} on ${eventDateStr}. Immediate action needed.`,
        date: ev.date,
        goatId: targetGoat?.id || ev.goat_id,
        targetName: goatName,
        event: ev,
        actionType: 'COMPLETE_TASK',
        actionLabel: 'Mark Done'
      });
    } else if (eventDateStr === todayStr) {
      alerts.push({
        id: alertId,
        type: 'TODAY_TASK',
        category: 'Tasks',
        severity: taskUrgency === 'urgent' ? 'urgent' : 'warning',
        urgency: taskUrgency,
        title: `${urgencyPrefix}Due Today: ${cleanTitle}`,
        description: `Scheduled for ${goatName} today.`,
        date: ev.date,
        goatId: targetGoat?.id || ev.goat_id,
        targetName: goatName,
        event: ev,
        actionType: 'COMPLETE_TASK',
        actionLabel: 'Mark Done'
      });
    } else if (eventDateStr <= threeDaysLaterStr) {
      alerts.push({
        id: alertId,
        type: 'UPCOMING_TASK',
        category: 'Tasks',
        severity: taskUrgency === 'urgent' ? 'urgent' : (taskUrgency === 'high' ? 'warning' : 'info'),
        urgency: taskUrgency,
        title: `${urgencyPrefix}Upcoming: ${cleanTitle}`,
        description: `Scheduled for ${goatName} on ${eventDateStr}.`,
        date: ev.date,
        goatId: targetGoat?.id || ev.goat_id,
        targetName: goatName,
        event: ev,
        actionType: 'COMPLETE_TASK',
        actionLabel: 'Mark Done'
      });
    }
  });

  // 2. GESTATION & KIDDING ALERTS (~150 days from mating/pregnancy)
  const matingOrPregnancyEvents = (events || []).filter(
    (e) => e.status !== 'cancelled' && (
      e.type === 'Mating' ||
      e.type === 'Pregnancy' ||
      e.category === 'Mating' ||
      e.category === 'Pregnancy' ||
      (e.title && /mating|breeding|pregnant|pregnancy/i.test(e.title))
    )
  );

  const seenPregnantGoatIds = new Set();

  matingOrPregnancyEvents.forEach((ev) => {
    if (!ev.goat_id || ev.goat_id === 'herd' || seenPregnantGoatIds.has(ev.goat_id)) return;
    const doe = goats.find((g) => g.id === ev.goat_id);
    if (!doe || doe.gender?.toLowerCase() === 'buck' || doe.gender?.toLowerCase() === 'male') return;

    // Check if doe subsequently gave birth after this event date
    const matingTime = new Date(ev.date).getTime();
    if (Number.isNaN(matingTime)) return;

    const hadSubsequentBirth = (events || []).some(
      (be) => be.goat_id === doe.id &&
      (be.type === 'Birth' || be.category === 'Birth' || (be.title && /kidded|birth|delivered/i.test(be.title))) &&
      new Date(be.date).getTime() > matingTime
    );

    if (hadSubsequentBirth) return;

    seenPregnantGoatIds.add(doe.id);

    const expectedKiddingTime = matingTime + 150 * 24 * 60 * 60 * 1000;
    const diffDays = Math.round((expectedKiddingTime - now.getTime()) / (24 * 60 * 60 * 1000));
    const expectedDateStr = new Date(expectedKiddingTime).toISOString().split('T')[0];

    const alertId = `kidding-${doe.id}-${ev.id}`;
    if (dismissedSet.has(alertId)) return;

    if (diffDays <= 0) {
      alerts.push({
        id: alertId,
        type: 'KIDDING_DUE',
        category: 'Reproduction',
        severity: 'urgent',
        title: `Kidding Due: ${doe.name} (#${doe.tag_number || doe.id.slice(0, 5)})`,
        description: `Expected kidding was ${expectedDateStr} (${Math.abs(diffDays)}d ago). Prepare nursery pen!`,
        date: new Date(expectedKiddingTime).toISOString(),
        goatId: doe.id,
        targetName: doe.name,
        actionType: 'VIEW_GOAT',
        actionLabel: 'View Doe'
      });
    } else if (diffDays <= 7) {
      alerts.push({
        id: alertId,
        type: 'KIDDING_SOON',
        category: 'Reproduction',
        severity: 'warning',
        title: `Kidding Soon: ${doe.name} in ~${diffDays} days`,
        description: `Expected date: ${expectedDateStr}. Check udder and prepare kidding kit.`,
        date: new Date(expectedKiddingTime).toISOString(),
        goatId: doe.id,
        targetName: doe.name,
        actionType: 'VIEW_GOAT',
        actionLabel: 'View Doe'
      });
    } else if (diffDays >= 45 && diffDays <= 65) {
      // ~60 days before birth is the optimal time to dry off the doe
      alerts.push({
        id: `dryoff-${doe.id}-${ev.id}`,
        type: 'DRY_OFF_DUE',
        category: 'Reproduction',
        severity: 'info',
        title: `Dry-Off Window: ${doe.name}`,
        description: `~${diffDays} days to kidding (${expectedDateStr}). Stop milking to let udder rest.`,
        date: new Date(expectedKiddingTime).toISOString(),
        goatId: doe.id,
        targetName: doe.name,
        actionType: 'VIEW_GOAT',
        actionLabel: 'View Doe'
      });
    }
  });

  // 3. SICK / IN-TREATMENT GOAT WATCHLIST
  (goats || []).forEach((goat) => {
    const statusLower = String(goat.status || '').toLowerCase();
    if (statusLower === 'sick' || statusLower === 'in treatment' || statusLower === 'quarantine' || statusLower === 'injured') {
      const alertId = `sick-watch-${goat.id}`;
      if (dismissedSet.has(alertId)) return;

      alerts.push({
        id: alertId,
        type: 'SICK_WATCHLIST',
        category: 'Health',
        severity: 'warning',
        title: `Health Alert: ${goat.name} is ${goat.status}`,
        description: `Located in Pen ${goat.barn_area || 'Unassigned'}. Monitor symptoms and treatments.`,
        date: now.toISOString(),
        goatId: goat.id,
        targetName: goat.name,
        actionType: 'VIEW_GOAT',
        actionLabel: 'View Profile'
      });
    }
  });

  // 4. MEDICATION & ANTIBIOTIC WITHDRAWAL SAFETY ALERTS
  (events || []).forEach((ev) => {
    const rawFields = typeof ev.custom_fields === 'string' ? JSON.parse(ev.custom_fields || '{}') : (ev.custom_fields || {});
    let withdrawalDays = Number(rawFields.withdrawal_days || 0);

    // Fallback: search note text for e.g. "withdrawal: 7 days" or "withdrawal 5 days"
    if (!withdrawalDays && ev.notes) {
      const match = ev.notes.match(/withdrawal[:\s]+(\d+)\s*d/i);
      if (match) withdrawalDays = parseInt(match[1], 10);
    }

    if (withdrawalDays > 0) {
      const evTime = new Date(ev.date).getTime();
      if (!Number.isNaN(evTime)) {
        const withdrawalEndTime = evTime + withdrawalDays * 24 * 60 * 60 * 1000;
        if (withdrawalEndTime > now.getTime()) {
          const daysLeft = Math.ceil((withdrawalEndTime - now.getTime()) / (24 * 60 * 60 * 1000));
          const goat = goats.find((g) => g.id === ev.goat_id);
          const goatName = goat ? goat.name : 'Goat';
          const alertId = `withdrawal-${ev.id}`;

          if (!dismissedSet.has(alertId)) {
            alerts.push({
              id: alertId,
              type: 'MEDICATION_WITHDRAWAL',
              category: 'Safety',
              severity: 'urgent',
              title: `Milk/Meat Withdrawal: ${goatName}`,
              description: `Active withdrawal for ~${daysLeft} more day(s) until ${new Date(withdrawalEndTime).toLocaleDateString()}. Do not sell milk or meat.`,
              date: new Date(withdrawalEndTime).toISOString(),
              goatId: goat?.id || ev.goat_id,
              targetName: goatName,
              actionType: 'VIEW_GOAT',
              actionLabel: 'View Goat'
            });
          }
        }
      }
    }
  });

  // 5. DAILY BARN ROUTINE: MISSING FEEDING LOG CHECK (Mid-day alert)
  const currentHour = now.getHours();
  if (currentHour >= 12 && Array.isArray(barnAreas) && barnAreas.length > 0) {
    barnAreas.forEach((area) => {
      // Find goats in this pen
      const goatsInPen = goats.filter((g) => g.barn_area === area.letter || g.barn_area_id === area.id);
      if (goatsInPen.length === 0) return; // Empty pen doesn't need feed alert

      const hasFeedingToday = (feedingEntries || []).some((fe) => {
        if (fe.barn_area_id !== area.id) return false;
        const entryDateStr = fe.date?.split('T')[0];
        return entryDateStr === todayStr;
      });

      if (!hasFeedingToday) {
        const alertId = `missing-feed-${area.id}-${todayStr}`;
        if (!dismissedSet.has(alertId)) {
          alerts.push({
            id: alertId,
            type: 'MISSING_FEED',
            category: 'Barn',
            severity: 'info',
            title: `Pen ${area.letter} Feed Not Logged Today`,
            description: `${goatsInPen.length} goat(s) in Pen ${area.letter}. No feeding entry recorded for today yet.`,
            date: now.toISOString(),
            penId: area.id,
            penLetter: area.letter,
            targetName: `Pen ${area.letter}`,
            actionType: 'OPEN_PEN',
            actionLabel: 'Log Feed'
          });
        }
      }
    });
  }

  // Sort alerts: urgent first, then warning, then info, then newest date
  const severityRank = { urgent: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => {
    const rankDiff = (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  return alerts;
}

/**
 * Checks for urgent/due farm alerts and sends a single consolidated browser notification if permitted.
 */
export async function checkUpcomingTasksAndNotify(events = [], goats = [], barnAreas = [], feedingEntries = [], milkingEntries = []) {
  const alerts = generateDynamicFarmAlerts({
    events,
    goats,
    barnAreas,
    feedingEntries,
    milkingEntries
  });

  if (alerts.length === 0) return [];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Daily rate-limit: Only show in-app browser notification summary once per day to prevent spam
  const lastNotifyDate = localStorage.getItem('last_inapp_notify_date');
  if (lastNotifyDate === todayStr) {
    return alerts;
  }

  const urgentAlerts = alerts.filter((a) => a.severity === 'urgent');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');

  if ((urgentAlerts.length > 0 || warningAlerts.length > 0) && getNotificationPermission() === 'granted') {
    let title = 'Beit Minerva Farm Alert';
    let body = '';

    if (urgentAlerts.length > 0) {
      title = `${urgentAlerts.length} Action(s) Require Attention`;
      body = `${urgentAlerts[0].title}: ${urgentAlerts[0].description}`;
      if (urgentAlerts.length > 1) {
        body += `\n+ ${urgentAlerts.length - 1} other urgent alert(s)`;
      }
    } else if (warningAlerts.length > 0) {
      title = `${warningAlerts.length} Farm Notification(s) Today`;
      body = `${warningAlerts[0].title}`;
      if (warningAlerts.length > 1) {
        body += `\n${warningAlerts[1].title}`;
      }
    }

    sendBrowserNotification(title, body, { tag: `farm-daily-summary-${todayStr}` });
    localStorage.setItem('last_inapp_notify_date', todayStr);
  }

  return alerts;
}

