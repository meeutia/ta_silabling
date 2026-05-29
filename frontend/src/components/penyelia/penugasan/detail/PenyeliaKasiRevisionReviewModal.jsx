import { CheckCircle2, Loader2, X } from 'lucide-react';


function joinUniqueNotes(notes = []) {
  const values = [];

  notes.forEach((note) => {
    const text = String(note || '').trim();
    if (!text) return;
    if (!values.some((item) => item === text)) values.push(text);
  });

  return values.join('\n\n');
}

function getRevisionId(row = {}) {
  return row.idRevisiLka || row.id_revisi_lka || row.id || row.id_revisi || '';
}

function getRevisionItems(row = {}) {
  return Array.isArray(row.items)
    ? row.items
    : Array.isArray(row.lka_revisi_items)
      ? row.lka_revisi_items
      : [];
}

function getRevisionItemLabel(item = {}) {
  const noSampel = item.noSampel || item.no_sampel || '-';
  const parameter = item.namaParameter || item.nama_parameter || item.parameter || '';
  const metode = item.namaMetode || item.nama_metode || item.metode || '';
  const acuan = item.acuanMetode || item.acuan_metode || '';
  const label = [parameter, metode, acuan].filter(Boolean).join(' - ');

  return label ? `${noSampel}: ${label}` : noSampel;
}

function getRevisionItemsNote(row = {}) {
  return joinUniqueNotes(
    getRevisionItems(row).map((item) =>
      item.catatanRevisi || item.catatan_revisi || item.note || ''
    )
  );
}

function getRevisionNote(row = {}) {
  return String(
    getRevisionItemsNote(row) ||
      row.catatanUmum ||
      row.catatan_umum ||
      ''
  ).trim();
}

function getRevisionItemsText(row = {}) {
  const items = getRevisionItems(row);

  if (items.length === 0) return '-';

  return items
    .map(getRevisionItemLabel)
    .filter(Boolean)
    .join('\n');
}

export function PenyeliaKasiRevisionReviewModal({
  modal,
  action,
  note,
  reviewingKasiRevisionId,
  onClose,
  onActionChange,
  onNoteChange,
  onSubmit,
}) {
  if (!modal?.open) return null;

  const revision = modal.revision || {};
  const revisionId = getRevisionId(revision);
  const revisionNote = getRevisionNote(revision);
  const isSubmitting = reviewingKasiRevisionId === revisionId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="shrink-0 flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Tanggapan Revisi Kasi Pengujian
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Tentukan apakah permintaan revisi Kasi diteruskan ke analis atau ditolak.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-gray-500 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Catatan Kasi Pengujian
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
              {revisionNote || '-'}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Target revisi
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
              {getRevisionItemsText(revision)}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Keputusan Penyelia
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">
                <input
                  type="radio"
                  name="kasiRevisionReviewAction"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={(event) => onActionChange(event.target.value)}
                  disabled={isSubmitting}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                Setuju, teruskan ke analis
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">
                <input
                  type="radio"
                  name="kasiRevisionReviewAction"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={(event) => onActionChange(event.target.value)}
                  disabled={isSubmitting}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                Tidak setuju, tolak revisi
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Catatan Tanggapan Penyelia
            </label>
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              disabled={isSubmitting}
              rows={4}
              placeholder="Tulis catatan tanggapan bila diperlukan..."
              className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Simpan Tanggapan
          </button>
        </div>
      </div>
    </div>
  );
}
