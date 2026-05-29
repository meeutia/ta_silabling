import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { FPPL_STATUSES } from '../../../utils/fpplStatus';

export function DetailPermohonanHeader({
  onBack,
  officerWhatsAppLink,
  activeSchedule,
  normalizedRequest,
  customerProfile,
  requestData,
  statusAktif,
  shouldShowDecisionNote,
  cleanDecisionNote,
  progressSteps,
  formatDate,
  formatDateTime,
  getStatusBadge,
}) {
  const formatDisplayDate = (value, formatter) => {
    const formatted = formatter(value);
    if (formatted && formatted !== '-') return formatted;

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value).trim() || '-';
    }

    return '-';
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Riwayat</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-gray-900 mb-3">
              Detail Permohonan
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Kontak Petugas (WhatsApp)</p>

                {officerWhatsAppLink ? (
                  <a
                    href={officerWhatsAppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                  >
                    {activeSchedule?.no_wa_pcc}
                  </a>
                ) : (
                  <p className="font-medium text-gray-900">—</p>
                )}
              </div>

              <div>
                <p className="text-gray-600 mb-1">Jenis Sampel</p>
                <p className="font-semibold text-gray-900">
                  {normalizedRequest.jenisSampel}
                </p>
              </div>

              <div>
                <p className="text-gray-600 mb-1">Tanggal Daftar</p>
                <p className="font-semibold text-gray-900">
                  {formatDisplayDate(normalizedRequest.tanggalDaftar, formatDate)}
                </p>
              </div>

              <div>
                <p className="text-gray-600 mb-1">Nama Instansi</p>
                <p className="font-semibold text-gray-900">
                  {customerProfile?.nama_instansi || '-'}
                </p>
              </div>

              <div>
                <p className="text-gray-600 mb-1">Maksud Pengujian</p>
                <p className="font-semibold text-gray-900">
                  {requestData?.maksud_pengujian || '-'}
                </p>
              </div>

              <div>
                <p className="text-gray-600 mb-1">Status</p>
                {getStatusBadge(statusAktif)}
              </div>

              <div>
                <p className="text-gray-600 mb-1">Tanggal Verifikasi</p>
                <p className="font-semibold text-gray-900">
                  {formatDisplayDate(normalizedRequest.tanggalVerifikasi, formatDateTime)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {shouldShowDecisionNote && (
          <div
            className={`rounded-lg border p-4 ${
              [FPPL_STATUSES.DIBATALKAN, FPPL_STATUSES.DIBATALKAN_PELANGGAN, FPPL_STATUSES.DITOLAK_ADMIN, FPPL_STATUSES.DITOLAK_KASI, FPPL_STATUSES.DITOLAK_PENYELIA].includes(statusAktif)
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <p
                className={`text-sm font-semibold leading-none ${
                  [FPPL_STATUSES.DIBATALKAN, FPPL_STATUSES.DIBATALKAN_PELANGGAN, FPPL_STATUSES.DITOLAK_ADMIN, FPPL_STATUSES.DITOLAK_KASI, FPPL_STATUSES.DITOLAK_PENYELIA].includes(statusAktif)
                    ? 'text-red-900'
                    : 'text-amber-900'
                }`}
              >
                {[FPPL_STATUSES.DIBATALKAN, FPPL_STATUSES.DIBATALKAN_PELANGGAN, FPPL_STATUSES.DITOLAK_ADMIN, FPPL_STATUSES.DITOLAK_KASI, FPPL_STATUSES.DITOLAK_PENYELIA].includes(statusAktif)
                  ? 'Alasan Penolakan'
                  : 'Catatan Status'}
              </p>
            </div>

            <p
              className={`text-sm mt-2 ${
                [FPPL_STATUSES.DIBATALKAN, FPPL_STATUSES.DIBATALKAN_PELANGGAN, FPPL_STATUSES.DITOLAK_ADMIN, FPPL_STATUSES.DITOLAK_KASI, FPPL_STATUSES.DITOLAK_PENYELIA].includes(statusAktif)
                  ? 'text-red-800'
                  : 'text-amber-800'
              }`}
            >
              {cleanDecisionNote}
            </p>
          </div>
        )}

        <div className="relative mt-10">
          <div className="flex items-center justify-between">
            {progressSteps.map((step, idx) => (
              <div
                key={step.key}
                className="flex-1 flex flex-col items-center relative"
              >
                {idx !== progressSteps.length - 1 && (
                  <div className="absolute top-5 left-1/2 w-full h-0.5 bg-gray-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        step.completed ? 'bg-emerald-500' : 'bg-gray-200'
                      }`}
                      style={{ width: step.completed ? '100%' : '0%' }}
                    />
                  </div>
                )}

                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step.completed
                      ? 'bg-emerald-500'
                      : step.active
                        ? 'bg-emerald-100 ring-4 ring-emerald-200'
                        : 'bg-gray-200'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <div
                      className={`w-3 h-3 rounded-full ${
                        step.active ? 'bg-emerald-600' : 'bg-gray-400'
                      }`}
                    />
                  )}
                </div>

                <p
                  className={`mt-2 text-xs font-medium text-center ${
                    step.completed || step.active
                      ? 'text-gray-900'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
