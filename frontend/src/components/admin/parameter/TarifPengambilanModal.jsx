import React from 'react';
import { X } from 'lucide-react';
import { CurrencyInput } from './CurrencyInput';

export function TarifPengambilanModal({ selectedItem, formData, onClose, onChange, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-stretch justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg h-full overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedItem ? 'Edit Tarif Pengambilan' : 'Tambah Tarif Pengambilan'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <form id="tarifForm" onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keterangan Jarak / Area <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="keterangan_jarak"
                value={formData.keterangan_jarak || ''}
                onChange={onChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Contoh: Padang (dalam kota) atau < 50 km"
                required
              />
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarif (Rp) <span className="text-red-500">*</span>
              </label>
              <CurrencyInput
                name="tarif"
                value={formData.tarif || ''}
                onChange={onChange}
                placeholder="Contoh: 150.000"
                required
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
          >
            Batal
          </button>

          <button
            type="submit"
            form="tarifForm"
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-sm"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
