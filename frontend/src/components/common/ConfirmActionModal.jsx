export function ConfirmActionModal({
  open,
  title,
  description,
  message,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  loading = false,
  onConfirm,
  onClose,
  onCancel,
}) {
  if (!open) return null;

  const body = description || message || '';
  const confirm = confirmText || confirmLabel || 'Ya';
  const cancel = cancelText || cancelLabel || 'Batal';
  const handleClose = onClose || onCancel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {body && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{body}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memproses...' : confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
