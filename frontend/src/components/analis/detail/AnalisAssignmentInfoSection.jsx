import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { buildTestingBusinessTimeline } from '../../../utils/businessDays';
import {
  DHL_SCIENTIFIC_SYMBOLS,
  InfoRow,
  StatusBadge,
  formatDateOnly,
  formatDateTimeDisplay,
  formatScientificDhl,
  getAcuanPengambilanSampel,
  getAbnormalitasSampel,
  getJamPenerimaanSampel,
  getKondisiSampel,
  getTanggalPenerimaanSampel,
  getTanggalPengambilanSampel,
} from './analisDetailUtils';

function getAssignmentInfoValues(detail, worksheet, resultRows) {
  const tanggalSampling =
    detail.tanggalPengambilanSampel ||
    detail.tanggal_pengambilan_sampel ||
    worksheet.tanggalPengambilanSampel ||
    worksheet.tanggal_pengambilan_sampel ||
    detail.tanggalSampling ||
    detail.tanggal_sampling ||
    worksheet.tanggalSampling ||
    worksheet.tanggal_sampling ||
    resultRows[0]?.tanggal_pengambilan_sampel ||
    resultRows[0]?.tanggalPengambilanSampel ||
    null;

  const tanggalPenerimaanSampel =
    detail.tanggalPenerimaan ||
    detail.tanggal_penerimaan ||
    worksheet.tanggalPenerimaan ||
    worksheet.tanggal_penerimaan ||
    resultRows[0]?.tanggal_penerimaan ||
    resultRows[0]?.tanggalPenerimaan ||
    null;

  const jamPenerimaanSampel =
    detail.jamPenerimaan ||
    detail.jam_penerimaan ||
    worksheet.jamPenerimaan ||
    worksheet.jam_penerimaan ||
    resultRows[0]?.jam_penerimaan ||
    resultRows[0]?.jamPenerimaan ||
    null;

  const abnormalitasSampel =
    detail.abnormalitasSampel ||
    detail.abnormalitas_sampel ||
    worksheet.abnormalitasSampel ||
    worksheet.abnormalitas_sampel ||
    resultRows[0]?.abnormalitas_sampel ||
    resultRows[0]?.abnormalitasSampel ||
    '-';

  const acuanPengambilanSampel =
    detail.acuanPengambilanSampel ||
    detail.acuan_pengambilan_sampel ||
    worksheet.acuanPengambilanSampel ||
    worksheet.acuan_pengambilan_sampel ||
    resultRows[0]?.acuan_pengambilan_sampel ||
    resultRows[0]?.acuanPengambilanSampel ||
    '-';

  const kondisiSampel =
    detail.kondisiSampel ||
    detail.kondisi_sampel ||
    resultRows[0]?.kondisi_sampel ||
    resultRows[0]?.kondisiSampel ||
    '-';

  const jenisContoh =
    detail.jenisContoh ||
    detail.jenis_contoh ||
    detail.jenisSampel ||
    detail.jenis_sampel ||
    Array.from(
      new Set(
        resultRows
          .map((row) => row.jenisSampel || row.jenis_sampel)
          .filter(Boolean)
      )
    ).join(', ') ||
    '-';

  const parameterPengujian =
    detail.parameter ||
    detail.namaParameter ||
    detail.nama_parameter ||
    detail.parameterName ||
    detail.parameter_name ||
    detail.Parameter?.nama_parameter ||
    detail.parameter?.nama_parameter ||
    detail.ParameterMetode?.Parameter?.nama_parameter ||
    detail.parameterMetode?.Parameter?.nama_parameter ||
    detail.parameter_metode?.Parameter?.nama_parameter ||
    detail.parameter_metode?.parameter?.nama_parameter ||
    '-';

  const namaMetodePengujian =
    detail.namaMetode ||
    detail.nama_metode ||
    detail.metode ||
    detail.Metode?.nama_metode ||
    detail.metode_uji ||
    detail.nama_metode_uji ||
    detail.ParameterMetode?.Metode?.nama_metode ||
    detail.parameterMetode?.Metode?.nama_metode ||
    detail.parameter_metode?.Metode?.nama_metode ||
    detail.parameter_metode?.metode?.nama_metode ||
    '';

  const acuanMetodePengujian =
    detail.acuanMetode ||
    detail.acuan_metode ||
    detail.acuan ||
    detail.ParameterMetode?.acuan_metode ||
    detail.parameterMetode?.acuan_metode ||
    detail.parameter_metode?.acuan_metode ||
    '';

  const metodePengujian =
    namaMetodePengujian && acuanMetodePengujian
      ? `${namaMetodePengujian} - ${acuanMetodePengujian}`
      : namaMetodePengujian || acuanMetodePengujian || '-';

  const pelaporNama =
    worksheet.dilaporkanOlehNama ||
    worksheet.dilaporkan_oleh_nama ||
    worksheet.dilaporkanOleh ||
    worksheet.dilaporkan_oleh ||
    detail.analisNama ||
    detail.analis_nama ||
    detail.idAnalis ||
    detail.id_analis ||
    '-';

  const tanggalPelaporan =
    worksheet.tanggalPelaporan ||
    worksheet.tanggal_pelaporan ||
    null;

  const pemeriksaNama =
    worksheet.diperiksaOlehNama ||
    worksheet.diperiksa_oleh_nama ||
    worksheet.diperiksaOleh ||
    worksheet.diperiksa_oleh ||
    detail.penyeliaNama ||
    detail.penyelia_nama ||
    detail.idPenyelia ||
    detail.id_penyelia ||
    '-';

  const tanggalPemeriksaan =
    worksheet.tanggalPemeriksaan ||
    worksheet.tanggal_pemeriksaan ||
    null;

  return {
    tanggalSampling,
    tanggalPenerimaanSampel,
    jamPenerimaanSampel,
    abnormalitasSampel,
    acuanPengambilanSampel,
    kondisiSampel,
    jenisContoh,
    parameterPengujian,
    metodePengujian,
    pelaporNama,
    tanggalPelaporan,
    pemeriksaNama,
    tanggalPemeriksaan,
  };
}

