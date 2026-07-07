import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, Loader2, ShieldAlert } from 'lucide-react';
import {
  activateBrowserPushNotification,
  getBrowserNotificationPermission,
  getExistingPushSubscription,
  isBrowserPushSupported,
} from '../../utils/browserPushNotification';

export function PushNotificationControl({ role, compact = false }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const shouldShow = role && role !== 'pelanggan';

  const refreshState = useCallback(async () => {
    if (!shouldShow) return;

    const isSupported = isBrowserPushSupported();
    setSupported(isSupported);
    setPermission(getBrowserNotificationPermission());

    if (!isSupported) return;

    try {
      const subscription = await getExistingPushSubscription();
      setActive(Boolean(subscription));
    } catch {
      setActive(false);
    }
  }, [shouldShow]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const label = useMemo(() => {
    if (!supported) return 'Tidak didukung';
    if (permission === 'denied') return 'Diblokir';
    if (active) return 'Push aktif';
    return 'Aktifkan push';
  }, [active, permission, supported]);

  const description = useMemo(() => {
    if (!supported) return 'Browser ini belum mendukung push notification.';
    if (permission === 'denied') return 'Izin notifikasi diblokir di pengaturan browser.';
    if (active) return 'Notifikasi internal lab akan muncul dari browser.';
    return 'Aktifkan agar notifikasi internal lab muncul seperti notifikasi Chrome atau Windows.';
  }, [active, permission, supported]);

  const handleActivate = async () => {
    setLoading(true);
    setMessage('');

    try {
      await activateBrowserPushNotification();
      setActive(true);
      setPermission(getBrowserNotificationPermission());
      setMessage('Push notification aktif.');
    } catch (error) {
      setMessage(error?.message || 'Gagal mengaktifkan push notification.');
      await refreshState();
    } finally {
      setLoading(false);
    }
  };

  if (!shouldShow) return null;

  if (compact) {
    return (
      <div className="silabling-push-compact">
        <div className="silabling-push-compact__row">
          <div className="silabling-push-compact__text">
            <p className="silabling-push-compact__title">Browser push</p>
            <p className="silabling-push-compact__desc">{description}</p>
          </div>
          <button
            type="button"
            onClick={handleActivate}
            disabled={loading || active || !supported || permission === 'denied'}
            className="silabling-push-compact__button"
          >
            {loading ? <Loader2 className="silabling-spin" /> : <BellRing />}
            <span>{label}</span>
          </button>
        </div>
        {message ? <p className="silabling-push-compact__message">{message}</p> : null}
      </div>
    );
  }

  return (
    <section className="silabling-push-card">
      <div className="silabling-push-card__icon" aria-hidden="true">
        {permission === 'denied' ? <ShieldAlert /> : <BellRing />}
      </div>

      <div className="silabling-push-card__body">
        <h2>Push notification browser</h2>
        <p>{description}</p>
        {message ? <span className="silabling-push-card__message">{message}</span> : null}
      </div>

      <button
        type="button"
        onClick={handleActivate}
        disabled={loading || active || !supported || permission === 'denied'}
        className="silabling-notification-button silabling-notification-button--primary silabling-push-card__button"
      >
        {loading ? <Loader2 className="silabling-spin" /> : <BellRing />}
        <span>{label}</span>
      </button>
    </section>
  );
}

export default PushNotificationControl;
