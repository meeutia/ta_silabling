import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import {
  formatDate,
  formatDateTimeDisplay,
  getAbnormalitasSampel,
  getAccreditationBadgeClass,
  getAcuanPengambilanSampel,
  getCatatanRevisiParts,
  getJamPenerimaanSampel,
  getInsituLabel,
  getKondisiSampel,
  getKoordinatSampel,
  getLkaHasilTarget,
  getLkaHasilTargetKey,
  getSatuanHasil,
  getStatusBadgeClass,
  getSubkontrakLabel,
  getTanggalPenerimaanSampel,
  getTanggalPengambilanSampel,
  isSubkontrakResult,
} from '../../lhu/lhuReviewUtils';
import { WorksheetFilesPreviewPane } from '../../penyelia/penugasan/detail/WorksheetFilesPreviewPane';

function InfoRow({ label, value, children }) {
  return (
    <div
      className="grid items-start border-b border-gray-100 py-2.5 last:border-b-0"
      style={{
        gridTemplateColumns: '135px 12px minmax(0, 1fr)',
      }}
    >
      <span className="text-sm font-medium text-gray-500">
        {label}
      </span>

      <span className="text-center text-sm font-medium text-gray-500">
        :
      </span>

      <span className="min-w-0 break-words pl-2 text-sm font-semibold text-gray-900">
        {children || value || '-'}
      </span>
    </div>
  );
}

function normalizeWorksheetFilesFromResults(results = []) {
  const map = new Map();

  (results || []).forEach((row) => {
    const files = Array.isArray(row.worksheetFiles || row.worksheet_files)
      ? row.worksheetFiles || row.worksheet_files
      : [];

    files.forEach((file) => {
      const path = file?.path || file?.filePath || file?.file_path || file?.secureUrl || file?.secure_url || '';
      if (!path || map.has(path)) return;

      map.set(path, {
        ...file,
        path: file.path || file.filePath || file.file_path || path,
        originalName: file.originalName || file.original_name || file.name || path.split('/').pop(),
      });
    });

    const directPath = row.fileWorksheetPath || row.file_worksheet_path || row.worksheetUrl || row.worksheet_url || '';
    if (directPath && !map.has(directPath)) {
      map.set(directPath, {
        path: directPath,
        originalName: directPath.split('/').pop(),
      });
    }
  });

  return Array.from(map.values());
}

