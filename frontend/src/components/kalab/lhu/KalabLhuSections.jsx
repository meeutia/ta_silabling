import {
  AlertCircle,
  CheckCircle,
  Eye,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import {
  formatDateOnly,
  formatDateTime,
  formatDateTimeDisplay,
  getAbnormalitasSampel,
  getAcuanPengambilanSampel,
  getFilePath,
  getJamPenerimaanSampel,
  getKalabStatusBadge as getStatusBadge,
  getKalabStatusLhu as getStatusLhu,
  getNomorLhu,
  getNoSampel,
  getTanggalPenerimaanSampel,
  getTanggalPengambilanSampel,
  pickRealValue,
  pickValue,
} from '../../lhu/lhuReviewUtils';
import {
  dedupeTextList,
  formatKoordinatLines,
  formatSampleFieldLines,
  formatSampleNoList,
  normalizeSampleNoList,
} from '../../lhu/lhuSampleDisplayUtils';
import { getLhuStatusDisplayLabel } from '../../../utils/workflowAccessRules';

import { DetailLhuTable, InfoRow } from './KalabLhuDetailSections.jsx';

export function KalabLhuHeader() {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Persetujuan LHU
        </h1>
        <p className="text-gray-600">
          Berikut ringkasan LHU yang perlu diverifikasi dan disetujui Kepala Lab.
        </p>
      </div>
    </div>
  );
}

export function KalabLhuMetricCards({ metrics = [] }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <button
            type="button"
            key={metric.label}
            onClick={metric.onClick}
            disabled={typeof metric.onClick !== 'function'}
            className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-default disabled:hover:translate-y-0"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className={`rounded-lg p-3 ${metric.iconBg}`}>
                <Icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>

            <div>
              <p className="mb-1 text-2xl font-bold text-gray-900">
                {metric.value}
              </p>
              <p className="mb-1 text-sm font-medium text-gray-900">
                {metric.label}
              </p>
              <p className="text-xs text-gray-600">{metric.sublabel}</p>
              <p className="mt-2 text-xs text-gray-500">{metric.trend}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function KalabLhuTabs({ activeTab, onChange }) {
  return (
    <div className="mb-6 flex border-b border-gray-200">
      <button
        type="button"
        onClick={() => onChange('Persetujuan')}
        className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'Persetujuan'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        Menunggu Persetujuan
      </button>

      <button
        type="button"
        onClick={() => onChange('Riwayat')}
        className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'Riwayat'
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        Riwayat LHU Disetujui
      </button>
    </div>
  );
}

export function KalabLhuSearchBox({ search, onSearchChange }) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Cari nomor LHU, no sampel, registrasi, jenis sampel, atau status..."
          className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
}

