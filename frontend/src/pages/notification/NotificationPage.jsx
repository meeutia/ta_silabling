import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Clock3, Loader2, MailOpen } from 'lucide-react';
import { notificationApi } from '../../api/notificationApi';
import { PushNotificationControl } from '../../components/layout/PushNotificationControl';
import { getDefaultPageForRole } from '../../app/pageConfig';
import {
  formatNotificationTime,
  getNotificationId,
  getNotificationMessage,
  getNotificationTitle,
  getRoleTarget,
} from '../../components/layout/notificationUi';

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'unread', label: 'Belum dibaca' },
];

const AUTO_REFRESH_INTERVAL_MS = 30000;

export function NotificationPage({ role, onNavigate }) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const totalCount = items.length;
  const isUnreadOnly = filter === 'unread';

  const pageSummary = useMemo(() => {
    if (loading && totalCount === 0) return 'Memuat daftar notifikasi.';
    if (totalCount === 0 && isUnreadOnly) return 'Tidak ada notifikasi yang belum dibaca.';
    if (totalCount === 0) return 'Belum ada notifikasi.';
    return `${totalCount} notifikasi ditampilkan. ${unreadCount} belum dibaca.`;
  }, [isUnreadOnly, loading, totalCount, unreadCount]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await notificationApi.unreadCount();
      setUnreadCount(Number(result?.count || 0));
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');

    try {
      const result = await notificationApi.list({
        limit: 100,
        unreadOnly: isUnreadOnly ? 'true' : '',
      });
      setItems(Array.isArray(result) ? result : []);
      await fetchUnreadCount();
    } catch (err) {
      if (!silent) setError(err?.message || 'Gagal memuat notifikasi.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetchUnreadCount, isUnreadOnly]);

  useEffect(() => {
    fetchNotifications();

    const intervalId = window.setInterval(() => {
      fetchNotifications({ silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchNotifications]);

  const markReadLocally = (idNotifikasi) => {
    setItems((currentItems) => currentItems
      .map((item) => (
        getNotificationId(item) === idNotifikasi
          ? { ...item, belumDibaca: false, sudahDibaca: true }
          : item
      ))
      .filter((item) => !isUnreadOnly || item.belumDibaca));
    setUnreadCount((currentCount) => Math.max(0, Number(currentCount || 0) - 1));
  };

  const handleOpenTarget = async (notification) => {
    const idNotifikasi = getNotificationId(notification);
    const wasUnread = Boolean(notification?.belumDibaca);

    try {
      if (idNotifikasi && wasUnread) {
        await notificationApi.markRead(idNotifikasi);
        markReadLocally(idNotifikasi);
      }
    } catch {
      // Navigasi tetap berjalan walaupun update status baca gagal.
    }

    const target = getRoleTarget(notification, role);
    if (target?.page && typeof onNavigate === 'function') {
      onNavigate(target.page, {
        queryParams: target.queryParams || null,
        pathSegments: target.pathSegments || [],
      });
      return;
    }

    if (typeof onNavigate === 'function') {
      onNavigate(getDefaultPageForRole(role));
    }
  };

  const handleMarkRead = async (notification) => {
    const idNotifikasi = getNotificationId(notification);
    if (!idNotifikasi || !notification?.belumDibaca) return;

    setActionLoading(true);
    try {
      await notificationApi.markRead(idNotifikasi);
      markReadLocally(idNotifikasi);
    } catch (err) {
      setError(err?.message || 'Gagal menandai notifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    setActionLoading(true);
    setError('');

    try {
      await notificationApi.markAllRead();
      setItems((currentItems) => (
        isUnreadOnly
          ? []
          : currentItems.map((item) => ({ ...item, belumDibaca: false, sudahDibaca: true }))
      ));
      setUnreadCount(0);
    } catch (err) {
      setError(err?.message || 'Gagal menandai semua notifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="silabling-notification-page">
      <div className="silabling-notification-page__shell">
        <header className="silabling-notification-hero">
          <div className="silabling-notification-hero__content">
            <span className="silabling-notification-hero__icon" aria-hidden="true">
              <Bell />
            </span>
            <div className="silabling-notification-hero__text">
              <h1>Notifikasi</h1>
              <p>Daftar notifikasi sistem untuk akun yang sedang login.</p>
              <span>{pageSummary}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={actionLoading || unreadCount === 0}
            className="silabling-notification-button silabling-notification-button--primary"
          >
            {actionLoading ? <Loader2 className="silabling-spin" /> : <CheckCheck />}
            <span>Tandai semua dibaca</span>
          </button>
        </header>

        <PushNotificationControl role={role} />

        <div className="silabling-notification-card">
          <div className="silabling-notification-toolbar">
            <div className="silabling-notification-tabs" role="tablist" aria-label="Filter notifikasi">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={filter === item.id ? 'is-active' : ''}
                  role="tab"
                  aria-selected={filter === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="silabling-notification-counter">
              Belum dibaca: <strong>{unreadCount}</strong>
            </p>
          </div>

          {loading && totalCount === 0 ? (
            <div className="silabling-notification-empty">
              <Loader2 className="silabling-spin" />
              <p>Memuat notifikasi...</p>
            </div>
          ) : error ? (
            <div className="silabling-notification-empty is-error">{error}</div>
          ) : items.length === 0 ? (
            <div className="silabling-notification-empty">
              <MailOpen />
              <p>{isUnreadOnly ? 'Tidak ada notifikasi belum dibaca.' : 'Belum ada notifikasi.'}</p>
              <span>Notifikasi baru akan muncul ketika ada aktivitas sistem untuk akun ini.</span>
            </div>
          ) : (
            <div className="silabling-notification-list-page">
              {items.map((item) => {
                const idNotifikasi = getNotificationId(item);
                const title = getNotificationTitle(item);
                const message = getNotificationMessage(item);

                return (
                  <article
                    key={idNotifikasi}
                    className={`silabling-notification-row ${item.belumDibaca ? 'is-unread' : 'is-read'}`}
                  >
                    <span className="silabling-notification-row__dot" aria-hidden="true" />

                    <div className="silabling-notification-row__body">
                      <div className="silabling-notification-row__head">
                        <h2>{title}</h2>
                        <span className={item.belumDibaca ? 'is-unread' : ''}>
                          {item.belumDibaca ? 'Belum dibaca' : 'Sudah dibaca'}
                        </span>
                      </div>

                      <p>{message}</p>

                      <div className="silabling-notification-row__meta">
                        {item.dibuatPada ? (
                          <span>
                            <Clock3 />
                            {formatNotificationTime(item.dibuatPada)}
                          </span>
                        ) : null}
                        {item.referensiLabel ? <span>{item.referensiLabel}</span> : null}
                      </div>
                    </div>

                    {item.belumDibaca ? (
                      <div className="silabling-notification-row__actions">
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item)}
                          disabled={actionLoading}
                          className="silabling-notification-button silabling-notification-button--secondary"
                        >
                          Tandai dibaca
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTarget(item)}
                          className="silabling-notification-button silabling-notification-button--primary"
                        >
                          Buka detail
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default NotificationPage;
