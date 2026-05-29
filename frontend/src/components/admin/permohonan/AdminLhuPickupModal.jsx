import { AlertCircle, AlertTriangle, CheckCircle, Clock, Loader2, X } from 'lucide-react';
import { getTodayYmd } from '../../../utils/businessDays';
import { showWarning } from '../../../utils/feedback';

export function AdminLhuPickupModal({
  mode,
  selectedPickup,
  pickupForm,
  setPickupForm,
  saving,
  onClose,
  onSaveSchedule,
  onRequestCompletePickup,
  onCancelCompletePickupConfirm,
  onCompletePickup,
  showCompletePickupConfirm = false,
  isBusinessDay,
  timeOptions = [],
}) {
  if (!mode || !selectedPickup) {
    return null;
  }

  const isScheduleMode = mode === 'schedule';
  const isReschedule = ['Dijadwalkan', 'Disetujui Pelanggan', 'Disetujui Admin'].includes(selectedPickup.status_pengambilan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              {isScheduleMode
                ? isReschedule
                  ? `Ubah Jadwal Pengambilan - ${selectedPickup.id_registrasi || '-'}`
                  : `Jadwalkan Pengambilan - ${selectedPickup.id_registrasi || '-'}`
                : `Konfirmasi Pengambilan - ${selectedPickup.id_registrasi || '-'}`}
            </h3>

            <p className="text-sm text-emerald-100">
              {isScheduleMode
                ? 'Atur jadwal pengambilan LHU pelanggan setelah seluruh LHU disahkan.'
                : 'Catat nama pengambil dan tandai LHU sudah diambil oleh pelanggan.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 border-b border-gray-300 pb-2 text-sm font-semibold text-gray-900">
                    Informasi Permohonan
                  </h4>

                  <div className="space-y-3 text-sm">
                    <InfoRow label="ID Registrasi" value={selectedPickup.id_registrasi || '-'} />
                    <InfoRow label="Nomor FPPL" value={selectedPickup.nomor_fppl || '-'} />
                    <InfoRow label="Pelanggan" value={selectedPickup.pelanggan || '-'} />
                    <InfoRow label="Total Sampel" value={`${selectedPickup.total_sampel || 0} sampel`} />
                    <InfoRow label="Total LHU" value={`${selectedPickup.total_lhu || 0} LHU final`} />
                  </div>
                </div>
              </div>
            </div>

            {isScheduleMode ? (
              <SchedulePickupForm
                pickupForm={pickupForm}
                setPickupForm={setPickupForm}
                isBusinessDay={isBusinessDay}
                timeOptions={timeOptions}
              />
            ) : (
              <CompletePickupForm pickupForm={pickupForm} setPickupForm={setPickupForm} />
            )}

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-yellow-900">
                <AlertCircle className="h-4 w-4" />
                Catatan Admin
              </h4>

              <p className="text-sm text-yellow-800">
                Pastikan seluruh LHU pada permohonan ini sudah disahkan sebelum menjadwalkan pengambilan.
                Setelah ditandai sudah diambil, data tidak akan muncul lagi pada tab Perlu Pengambilan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">

          <button
            type="button"
            onClick={isScheduleMode ? onSaveSchedule : (onRequestCompletePickup || onCompletePickup)}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isScheduleMode ? (
              <Clock className="h-5 w-5" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}

            {isScheduleMode
              ? isReschedule
                ? 'Simpan Perubahan Jadwal'
                : 'Simpan Jadwal'
              : 'Tandai Sudah Diambil'}
          </button>
        </div>

        {showCompletePickupConfirm && !isScheduleMode && (
          <CompletePickupConfirmModal
            selectedPickup={selectedPickup}
            saving={saving}
            onCancel={onCancelCompletePickupConfirm || (() => {})}
            onConfirm={onCompletePickup}
          />
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      className="grid items-start gap-2"
      style={{ gridTemplateColumns: '140px 12px 1fr' }}
    >
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-500">:</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function SchedulePickupForm({ pickupForm, setPickupForm, isBusinessDay, timeOptions = [] }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-4">
        <h4 className="font-semibold text-emerald-900">
          Form Jadwal Pengambilan LHU
        </h4>
        <p className="mt-1 text-sm text-emerald-700">
          Jadwal ini akan digunakan sebagai informasi pengambilan LHU oleh pelanggan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tanggal Pengambilan <span className="text-red-500">*</span>
          </label>

          <input
            type="date"
            value={pickupForm.tanggalPengambilan}
            min={getTodayYmd()}
            onChange={(event) => {
              const nextDate = event.target.value;
              const dateCheck = typeof isBusinessDay === 'function' ? isBusinessDay(nextDate) : { valid: true };
              if (!dateCheck.valid) {
                showWarning(dateCheck.reason || 'Tanggal pengambilan LHU harus hari kerja.');
                setPickupForm((prev) => ({
                  ...prev,
                  tanggalPengambilan: '',
                }));
                return;
              }

              setPickupForm((prev) => ({
                ...prev,
                tanggalPengambilan: nextDate,
              }));
            }}
            className="w-full rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Jam Pengambilan <span className="text-red-500">*</span>
          </label>

          <select
            value={pickupForm.jamPengambilan}
            onChange={(event) =>
              setPickupForm((prev) => ({
                ...prev,
                jamPengambilan: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Pilih jam</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time} WIB
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-emerald-700">
        Jadwal hanya dapat dipilih pada hari kerja, bukan tanggal merah, dan dalam jam operasional 08:00-16:00 WIB.
      </p>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Catatan
        </label>

        <textarea
          value={pickupForm.catatan}
          onChange={(event) =>
            setPickupForm((prev) => ({
              ...prev,
              catatan: event.target.value,
            }))
          }
          rows={4}
          placeholder="Contoh: LHU dapat diambil di loket administrasi pada jam kerja."
          className="w-full resize-none rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </div>
    </div>
  );
}


function CompletePickupConfirmModal({ selectedPickup, saving, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="text-center">
          <h4 className="text-lg font-bold text-gray-900">
            Konfirmasi Pengambilan LHU
          </h4>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Tandai LHU permohonan{' '}
            <span className="font-semibold text-gray-900">
              {selectedPickup?.id_registrasi || '-'}
            </span>{' '}
            sudah diambil?
          </p>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            Setelah dikonfirmasi, permohonan ini akan keluar dari daftar pengambilan LHU.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Ya, Tandai Sudah Diambil
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletePickupForm({ pickupForm, setPickupForm }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="mb-4">
        <h4 className="font-semibold text-blue-900">
          Konfirmasi Pengambilan LHU
        </h4>
        <p className="mt-1 text-sm text-blue-700">
          Isi nama orang yang mengambil LHU. Setelah disimpan, permohonan ini akan keluar dari antrean pengambilan.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Nama Pengambil <span className="text-red-500">*</span>
        </label>

        <input
          type="text"
          value={pickupForm.namaPengambil}
          onChange={(event) =>
            setPickupForm((prev) => ({
              ...prev,
              namaPengambil: event.target.value,
            }))
          }
          placeholder="Masukkan nama pengambil LHU"
          className="w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  );
}
