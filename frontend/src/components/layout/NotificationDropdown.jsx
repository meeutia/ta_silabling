import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Bell, CheckCheck, Clock3, Loader2, MailOpen, X } from 'lucide-react';
import { notificationApi } from '../../api/notificationApi';
import { PushNotificationControl } from './PushNotificationControl';
import { getDefaultPageForRole } from '../../app/pageConfig';
import {
  formatNotificationTime,
  getNotificationId,
  getNotificationMessage,
  getNotificationTitle,
  getRoleTarget,
  summarizeNotificationMessage,
} from './notificationUi';

export function NotificationDropdown({ role, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  const normalizedUnreadCount = useMemo(() => {
    const count = Number(unreadCount || 0);
    if (!Number.isFinite(count) || count <= 0) return 0;
    return count;
  }, [unreadCount]);

  const fetchUnreadCount = useCallback(async (silent = false) => {
    try {
      const result = await notificationApi.unreadCount();
      setUnreadCount(Number(result?.count || 0));
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');

    try {
      const result = await notificationApi.list({ limit: 8 });
      setItems(Array.isArray(result) ? result : []);
      await fetchUnreadCount(silent);
    } catch (err) {
      if (!silent) setError(err?.message || 'Gagal memuat notifikasi.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetchUnreadCount]);

  const fetchAll = useCallback(async (silent = false) => {
    if (open) {
      await fetchNotifications(silent);
    } else {
      await fetchUnreadCount(silent);
    }
  }, [open, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAutoRefresh(fetchAll);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const markReadLocally = (idNotifikasi) => {
    setItems((currentItems) => currentItems.map((item) => (
      getNotificationId(item) === idNotifikasi
        ? { ...item, belumDibaca: false, sudahDibaca: true }
        : item
    )));
    setUnreadCount((currentCount) => Math.max(0, Number(currentCount || 0) - 1));
  };

  const navigateToTarget = (notification) => {
    const target = getRoleTarget(notification, role);

    if (target?.page && typeof onNavigate === 'function') {
      onNavigate(target.page, {
        queryParams: target.queryParams || null,
        pathSegments: target.pathSegments || [],
      });
      setOpen(false);
      return;
    }

    if (typeof onNavigate === 'function') {
      onNavigate(getDefaultPageForRole(role));
      setOpen(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    const idNotifikasi = getNotificationId(notification);
    const wasUnread = Boolean(notification?.belumDibaca);

    try {
      if (idNotifikasi && wasUnread) {
        await notificationApi.markRead(idNotifikasi);
        markReadLocally(idNotifikasi);
      }
    } catch {
      // Navigasi tetap boleh berjalan walaupun update status baca gagal.
    }

    navigateToTarget(notification);
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);

    try {
      await notificationApi.markAllRead();
      setItems((currentItems) => currentItems.map((item) => ({
        ...item,
        belumDibaca: false,
        sudahDibaca: true,
      })));
      setUnreadCount(0);
    } catch (err) {
      setError(err?.message || 'Gagal menandai notifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAll = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('notifikasi');
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        aria-label="Buka notifikasi"
      >
        <Bell className="h-5 w-5" />
        {normalizedUnreadCount > 0 ? (
          <span className="silabling-notif-badge">
            {normalizedUnreadCount > 99 ? '99+' : normalizedUnreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="silabling-notification-panel">
          <div className="border-b border-gray-100 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-950">Notifikasi</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {normalizedUnreadCount > 0
                    ? `${normalizedUnreadCount} belum dibaca`
                    : 'Semua notifikasi sudah dibaca'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={actionLoading || normalizedUnreadCount === 0}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                  Tandai semua
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 bg-white p-3">
            <PushNotificationControl role={role} compact />
          </div>

          <div className="silabling-notification-list">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat notifikasi...
              </div>
            ) : error ? (
              <div className="rounded-xl bg-white px-4 py-8 text-center text-sm text-red-600">{error}</div>
            ) : items.length === 0 ? (
              <div className="rounded-xl bg-white px-4 py-8 text-center">
                <MailOpen className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-700">Belum ada notifikasi.</p>
              </div>
            ) : (
              <div className="silabling-notification-dropdown-items">
                {items.map((item) => {
                  const idNotifikasi = getNotificationId(item);
                  const title = getNotificationTitle(item);
                  const message = getNotificationMessage(item);

                  const Wrapper = item.belumDibaca ? 'button' : 'div';
                  return (
                    <Wrapper
                      type={item.belumDibaca ? 'button' : undefined}
                      key={idNotifikasi}
                      onClick={item.belumDibaca ? () => handleNotificationClick(item) : undefined}
                      className={`silabling-notif-item${item.belumDibaca ? ' is-unread' : ' is-read'}`}
                    >
                      <span className={`silabling-notif-item__dot${item.belumDibaca ? ' is-unread' : ''}`} aria-hidden="true" />
                      <span className="silabling-notif-item__content">
                        <span className="silabling-clamp-2 silabling-notif-item__title">{title}</span>
                        <span className="silabling-clamp-2 silabling-notif-item__message">
                          {summarizeNotificationMessage(message, 130)}
                        </span>
                        {item.dibuatPada ? (
                          <span className="silabling-notif-item__time">
                            <Clock3 />
                            {formatNotificationTime(item.dibuatPada)}
                          </span>
                        ) : null}
                      </span>
                    </Wrapper>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-white p-3">
            <button
              type="button"
              onClick={handleViewAll}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Lihat semua notifikasi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationDropdown;
