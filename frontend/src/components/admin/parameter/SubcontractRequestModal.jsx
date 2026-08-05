import { useState } from 'react';
import { X, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { adminParameterApi } from '../../../api/adminParameterApi';
import { showError, showSuccess } from '../../../utils/feedback';
import { getApiErrorMessage } from '../../../api/httpClient';

export function SubcontractRequestModal({ request, onClose, onRefresh, onGoToAddMethod }) {
  const [submitting, setSubmitting] = useState(false);

  const isPending = request?.status_permintaan === 'MENUNGGU_ADMIN';

  // Extract info from nested data
  const fpm = request?.fppl_parameter_metode;
  const parameter = fpm?.parameter;
  const jenisSampelObj = fpm?.jenis_sampel;
  const regBmObj = fpm?.reg_bm;
  const kategoriParameter = parameter?.kategori?.nama_kategori || parameter?.kategori_parameter || request?.parameter?.kategori?.nama_kategori || request?.parameter?.kategori_parameter || '-';
  const jenisSampel = jenisSampelObj?.jenis_sampel || (typeof jenisSampelObj === 'string' ? jenisSampelObj : '-');
  const regulasi = regBmObj?.ref_reg || regBmObj?.instansi || (typeof regBmObj === 'string' ? regBmObj : '-');
  const instansi = regBmObj?.instansi || '-';

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await adminParameterApi.rejectSubcontractRequest(request.id_permintaan_subkontrak);
      showSuccess('Permintaan subkontrak ditolak.');
      onRefresh();
      onClose();
    } catch (err) {
      showError(getApiErrorMessage(err, 'Gagal menolak permintaan subkontrak.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white">Detail Permintaan Subkontrak</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Info Permohonan */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
            <h4 className="font-semibold text-gray-800 text-base mb-2">Informasi Permohonan</h4>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-gray-500">No. Registrasi:</span>
              <span className="col-span-2 font-medium text-gray-900">
                {request.id_registrasi || request.fppl?.id_registrasi || '-'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-gray-500">Waktu Permintaan:</span>
              <span className="col-span-2 font-medium text-gray-900">
                {new Date(request.diajukan_pada || request.created_at).toLocaleString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-gray-500">Status:</span>
              <span className="col-span-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  request.status_permintaan === 'MENUNGGU_ADMIN'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : request.status_permintaan === 'SELESAI'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  {request.status_permintaan === 'MENUNGGU_ADMIN' ? 'Menunggu Admin'
                    : request.status_permintaan === 'SELESAI' ? 'Selesai' : 'Ditolak'}
                </span>
              </span>
            </div>
          </div>

          {/* Info Parameter & Sampel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 text-sm">
            <h4 className="font-semibold text-blue-900 text-base mb-2">Parameter Uji yang Diminta</h4>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-blue-700">Parameter Uji:</span>
              <span className="col-span-2 font-semibold text-blue-900 text-base">
                {parameter?.nama_parameter || '-'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-blue-700">Kategori:</span>
              <span className="col-span-2 font-medium text-blue-900">
                {kategoriParameter}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-blue-700">Jenis Sampel:</span>
              <span className="col-span-2 font-medium text-blue-900">
                {jenisSampel}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-blue-700">Regulasi/Standar:</span>
              <span className="col-span-2 font-medium text-blue-900">
                {regulasi}
                {instansi !== '-' && instansi !== regulasi && (
                  <span className="ml-2 text-xs text-blue-600">({instansi})</span>
                )}
              </span>
            </div>
          </div>

          {/* Action: Jika pending, tampilkan tombol tambah metode + tolak */}
          {isPending ? (
            <div className="space-y-4">
              {/* Tombol Tambah Metode */}
              <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Setujui: Tambahkan Metode Subkontrak
                </h4>
                <p className="text-sm text-emerald-800 mb-4">
                  Klik tombol di bawah untuk langsung menambahkan metode subkontrak untuk parameter{' '}
                  <strong>{parameter?.nama_parameter || '-'}</strong> di halaman Kelola Parameter.
                  Parameter sudah otomatis dipilih, Anda hanya perlu mengisi nama metode, acuan, dan tarif.
                </p>
                <button
                  onClick={() => {
                    if (typeof onGoToAddMethod === 'function') {
                      onGoToAddMethod({
                        id_parameter: request.id_parameter,
                        nama_parameter: parameter?.nama_parameter,
                        requestId: request.id_permintaan_subkontrak,
                        is_subkontrak: true,
                      });
                    }
                  }}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Tambahkan Metode Subkontrak
                </button>
              </div>

              {/* Tolak */}
              <div className="border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Atau Tolak Permintaan
                </h4>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="w-full py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors text-sm"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Tolak Permintaan
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {request.status_permintaan === 'SELESAI' ? 'Permintaan selesai diproses' : 'Permintaan ditolak'}
                  </h4>
                  <p className="mt-1 text-sm text-gray-600">
                    Status permintaan ini sudah final.
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  request.status_permintaan === 'SELESAI'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  {request.status_permintaan === 'SELESAI' ? 'Selesai' : 'Ditolak'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
