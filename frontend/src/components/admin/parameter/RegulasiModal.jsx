import React from 'react';
import { Lock, X } from 'lucide-react';

export function RegulasiModal({ selectedItem, formData, onClose, onChange, onSubmit }) {
  const isLocked = Boolean(selectedItem && (selectedItem.is_locked || formData.is_locked));
  const usage = selectedItem?.usage || formData.usage || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedItem ? 'Edit Regulasi' : 'Tambah Regulasi'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Atur instansi dan referensi regulasi baku mutu.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {isLocked && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Acuan regulasi dikunci</p>
                    <p className="mt-1">
                      Regulasi ini sudah terhubung dengan paket/permohonan ({Number(usage.pkt_bm || 0)} paket, {Number(usage.fppl_sampel || 0)} data sampel).
                      Kamu masih bisa mengubah status aktif/nonaktif, tetapi instansi dan referensi regulasi tidak boleh diubah.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instansi <span className="text-red-500">*</span>
              </label>

              <select
                name="instansi"
                value={formData.instansi || ''}
                onChange={onChange}
                disabled={isLocked}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                required
              >
                <option value="KEMENKES">KEMENKES</option>
                <option value="KLH">KLH</option>
                <option value="KLHK">KLHK</option>
                <option value="INTERNAL">INTERNAL</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referensi Regulasi <span className="text-red-500">*</span>
              </label>

              <textarea
                name="ref_reg"
                value={formData.ref_reg || ''}
                onChange={onChange}
                disabled={isLocked}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                placeholder="Contoh: Permenkes No. 2 Tahun 2023"
                required
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active || false}
                onChange={onChange}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Regulasi Aktif</span>
            </label>
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
              >
                Batal
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-sm"
              >
                {selectedItem ? 'Simpan Perubahan' : 'Tambah Regulasi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
