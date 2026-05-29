import { Loader2, X } from 'lucide-react';
import { formatDateOnly } from './penyeliaPenugasanDetailUtils';

export function PenyeliaDeadlineModal({
  deadlineModal,
  deadlineValue,
  actionLoadingId,
  onClose,
  onChangeDeadline,
  onSubmit,
}) {
  if (!deadlineModal.open || !deadlineModal.detail) return null;

  const detail = deadlineModal.detail;
  const isLoading = actionLoadingId === detail.idPenugasanDetail;
  const parameter = detail.parameter || detail.namaParameter || detail.nama_parameter || '-';
  const metode = detail.namaMetode || detail.nama_metode || detail.metode || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-5/6 max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Deadline Penugasan
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Deadline lama: {formatDateOnly(detail.deadline)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Parameter:</span> {parameter}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Metode:</span> {metode}
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Deadline baru
            </span>
            <input
              type="date"
              value={deadlineValue}
              onChange={(event) => onChangeDeadline(event.target.value)}
              disabled={isLoading}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || !deadlineValue}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Simpan Deadline
          </button>
        </div>
      </div>
    </div>
  );
}
