import { CheckCircle, Loader2 } from 'lucide-react';

function firstFilled(values = []) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text && text !== '-') return text;
  }
  return '';
}

function getApproveLabel(detail = {}) {
  const sample = Array.isArray(detail.samples) && detail.samples.length > 0
    ? detail.samples[0]
    : {};

  const parameterMetode =
    detail.parameterMetode ||
    detail.parameter_metode ||
    detail.ParameterMetode ||
    sample.parameterMetode ||
    sample.parameter_metode ||
    sample.ParameterMetode ||
    {};

  const nestedParameter =
    parameterMetode.parameter ||
    parameterMetode.Parameter ||
    sample.parameter ||
    sample.Parameter ||
    {};

  const nestedMetode =
    parameterMetode.metode ||
    parameterMetode.Metode ||
    sample.metodeObj ||
    sample.metode_object ||
    sample.Metode ||
    {};

  const parameter = firstFilled([
    detail.parameter,
    detail.namaParameter,
    detail.nama_parameter,
    detail.parameterName,
    detail.parameter_name,
    detail.nama_parameter_uji,
    sample.parameter,
    sample.namaParameter,
    sample.nama_parameter,
    sample.parameterName,
    sample.parameter_name,
    nestedParameter.namaParameter,
    nestedParameter.nama_parameter,
    nestedParameter.parameter,
  ]) || '-';

  const metode = firstFilled([
    detail.metode,
    detail.namaMetode,
    detail.nama_metode,
    detail.method,
    detail.methodName,
    detail.method_name,
    detail.metodePengujian,
    detail.metode_pengujian,
    detail.namaMetodePengujian,
    detail.nama_metode_pengujian,
    parameterMetode.namaMetode,
    parameterMetode.nama_metode,
    parameterMetode.metode,
    parameterMetode.metodePengujian,
    parameterMetode.metode_pengujian,
    nestedMetode.namaMetode,
    nestedMetode.nama_metode,
    nestedMetode.metode,
    sample.metode,
    sample.namaMetode,
    sample.nama_metode,
    sample.method,
    sample.methodName,
    sample.method_name,
  ]) || '-';

  return `${parameter} — ${metode}`;
}

export function PenyeliaApproveModal({ approveModal, actionLoadingId, onClose, onSubmit }) {
  if (!approveModal.open || !approveModal.detail) return null;

  const detail = approveModal.detail;
  const isLoading = actionLoadingId === detail.idPenugasanDetail;
  const label = getApproveLabel(detail);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle className="h-7 w-7" />
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">Setujui LKA</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Konfirmasi persetujuan LKA dari hasil pengujian analis.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
          <p className="text-sm text-gray-700">LKA yang akan disetujui</p>
          <p className="mt-1 text-sm font-bold leading-6 text-emerald-800">{label}</p>
        </div>

        <p className="mt-4 text-center text-sm leading-6 text-gray-600">
          Setelah disetujui, LKA akan masuk ke tahap verifikasi berikutnya.
        </p>

        <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Setujui LKA
          </button>
        </div>
      </div>
    </div>
  );
}
