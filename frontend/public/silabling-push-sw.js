self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Notifikasi SILABLING', body: 'Ada notifikasi baru.' };
  }

  const title = payload.title || 'Notifikasi SILABLING';
  const options = {
    body: payload.body || 'Ada notifikasi baru.',
    tag: payload.tag || 'silabling-notification',
    data: payload.data || {},
    icon: '/logo-uptd.png',
    badge: '/logo-uptd.png',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    // Attempt to focus existing tab
    for (const client of windowClients) {
      if (client.url === targetUrl && 'focus' in client) {
        return client.focus();
      }
    }
    
    // If exact url not found but there's a window, navigate and focus
    if (windowClients.length > 0 && 'focus' in windowClients[0] && 'navigate' in windowClients[0]) {
      const client = windowClients[0];
      await client.navigate(targetUrl);
      return client.focus();
    }

    if (clients.openWindow) return clients.openWindow(targetUrl);
    return undefined;
  })());
});