export function KalabLhuTable({
  activeTab,
  rows = [],
  loading,
  onOpenDetail,
  onOpenPdf,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-bold text-gray-900">
          {activeTab === 'Riwayat'
            ? 'Riwayat LHU yang Telah Disetujui'
            : 'Daftar LHU Menunggu Persetujuan'}
        </h2>

        <p className="mt-0.5 text-xs text-gray-500">
          {activeTab === 'Riwayat'
            ? 'Daftar LHU yang sudah disahkan Kepala Lab.'
            : 'Buka PDF draft untuk melihat bentuk surat sebelum disahkan.'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1350px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Nomor LHU
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Nomor Sampel
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Jenis Sampel
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                {activeTab === 'Riwayat' ? 'Disahkan' : 'Finalisasi QC'}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-14 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    {activeTab === 'Riwayat'
                      ? 'Memuat riwayat LHU...'
                      : 'Memuat antrean LHU...'}
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-14 text-center text-gray-500">
                  {activeTab === 'Riwayat'
                    ? 'Belum ada LHU yang disetujui.'
                    : 'Tidak ada LHU yang menunggu persetujuan.'}
                </td>
              </tr>
            ) : (
              rows.map((item) => {
                const nomorLhu = getNomorLhu(item);
                const filePath = getFilePath(item);
                const status = getStatusLhu(item);
                const displayStatus = getLhuStatusDisplayLabel(status, status || '-');

                return (
                  <tr key={nomorLhu} className="transition-all hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {nomorLhu || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {getNoSampel(item) || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.jenisSampel || item.jenis_sampel || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {activeTab === 'Riwayat'
                        ? formatDateTime(
                            item.kalabAt ||
                              item.kalab_at ||
                              item.tanggalPenerbitan ||
                              item.tanggal_penerbitan
                          )
                        : formatDateTime(item.qcAt || item.qc_at)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(
                          displayStatus
                        )}`}
                      >
                        {displayStatus}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenDetail(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                          Detail
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenPdf(item)}
                          disabled={!filePath && !nomorLhu}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FileText className="h-4 w-4" />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <p className="text-sm text-gray-600">
          Menampilkan <span className="font-semibold">{rows.length}</span> LHU
        </p>
      </div>
    </div>
  );
}

export function KalabLhuDetailModal({
  actionLoading,
  akreditasi,
  canApproveOrRevise,
  detailRows,
  lhuInfo,
  sampleRows = [],
  pelangganInfo = {},
  loadingDetail,
  onApprove,
  onClose,
  onOpenPdf,
  selectedNomorLhu,
  selectedPdfUrl,
  selectedRow,
}) {
  if (!selectedRow) return null;

  const normalizedSampleRows = Array.isArray(sampleRows) ? sampleRows : [];
  const selectedSampleNoItems = dedupeTextList([
    ...normalizedSampleRows.map((sample) => sample.noSampel || sample.no_sampel).filter(Boolean),
    ...normalizeSampleNoList(lhuInfo.no_sampel || lhuInfo.noSampel),
    ...normalizeSampleNoList(selectedRow.no_sampel || selectedRow.noSampel),
    ...normalizeSampleNoList(getNoSampel(selectedRow)),
  ]);
  const detailSampleNos = selectedSampleNoItems.length
    ? selectedSampleNoItems
    : Array.from(new Set((detailRows || []).flatMap((row) => row.samples || row.sampels || Object.keys(row.hasil_by_sample || row.hasilBySample || {})))).filter(Boolean);
  const selectedSampleDisplayText = formatSampleNoList(detailSampleNos);
  const selectedJenisLabels = Array.from(
    new Set(normalizedSampleRows.map((sample) => sample.jenisSampel || sample.jenis_sampel).filter(Boolean))
  ).join(', ');
  const selectedAbnormalitasText = formatSampleFieldLines(
    normalizedSampleRows,
    (sample) => sample.abnormalitasSampel || sample.abnormalitas_sampel,
    pickRealValue(
      lhuInfo.abnormalitasSampel,
      lhuInfo.abnormalitas_sampel,
      selectedRow.abnormalitasSampel,
      selectedRow.abnormalitas_sampel,
      getAbnormalitasSampel(lhuInfo),
      getAbnormalitasSampel(selectedRow)
    ),
    detailSampleNos,
    { collapseIdentical: true }
  );
  const selectedLokasiText = formatSampleFieldLines(
    normalizedSampleRows,
    (sample) => sample.lokasiSpesifik || sample.lokasi_spesifik || sample.lokasiPengambilanSampel || sample.lokasi_pengambilan_sampel,
    pickRealValue(
      lhuInfo.lokasiSpesifik,
      lhuInfo.lokasi_spesifik,
      lhuInfo.lokasiPengambilanSampel,
      lhuInfo.lokasi_pengambilan_sampel,
      selectedRow.lokasiSpesifik,
      selectedRow.lokasi_spesifik,
      selectedRow.lokasiPengambilanSampel,
      selectedRow.lokasi_pengambilan_sampel
    ),
    detailSampleNos,
    { collapseIdentical: true }
  );
  const selectedAcuanPengambilanText = formatSampleFieldLines(
    normalizedSampleRows,
    (sample) => sample.acuanPengambilanSampel || sample.acuan_pengambilan_sampel,
    pickRealValue(
      lhuInfo.acuanPengambilanSampel,
      lhuInfo.acuan_pengambilan_sampel,
      selectedRow.acuanPengambilanSampel,
      selectedRow.acuan_pengambilan_sampel,
      getAcuanPengambilanSampel(lhuInfo),
      getAcuanPengambilanSampel(selectedRow)
    ),
    detailSampleNos,
    { collapseIdentical: true }
  );
  const selectedKoordinatText = formatKoordinatLines(
    normalizedSampleRows,
    pickValue(lhuInfo.koordinat, selectedRow.koordinat),
    detailSampleNos
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              Persetujuan LHU - {selectedNomorLhu || '-'}
            </h3>
            <p className="text-sm text-emerald-100">
              Review draft PDF dan detail LHU sebelum disahkan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white transition-all hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loadingDetail ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center text-gray-500">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-emerald-600" />
              Memuat detail LHU...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">
                      Informasi Permohonan & Pelanggan
                    </h4>

                    <InfoRow
                      label="No. Sampel"
                      value={selectedSampleDisplayText}
                    />

                    <InfoRow
                      label="Nomor FPPL"
                      value={pickValue(
                        lhuInfo.nomorFppl,
                        lhuInfo.nomor_fppl,
                        selectedRow.nomorFppl,
                        selectedRow.nomor_fppl,
                        lhuInfo.id_registrasi,
                        lhuInfo.idRegistrasi,
                        selectedRow.idRegistrasi,
                        selectedRow.id_registrasi
                      )}
                    />

                    <InfoRow
                      label="Jenis Sampel"
                      value={pickValue(
                        selectedJenisLabels,
                        lhuInfo.jenis_sampel,
                        lhuInfo.jenisSampel,
                        selectedRow.jenisSampel,
                        selectedRow.jenis_sampel
                      )}
                    />

                    <InfoRow
                      label="Pelanggan"
                      value={pickValue(
                        pelangganInfo.namaPelanggan,
                        pelangganInfo.nama_pelanggan,
                        pelangganInfo.namaInstansi,
                        pelangganInfo.nama_instansi,
                        lhuInfo.namaPelanggan,
                        lhuInfo.nama_pelanggan,
                        lhuInfo.namaInstansi,
                        lhuInfo.nama_instansi,
                        selectedRow.namaPelanggan,
                        selectedRow.nama_pelanggan
                      )}
                    />

                    <InfoRow
                      label="PIC Pelanggan"
                      value={pickValue(
                        pelangganInfo.pic,
                        pelangganInfo.picPelanggan,
                        pelangganInfo.pic_pelanggan,
                        lhuInfo.pic,
                        lhuInfo.picPelanggan,
                        lhuInfo.pic_pelanggan,
                        selectedRow.pic,
                        selectedRow.picPelanggan,
                        selectedRow.pic_pelanggan
                      )}
                    />

                    <InfoRow
                      label="No. Telp"
                      value={pickValue(
                        pelangganInfo.noTelp,
                        pelangganInfo.no_telp,
                        pelangganInfo.telpPelanggan,
                        pelangganInfo.telp_pelanggan,
                        pelangganInfo.noHp,
                        pelangganInfo.no_hp,
                        pelangganInfo.nomorTelepon,
                        pelangganInfo.nomor_telepon,
                        lhuInfo.noTelp,
                        lhuInfo.no_telp,
                        lhuInfo.telpPelanggan,
                        lhuInfo.telp_pelanggan,
                        lhuInfo.noHp,
                        lhuInfo.no_hp,
                        lhuInfo.nomorTelepon,
                        lhuInfo.nomor_telepon,
                        selectedRow.noTelp,
                        selectedRow.no_telp,
                        selectedRow.telpPelanggan,
                        selectedRow.telp_pelanggan,
                        selectedRow.noHp,
                        selectedRow.no_hp,
                        selectedRow.nomorTelepon,
                        selectedRow.nomor_telepon
                      )}
                    />

                    <InfoRow
                      label="Alamat"
                      value={pickValue(
                        pelangganInfo.alamat,
                        pelangganInfo.alamatPelanggan,
                        pelangganInfo.alamat_pelanggan,
                        lhuInfo.alamat,
                        lhuInfo.alamatPelanggan,
                        lhuInfo.alamat_pelanggan
                      )}
                    />

                    <InfoRow
                      label="Tanggal Ambil"
                      value={formatDateOnly(
                        getTanggalPengambilanSampel(lhuInfo) ||
                          getTanggalPengambilanSampel(selectedRow)
                      )}
                    />

                    <InfoRow
                      label="Tanggal Terima"
                      value={formatDateTimeDisplay(
                        getTanggalPenerimaanSampel(lhuInfo) ||
                          getTanggalPenerimaanSampel(selectedRow),
                        getJamPenerimaanSampel(lhuInfo) ||
                          getJamPenerimaanSampel(selectedRow)
                      )}
                    />

                    <InfoRow
                      label="Paket BM"
                      value={pickValue(
                        lhuInfo.nama_pkt,
                        lhuInfo.namaPkt,
                        selectedRow.namaPkt,
                        selectedRow.nama_pkt
                      )}
                    />
                    <InfoRow label="Abnormalitas Sampel" value={selectedAbnormalitasText} />
                    <InfoRow label="Lokasi Pengambilan Sampel" value={selectedLokasiText} />
                    <InfoRow label="Acuan Pengambilan Sampel" value={selectedAcuanPengambilanText} />
                    <InfoRow
                      label="Standar"
                      value={pickRealValue(
                        lhuInfo.regBm,
                        lhuInfo.reg_bm,
                        lhuInfo.standar,
                        lhuInfo.refReg,
                        lhuInfo.ref_reg,
                        selectedRow.regBm,
                        selectedRow.reg_bm,
                        selectedRow.standar,
                        selectedRow.refReg,
                        selectedRow.ref_reg
                      )}
                    />
                  </div>

                  <div>
                    <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">
                      Informasi LHU
                    </h4>

                    <InfoRow label="Nomor LHU" value={selectedNomorLhu} />

                    <InfoRow label="Status">
                      {(() => {
                        const rawStatus = getStatusLhu(lhuInfo) || getStatusLhu(selectedRow);
                        const displayStatus = getLhuStatusDisplayLabel(rawStatus, rawStatus || '-');

                        return (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(
                              displayStatus
                            )}`}
                          >
                            {displayStatus}
                          </span>
                        );
                      })()}
                    </InfoRow>

                    <InfoRow label="Koordinat" value={selectedKoordinatText} />

                    <InfoRow
                      label="Finalisasi QC"
                      value={formatDateTime(
                        lhuInfo.qc_at || lhuInfo.qcAt || selectedRow.qcAt || selectedRow.qc_at
                      )}
                    />

                    <InfoRow
                      label="QC Oleh"
                      value={pickValue(
                        lhuInfo.qcNama,
                        selectedRow.qcNama,
                        lhuInfo.qc_by,
                        selectedRow.qc_by
                      )}
                    />

                    <InfoRow
                      label="Akreditasi"
                      value={
                        akreditasi
                          ? `${akreditasi.totalTerakreditasi || akreditasi.total_terakreditasi || 0} dari ${akreditasi.totalParameter || akreditasi.total_parameter || 0} parameter`
                          : `${selectedRow.totalTerakreditasi || selectedRow.total_terakreditasi || 0} dari ${selectedRow.totalParameter || selectedRow.total_parameter || 0} parameter`
                      }
                    />
                  </div>
                </div>
              </div>

              {selectedPdfUrl && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-purple-900">
                        Preview PDF Draft LHU
                      </p>
                      <p className="mt-1 text-sm text-purple-700">
                        Periksa bentuk surat sebelum menyetujui LHU.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenPdf({ ...(selectedRow || {}), ...(lhuInfo || {}) })}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                    >
                      <FileText className="h-4 w-4" />
                      Buka di Tab Baru
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Detail Hasil LHU
                  </h4>
                  <span className="text-xs text-gray-500">
                    {detailRows.length} parameter
                  </span>
                </div>

                <DetailLhuTable details={detailRows} sampleNos={detailSampleNos} />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
                  <AlertCircle className="h-4 w-4" />
                  Catatan Kepala Lab
                </h4>
                <p className="text-sm text-blue-800">
                  Jika disetujui, sistem akan mengisi tanggal penerbitan, mencatat persetujuan Kepala Lab,
                  dan membuat PDF final tanpa watermark draft.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">

          {canApproveOrRevise && (
            <button
              type="button"
              onClick={onApprove}
              disabled={loadingDetail || Boolean(actionLoading)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === 'approve' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              Setujui & Buat PDF Final
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
