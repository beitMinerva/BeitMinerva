// Web Notifications Service & Due Tasks Checker for Goat Farm Management

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function sendBrowserNotification(title, body, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return null;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
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
    console.error('Failed to trigger browser notification:', err);
    return null;
  }
}

/**
 * Scans events/scheduled tasks and notifies user of tasks due today or overdue
 */
export function checkUpcomingTasksAndNotify(events = [], goats = []) {
  if (!events || events.length === 0) return [];

  const todayStr = new Date().toISOString().split('T')[0];
  const dueTasks = [];

  events.forEach((ev) => {
    const isScheduled = ev.title?.toLowerCase().startsWith('scheduled') || ev.custom_fields?.repeat_frequency;
    if (!isScheduled) return;

    const eventDateStr = ev.date?.split('T')[0];
    if (eventDateStr === todayStr) {
      const goatName = ev.goat_id ? goats.find(g => g.id === ev.goat_id)?.name || 'Goat' : 'Herd';
      dueTasks.push({
        event: ev,
        title: ev.title || 'Scheduled Task Due Today',
        message: `${ev.title} is due today for ${goatName}!`,
        type: 'TODAY'
      });
    }
  });

  // If permission is granted, trigger push notification for the first task
  if (dueTasks.length > 0 && getNotificationPermission() === 'granted') {
    const task = dueTasks[0];
    sendBrowserNotification(`🐐 Farm Task Reminder`, task.message, { tag: `task-${task.event.id}` });
  }

  return dueTasks;
}
