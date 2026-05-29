import React from 'react';
import { Truck, X } from 'lucide-react';
import { stripHtml } from './parameterFormatters';
import { ScientificInput, ScientificTextarea } from './AdminKelolaParameterFormControls';

export function ParameterMetodeModal({
  selectedItem,
  formData,
  parametersOption,
  methodsOption,
  kategoriParameterOptions = [],
  onClose,
  onChange,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedItem ? 'Edit Parameter & Metode' : 'Tambah Parameter & Metode'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Lengkapi parameter, metode, acuan, tarif, dan status akreditasi.
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

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <form id="form-param-metode" onSubmit={onSubmit} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Data Parameter</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Pilih parameter lama atau buat parameter baru.
                  </p>
                </div>

                {!selectedItem && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="is_new_parameter"
                      checked={Boolean(formData.is_new_parameter)}
                      onChange={onChange}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                    />
                    <span className="font-medium text-emerald-700">Buat Baru</span>
                  </label>
                )}
              </div>

              {formData.is_new_parameter ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ScientificInput
                    label="Nama Parameter"
                    name="nama_parameter"
                    value={formData.nama_parameter || ''}
                    onChange={onChange}
                    placeholder="Contoh: Amonia (NH₃-N)"
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori Parameter
                    </label>

                    <input
                      list="kategori-options"
                      type="text"
                      name="kategori_parameter"
                      value={formData.kategori_parameter || ''}
                      onChange={onChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="Fisika / Kimia / Mikrobiologi"
                    />

                    <datalist id="kategori-options">
                      {kategoriParameterOptions.length > 0 ? (
                        kategoriParameterOptions.map((kategori) => (
                          <option
                            key={kategori.id_kategori_parameter || kategori.nama_kategori}
                            value={kategori.nama_kategori || ''}
                          />
                        ))
                      ) : (
                        <>
                          <option value="Fisika" />
                          <option value="Kimia" />
                          <option value="Kimia anorganik" />
                          <option value="Kimia organik" />
                          <option value="Mikrobiologi" />
                        </>
                      )}
                    </datalist>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parameter <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="id_parameter"
                    value={formData.id_parameter || ''}
                    onChange={onChange}
                    disabled={!!selectedItem}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    required={!formData.is_new_parameter}
                  >
                    <option value="">Pilih Parameter</option>
                    {parametersOption.map((parameter) => (
                      <option key={parameter.id_parameter} value={parameter.id_parameter}>
                        {stripHtml(parameter.nama_parameter)} ({parameter.kategori_parameter || parameter.kategori?.nama_kategori || '-'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Data Metode</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Pilih metode lama atau buat metode baru.
                  </p>
                </div>

                {!selectedItem && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="is_new_metode"
                      checked={Boolean(formData.is_new_metode)}
                      onChange={onChange}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                    />
                    <span className="font-medium text-emerald-700">Buat Baru</span>
                  </label>
                )}
              </div>

              {formData.is_new_metode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Metode <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="nama_metode"
                    value={formData.nama_metode || ''}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="Contoh: Spektrofotometri UV-Vis"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metode <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="id_metode"
                    value={formData.id_metode || ''}
                    onChange={onChange}
                    disabled={!!selectedItem}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    required={!formData.is_new_metode}
                  >
                    <option value="">Pilih Metode</option>
                    {methodsOption.map((metode) => (
                      <option key={metode.id_metode} value={metode.id_metode}>
                        {metode.nama_metode}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900">Detail Kombinasi</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Data ini akan dipakai untuk tarif, pengujian, dan LHU.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScientificInput
                  label="Acuan Metode"
                  name="acuan_metode"
                  value={formData.acuan_metode || ''}
                  onChange={onChange}
                  placeholder="Contoh: SNI 6989.11:2019"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarif <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="number"
                    name="tarif"
                    value={formData.tarif || 0}
                    onChange={onChange}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_terakreditasi"
                  checked={formData.is_terakreditasi || false}
                  onChange={onChange}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Parameter Terakreditasi KAN
                </span>
              </label>

              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_subkontrak"
                  checked={formData.is_subkontrak || false}
                  onChange={onChange}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  <Truck className="w-4 h-4 inline mr-1" />
                  Tarif Subkontrak
                </span>
              </label>
            </div>
          </form>
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
              form="form-param-metode"
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-sm"
            >
              {selectedItem ? 'Simpan Perubahan' : 'Tambah Parameter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
