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
    icon: '/vite.svg',
    badge: '/vite.svg',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) return client.navigate(targetUrl);
        return undefined;
      }
    }

    if (clients.openWindow) return clients.openWindow(targetUrl);
    return undefined;
  })());
});
