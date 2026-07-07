export function formatNotificationTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getRoleTarget(notification, role) {
  return notification?.target?.[role] || null;
}

export function getNotificationId(notification) {
  return notification?.idNotifikasi || notification?.idNotifikasiEmail || '';
}

export function getNotificationTitle(notification) {
  return String(notification?.judul || 'Notifikasi').trim();
}

export function getNotificationMessage(notification) {
  return String(notification?.pesan || 'Ada notifikasi baru.').trim();
}

export function summarizeNotificationMessage(message, maxLength = 96) {
  const cleanMessage = String(message || '').replace(/\s+/g, ' ').trim();
  if (!cleanMessage || cleanMessage.length <= maxLength) return cleanMessage;
  return `${cleanMessage.slice(0, maxLength - 1).trim()}…`;
}
