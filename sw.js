// Service Worker for Goat Farm Management System (Web Push Notifications)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Beit Minerva Farm', body: 'You have a scheduled farm task due today!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const appScope = self.registration.scope || './';
  const targetUrl = data.url ? new URL(data.url, appScope).href : appScope;

  const options = {
    body: data.body || 'Farm task reminder',
    icon: new URL('favicon.svg', appScope).href,
    badge: new URL('favicon.svg', appScope).href,
    tag: data.tag || 'goat-farm-reminder',
    renotify: true,
    data: { url: targetUrl }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const appScope = self.registration.scope || './';
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : appScope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.startsWith(appScope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
