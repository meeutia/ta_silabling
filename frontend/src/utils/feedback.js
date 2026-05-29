const TOAST_EVENT_NAME = 'app:toast';

function emitToast(detail) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT_NAME, {
      detail: {
        id: Date.now(),
        type: detail.type || 'success',
        title: detail.title,
        message: detail.message || '',
        temporaryPassword: detail.temporaryPassword,
        duration: detail.duration,
      },
    })
  );
}

export function showToast(detail) {
  emitToast(detail || {});
}

export function showSuccess(message, options = {}) {
  emitToast({
    type: 'success',
    title: options.title || 'Berhasil',
    message,
    ...options,
  });
}

export function showError(message, options = {}) {
  emitToast({
    type: 'error',
    title: options.title || 'Gagal',
    message,
    ...options,
  });
}

export function showInfo(message, options = {}) {
  emitToast({
    type: 'info',
    title: options.title || 'Informasi',
    message,
    ...options,
  });
}

export function showWarning(message, options = {}) {
  emitToast({
    type: 'warning',
    title: options.title || 'Perlu dicek',
    message,
    ...options,
  });
}

export function getToastEventName() {
  return TOAST_EVENT_NAME;
}
