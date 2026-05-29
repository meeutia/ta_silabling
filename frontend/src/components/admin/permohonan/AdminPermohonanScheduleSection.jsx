import { CheckCircle, ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react';
import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import { getTodayYmd } from '../../../utils/businessDays';
import { usesOfficerSampling } from './adminPermohonanHelpers';

export function AdminPermohonanScheduleSection({
  selectedRequest,
  expandedSection,
  toggleSection,
  activeSchedule,
  formatDate,
  formatDateTime,
  setExpandedSection,
  sampelRef,
  showScheduleInputs,
  setShowScheduleInputs,
  scheduleForm,
  setScheduleForm,
  isBusinessDay,
  scheduleError,
  setScheduleError,
  timeOptions = [],
  pccOptions,
  handleSaveSamplingSchedule,
  saving,
}) {
  const isOfficerSampling = usesOfficerSampling(selectedRequest);
  const scheduleLabel = isOfficerSampling ? 'Jadwal Pengambilan oleh PCC' : 'Jadwal Pengantaran Mandiri';
  const normalizedStatus = normalizeFpplStatus(selectedRequest.status_fppl);
  const canManageSchedule = [
    FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
    FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
    FPPL_STATUSES.MENUNGGU_SAMPEL,
  ].includes(normalizedStatus);
  const canContinueToSampleReceipt = normalizedStatus === FPPL_STATUSES.MENUNGGU_SAMPEL && activeSchedule;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 transition-all">
      <button
        onClick={() => toggleSection('jadwal')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">{scheduleLabel}</h2>
        </div>
        {expandedSection === 'jadwal' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>

      {expandedSection === 'jadwal' && (
        <div className="px-6 pb-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Usulan pelanggan</p>
              <p className="mt-1 font-medium text-gray-900">
                {isOfficerSampling
                  ? formatDateTime(selectedRequest.tanggal_rencana_pengambilan_sampel, selectedRequest.jam_rencana_pengambilan_sampel)
                  : formatDate(selectedRequest.tanggal_rencana_pengantaran_sampel)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Jadwal aktif saat ini</p>
              <p className="mt-1 font-medium text-gray-900">
                {activeSchedule
                  ? formatDateTime(activeSchedule.tanggal_jadwal, activeSchedule.jam_jadwal)
                  : 'Belum ada jadwal disetujui admin'}
              </p>
            </div>
          </div>

          {canManageSchedule ? (
            <div className="border-t border-gray-200 pt-6">
              {activeSchedule && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 mb-4">
                  <p className="text-sm font-semibold text-emerald-800 mb-2">✓ Jadwal Telah Disetujui</p>
                  <p className="text-sm text-emerald-700">
                    {isOfficerSampling ? 'Jadwal pengambilan sampel' : 'Jadwal pengantaran sampel'} sudah ditentukan dan pelanggan telah diberitahukan. Permohonan siap untuk tahap berikutnya.
                  </p>
                    {isOfficerSampling &&
                      (activeSchedule?.pegawai_pcc?.nama_pegawai || activeSchedule?.nama_pegawai_pcc) && (
                        <p className="text-sm text-emerald-700 mt-2">
                          Petugas:{' '}
                          <span className="font-semibold">
                            {activeSchedule?.pegawai_pcc?.nama_pegawai || activeSchedule?.nama_pegawai_pcc}
                          </span>
                        </p>
                    )}
                </div>
              )}

              {!showScheduleInputs && canContinueToSampleReceipt && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setExpandedSection('sampel');
                      setTimeout(() => {
                        sampelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Lanjut ke Penerimaan Sampel
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowScheduleInputs(!showScheduleInputs)}
                className="mb-4 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">
                    {activeSchedule ? 'Ubah' : 'Isi'} Jadwal {isOfficerSampling ? 'Pengambilan' : 'Pengantaran'}
                  </span>
                </div>
                {showScheduleInputs ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </button>

              {showScheduleInputs && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal {isOfficerSampling ? 'Pengambilan' : 'Pengantaran'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        value={scheduleForm.tanggalPengambilan}
                        min={getTodayYmd()}
                        onChange={(e) => {
                          const nextDate = e.target.value;
                          const dateCheck = isBusinessDay(nextDate);
                          if (!dateCheck.valid) {
                            setScheduleError(dateCheck.reason);
                            setScheduleForm({ ...scheduleForm, tanggalPengambilan: '' });
                            return;
                          }
                          setScheduleError('');
                          setScheduleForm({ ...scheduleForm, tanggalPengambilan: nextDate });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jam {isOfficerSampling ? 'Pengambilan' : 'Penerimaan'} (WIB) <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        value={scheduleForm.jamPengambilan}
                        onChange={(e) => {
                          setScheduleForm({ ...scheduleForm, jamPengambilan: e.target.value });
                          if (scheduleError === 'Jam pengambilan wajib dipilih.') setScheduleError('');
                        }}
                      >
                        <option value="">Pilih jam</option>
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time} WIB
                          </option>
                        ))}
                      </select>
                    </div>

                    {isOfficerSampling && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Petugas Pengambil Sampel (PCC) <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          value={scheduleForm.idPegawaiPcc}
                          onChange={(e) => {
                            setScheduleForm({ ...scheduleForm, idPegawaiPcc: e.target.value });
                             if (scheduleError === 'PCC wajib dipilih.') setScheduleError('');
                          }}
                        >
                          <option value="">Pilih Petugas</option>
                          {pccOptions.map(pcc => (
                            <option key={pcc.id_pegawai} value={pcc.id_pegawai}>
                              {pcc.nama_pegawai} ({pcc.no_wa || 'No WA'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {scheduleError && <p className="text-red-500 text-sm mb-4">{scheduleError}</p>}

                  <p className="mb-4 text-xs text-gray-500">
                    Jadwal hanya dapat dipilih pada hari kerja, bukan tanggal merah, dan dalam jam operasional 08:00-16:00 WIB.
                  </p>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 mb-4">
                    <p className="text-sm font-medium text-emerald-800">
                      Admin dapat menyetujui jadwal yang diusulkan pelanggan atau menggantinya sesuai ketersediaan setelah permohonan diverifikasi. Jadwal ini boleh ditetapkan sebelum metode dan pembayaran selesai, tetapi penerimaan sampel tetap menunggu pembayaran lunas atau Bayar Nanti.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      onClick={handleSaveSamplingSchedule}
                      disabled={
                        saving || 
                        !!scheduleError || 
                        !scheduleForm.tanggalPengambilan ||
                        !scheduleForm.jamPengambilan ||
                        (isOfficerSampling && !scheduleForm.idPegawaiPcc)
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {saving
                        ? 'Menyimpan...'
                        : activeSchedule ? 'Perbarui Jadwal' : 'Setujui Jadwal yang Akan Aktif'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-700">
                Jadwal hanya bisa diubah setelah permohonan disetujui admin dan sebelum sampel diterima. Status yang diperbolehkan: <span className="font-semibold">Menunggu Penentuan Metode, Menunggu Pembayaran, atau Menunggu Sampel</span>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
