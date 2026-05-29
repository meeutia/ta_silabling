import { useEffect, useState } from 'react';
import { getToastEventName } from '../../utils/feedback';
import { ToastNotification } from './ToastNotification';

const DEFAULT_TOAST_DURATION = 3500;

export function AppToastHost() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleToast = (event) => {
      const detail = event.detail || {};
      const nextToast = {
        show: true,
        type: detail.type || 'success',
        title: detail.title,
        message: detail.message || '',
        temporaryPassword: detail.temporaryPassword,
        duration: detail.duration ?? DEFAULT_TOAST_DURATION,
        id: detail.id || Date.now(),
      };

      setToast(nextToast);
    };

    window.addEventListener(getToastEventName(), handleToast);
    return () => window.removeEventListener(getToastEventName(), handleToast);
  }, []);

  useEffect(() => {
    if (!toast?.show) return undefined;

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, toast.duration ?? DEFAULT_TOAST_DURATION);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <ToastNotification
      toast={toast}
      onClose={() => setToast(null)}
    />
  );
}

export default AppToastHost;
