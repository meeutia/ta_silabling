import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, Loader2, ShieldAlert } from 'lucide-react';
import {
  activateBrowserPushNotification,
  deactivateBrowserPushNotification,
  getBrowserNotificationPermission,
  getExistingPushSubscription,
  getServerPushStatus,
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
      const serverActive = await getServerPushStatus();
      const localSubscription = await getExistingPushSubscription();
      setActive(serverActive || Boolean(localSubscription));
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

  const handleDeactivate = async () => {
    setLoading(true);
    setMessage('');

    try {
      await deactivateBrowserPushNotification();
      setActive(false);
      setMessage('Push notification dinonaktifkan.');
    } catch (error) {
      setMessage(error?.message || 'Gagal menonaktifkan push notification.');
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
          {active ? (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={loading}
              className="silabling-push-compact__button"
              style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
            >
              {loading ? <Loader2 className="silabling-spin" /> : <BellRing />}
              <span>Nonaktifkan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleActivate}
              disabled={loading || !supported || permission === 'denied'}
              className="silabling-push-compact__button"
            >
              {loading ? <Loader2 className="silabling-spin" /> : <BellRing />}
              <span>{label}</span>
            </button>
          )}
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

      <div className="silabling-push-card__actions" style={{ display: 'flex', gap: '8px' }}>
        {active ? (
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={loading}
            className="silabling-notification-button silabling-notification-button--primary silabling-push-card__button"
            style={{ backgroundColor: '#ef4444' }}
          >
            {loading ? <Loader2 className="silabling-spin" /> : <BellRing />}
            <span>Nonaktifkan</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleActivate}
            disabled={loading || !supported || permission === 'denied'}
            className="silabling-notification-button silabling-notification-button--primary silabling-push-card__button"
          >
            {loading ? <Loader2 className="silabling-spin" /> : <BellRing />}
            <span>{label}</span>
          </button>
        )}
      </div>
    </section>
  );
}

export default PushNotificationControl;
