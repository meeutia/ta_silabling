import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp, MapPin, X } from 'lucide-react';
import { FPPL_STATUSES } from '../../../utils/fpplStatus';

export function DetailSampleScheduleSection({
  sampelRef,
  expandedSection,
  toggleSection,
  statusAktif,
  requestData,
  normalizedRequest,
  invoice,
  billing,
  activeSchedule,
  officerWhatsAppLink,
  requestSamples,
  formatDateTime,
  formatCurrency,
  getSampleParameterMethods,
  getSampleTypeName,
  getRegBmLabel,
  getParameterName,
  getMethodName,
  getParameterPrice,
  isParameterSubkontrak,
  getKasiPengujianNote,
  lhuPickupInfo,
  minScheduleDate,
  activeScheduleChangeType,
  handleOpenScheduleChangeForm,
  handleCancelScheduleChangeForm,
  handleConfirmSchedule,
  scheduleChangeForm,
  setScheduleChangeForm,
  handleScheduleChangeDateChange,
  handleScheduleChangeTimeChange,
  scheduleChangeLoading,
  scheduleConfirmLoading,
  handleScheduleChangeSubmit,
  detailRefreshing = false,
}) {
  const isPetugasSampling = requestData?.jenis_pengambilan_sampel === 'Petugas';
  const isSampleReceived = [
    FPPL_STATUSES.PROSES_PENGUJIAN,
    FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
    FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
    FPPL_STATUSES.SELESAI,
  ].includes(statusAktif);
  const isClosedRequest = [
    FPPL_STATUSES.DIBATALKAN,
    FPPL_STATUSES.DIBATALKAN_PELANGGAN,
    FPPL_STATUSES.DITOLAK_ADMIN,
    FPPL_STATUSES.DITOLAK_KASI,
    FPPL_STATUSES.DITOLAK_PENYELIA,
  ].includes(statusAktif);
  const shouldShowSampleSchedule = Boolean(activeSchedule) && [
    FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
    FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
    FPPL_STATUSES.MENUNGGU_SAMPEL,
    'Menunggu Pengambilan Sampel',
    'Menunggu Pengantaran Sampel',
    FPPL_STATUSES.PROSES_PENGUJIAN,
    FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
    FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
    FPPL_STATUSES.SELESAI,
  ].includes(statusAktif);
  const hasLhuPickupSchedule = Boolean(lhuPickupInfo?.tanggal_pengambilan || lhuPickupInfo?.tanggalPengambilan);
  const isWaitingLhuScheduling = statusAktif === FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU;
  const lhuPickupStatus = lhuPickupInfo?.status_pengambilan || lhuPickupInfo?.statusPengambilan;
  const scheduleChangeRows = Array.isArray(requestData?.pengajuan_perubahan_jadwal)
    ? requestData.pengajuan_perubahan_jadwal
    : Array.isArray(requestData?.pengajuanPerubahanJadwal)
    ? requestData.pengajuanPerubahanJadwal
    : Array.isArray(requestData?.PengajuanPerubahanJadwals)
    ? requestData.PengajuanPerubahanJadwals
    : [];

  const getPendingScheduleChange = (jenisJadwal) =>
    scheduleChangeRows.find((row) => {
      const jenis = String(row.jenis_jadwal || row.jenisJadwal || '').toUpperCase();
      const status = row.status_pengajuan || row.statusPengajuan;
      return jenis === jenisJadwal && status === 'Menunggu Persetujuan Admin';
    });

  const pendingSampleScheduleChange = getPendingScheduleChange('SAMPEL');
  const pendingLhuScheduleChange = getPendingScheduleChange('LHU');

  const getApprovedScheduleChange = (jenisJadwal) =>
    scheduleChangeRows.find((row) => {
      const jenis = String(row.jenis_jadwal || row.jenisJadwal || '').toUpperCase();
      const status = row.status_pengajuan || row.statusPengajuan;
      return jenis === jenisJadwal && status === 'Disetujui';
    });

  const getScheduleApprovalStatus = (schedule, jenisJadwal) => {
    if (!schedule) return '';

    if (jenisJadwal === 'LHU') {
      return schedule?.status_pengambilan || schedule?.statusPengambilan || '';
    }

    return schedule?.status_jadwal || schedule?.statusJadwal || '';
  };

  const isScheduleApproved = (schedule, jenisJadwal) => {
    const status = String(getScheduleApprovalStatus(schedule, jenisJadwal)).trim();
    if (['Disetujui Pelanggan', 'Disetujui'].includes(status)) return true;

    const approvedChange = Boolean(getApprovedScheduleChange(jenisJadwal));
    if (status === 'Disetujui Admin') return approvedChange;
    return !status && approvedChange;
  };

  const getApprovedByLabel = (schedule, jenisJadwal) => {
    const status = String(getScheduleApprovalStatus(schedule, jenisJadwal)).trim();
    if (status === 'Disetujui Admin' || (!status && getApprovedScheduleChange(jenisJadwal))) return 'admin';
    if (status === 'Disetujui Pelanggan' || status === 'Disetujui') return 'pelanggan';
    return 'pelanggan/admin';
  };

  const isSampleScheduleApproved = isScheduleApproved(activeSchedule, 'SAMPEL');
  const isLhuScheduleApproved = isScheduleApproved(lhuPickupInfo, 'LHU');
  const canRequestSampleReschedule = Boolean(activeSchedule) && !isSampleReceived && !isClosedRequest && !isSampleScheduleApproved;
  const canRequestLhuReschedule = hasLhuPickupSchedule && lhuPickupStatus !== 'Sudah Diambil' && !isClosedRequest && !isLhuScheduleApproved;

  const getScheduleKindLabel = (jenisJadwal) =>
    jenisJadwal === 'LHU' ? 'Jadwal Pengambilan LHU' : 'Jadwal Sampel';

  const getSampleReceptionStatusLabel = () => {
    if (isSampleReceived) return 'Sampel Diterima';
    if (isClosedRequest) return 'Permohonan Dibatalkan';
    if (activeSchedule && isPetugasSampling) return 'Menunggu Pengambilan Sampel';
    if (activeSchedule) return 'Menunggu Pengantaran Sampel';
    return FPPL_STATUSES.MENUNGGU_SAMPEL;
  };

  const renderScheduleChangeForm = (jenisJadwal) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <form onSubmit={handleScheduleChangeSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">Ajukan Perubahan {getScheduleKindLabel(jenisJadwal)}</p>
            <p className="mt-1 text-sm text-gray-600">
              Pengajuan ini akan masuk ke admin. Jadwal aktif hanya berubah jika admin menyetujui.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tanggal Usulan</label>
            <input
              type="date"
              value={scheduleChangeForm.tanggalUsulan}
              min={minScheduleDate}
              onChange={(event) => {
                if (typeof handleScheduleChangeDateChange === 'function') {
                  handleScheduleChangeDateChange(jenisJadwal, event.target.value);
                  return;
                }

                setScheduleChangeForm((previous) => ({ ...previous, jenisJadwal, tanggalUsulan: event.target.value }));
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Jam Usulan</label>
            <input
              type="time"
              min="08:00"
              max="16:00"
              value={scheduleChangeForm.jamUsulan}
              onChange={(event) => {
                if (typeof handleScheduleChangeTimeChange === 'function') {
                  handleScheduleChangeTimeChange(jenisJadwal, event.target.value);
                  return;
                }

                setScheduleChangeForm((previous) => ({ ...previous, jenisJadwal, jamUsulan: event.target.value }));
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Jadwal hanya dapat dipilih pada hari kerja, bukan tanggal merah, dan dalam jam operasional 08:00-16:00 WIB.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold text-gray-700">Alasan perubahan jadwal</label>
          <textarea
            rows={4}
            value={scheduleChangeForm.alasanPengajuan}
            onChange={(event) => setScheduleChangeForm((previous) => ({ ...previous, jenisJadwal, alasanPengajuan: event.target.value }))}
            placeholder="Contoh: PIC tidak bisa hadir pada jadwal yang diberikan admin."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancelScheduleChangeForm}
            disabled={scheduleChangeLoading}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={scheduleChangeLoading}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scheduleChangeLoading ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderScheduleActions = (jenisJadwal, schedule) => {
    const pending = jenisJadwal === 'LHU' ? pendingLhuScheduleChange : pendingSampleScheduleChange;
    const approved = isScheduleApproved(schedule, jenisJadwal);
    const isConfirming = scheduleConfirmLoading === jenisJadwal;

    return (
      <div className="mt-4 space-y-3">
        {approved ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Jadwal ini sudah disetujui {getApprovedByLabel(schedule, jenisJadwal)}. Tombol setuju dan atur ulang jadwal tidak ditampilkan lagi.
          </div>
        ) : pending ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Pengajuan perubahan jadwal sedang menunggu persetujuan admin untuk {formatDateTime(pending.tanggal_usulan || pending.tanggalUsulan, pending.jam_usulan || pending.jamUsulan)}.
          </div>
        ) : (
          <div id={`${jenisJadwal === 'LHU' ? 'lhu' : 'sample'}-schedule-confirmation`} className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => handleConfirmSchedule?.(jenisJadwal)}
              disabled={isConfirming}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConfirming ? 'Menyimpan...' : 'Setujui Jadwal'}
            </button>
            <button
              type="button"
              onClick={() => handleOpenScheduleChangeForm?.(jenisJadwal)}
              disabled={isConfirming}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Atur Ulang Jadwal?
            </button>
          </div>
        )}

        {!approved && activeScheduleChangeType === jenisJadwal && renderScheduleChangeForm(jenisJadwal)}
      </div>
    );
  };

  return (
    <div
      ref={sampelRef}
      className="bg-white rounded-xl shadow-sm border border-gray-100 transition-all"
    >
      <button
        onClick={() => toggleSection('sampel')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Informasi Sampel & Jadwal
          </h2>
        </div>
        {expandedSection === 'sampel' ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expandedSection === 'sampel' && (
        <div className="px-6 pb-6 space-y-6">
          {shouldShowSampleSchedule && (
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900">
                    Jadwal {isPetugasSampling ? 'Pengambilan' : 'Pengantaran'} Telah Ditentukan
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-emerald-800">
                    <p>
                      <span className="font-medium">Tanggal:</span>{' '}
                      {formatDateTime(
                        `${activeSchedule.tanggal_jadwal} ${activeSchedule.jam_jadwal || ''}`
                      )}
                    </p>
                    {isPetugasSampling && activeSchedule?.nama_pegawai_pcc && (
                      <p className="text-xs text-emerald-700 mt-2">
                        Silakan hubungi{' '}
                        <span className="font-semibold">{activeSchedule.nama_pegawai_pcc}</span>{' '}
                        di{' '}
                        {officerWhatsAppLink ? (
                          <a
                            href={officerWhatsAppLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline hover:text-emerald-900"
                          >
                            {activeSchedule.no_wa_pcc}
                          </a>
                        ) : (
                          <span className="font-semibold">—</span>
                        )}{' '}
                        untuk konfirmasi jadwal pengambilan sampel.
                      </p>
                    )}
                  </div>

                  {(canRequestSampleReschedule || isSampleScheduleApproved || pendingSampleScheduleChange) && renderScheduleActions('SAMPEL', activeSchedule)}
                </div>
              </div>
            </div>
          )}

          {isWaitingLhuScheduling && !hasLhuPickupSchedule && (
            <div id="lhu-pickup" className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">Menunggu Penjadwalan LHU</p>
                  <p className="mt-1 text-sm text-amber-800">
                    LHU sudah disahkan. Admin akan menjadwalkan pengambilan LHU, lalu pelanggan dapat menyetujui atau mengajukan perubahan jadwal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasLhuPickupSchedule && (
            <div id="lhu-pickup" className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">LHU Siap Diambil</p>
                  <p className="mt-1 text-sm text-blue-800">
                    Silakan ambil LHU pada{' '}
                    <span className="font-semibold">
                      {formatDateTime(`${lhuPickupInfo.tanggal_pengambilan || lhuPickupInfo.tanggalPengambilan} ${lhuPickupInfo.jam_pengambilan || lhuPickupInfo.jamPengambilan || ''}`)}
                    </span>
                    .
                  </p>
                  {lhuPickupInfo?.catatan && (
                    <p className="mt-1 text-xs text-blue-700">Catatan: {lhuPickupInfo.catatan}</p>
                  )}

                  {(canRequestLhuReschedule || isLhuScheduleApproved || pendingLhuScheduleChange) && renderScheduleActions('LHU', lhuPickupInfo)}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Nama Sampel</p>
              <p className="font-medium text-gray-900">
                {normalizedRequest.namaSampel}
              </p>
            </div>

            <div>
              <p className="text-gray-600 mb-1">
                {isPetugasSampling ? 'Lokasi Sampling' : 'Lokasi Asal Sampel'}
              </p>
              <p className="font-medium text-gray-900">
                {normalizedRequest.lokasi}
              </p>
            </div>

            <div>
              <p className="text-gray-600 mb-1">Metode Sampling</p>
              <p className="font-medium text-gray-900">
                {invoice?.rincian?.metodeSampling ?? billing?.metodeSampling ?? '—'}
              </p>
            </div>

            <div>
              <p className="text-gray-600 mb-1">Jadwal Sampling</p>
              <p className="font-medium text-gray-900">
                {requestData?.jadwal_sampling
                  ? formatDateTime(requestData.jadwal_sampling)
                  : 'Menunggu penjadwalan'}
              </p>
            </div>

            {isPetugasSampling && (
              <>
                <div>
                  <p className="text-gray-600 mb-1">Petugas Pengambil</p>
                  <p className="font-medium text-gray-900">
                    {activeSchedule?.nama_pegawai_pcc || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 mb-1">No Permohonan</p>
                  <p className="font-medium text-gray-900">
                    {normalizedRequest.nomorFppl}
                  </p>
                </div>
              </>
            )}

            <div>
              <p className="text-gray-600 mb-1">Status Penerimaan</p>
              <p
                className={`font-medium ${
                  isSampleReceived
                    ? 'text-emerald-700'
                    : isClosedRequest
                    ? 'text-red-700'
                    : 'text-yellow-700'
                }`}
              >
                {getSampleReceptionStatusLabel()}
              </p>
            </div>
          </div>

          {requestSamples.length > 0 ? (
            <div className="space-y-4">
              {requestSamples.map((requestSample, idx) => {
                const parameterMethods = getSampleParameterMethods(requestSample);
                return (
                  <div
                    key={requestSample.id_fppl_sampel || idx}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="font-semibold text-gray-900">
                          Jenis sampel {idx + 1}: {getSampleTypeName(requestSample)}
                        </h4>

                        <div className="flex items-center gap-4">
                          <p className="text-sm text-gray-600">
                            Standar: {getRegBmLabel(requestSample)}
                          </p>

                          <span className="text-sm text-gray-600">
                            Jumlah: {requestSample.jumlah_sampel || 1}
                          </span>
                        </div>
                      </div>
                    </div>

                    {parameterMethods.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                        <table className="w-full min-w-[900px] text-sm">
                          <thead className="bg-gray-50">
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                                Parameter
                              </th>
                              <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                                Metode
                              </th>
                              <th className="px-4 py-3 text-right text-gray-600 font-semibold">
                                Harga
                              </th>
                              <th className="px-4 py-3 text-center text-gray-600 font-semibold">
                                Subkontrak
                              </th>
                              <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                                Catatan
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100">
                            {parameterMethods.map((sampleParameterMethod) => {
                              const isSubkontrak = isParameterSubkontrak(sampleParameterMethod);
                              const price = getParameterPrice(sampleParameterMethod);
                              const note = getKasiPengujianNote(sampleParameterMethod);

                              return (
                                <tr key={sampleParameterMethod.id_fppl_parameter_metode}>
                                  <td className="px-4 py-3 text-gray-900 font-medium">
                                    {getParameterName(sampleParameterMethod)}
                                  </td>

                                  <td className="px-4 py-3 text-gray-600">
                                    {getMethodName(sampleParameterMethod)}
                                  </td>

                                  <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                                    {formatCurrency(price)}
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    {isSubkontrak ? (
                                      <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 border border-orange-200">
                                        Ya
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                        Tidak
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-gray-600">
                                    {note}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        Belum ada parameter dan metode.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : detailRefreshing ? (
            <p className="text-gray-400 text-sm">
              Memuat data sampel...
            </p>
          ) : (
            <p className="text-gray-400 text-sm">
              Tidak ada data sampel.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
