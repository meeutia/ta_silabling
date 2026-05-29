import { CheckCircle2, Loader2, Save, Send } from 'lucide-react';
import {
  getKasiPengujianRevisionNote,
  getPenyeliaResponseNote,
  getPenyeliaRevisionNote,
  getRowReviewStatus,
  getStatusBadgeClass,
  normalizeScientificResultInput,
} from './analisDetailUtils';

function getLkaRevisionNote(detail = {}) {
  return String(
    detail?.worksheet?.lkaRevisionNote ||
      detail?.worksheet?.lka_revision_note ||
      detail?.worksheet?.catatanRevisiGlobal ||
      detail?.worksheet?.catatan_revisi_global ||
      detail?.worksheet?.catatanRevisiLka ||
      detail?.worksheet?.catatan_revisi_lka ||
      detail?.worksheet?.catatanRevisi ||
      detail?.worksheet?.catatan_revisi ||
      detail?.lkaRevisionNote ||
      detail?.lka_revision_note ||
      detail?.catatanRevisiGlobal ||
      detail?.catatan_revisi_global ||
      detail?.catatanRevisiLka ||
      detail?.catatan_revisi_lka ||
      detail?.catatanRevisi ||
      detail?.catatan_revisi ||
      ''
  ).trim();
}

function looksLikePerSampleRevisionNote(note = '', rows = []) {
  const cleanNote = String(note || '').trim();
  if (!cleanNote) return false;

  const sampleNos = rows
    .map((row) => row.noSampel || row.no_sampel)
    .filter(Boolean);

  return sampleNos.some((noSampel) => cleanNote.includes(`${noSampel}:`));
}

export function AnalisResultSection({
  detail = {},
  resultRows,
  setResultRows,
  progressStats,
  canEditResultRow,
  isReadOnly,
  isLhuLocked = false,
  savingResults,
  submitting,
  onSaveResults,
  onSubmitWorksheet,
}) {
  const lkaRevisionNote = getLkaRevisionNote(detail);
  const shouldShowLkaRevisionNote = Boolean(
    lkaRevisionNote && !looksLikePerSampleRevisionNote(lkaRevisionNote, resultRows)
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Hasil Pengujian Sampel <span className="text-red-500">*</span>
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Isi hasil pengujian untuk setiap nomor sampel.
          </p>
        </div>

        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {progressStats.filled}/{progressStats.total} terisi
        </div>
      </div>

      <div className="p-6 mb-5">
        {shouldShowLkaRevisionNote && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">Keterangan Revisi LKA</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">
              {lkaRevisionNote}
            </p>
          </div>
        )}

        <div className="mb-5 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progressStats.percent}%` }}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-[1350px] w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  No Sampel
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Hasil
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Catatan Hasil
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Catatan Revisi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {resultRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    Tidak ada sampel pada tugas ini.
                  </td>
                </tr>
              ) : (
                resultRows.map((row, index) => {
                  const isFilled = Boolean(String(row.hasil || '').trim());
                  const rowEditable = canEditResultRow(row);
                  const rowStatus = getRowReviewStatus(row);
                  const rowRevisionNotePenyelia = getPenyeliaRevisionNote(row);
                  const rowRevisionNoteKasi = getKasiPengujianRevisionNote(row);
                  const rowPenyeliaResponseNote = getPenyeliaResponseNote(row);

                  return (
                    <tr key={row.noSampel || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-900">
                        {row.noSampel}
                      </td>

                      <td className="px-4 py-3">
                        {!rowEditable ? (
                          <span
                            className={`text-sm ${
                              isFilled
                                ? 'font-medium text-gray-900'
                                : 'italic text-gray-400'
                            }`}
                          >
                            {row.hasil || 'Belum ada hasil'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="text"
                            value={row.hasil}
                            onChange={(event) => {
                              const nextValue = normalizeScientificResultInput(event.target.value);
                              setResultRows((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, hasil: nextValue } : item
                                )
                              );
                            }}
                            placeholder="Masukkan nilai hasil pengujian..."
                            className="min-w-[180px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                          />
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {!rowEditable ? (
                          <span className="text-sm text-gray-700">
                            {row.catatanHasil || row.catatan_hasil || '-'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={row.catatanHasil || row.catatan_hasil || ''}
                            onChange={(event) =>
                              setResultRows((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        catatanHasil: event.target.value,
                                        catatan_hasil: event.target.value,
                                      }
                                    : item
                                )
                              )
                            }
                            placeholder="Opsional, catatan hasil pengujian..."
                            className="min-w-[220px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                          />
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              rowStatus
                                ? getStatusBadgeClass(rowStatus)
                                : isFilled
                                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            {rowStatus || (isFilled ? 'Terisi' : 'Belum Terisi')}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-700">
                        {rowRevisionNotePenyelia || rowRevisionNoteKasi || rowPenyeliaResponseNote ? (
                          <div className="space-y-2">
                            {rowRevisionNotePenyelia && (
                              <div className="max-w-[320px] whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                                <p className="font-semibold">Catatan Revisi Penyelia</p>
                                <p className="mt-1">{rowRevisionNotePenyelia}</p>
                              </div>
                            )}

                            {rowRevisionNoteKasi && (
                              <div className="max-w-[320px] whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                                <p className="font-semibold">Catatan Revisi Kasi Pengujian</p>
                                <p className="mt-1">{rowRevisionNoteKasi}</p>
                              </div>
                            )}

                            {rowPenyeliaResponseNote && (
                              <div className="max-w-[320px] whitespace-pre-wrap rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700">
                                <p className="font-semibold">Respon Penyelia</p>
                                <p className="mt-1">{rowPenyeliaResponseNote}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isReadOnly && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onSaveResults}
              disabled={savingResults}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingResults ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingResults ? 'Menyimpan...' : 'Simpan Hasil'}
            </button>

            <button
              type="button"
              onClick={onSubmitWorksheet}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? 'Mengirim...' : 'Kirim ke Penyelia'}
            </button>
          </div>
        )}

        {isReadOnly && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-700">
                {isLhuLocked
                  ? 'LHU sudah tergenerate. Data hasil hanya dapat dibaca.'
                  : 'Worksheet telah dikirim. Data hasil hanya dapat dibaca.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
