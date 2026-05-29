import { AlertCircle, Loader2, X } from 'lucide-react';
import {
  getSampleLkaHasilTargetKey,
  getSampleReviewStatus,
  isSampleWaitingPenyelia,
} from './penyeliaPenugasanDetailUtils';

export function PenyeliaRevisionModal({
  revisionModal,
  revisionNotes,
  revisionSampleNotes = {},
  actionLoadingId,
  onClose,
  onModeChange,
  onToggleSample,
  onNotesChange,
  onSampleNotesChange,
  onSubmit,
}) {
  if (!revisionModal.open || !revisionModal.detail) return null;

  const selectableSamples = (revisionModal.detail?.samples || []).filter((sample) =>
    isSampleWaitingPenyelia(sample, revisionModal.detail)
  );
  const selectedIds = revisionModal.selectedIds || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="mx-auto flex min-h-full w-full max-w-2xl items-start justify-center py-6 sm:items-center">
        <div className="flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between rounded-t-xl bg-amber-600 px-6 py-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                Minta Perbaikan
              </h3>

              <p className="text-sm text-gray-100">
                {revisionModal.detail.parameter} — {revisionModal.detail.metode}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-white transition-all hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-sm font-semibold text-gray-700">
                Target Revisi
              </p>

              <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={revisionModal.mode === 'all'}
                  onChange={() => onModeChange('all')}
                />
                Revisi seluruh LKA
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={revisionModal.mode === 'selected'}
                  onChange={() => onModeChange('selected')}
                />
                Revisi hasil sampel tertentu
              </label>
            </div>

            {revisionModal.mode === 'all' && (
              <>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Catatan Revisi
                </label>

                <textarea
                  rows={5}
                  value={revisionNotes}
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="Tulis catatan revisi untuk seluruh LKA..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-amber-500"
                />
              </>
            )}

            {revisionModal.mode === 'selected' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Pilih sampel dan isi catatan revisi per sampel
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Catatan hanya wajib untuk sampel yang dicentang.
                  </p>
                </div>

                {selectableSamples.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                    Tidak ada sampel yang menunggu review penyelia.
                  </div>
                ) : (
                  <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-gray-200">
                    {selectableSamples.map((sample) => {
                      const hasilKey = getSampleLkaHasilTargetKey(sample);
                      const hasilTarget = { kodeLka: sample.kodeLka || sample.kode_lka, kode_lka: sample.kode_lka || sample.kodeLka, noSampel: sample.noSampel || sample.no_sampel, no_sampel: sample.no_sampel || sample.noSampel };
                      const noSampel = sample.noSampel || sample.no_sampel || '-';
                      const checked = selectedIds.includes(hasilKey);

                      return (
                        <div
                          key={hasilKey || noSampel}
                          className="border-b border-gray-100 p-3 last:border-b-0"
                        >
                          <label className="flex cursor-pointer items-start gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(checked)}
                              onChange={() => onToggleSample(hasilTarget)}
                              disabled={!hasilKey}
                              className="mt-1"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-900">
                                  {noSampel}
                                </p>

                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                  {getSampleReviewStatus(sample, revisionModal.detail)}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-gray-600">
                                Hasil: {sample.hasil || '-'}
                              </p>
                            </div>
                          </label>

                          {checked && (
                            <div className="mt-3 pl-7">
                              <label className="mb-1 block text-xs font-medium text-gray-600">
                                Catatan Revisi untuk {noSampel}
                              </label>

                              <textarea
                                rows={3}
                                value={revisionSampleNotes[hasilKey] || ''}
                                onChange={(event) =>
                                  onSampleNotesChange(hasilTarget, event.target.value)
                                }
                                placeholder={`Tulis catatan revisi untuk ${noSampel}...`}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-all hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={actionLoadingId === revisionModal.detail.idPenugasanDetail}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white transition-all hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoadingId === revisionModal.detail.idPenugasanDetail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
