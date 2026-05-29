import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

const POSITION_CLASS = {
  top: 'top-20 right-4 left-4 sm:left-auto sm:right-5',
  bottom: 'bottom-4 right-4 left-4 sm:left-auto',
};

const TOAST_STYLE = {
  success: {
    icon: CheckCircle2,
    title: 'Berhasil',
    compactClass: 'bg-gray-900 text-white',
    borderClass: 'border-emerald-200 bg-emerald-50',
    iconClass: 'text-emerald-600',
    titleClass: 'text-emerald-800',
    messageClass: 'text-emerald-700',
  },
  error: {
    icon: AlertCircle,
    title: 'Gagal',
    compactClass: 'bg-red-600 text-white',
    borderClass: 'border-red-200 bg-red-50',
    iconClass: 'text-red-600',
    titleClass: 'text-red-800',
    messageClass: 'text-red-700',
  },
  warning: {
    icon: TriangleAlert,
    title: 'Perlu dicek',
    compactClass: 'bg-amber-600 text-white',
    borderClass: 'border-amber-200 bg-amber-50',
    iconClass: 'text-amber-600',
    titleClass: 'text-amber-800',
    messageClass: 'text-amber-700',
  },
  info: {
    icon: Info,
    title: 'Informasi',
    compactClass: 'bg-blue-600 text-white',
    borderClass: 'border-blue-200 bg-blue-50',
    iconClass: 'text-blue-600',
    titleClass: 'text-blue-800',
    messageClass: 'text-blue-700',
  },
};

export function ToastNotification({
  toast,
  onClose,
  position = 'top',
  compact = false,
}) {
  const isOpen = Boolean(toast?.show ?? toast);
  if (!isOpen) return null;

  const style = TOAST_STYLE[toast?.type] || TOAST_STYLE.success;
  const title = toast?.title || style.title;
  const message = toast?.message || '';
  const Icon = style.icon;
  const containerClass = POSITION_CLASS[position] || POSITION_CLASS.top;

  if (compact) {
    return (
      <div
        className={`fixed ${containerClass} z-[80] flex items-center gap-3 rounded-xl px-6 py-3 shadow-lg ${style.compactClass}`}
      >
        <Icon className="h-5 w-5" />
        <span className="text-sm font-medium">{message || title}</span>
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/10" aria-label="Tutup notifikasi">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`fixed ${containerClass} z-[80] w-auto max-w-md`}>
      <div className={`rounded-xl border p-4 shadow-xl ${style.borderClass}`}>
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} />

          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${style.titleClass}`}>
              {title}
            </p>
            {message ? (
              <p className={`mt-1 text-sm ${style.messageClass}`}>
                {message}
              </p>
            ) : null}

            {toast?.temporaryPassword ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
                <p className="mb-1 text-xs text-gray-500">Password sementara</p>
                <code className="break-all text-sm font-semibold text-gray-900">
                  {toast.temporaryPassword}
                </code>
              </div>
            ) : null}
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-white/70"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ToastNotification;
