import React from 'react';
import { AlertTriangle, Lock, Plus, Trash2, X } from 'lucide-react';

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

function getKlasifikasiList(formData = {}, selectedItem = null) {
  if (selectedItem) {
    return [formData.klasifikasi || selectedItem.klasifikasi || ''];
  }

  if (Array.isArray(formData.klasifikasi_list) && formData.klasifikasi_list.length > 0) {
    return formData.klasifikasi_list;
  }

  if (Array.isArray(formData.klasifikasi) && formData.klasifikasi.length > 0) {
    return formData.klasifikasi;
  }

  return [formData.klasifikasi || ''];
}

function emitKlasifikasiListChange(onChange, nextList) {
  onChange({
    target: {
      name: 'klasifikasi_list',
      value: nextList,
    },
  });
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
  const klasifikasiList = getKlasifikasiList(formData, selectedItem);
  const isEditMode = Boolean(selectedItem);

  const handleKlasifikasiChange = (index, value) => {
    if (isEditMode) {
      onChange({ target: { name: 'klasifikasi', value } });
      return;
    }

    const nextList = klasifikasiList.map((item, itemIndex) => (itemIndex === index ? value : item));
    emitKlasifikasiListChange(onChange, nextList);
  };

  const handleAddKlasifikasi = () => {
    emitKlasifikasiListChange(onChange, [...klasifikasiList, '']);
  };

  const handleRemoveKlasifikasi = (index) => {
    const nextList = klasifikasiList.filter((_, itemIndex) => itemIndex !== index);
    emitKlasifikasiListChange(onChange, nextList.length > 0 ? nextList : ['']);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-stretch justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full h-full flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedItem ? 'Edit Paket Baku Mutu' : 'Tambah Paket Baku Mutu'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Tambahkan klasifikasi ke kelompok regulasi dan jenis sampel. Status aktif/nonaktif dikelola pada level kelompok baku mutu.
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
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6"
          >
            {isLocked && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Struktur paket dikunci</p>
                    <p className="mt-1">
                      Paket ini sudah dipakai pada LHU ({Number(usage.lhu || 0)} data).
                      Regulasi, jenis sampel, dan klasifikasi tidak boleh diubah. Status aktif/nonaktif dikelola pada level kelompok baku mutu.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isLocked && selectedItem && Number(selectedItem?.usage?.pkt_bm_nilai || 0) > 0 && (
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

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  Klasifikasi <span className="text-red-500">*</span>
                </label>
                {!isEditMode && !isLocked && (
                  <button
                    type="button"
                    onClick={handleAddKlasifikasi}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Klasifikasi
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {klasifikasiList.map((value, index) => (
                  <div key={`klasifikasi-${index}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      name={isEditMode ? 'klasifikasi' : `klasifikasi_list.${index}`}
                      value={value || ''}
                      onChange={(event) => handleKlasifikasiChange(index, event.target.value)}
                      disabled={isLocked}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none ${disabledInputClass(isLocked)}`}
                      placeholder={index === 0 ? 'Contoh: Kelas I / Umum' : 'Contoh: Kelas II'}
                      required={index === 0}
                    />

                    {!isEditMode && !isLocked && klasifikasiList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKlasifikasi(index)}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-100"
                        title="Hapus klasifikasi ini"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!isEditMode && (
                <p className="mt-2 text-xs text-gray-500">
                  Setiap baris akan dibuat menjadi satu klasifikasi paket baku mutu pada regulasi dan jenis sampel yang sama.
                </p>
              )}
            </div>

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
