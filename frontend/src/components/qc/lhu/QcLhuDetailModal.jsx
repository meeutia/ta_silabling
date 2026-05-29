import { AlertCircle, CheckCircle, FileText, GripVertical, Loader2, Send, X } from 'lucide-react';
import {
  formatDate,
  formatDateTimeDisplay,
  getAbnormalitasSampel,
  getAcuanPengambilanSampel,
  getJamPenerimaanSampel,
  getStatusBadge,
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
import { getPktLabel, getPktValue } from './qcLhuUtils';
import { isQcEditableLhuStatus } from '../../../utils/workflowAccessRules';

import { AccreditationInfo, DetailLhuTable, InfoRow, isSampleAlreadyInLhu, isSampleLockedForQc } from './QcLhuDetailSections.jsx';

export function QcLhuDetailModal({
  detailMode,
  showDetailModal,
  selectedSample,
  detailData,
  selectedNoSampel,
  selectedNomorLhu,
  selectedStatus,
  sampleInfo,
  pelangganInfo,
  lhuInfo,
  loadingDetail,
  loadingPreview,
  submitting,
  closeDetail,
  form,
  setForm,
  setPreviewData,
  loadPreviewFor,
  paketBmOptions,
  previewPaket,
  displayAkreditasi,
  displayDetails,
  moveDetailRow,
  moveSampleRow,
  selectedFilePath,
  openPdf,
  handleFinalize,
  getRequestId,
  canFinalizeSelectedLhu,
}) {
  if (!showDetailModal || !selectedSample) return null;

  const rawSampleRows = detailData?.samples || detailData?.sampels || [];
  const normalizedSampleRows = Array.isArray(rawSampleRows) ? rawSampleRows : [];
  const sampleRows = detailMode === 'finalisasi'
    ? normalizedSampleRows.filter((sample) => !isSampleAlreadyInLhu(sample))
    : normalizedSampleRows;
  const selectedSampleNos = Array.isArray(form.sampleNos)
    ? form.sampleNos.filter((noSampel) => sampleRows.some((sample) => (sample.noSampel || sample.no_sampel) === noSampel))
    : [];
  const hasSelectedSamples = selectedSampleNos.length > 0;
  const selectedSampleRows = sampleRows.filter((sample) =>
    selectedSampleNos.includes(sample.noSampel || sample.no_sampel)
  );
  const selectedJenisLabels = Array.from(
    new Set(selectedSampleRows.map((sample) => sample.jenisSampel || sample.jenis_sampel).filter(Boolean))
  ).join(', ');
  const selectedJenisKeys = Array.from(
    new Set(selectedSampleRows.map((sample) => `${sample.idJenisSampel || sample.id_jenis_sampel || ''}|${sample.idRegBm || sample.id_reg_bm || ''}`).filter((key) => key !== '|'))
  );
  const selectedSampleTypesCompatible = selectedJenisKeys.length <= 1;
  const selectedJenisKey = selectedSampleTypesCompatible ? selectedJenisKeys[0] : '';
  const canFinalizeCurrentStatus = canFinalizeSelectedLhu ?? isQcEditableLhuStatus(selectedStatus);
  const finalizeDisabledReason = !canFinalizeCurrentStatus
    ? 'LHU sudah masuk approval Kepala Lab atau sudah disahkan.'
    : !hasSelectedSamples
      ? 'Pilih minimal satu sampel.'
      : !selectedSampleTypesCompatible
        ? 'Sampel dalam satu LHU harus memiliki jenis sampel dan regulasi baku mutu yang sama.'
        : !form.idPktBm
          ? 'Pilih paket baku mutu terlebih dahulu.'
          : '';

  const filteredPaketBmOptions = hasSelectedSamples && selectedJenisKey
    ? paketBmOptions.filter((pkt) => `${pkt.idJenisSampel || pkt.id_jenis_sampel || ''}|${pkt.idRegBm || pkt.id_reg_bm || ''}` === selectedJenisKey)
    : [];
  const selectedSampleNoItems = dedupeTextList([
    ...selectedSampleRows.map((sample) => sample.noSampel || sample.no_sampel).filter(Boolean),
    ...normalizeSampleNoList(selectedSampleNos),
    ...normalizeSampleNoList(selectedNoSampel),
    ...normalizeSampleNoList(lhuInfo.no_sampel || lhuInfo.noSampel),
  ]);
  const selectedSampleDisplayText = formatSampleNoList(selectedSampleNoItems);
  const selectedKoordinatText = formatKoordinatLines(
    selectedSampleRows,
    pickValue(lhuInfo.koordinat, sampleInfo.koordinat, selectedSample?.koordinat),
    selectedSampleNoItems
  );
  const selectedAbnormalitasText = formatSampleFieldLines(
    selectedSampleRows,
    (sample) => sample.abnormalitasSampel || sample.abnormalitas_sampel,
    pickRealValue(
      sampleInfo.abnormalitasSampel,
      sampleInfo.abnormalitas_sampel,
      lhuInfo.abnormalitasSampel,
      lhuInfo.abnormalitas_sampel,
      selectedSample.abnormalitasSampel,
      selectedSample.abnormalitas_sampel,
      getAbnormalitasSampel(sampleInfo),
      getAbnormalitasSampel(lhuInfo),
      getAbnormalitasSampel(selectedSample)
    ),
    selectedSampleNoItems,
    { collapseIdentical: true }
  );
  const selectedAcuanPengambilanText = formatSampleFieldLines(
    selectedSampleRows,
    (sample) => sample.acuanPengambilanSampel || sample.acuan_pengambilan_sampel,
    pickRealValue(
      sampleInfo.acuanPengambilanSampel,
      sampleInfo.acuan_pengambilan_sampel,
      lhuInfo.acuanPengambilanSampel,
      lhuInfo.acuan_pengambilan_sampel,
      selectedSample.acuanPengambilanSampel,
      selectedSample.acuan_pengambilan_sampel,
      getAcuanPengambilanSampel(sampleInfo),
      getAcuanPengambilanSampel(lhuInfo),
      getAcuanPengambilanSampel(selectedSample)
    ),
    selectedSampleNoItems,
    { collapseIdentical: true }
  );
  const requestId = getRequestId?.(selectedSample) || selectedSample.idRegistrasi || selectedSample.id_registrasi || selectedNoSampel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              {detailMode === 'history'
                ? `Detail LHU - ${selectedNomorLhu || '-'}`
                : `Finalisasi LHU - ${selectedSample?.nomorFppl || selectedSample?.nomor_fppl || requestId || '-'}`}
            </h3>
            <p className="text-sm text-emerald-100">
              {detailMode === 'history'
                ? 'Lihat detail LHU dan PDF draft/final.'
                : 'Pilih sampel untuk 1 LHU, tentukan paket baku mutu, lalu kirim ke Kepala Lab.'}
            </p>
          </div>

          <button type="button" onClick={closeDetail} className="rounded p-1 text-white transition-all hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loadingDetail ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-gray-500">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-emerald-600" />
              Memuat detail LHU...
            </div>
          ) : (
            <div className="space-y-6">
              {(detailMode !== 'finalisasi' || hasSelectedSamples) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">
                      Informasi Permohonan & Pelanggan
                    </h4>

                    <InfoRow
                      label="No Sampel"
                      value={selectedSampleDisplayText}
                      
                    />
                    <InfoRow
                      label="Nomor FPPL"
                      value={pickValue(
                        sampleInfo.nomorFppl,
                        sampleInfo.nomor_fppl,
                        selectedSample.nomorFppl,
                        selectedSample.nomor_fppl,
                        lhuInfo.nomorFppl,
                        lhuInfo.nomor_fppl
                      )}
                    />
                    <InfoRow
                      label="Jenis Sampel"
                      value={pickValue(
                        selectedJenisLabels,
                        sampleInfo.jenisSampel,
                        sampleInfo.jenis_sampel,
                        selectedSample.jenisSampel,
                        selectedSample.jenis_sampel,
                        lhuInfo.jenis_sampel,
                        lhuInfo.jenisSampel
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
                        selectedSample.namaPelanggan,
                        selectedSample.nama_pelanggan
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
                        selectedSample.pic,
                        selectedSample.picPelanggan,
                        selectedSample.pic_pelanggan
                      )}
                    />
                    <InfoRow
                      label="No. Telp"
                      value={pickValue(
                        pelangganInfo.noTelp,
                        pelangganInfo.no_telp,
                        pelangganInfo.telpPelanggan,
                        pelangganInfo.telp_pelanggan,
                        lhuInfo.noTelp,
                        lhuInfo.no_telp,
                        lhuInfo.telpPelanggan,
                        lhuInfo.telp_pelanggan
                      )}
                    />
                    <InfoRow
                      label="Email"
                      value={pickValue(
                        pelangganInfo.email,
                        pelangganInfo.emailKontak,
                        pelangganInfo.email_kontak,
                        pelangganInfo.emailPelanggan,
                        pelangganInfo.email_pelanggan,
                        lhuInfo.email,
                        lhuInfo.emailKontak,
                        lhuInfo.email_kontak,
                        lhuInfo.emailPelanggan,
                        lhuInfo.email_pelanggan
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
                      label="Tanggal Pengambilan"
                      value={formatDate(
                        getTanggalPengambilanSampel(sampleInfo) ||
                          getTanggalPengambilanSampel(lhuInfo) ||
                          getTanggalPengambilanSampel(selectedSample)
                      )}
                    />
                    <InfoRow
                      label="Tanggal Terima"
                      value={formatDateTimeDisplay(
                        getTanggalPenerimaanSampel(sampleInfo) || getTanggalPenerimaanSampel(lhuInfo),
                        getJamPenerimaanSampel(sampleInfo) || getJamPenerimaanSampel(lhuInfo)
                      )}
                    />
                    <InfoRow label="Kondisi Sampel" value={pickValue(sampleInfo.kondisiSampel, sampleInfo.kondisi_sampel, lhuInfo.kondisi_sampel)} />
                    <InfoRow label="Abnormalitas" value={selectedAbnormalitasText} />
                    <InfoRow label="Acuan Pengambilan Sampel" value={selectedAcuanPengambilanText} />
                  </div>

                  <div>
                    <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">Informasi LHU</h4>
                    <InfoRow label="Nomor LHU" value={pickValue(selectedNomorLhu, lhuInfo.nomor_lhu, lhuInfo.nomorLhu, 'Belum dibuat')} />
                    <InfoRow label="Status LHU">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(selectedStatus)}`}>
                        {selectedStatus}
                      </span>
                    </InfoRow>
                    <InfoRow label="Koordinat" stacked>
                      <span className="whitespace-pre-wrap pl-4">{selectedKoordinatText}</span>
                    </InfoRow>
                    <InfoRow
                      label="Paket Baku Mutu"
                      value={pickRealValue(
                        sampleInfo.regBm,
                        sampleInfo.reg_bm,
                        sampleInfo.standar,
                        lhuInfo.regBm,
                        lhuInfo.reg_bm,
                        lhuInfo.standar,
                        selectedSample.regBm,
                        selectedSample.reg_bm,
                        selectedSample.standar,
                        sampleInfo.ref_reg,
                        lhuInfo.ref_reg,
                        selectedSample.ref_reg
                      )}
                    />
                  </div>
                </div>
                </div>
              )}

              {detailMode === 'finalisasi' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h4 className="mb-4 text-sm font-semibold text-gray-900">Form Finalisasi</h4>

                  <div className="space-y-5">
                    {!hasSelectedSamples && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Pilih sampel terlebih dahulu. Informasi Permohonan & Pelanggan, Informasi LHU, paket baku mutu, dan Detail LHU akan ditampilkan setelah sampel dipilih.
                      </div>
                    )}

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Sampel untuk LHU ini <span className="text-red-500">*</span>
                        </label>
                        <span className="text-xs text-gray-500">{selectedSampleNos.length} sampel dipilih</span>
                      </div>

                      {sampleRows.length === 0 ? (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                          Semua sampel pada permohonan ini sudah dibuat LHU, sehingga tidak tersedia untuk finalisasi LHU baru.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {sampleRows.map((sample) => {
                          const noSampel = sample.noSampel || sample.no_sampel;
                          const checked = selectedSampleNos.includes(noSampel);
                          const orderIndex = selectedSampleNos.indexOf(noSampel);
                          const lockedForQc = isSampleLockedForQc(sample);

                          return (
                            <label
                              key={noSampel}
                              draggable={!lockedForQc && checked && selectedSampleNos.length > 1}
                              onDragStart={(event) => {
                                if (lockedForQc || !checked) return;
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', String(orderIndex));
                              }}
                              onDragOver={(event) => {
                                if (lockedForQc || !checked) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(event) => {
                                if (lockedForQc || !checked) return;
                                event.preventDefault();
                                const fromIndex = Number(event.dataTransfer.getData('text/plain'));
                                if (Number.isFinite(fromIndex) && orderIndex >= 0) {
                                  moveSampleRow?.(fromIndex, orderIndex);
                                }
                              }}
                              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                                lockedForQc
                                  ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-75'
                                  : checked
                                    ? 'cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-900'
                                    : 'cursor-pointer border-gray-200 bg-white text-gray-700 hover:border-emerald-200'
                              } ${!lockedForQc && checked && selectedSampleNos.length > 1 ? 'cursor-move' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={lockedForQc}
                                onChange={(event) => {
                                  const nextNos = event.target.checked
                                    ? [...selectedSampleNos, noSampel]
                                    : selectedSampleNos.filter((item) => item !== noSampel);

                                  setForm((prev) => ({ ...prev, sampleNos: nextNos, idPktBm: '' }));
                                  setPreviewData(null);
                                }}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 font-semibold">
                                  {checked && selectedSampleNos.length > 1 && <GripVertical className="h-3.5 w-3.5 text-emerald-600" />}
                                  <span className="truncate">{noSampel}</span>
                                  {checked && orderIndex >= 0 && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                      Urutan {orderIndex + 1}
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 block text-xs text-gray-500">{sample.jenisSampel || sample.jenis_sampel || '-'}</span>
                                {lockedForQc && (
                                  <span className="mt-1 inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                    Sudah masuk LHU
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                          })}
                        </div>
                      )}

                      <p className="mt-2 text-xs text-gray-500">
                        Sampel yang dipilih di sini akan menjadi satu LHU. Seret kartu sampel terpilih untuk mengatur urutan kolom hasil pada PDF LHU.
                      </p>
                    </div>

                    {hasSelectedSamples && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Paket Baku Mutu <span className="text-red-500">*</span>
                        </label>
                        {!selectedSampleTypesCompatible ? (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Sampel yang dipilih memiliki jenis sampel/regulasi berbeda. Pilih sampel dengan jenis yang sama untuk membuat 1 LHU.
                          </div>
                        ) : (
                          <select
                            value={form.idPktBm}
                            onChange={(event) => {
                              const nextIdPktBm = event.target.value;
                              setForm((prev) => ({ ...prev, idPktBm: nextIdPktBm }));
                              setPreviewData(null);

                              if (nextIdPktBm && selectedSampleNos.length) {
                                loadPreviewFor(requestId, nextIdPktBm, selectedSampleNos);
                              }
                            }}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          >
                            <option value="">Pilih paket baku mutu</option>
                            {filteredPaketBmOptions.map((pkt) => (
                              <option key={getPktValue(pkt)} value={getPktValue(pkt)}>
                                {getPktLabel(pkt)}
                              </option>
                            ))}
                          </select>
                        )}
                        {selectedSampleTypesCompatible && filteredPaketBmOptions.length === 0 && (
                          <p className="mt-2 text-xs text-amber-700">
                            Tidak ada paket baku mutu yang sesuai dengan jenis sampel terpilih.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {previewPaket && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-800">Paket baku mutu terpilih:</p>
                  <p className="mt-1 text-sm text-emerald-700">{getPktLabel(previewPaket)}</p>
                </div>
              )}

              <AccreditationInfo akreditasi={displayAkreditasi} />

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Detail LHU</h4>
                  <div className="text-right">
                    <span className="block text-xs text-gray-500">{displayDetails.length} parameter</span>
                    {detailMode === 'finalisasi' && (
                      <span className="block text-xs text-emerald-700">Drag baris untuk mengatur urutan PDF</span>
                    )}
                  </div>
                </div>
                {loadingPreview ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-600" />
                    Memuat preview baku mutu...
                  </div>
                ) : (
                  <DetailLhuTable
                    details={displayDetails}
                    editableOrder={detailMode === 'finalisasi'}
                    onMoveRow={moveDetailRow}
                    sampleNos={selectedSampleNos}
                    onMoveSample={moveSampleRow}
                  />
                )}
              </div>

              {selectedFilePath && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-purple-900">File PDF LHU tersedia</p>
                      <p className="mt-1 text-sm text-purple-700">
                        {String(selectedStatus).toLowerCase().includes('disahkan')
                          ? 'File ini adalah LHU final.'
                          : 'File ini adalah draft LHU untuk review Kepala Lab.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPdf(selectedFilePath)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                    >
                      <FileText className="h-4 w-4" />
                      Buka PDF
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
                  <AlertCircle className="h-4 w-4" />
                  Catatan Pengendalian Mutu
                </h4>
                <p className="text-sm text-blue-800">
                  Nomor LHU dan PDF draft dibuat saat finalisasi. Setelah disetujui Kepala Lab, PDF akan menjadi versi final.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">

          {detailMode === 'finalisasi' && (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={submitting || loadingDetail || loadingPreview || Boolean(finalizeDisabledReason)}
              title={finalizeDisabledReason || 'Finalisasi LHU dan kirim ke Kepala Lab'}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Finalisasi & Kirim ke Kalab
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
