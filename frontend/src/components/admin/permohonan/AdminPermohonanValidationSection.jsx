import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, XCircle } from 'lucide-react';
import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import {
  getParameterName,
  getRegBmLabel,
  getRequestSamples,
  getRequestSampleTypeName,
  getSampleParameterMethods,
  getSampleQuantity,
  usesOfficerSampling,
} from './adminPermohonanHelpers';


function pickFirstFilled(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== '') || '';
}

function formatTimeWib(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  const normalized = text.slice(0, 5);
  return normalized ? `${normalized} WIB` : '-';
}

function formatSamplingMethod(value) {
  if (value === 'Petugas') return 'Diambil oleh Petugas Laboratorium';
  if (value === 'Mandiri') return 'Diantar Mandiri oleh Pelanggan';
  return value || '-';
}

function FieldInfo({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-gray-900">{value || '-'}</p>
    </div>
  );
}

export function AdminPermohonanValidationSection({
  expandedSection,
  toggleSection,
  customer,
  selectedRequest,
  validationDecision,
  setValidationDecision,
  validationNote,
  setValidationNote,
  selectedSamplingTariffId,
  setSelectedSamplingTariffId,
  samplingTariffList,
  handleSaveValidation,
  saving,
  setShowDeferredPaymentModal,
  showDeferredPaymentModal,
  deferredPaymentNote,
  setDeferredPaymentNote,
  handleDeferredPaymentByAdmin,
}) {
  const isOfficerSampling = usesOfficerSampling(selectedRequest);
  const shouldShowSamplingTariff = isOfficerSampling && validationDecision === 'setujui';

  const handleDecisionChange = (decision) => {
    setValidationDecision(decision);

    if (decision === 'tolak') {
      setSelectedSamplingTariffId('');
    }
  };

  return (
    <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 transition-all">
            <button
              onClick={() => toggleSection('validasi')}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900">Validasi Permohonan</h2>
              </div>
              {expandedSection === 'validasi' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>

            {expandedSection === 'validasi' && (
              <div className="px-6 pb-6 space-y-6">
                {/* Data Ringkasan */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-4 text-base font-semibold text-gray-900">Ringkasan Data Permohonan</h3>

                  {(() => {
                    const requestSamples = getRequestSamples(selectedRequest);
                    const isOfficer = isOfficerSampling;
                    const plannedDate = isOfficer
                      ? pickFirstFilled(
                          selectedRequest.tanggal_rencana_pengambilan_sampel,
                          selectedRequest.tanggalRencanaPengambilanSampel,
                          selectedRequest.tanggal_pengambilan,
                          selectedRequest.tanggalPengambilan
                        )
                      : pickFirstFilled(
                          selectedRequest.tanggal_rencana_pengantaran_sampel,
                          selectedRequest.tanggalRencanaPengantaranSampel,
                          selectedRequest.tanggal_pengantaran,
                          selectedRequest.tanggalPengantaran,
                          selectedRequest.tanggal_rencana_pengambilan_sampel,
                          selectedRequest.tanggalRencanaPengambilanSampel
                        );
                    const plannedTime = pickFirstFilled(
                      selectedRequest.jam_rencana_pengambilan_sampel,
                      selectedRequest.jamRencanaPengambilanSampel,
                      selectedRequest.jam_pengambilan,
                      selectedRequest.jamPengambilan,
                      selectedRequest.jam_rencana_pengantaran_sampel,
                      selectedRequest.jamRencanaPengantaranSampel
                    );
                    const locationLabel = isOfficer
                      ? 'Alamat Lengkap Pengambilan Sampel'
                      : 'Alamat/Lokasi Asal Sampel';

                    return (
                      <div className="space-y-5">
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <p className="mb-3 text-sm font-semibold text-emerald-700">Data Pelanggan</p>
                          <div className="grid gap-4 md:grid-cols-2">
                            <FieldInfo label="Nama Instansi/Perusahaan" value={customer?.nama_instansi || customer?.namaInstansi} />
                            <FieldInfo label="PIC" value={customer?.pic} />
                            <FieldInfo label="Email PIC" value={customer?.email_kontak || customer?.emailKontak || customer?.email_pic || customer?.emailPic || customer?.email} />
                            <FieldInfo label="No. Telepon" value={customer?.no_telp || customer?.noTelp} />
                            <FieldInfo label="Alamat" value={customer?.alamat} className="md:col-span-2" />
                            <FieldInfo label="Maksud Pengujian" value={selectedRequest.maksud_pengujian || selectedRequest.maksudPengujian} className="md:col-span-2" />
                          </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <p className="mb-3 text-sm font-semibold text-emerald-700">Informasi Pengambilan Sampel</p>
                          <div className="grid gap-4 md:grid-cols-2">
                            <FieldInfo label="Metode Pengambilan Sampel" value={formatSamplingMethod(selectedRequest.jenis_pengambilan_sampel || selectedRequest.jenisPengambilanSampel)} />
                            <FieldInfo label={isOfficer ? 'Rencana Tanggal Pengambilan' : 'Rencana Tanggal Pengantaran'} value={plannedDate || '-'} />
                            <FieldInfo label={isOfficer ? 'Jam Pengambilan' : 'Jam Pengantaran'} value={formatTimeWib(plannedTime)} />
                            <FieldInfo label={locationLabel} value={selectedRequest.lokasi_pengambilan_sampel || selectedRequest.lokasiPengambilanSampel || selectedRequest.alamat_pengambilan_sampel || selectedRequest.alamatPengambilanSampel} />
                          </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <p className="mb-3 text-sm font-semibold text-emerald-700">Jenis sampel & Parameter yang Dipilih</p>
                          <div className="space-y-4">
                            {requestSamples.length > 0 ? requestSamples.map((requestSample, sampleIndex) => {
                              const sampleTypeName = getRequestSampleTypeName(requestSample);
                              const quantity = getSampleQuantity(requestSample);
                              const sampleParameters = getSampleParameterMethods(requestSample);

                              return (
                                <div key={requestSample.id_fppl_sampel || requestSample.idFpplSampel || sampleIndex} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">Jenis sampel: {sampleTypeName}</p>
                                      <p className="text-xs text-gray-600">Standar: {getRegBmLabel(requestSample)}</p>
                                    </div>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                                      {quantity} sampel
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {sampleParameters.length > 0 ? sampleParameters.map((sampleParameterMethod, parameterIndex) => (
                                      <span key={sampleParameterMethod.id_fppl_parameter_metode || sampleParameterMethod.idFpplParameterMetode || parameterIndex} className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                                        {getParameterName(sampleParameterMethod)}
                                      </span>
                                    )) : (
                                      <span className="text-sm text-gray-500">Belum ada parameter.</span>
                                    )}
                                  </div>
                                </div>
                              );
                            }) : (
                              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
                                Belum ada jenis sampel dan parameter.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Keputusan Validasi — only for 'Menunggu Verifikasi' */}
                  {normalizeFpplStatus(selectedRequest.status_fppl) === FPPL_STATUSES.MENUNGGU_VERIFIKASI && (                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Keputusan Validasi</h3>

                    {shouldShowSamplingTariff && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Keterangan Jarak <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedSamplingTariffId}
                          onChange={(e) => setSelectedSamplingTariffId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        >
                          <option value="">Pilih keterangan jarak</option>
                          {samplingTariffList.map((samplingTariff) => (
                            <option key={samplingTariff.id_tarif_pengambilan} value={samplingTariff.id_tarif_pengambilan}>
                              {samplingTariff.keterangan_jarak || samplingTariff.id_tarif_pengambilan}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-600 mt-1">Wajib dipilih sebelum validasi untuk sampling oleh petugas.</p>
                      </div>
                    )}

                    <div className="space-y-3 mb-4">
                      <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${validationDecision === 'setujui' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                        <input
                          type="radio"
                          name="keputusan"
                          value="setujui"
                          checked={validationDecision === 'setujui'}
                          onChange={() => handleDecisionChange('setujui')}
                          className="w-5 h-5 text-emerald-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900">Setujui Permohonan</p>
                          <p className="text-sm text-gray-600">Status berubah ke "Menunggu Penentuan Metode" oleh Kasi Pengujian</p>
                        </div>
                      </label>


                      <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${validationDecision === 'tolak' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                        <input
                          type="radio"
                          name="keputusan"
                          value="tolak"
                          checked={validationDecision === 'tolak'}
                          onChange={() => handleDecisionChange('tolak')}
                          className="w-5 h-5 text-red-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900">Tolak Permohonan</p>
                          <p className="text-sm text-gray-600">Permohonan tidak dapat diproses</p>
                        </div>
                      </label>
                    </div>

                    {validationDecision === 'tolak' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Catatan Penolakan (Wajib)
                        </label>
                        <textarea
                          value={validationNote}
                          onChange={(e) => setValidationNote(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                          placeholder="Jelaskan alasan penolakan..."
                        />
                      </div>
                    )}

                    <button
                      onClick={handleSaveValidation}
                      disabled={
                        !validationDecision ||
                        (validationDecision === 'tolak' && !validationNote.trim()) ||
                        (validationDecision === 'setujui' && isOfficerSampling && !selectedSamplingTariffId) ||
                        saving
                      }
                      className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                      {saving ? 'Menyimpan...' : 'Simpan Keputusan Validasi'}
                    </button>
                  </div>
                )}

                {/* Status setelah validasi */}
                {normalizeFpplStatus(selectedRequest.status_fppl) === FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER && (                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-indigo-800">Permohonan Disetujui</p>
                      <p className="text-sm text-indigo-700">Menunggu penentuan parameter oleh Kasi Pengujian.</p>
                    </div>
                  </div>
                )}

                {[FPPL_STATUSES.DIBATALKAN, FPPL_STATUSES.DIBATALKAN_PELANGGAN, FPPL_STATUSES.DITOLAK_ADMIN, FPPL_STATUSES.DITOLAK_KASI, FPPL_STATUSES.DITOLAK_PENYELIA].includes(normalizeFpplStatus(selectedRequest.status_fppl)) && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Permohonan Ditolak</p>
                      <p className="text-sm text-red-700">Permohonan ini telah dibatalkan.</p>
                      {selectedRequest.catatan_penolakan && (
                        <p className="text-sm text-red-800 mt-2">Catatan: {selectedRequest.catatan_penolakan}</p>
                      )}
                    </div>
                  </div>
                )}

                {![FPPL_STATUSES.MENUNGGU_VERIFIKASI, FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER, FPPL_STATUSES.DIBATALKAN, FPPL_STATUSES.DIBATALKAN_PELANGGAN, FPPL_STATUSES.DITOLAK_ADMIN, FPPL_STATUSES.DITOLAK_KASI, FPPL_STATUSES.DITOLAK_PENYELIA].includes(normalizeFpplStatus(selectedRequest.status_fppl)) && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm font-medium text-emerald-800">
                      ✓ Permohonan disetujui. Status saat ini: {selectedRequest.status_fppl}
                    </p>
                  </div>
                )}             

                {normalizeFpplStatus(selectedRequest.status_fppl) === FPPL_STATUSES.MENUNGGU_PEMBAYARAN && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          Bayar Nanti hanya bisa dicatat dari sisi admin.
                        </p>
                        <p className="text-sm text-amber-800">
                          Gunakan tombol ini jika klien corporate diperbolehkan bayar setelah tahap pengambilan/pengantaran sampel atau setelah layanan selesai.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowDeferredPaymentModal(true)}
                        disabled={saving}
                        className="px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all font-medium disabled:opacity-50"
                      >
                        {saving ? 'Menyimpan...' : 'Catat Bayar Nanti'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {showDeferredPaymentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
              <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900">Catat Bayar Nanti</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Isi catatan untuk alasan Bayar Nanti (contoh: klien corporate).
                  </p>
                </div>

                <div className="px-6 py-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Catatan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={deferredPaymentNote}
                    onChange={(e) => setDeferredPaymentNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: Klien corporate, pembayaran dilakukan setelah sampling selesai."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                  <button
                    onClick={() => {
                      if (saving) return;
                      setShowDeferredPaymentModal(false);
                      setDeferredPaymentNote('');
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDeferredPaymentByAdmin}
                    disabled={saving || !deferredPaymentNote.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {saving ? 'Menyimpan...' : 'Simpan Catatan'}
                  </button>
                </div>
              </div>
            </div>
          )}
    </>
  );
}
