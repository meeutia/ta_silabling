import { X } from 'lucide-react';

export function RegistrationTariffModal({ isOpen, tariffs, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Harga Pengambilan Sampel oleh Laboratorium</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto">
          {tariffs.length > 0 ? (
            <table className="w-full min-w-[720px] table-auto text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Jenis Kegiatan</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Tarif (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {tariffs.map((tariff) => (
                  <tr key={tariff.id_tarif_pengambilan} className="border-b border-gray-100">
                    <td className="px-4 py-2">{tariff.keterangan_jarak}</td>
                    <td className="px-4 py-2 text-right">Rp {Number(tariff.tarif).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">Memuat data tarif...</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