function ResultTable({
  results = [],
  revisionOpen = false,
  selectedRevisionIds = [],
  onToggleRevisionResult,
}) {
  if (!results.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
        Hasil pengujian belum tersedia.
      </div>
    );
  }

  const selectedSet = new Set(selectedRevisionIds || []);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="overflow-x-auto pb-2">
        <table className="w-full min-w-[1840px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {revisionOpen && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Pilih Revisi
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Parameter
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Metode
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Hasil
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Satuan
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Subkontrak
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Insitu
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Status LKA
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Akreditasi
              </th>
              <th className="w-[360px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Catatan Revisi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {results.map((row, index) => {
              const parameter = row.namaParameter || row.nama_parameter || '-';
              const kategori = row.kategoriParameter || row.kategori_parameter || '';
              const metode = row.namaMetode || row.nama_metode || '-';
              const acuanMetode = row.acuanMetode || row.acuan_metode || '-';
              const hasil = row.hasil || '-';
              const satuan = getSatuanHasil(row);
              const subkontrakLabel = getSubkontrakLabel(row);
              const insituLabel = getInsituLabel(row);
              const isSubkontrak = isSubkontrakResult(row);
              const statusLka = row.statusLka || row.status_lka || '-';
              const hasilKey = getLkaHasilTargetKey(row);
              const hasilTarget = getLkaHasilTarget(row);
              const checked = hasilKey ? selectedSet.has(String(hasilKey)) : false;
              const checkboxDisabled = !hasilKey || isSubkontrak;
              const isTerakreditasi = Number(
                row.isTerakreditasi ?? row.is_terakreditasi ?? 0
              );
              const catatanRevisiParts = getCatatanRevisiParts(row);

              return (
                <tr
                  key={`${hasilKey || index}-${parameter}`}
                  className={`transition-colors hover:bg-gray-50 ${checked ? 'bg-red-50/50' : ''}`}
                >
                  {revisionOpen && (
                    <td className="px-4 py-3 align-top">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={checkboxDisabled}
                          onChange={() => onToggleRevisionResult?.(hasilTarget)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <span>
                          {isSubkontrak
                            ? 'Subkontrak'
                            : hasilKey
                              ? 'Revisi'
                              : 'Tidak tersedia'}
                        </span>
                      </label>
                    </td>
                  )}

                  <td className="px-4 py-3 font-medium text-gray-900">
                    <p>{parameter}</p>
                    {kategori && (
                      <p className="mt-1 text-xs text-gray-500">
                        {kategori}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    <p>{metode}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {acuanMetode}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-gray-900">
                    <span className="font-semibold">{hasil}</span>
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {satuan}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isSubkontrak
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {subkontrakLabel}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {insituLabel}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        statusLka
                      )}`}
                    >
                      {statusLka}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAccreditationBadgeClass(
                        isTerakreditasi
                      )}`}
                    >
                      {isTerakreditasi === 1 ? 'Terakreditasi' : 'Tidak'}
                    </span>
                  </td>

                  <td className="w-[360px] px-4 py-3 align-top">
                    {catatanRevisiParts.hasAny ? (
                      <div className="max-h-40 w-[340px] space-y-2 overflow-y-auto text-xs leading-relaxed">
                        {catatanRevisiParts.penyeliaNote && (
                          <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                            <p className="font-semibold">Catatan Revisi Penyelia</p>
                            <p className="mt-1">{catatanRevisiParts.penyeliaNote}</p>
                          </div>
                        )}

                        {catatanRevisiParts.kasiNote && (
                          <div className="whitespace-pre-line rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                            <p className="font-semibold">Catatan Revisi Kasi Pengujian</p>
                            <p className="mt-1">{catatanRevisiParts.kasiNote}</p>
                          </div>
                        )}

                        {(catatanRevisiParts.keputusanPenyelia || catatanRevisiParts.catatanPenyelia) && (
                          <div className="whitespace-pre-line rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700">
                            <p className="font-semibold">Tinjauan Penyelia</p>
                            {catatanRevisiParts.keputusanPenyelia && (
                              <p className="mt-1">
                                <span className="font-semibold">Keputusan:</span> {catatanRevisiParts.keputusanPenyelia}
                              </p>
                            )}
                            {catatanRevisiParts.catatanPenyelia && (
                              <p className="mt-1">
                                <span className="font-semibold">Catatan:</span> {catatanRevisiParts.catatanPenyelia}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KasiLhuReviewModal({
  showModal,
  selectedSample,
  sampleInfo,
  resultRows,
  loadingDetail,
  revisionOpen,
  revisionNotesById,
  onRevisionNoteChange,
  selectedRevisionIds,
  selectedRevisionRows,
  actionLoading,
  selectedNoSampel,
  selectedStatus,
  selectedCatatanRevisi,
  canReview,
  onClose,
  onOpenRevision,
  onCancelRevision,
  onApprove,
  onToggleRevisionResult,
  onSubmitRevision,
}) {
  if (!showModal || !selectedSample) return null;

  const worksheetFiles = normalizeWorksheetFilesFromResults(resultRows);
  const selectedCatatanRevisiParts = getCatatanRevisiParts({
    catatanRevisiHasil: selectedCatatanRevisi,
    catatan_revisi_hasil: selectedCatatanRevisi,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              Hasil Uji Sementara
            </h3>
            <p className="text-sm text-emerald-100">
              Sampel: {selectedNoSampel || '-'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white transition-all hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-emerald-600" />
              Memuat detail review hasil...
            </div>
          ) : (
            <div className="space-y-6">
              {selectedCatatanRevisiParts.hasAny && (
                <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-red-800">
                      Catatan Revisi Sebelumnya
                    </p>
                    <div className="mt-3 space-y-2">
                      {selectedCatatanRevisiParts.penyeliaNote && (
                        <div className="whitespace-pre-line rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
                          <p className="font-semibold">Catatan Revisi Penyelia</p>
                          <p className="mt-1">{selectedCatatanRevisiParts.penyeliaNote}</p>
                        </div>
                      )}
                      {selectedCatatanRevisiParts.kasiNote && (
                        <div className="whitespace-pre-line rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-700">
                          <p className="font-semibold">Catatan Revisi Kasi Pengujian</p>
                          <p className="mt-1">{selectedCatatanRevisiParts.kasiNote}</p>
                        </div>
                      )}
                      {(selectedCatatanRevisiParts.keputusanPenyelia || selectedCatatanRevisiParts.catatanPenyelia) && (
                        <div className="whitespace-pre-line rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-sky-700">
                          <p className="font-semibold">Tinjauan Penyelia</p>
                          {selectedCatatanRevisiParts.keputusanPenyelia && (
                            <p className="mt-1"><span className="font-semibold">Keputusan:</span> {selectedCatatanRevisiParts.keputusanPenyelia}</p>
                          )}
                          {selectedCatatanRevisiParts.catatanPenyelia && (
                            <p className="mt-1"><span className="font-semibold">Catatan:</span> {selectedCatatanRevisiParts.catatanPenyelia}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <KasiLhuSampleInfoSection
                sampleInfo={sampleInfo}
                selectedNoSampel={selectedNoSampel}
                selectedStatus={selectedStatus}
              />

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Pratinjau File Worksheet
                  </h4>
                  <span className="text-xs text-gray-500">
                    {worksheetFiles.length} file
                  </span>
                </div>

                <div className="h-[420px] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <WorksheetFilesPreviewPane files={worksheetFiles} />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Hasil Pengujian
                  </h4>
                  <span className="text-xs text-gray-500">
                    {resultRows.length} parameter
                  </span>
                </div>

                <ResultTable
                  results={resultRows}
                  revisionOpen={revisionOpen}
                  selectedRevisionIds={selectedRevisionIds}
                  onToggleRevisionResult={onToggleRevisionResult}
                />
              </div>

              {revisionOpen && (
                <KasiLhuRevisionBox
                  selectedCount={selectedRevisionIds.length}
                  selectedRevisionRows={selectedRevisionRows}
                  revisionNotesById={revisionNotesById}
                  onRevisionNoteChange={onRevisionNoteChange}
                  onCancelRevision={onCancelRevision}
                  onSubmitRevision={() => onSubmitRevision(selectedNoSampel)}
                  actionLoading={actionLoading}
                  selectedNoSampel={selectedNoSampel}
                />
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-gray-700">
                  <strong>Catatan:</strong> Hasil pengujian di atas merupakan hasil sementara
                  yang sudah disetujui Penyelia. Setelah disetujui Kasi Pengujian, sampel akan
                  masuk ke Pengendalian Mutu untuk pembuatan LHU dan penerbitan nomor LHU.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-8 py-4">
          <div className="flex gap-3">
            {!loadingDetail && canReview && !revisionOpen && (
              <button
                type="button"
                onClick={onOpenRevision}
                disabled={Boolean(actionLoading)}
                className="flex items-center gap-2 rounded-lg border-2 border-red-400 px-6 py-2.5 font-medium text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AlertCircle className="h-5 w-5" />
                Minta Revisi
              </button>
            )}

            {!loadingDetail && canReview && (
              <button
                type="button"
                onClick={() => onApprove(selectedNoSampel)}
                disabled={Boolean(actionLoading)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === `approve-${selectedNoSampel}` ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Setujui Hasil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KasiLhuSampleInfoSection({ sampleInfo, selectedNoSampel, selectedStatus }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">
            Informasi Sampel
          </h4>

          <InfoRow label="No. Sampel" value={selectedNoSampel} />

          <InfoRow
            label="ID Registrasi"
            value={sampleInfo.idRegistrasi || sampleInfo.id_registrasi}
          />

          <InfoRow
            label="Nomor FPPL"
            value={sampleInfo.nomorFppl || sampleInfo.nomor_fppl}
          />

          <InfoRow
            label="Jenis Sampel"
            value={sampleInfo.jenisSampel || sampleInfo.jenis_sampel}
          />

          <InfoRow label="Kondisi Sampel" value={getKondisiSampel(sampleInfo)} />

          <InfoRow label="Koordinat" value={getKoordinatSampel(sampleInfo)} />

          <InfoRow
            label="Abnormalitas Sampel"
            value={getAbnormalitasSampel(sampleInfo)}
          />

          <InfoRow
            label="Acuan Pengambilan Sampel"
            value={getAcuanPengambilanSampel(sampleInfo)}
          />
        </div>

        <div>
          <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">
            Informasi Review
          </h4>

          <InfoRow
            label="Tanggal Terima"
            value={formatDateTimeDisplay(
              getTanggalPenerimaanSampel(sampleInfo),
              getJamPenerimaanSampel(sampleInfo)
            )}
          />

          <InfoRow
            label="Tanggal Pengambilan"
            value={formatDate(
              getTanggalPengambilanSampel(sampleInfo) ||
                sampleInfo.tanggalJadwal ||
                sampleInfo.tanggal_jadwal
            )}
          />

          <InfoRow
            label="Jam Pengambilan"
            value={sampleInfo.jamJadwal || sampleInfo.jam_jadwal}
          />

          <InfoRow
            label="Standar / Regulasi"
            value={sampleInfo.regBm || sampleInfo.reg_bm || sampleInfo.standar}
          />

          <InfoRow label="Status Review">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                selectedStatus
              )}`}
            >
              {selectedStatus}
            </span>
          </InfoRow>
        </div>
      </div>
    </div>
  );
}

function KasiLhuRevisionBox({
  selectedCount,
  selectedRevisionRows = [],
  revisionNotesById = {},
  onRevisionNoteChange,
  onCancelRevision,
  onSubmitRevision,
  actionLoading,
  selectedNoSampel,
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h4 className="mb-1 font-bold text-red-900">
        Catatan Revisi
      </h4>
      <p className="mb-3 text-sm text-red-700">
        Centang parameter/metode pada tabel di atas yang perlu diuji ulang, lalu tulis alasan revisinya.
      </p>

      <div className="mb-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
        Parameter/metode dipilih: <strong>{selectedCount}</strong>
      </div>

      {selectedRevisionRows.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-white p-3">
          <p className="mb-2 text-sm font-semibold text-red-900">Catatan Revisi per Parameter/Metode</p>
          <div className="space-y-4">
            {selectedRevisionRows.map((row, index) => {
              const hasilKey = getLkaHasilTargetKey(row);
              const hasilTarget = getLkaHasilTarget(row);
              const parameter = row.namaParameter || row.nama_parameter || '-';
              const metode = row.namaMetode || row.nama_metode || '-';
              const acuan = row.acuanMetode || row.acuan_metode || '-';
              return (
                <div key={`${hasilKey || index}-${parameter}`} className="rounded-lg bg-red-50 px-3 py-3">
                  <p className="text-sm font-semibold text-gray-900">{parameter} - {metode}</p>
                  <p className="text-xs text-gray-600">{acuan}</p>
                  <textarea
                    value={revisionNotesById[String(hasilKey)] || ''}
                    onChange={(event) => onRevisionNoteChange?.(hasilTarget, event.target.value)}
                    rows={3}
                    placeholder={`Catatan revisi untuk ${parameter}`}
                    className="mt-3 w-full resize-none rounded-lg border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelRevision}
          disabled={Boolean(actionLoading)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Batal
        </button>

        <button
          type="button"
          onClick={onSubmitRevision}
          disabled={Boolean(actionLoading)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionLoading === `revise-${selectedNoSampel}` ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          Kirim Revisi
        </button>
      </div>
    </div>
  );
}
