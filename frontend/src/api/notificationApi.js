import { requestData } from './httpClient';

function buildQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    const normalizedValue = String(value ?? '').trim();
    if (normalizedValue) search.set(key, normalizedValue);
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

export const notificationApi = {
  list(params = {}) {
    return requestData(`/notifications${buildQuery(params)}`, {}, { auth: true, blocking: false });
  },

  unreadCount() {
    return requestData('/notifications/unread-count', {}, { auth: true, blocking: false });
  },

  markRead(idNotifikasi) {
    return requestData(`/notifications/${encodeURIComponent(idNotifikasi)}/read`, {
      method: 'PATCH',
    }, { auth: true, blocking: false });
  },

  markAllRead() {
    return requestData('/notifications/read-all', {
      method: 'PATCH',
    }, { auth: true, blocking: false });
  },

  pushConfig() {
    return requestData('/notifications/push/config', {}, { auth: true, blocking: false });
  },

  subscribePush(subscription) {
    return requestData('/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    }, { auth: true, blocking: false });
  },

  unsubscribePush(endpoint) {
    return requestData('/notifications/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }, { auth: true, blocking: false });
  },
};