export function AnalisAssignmentInfoSection({
  detail,
  resultRows,
  worksheetForm,
  setWorksheetForm,
  canEditWorksheetMeta,
  showDhlScientificHelper,
  setShowDhlScientificHelper,
  handleInsertDhlSymbol,
}) {
  const worksheet = detail.worksheet || {};
  const hasRevisionNote = Boolean(worksheet.catatanRevisi || worksheet.catatan_revisi);
  const {
    tanggalSampling,
    tanggalPenerimaanSampel,
    jamPenerimaanSampel,
    abnormalitasSampel,
    acuanPengambilanSampel,
    kondisiSampel,
    jenisContoh,
    parameterPengujian,
    metodePengujian,
    pelaporNama,
    tanggalPelaporan,
    pemeriksaNama,
    tanggalPemeriksaan,
  } = getAssignmentInfoValues(detail, worksheet, resultRows);
  const timeline = buildTestingBusinessTimeline(tanggalPenerimaanSampel);
  const maxWorksheetDate = timeline.testingEnd || undefined;

  return (
    <>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Informasi Penugasan
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Ringkasan informasi contoh dan data pengerjaan analis.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">
                Informasi Sampel
              </h4>


              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Informasi Parameter Metode
                </p>

                <div className="space-y-1">
                  <InfoRow label="Parameter">
                    {parameterPengujian}
                  </InfoRow>

                  <InfoRow label="Metode">
                    {metodePengujian}
                  </InfoRow>
                </div>
              </div>

              <div className="space-y-4">
                {resultRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                    Tidak ada data sampel pada tugas ini.
                  </div>
                ) : (
                  resultRows.map((row, index) => {
                    const noSampel = row.noSampel || row.no_sampel || `Sampel ${index + 1}`;

                    const rowTanggalSampling =
                      row.tanggalPengambilanSampel ||
                      row.tanggal_pengambilan_sampel ||
                      getTanggalPengambilanSampel(row) ||
                      tanggalSampling;

                    const rowTanggalPenerimaan =
                      row.tanggalPenerimaan ||
                      row.tanggal_penerimaan ||
                      getTanggalPenerimaanSampel(row) ||
                      tanggalPenerimaanSampel;

                    const rowJamPenerimaan =
                      row.jamPenerimaan ||
                      row.jam_penerimaan ||
                      getJamPenerimaanSampel(row) ||
                      jamPenerimaanSampel;

                    const rowKondisiSampel =
                      row.kondisiSampel ||
                      row.kondisi_sampel ||
                      getKondisiSampel(row) ||
                      kondisiSampel;

                    const rowJenisContoh =
                      row.jenisSampel ||
                      row.jenis_sampel ||
                      jenisContoh;

                    const rowAcuanPengambilan =
                      row.acuanPengambilanSampel ||
                      row.acuan_pengambilan_sampel ||
                      getAcuanPengambilanSampel(row) ||
                      acuanPengambilanSampel;

                    const rowAbnormalitas =
                      row.abnormalitasSampel ||
                      row.abnormalitas_sampel ||
                      getAbnormalitasSampel(row) ||
                      abnormalitasSampel;

                    return (
                      <div
                        key={noSampel}
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <p className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-900">
                          Sampel {noSampel}
                        </p>

                        <div className="space-y-1">
                          <InfoRow label="Tanggal Sampling">
                            {formatDateOnly(rowTanggalSampling)}
                          </InfoRow>

                          <InfoRow label="Tanggal Penerimaan">
                            {formatDateTimeDisplay(rowTanggalPenerimaan, rowJamPenerimaan)}
                          </InfoRow>

                          <InfoRow label="Kondisi Sampel">
                            {rowKondisiSampel}
                          </InfoRow>

                          <InfoRow label="Jenis Contoh">
                            {rowJenisContoh}
                          </InfoRow>

                          <InfoRow label="Acuan Pengambilan">
                            {rowAcuanPengambilan}
                          </InfoRow>

                          <InfoRow label="Abnormalitas Sampel">
                            {rowAbnormalitas}
                          </InfoRow>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">
                Informasi LKA
              </h4>

              <div className="space-y-1">
                <InfoRow label="Status LKA">
                  <StatusBadge status={worksheet.statusLka || worksheet.status_lka || 'Draft'} />
                </InfoRow>

                <InfoRow label="Tanggal Pengerjaan *">
                  {!canEditWorksheetMeta ? (
                    formatDateOnly(worksheetForm.tanggalMulaiPengujian)
                  ) : (
                    <input
                      type="date"
                      value={worksheetForm.tanggalMulaiPengujian}
                      max={maxWorksheetDate}
                      onChange={(event) =>
                        setWorksheetForm((prev) => ({
                          ...prev,
                          tanggalMulaiPengujian: event.target.value,
                          tanggalSelesaiPengujian:
                            prev.tanggalSelesaiPengujian &&
                            event.target.value &&
                            prev.tanggalSelesaiPengujian < event.target.value
                              ? event.target.value
                              : prev.tanggalSelesaiPengujian,
                        }))
                      }
                      className="h-9 w-full max-w-[190px] rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </InfoRow>

                <InfoRow label="Tanggal Selesai *">
                  {!canEditWorksheetMeta ? (
                    formatDateOnly(worksheetForm.tanggalSelesaiPengujian)
                  ) : (
                    <input
                      type="date"
                      value={worksheetForm.tanggalSelesaiPengujian}
                      min={worksheetForm.tanggalMulaiPengujian || undefined}
                      max={maxWorksheetDate}
                      onChange={(event) =>
                        setWorksheetForm((prev) => ({
                          ...prev,
                          tanggalSelesaiPengujian: event.target.value,
                        }))
                      }
                      className="h-9 w-full max-w-[190px] rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </InfoRow>

                <InfoRow label="DHL Akuades *">
                  {!canEditWorksheetMeta ? (
                    <span>{formatScientificDhl(worksheetForm.dhlAkuades)}</span>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={worksheetForm.dhlAkuades}
                          onChange={(event) =>
                            setWorksheetForm((prev) => ({
                              ...prev,
                              dhlAkuades: event.target.value,
                            }))
                          }
                          placeholder="Contoh: 1.2 × 10⁻⁶ S/cm"
                          className="h-9 w-full max-w-[280px] rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                        />

                        <button
                          type="button"
                          onClick={() => setShowDhlScientificHelper((prev) => !prev)}
                          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-100"
                        >
                          {showDhlScientificHelper ? 'Tutup simbol' : 'Simbol ilmiah'}
                        </button>
                      </div>

                      {showDhlScientificHelper && (
                        <div className="max-w-xl rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                          <div className="flex flex-wrap gap-2">
                            {DHL_SCIENTIFIC_SYMBOLS.map((symbol) => (
                              <button
                                key={symbol}
                                type="button"
                                onClick={() => handleInsertDhlSymbol(symbol)}
                                className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
                              >
                                {symbol}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </InfoRow>

                <InfoRow label="Dilaporkan Oleh">
                  {pelaporNama} / {formatDateOnly(tanggalPelaporan)}
                </InfoRow>

                <InfoRow label="Diperiksa Oleh/Tgl">
                  {pemeriksaNama} / {formatDateOnly(tanggalPemeriksaan)}
                </InfoRow>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasRevisionNote && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-red-800">
                Catatan Revisi Penyelia
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {worksheet.catatanRevisi || worksheet.catatan_revisi}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AnalisReadOnlyNotice({ isReadOnly, isLhuLocked = false, detail = null }) {
  if (!isReadOnly) return null;

  const lockedLhu = Array.isArray(detail?.lockedLhus || detail?.locked_lhus)
    ? (detail.lockedLhus || detail.locked_lhus)[0]
    : null;

  const title = isLhuLocked
    ? 'LHU sudah tergenerate'
    : 'Worksheet sudah dikirim';

  const description = isLhuLocked
    ? `Data LKA dan hasil pengujian tidak dapat diubah karena sudah masuk LHU${lockedLhu?.nomorLhu || lockedLhu?.nomor_lhu ? ` ${lockedLhu.nomorLhu || lockedLhu.nomor_lhu}` : ''}.`
    : 'Data LKA dan hasil pengujian tidak dapat diubah kecuali Penyelia meminta revisi.';

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
        <div>
          <h3 className="font-semibold text-emerald-800">
            {title}
          </h3>
          <p className="mt-1 text-sm text-emerald-700">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
