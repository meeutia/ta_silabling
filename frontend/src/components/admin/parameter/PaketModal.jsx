import React from 'react';
import { AlertTriangle, Lock, X } from 'lucide-react';
import { ScientificInput, ScientificTextarea } from './AdminKelolaParameterFormControls';

function normalizeBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'aktif', 'active', 'ya', 'yes'].includes(normalized);
}

function buildRegulasiOptions(regulasiData = [], selectedRegulasiId = '') {
  return regulasiData.filter((regulasi) => {
    if (regulasi.id_reg_bm === selectedRegulasiId) return true;
    return normalizeBool(regulasi.is_active);
  });
}

function disabledInputClass(isDisabled) {
  return isDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white';
}

export function PaketModal({
  selectedItem,
  formData,
  regulasiData,
  jenisSampelOptions,
  onClose,
  onChange,
  onSubmit,
}) {
  const isLocked = Boolean(selectedItem && (selectedItem.is_locked || formData.is_locked));
  const usage = selectedItem?.usage || formData.usage || {};
  const regulasiOptions = buildRegulasiOptions(regulasiData, formData.id_reg_bm);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        <div className="p-6 border-b border-gray-200 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedItem ? 'Edit Paket Baku Mutu' : 'Tambah Paket Baku Mutu'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Hubungkan regulasi dengan jenis sampel dan klasifikasi baku mutu.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col flex-1 overflow-hidden"
          style={{ minHeight: 0 }}
        >
          <div
            className="p-6 space-y-4 overflow-y-auto flex-1"
            style={{ minHeight: 0 }}
          >
            {isLocked && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Struktur paket dikunci</p>
                    <p className="mt-1">
                      Paket ini sudah dipakai pada LHU ({Number(usage.lhu || 0)} data).
                      Kamu masih bisa mengubah status aktif/nonaktif, tetapi regulasi, jenis sampel, klasifikasi, nama paket, dan teks LHU tidak boleh diubah.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isLocked && selectedItem && Number(selectedItem?.usage?.pkt_bm_param || 0) > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Paket ini sudah memiliki parameter baku mutu. Perubahan masih diperbolehkan karena belum dipakai pada LHU.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Regulasi <span className="text-red-500">*</span>
                </label>

                <select
                  name="id_reg_bm"
                  value={formData.id_reg_bm || ''}
                  onChange={onChange}
                  disabled={isLocked}
                  className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${disabledInputClass(isLocked)}`}
                  required
                >
                  <option value="">Pilih Regulasi</option>
                  {regulasiOptions.map((regulasi) => (
                    <option key={regulasi.id_reg_bm} value={regulasi.id_reg_bm}>
                      {regulasi.instansi} - {regulasi.ref_reg}
                      {!normalizeBool(regulasi.is_active) ? ' (Nonaktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Sampel <span className="text-red-500">*</span>
                </label>

                <select
                  name="id_jenis_sampel"
                  value={formData.id_jenis_sampel || ''}
                  onChange={onChange}
                  disabled={isLocked}
                  className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${disabledInputClass(isLocked)}`}
                  required
                >
                  <option value="">Pilih Jenis Sampel</option>
                  {jenisSampelOptions.map((jenis) => (
                    <option key={jenis.id_jenis_sampel} value={jenis.id_jenis_sampel}>
                      {jenis.jenis_sampel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ScientificInput
              label="Nama Paket"
              name="nama_pkt"
              value={formData.nama_pkt || ''}
              onChange={onChange}
              placeholder="Contoh: Air Sungai Kelas II"
              disabled={isLocked}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Klasifikasi
              </label>

              <input
                type="text"
                name="klasifikasi"
                value={formData.klasifikasi || ''}
                onChange={onChange}
                disabled={isLocked}
                className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${disabledInputClass(isLocked)}`}
                placeholder="Contoh: Kelas I / Kelas II / Umum"
              />
            </div>

            <ScientificTextarea
              label="Teks LHU"
              value={formData.teks_lhu || ''}
              onChange={(value) =>
                onChange({
                  target: {
                    name: 'teks_lhu',
                    value,
                  },
                })
              }
              placeholder="Teks keterangan regulasi yang akan ditampilkan di LHU"
              disabled={isLocked}
              required
            />

            <label className="flex items-center gap-2 cursor-pointer pb-6">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active || false}
                onChange={onChange}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Paket Aktif</span>
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
                {selectedItem ? 'Simpan Perubahan' : 'Tambah Paket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
