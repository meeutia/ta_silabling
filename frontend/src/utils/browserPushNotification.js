import { notificationApi } from '../api/notificationApi';

const SERVICE_WORKER_PATH = '/silabling-push-sw.js';

function urlBase64ToUint8Array(base64String = '') {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isBrowserPushSupported() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean(
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
}

export async function getPushServiceWorkerRegistration() {
  if (!isBrowserPushSupported()) {
    throw new Error('Browser tidak mendukung push notification.');
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH);
}

export async function getActiveServiceWorkerRegistration() {
  if (!isBrowserPushSupported()) return null;
  return navigator.serviceWorker.getRegistration();
}

export async function getExistingPushSubscription() {
  if (!isBrowserPushSupported()) return null;

  const registration = await getActiveServiceWorkerRegistration();
  if (!registration) return null;
  
  return registration.pushManager.getSubscription();
}

export async function getServerPushStatus() {
  try {
    const status = await notificationApi.pushStatus();
    return Boolean(status?.active);
  } catch {
    return false;
  }
}

export async function activateBrowserPushNotification() {
  if (!isBrowserPushSupported()) {
    throw new Error('Browser tidak mendukung push notification.');
  }

  const config = await notificationApi.pushConfig();
  if (!config?.enabled || !config?.publicKey) {
    throw new Error('Push notification belum aktif di server. Pastikan VAPID key dan ENABLE_PUSH_NOTIFICATIONS sudah dikonfigurasi.');
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi browser belum diberikan.');
  }

  const registration = await getPushServiceWorkerRegistration();
  await navigator.serviceWorker.ready;
  
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.publicKey),
  });

  await notificationApi.subscribePush(subscription.toJSON());
  return { active: true, permission, subscription };
}

export async function deactivateBrowserPushNotification() {
  if (!isBrowserPushSupported()) return { active: false };

  const subscription = await getExistingPushSubscription();
  
  try {
    await notificationApi.unsubscribePush(subscription?.endpoint || null);
  } catch {
    // Ignore error, proceed to unsubscribe locally
  }

  if (subscription) {
    await subscription.unsubscribe();
  }
  
  return { active: false };
}
