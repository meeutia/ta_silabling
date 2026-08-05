import React, { useEffect, useRef } from 'react';
import { Truck, X } from 'lucide-react';
import { stripHtml, normalizeBool } from './parameterFormatters';
import { ScientificInput } from './AdminKelolaParameterFormControls';
import { CurrencyInput } from './CurrencyInput';

function ReadOnlyField({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      <div className="min-h-[42px] rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-700">
        {children || '-'}
      </div>
    </div>
  );
}

function StatusBadge({ active, activeLabel, inactiveLabel, activeClass = 'bg-emerald-100 text-emerald-700' }) {
  return active ? (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${activeClass}`}>
      {activeLabel}
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
      {inactiveLabel}
    </span>
  );
}

export function ParameterMetodeModal({
  selectedItem,
  formData,
  submitError = '',
  parametersOption,
  methodsOption,
  kategoriParameterOptions = [],
  onClose,
  onChange,
  onSubmit,
}) {
  const isEditMode = Boolean(selectedItem);
  const selectedParameterName = selectedItem?.parameter?.nama_parameter || '-';
  const selectedMetodeName = selectedItem?.metode?.nama_metode || '-';
  const formScrollRef = useRef(null);

  useEffect(() => {
    formScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [selectedItem, formData?.id_parameter, formData?.id_metode, formData?.is_new_parameter, formData?.is_new_metode, submitError]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-stretch justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full h-full flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditMode ? 'Edit Tarif Parameter & Metode' : 'Tambah Parameter & Metode'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isEditMode
                  ? 'Data parameter, metode, acuan, akreditasi, dan subkontrak dikunci. Ubah tarif dan status aktif metode.'
                  : 'Lengkapi parameter, metode, acuan, tarif, dan status akreditasi.'}
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

        <div ref={formScrollRef} className="p-6 overflow-y-auto flex-1 min-h-0">
          <form id="form-param-metode" onSubmit={onSubmit} className="space-y-6">
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {isEditMode ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900">Data Parameter & Metode</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Data acuan tidak dapat diubah dari form edit. Buat data parameter metode baru jika acuan/metode berubah.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ReadOnlyField label="Parameter">
                      <span>{stripHtml(selectedParameterName)}</span>
                    </ReadOnlyField>

                    <ReadOnlyField label="Metode">
                      <span>{selectedMetodeName}</span>
                    </ReadOnlyField>

                    <ReadOnlyField label="Acuan Metode">
                      <span>{formData.acuan_metode || '-'}</span>
                    </ReadOnlyField>

                    <ReadOnlyField label="Status">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          active={normalizeBool(formData.is_terakreditasi)}
                          activeLabel="Terakreditasi"
                          inactiveLabel="Tidak terakreditasi"
                        />
                        <StatusBadge
                          active={normalizeBool(formData.is_subkontrak)}
                          activeLabel="Subkontrak"
                          inactiveLabel="Regular"
                          activeClass="bg-blue-100 text-blue-700"
                        />
                        <StatusBadge
                          active={normalizeBool(formData.is_active ?? true)}
                          activeLabel="Aktif"
                          inactiveLabel="Nonaktif"
                        />
                      </div>
                    </ReadOnlyField>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900">Tarif</h3>
                    <p className="mt-1 text-xs text-gray-500">Tarif dan status aktif dapat diedit. Metode nonaktif tidak muncul untuk penetapan metode baru oleh Kasi.</p>
                  </div>

                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarif <span className="text-red-500">*</span>
                    </label>

                    <CurrencyInput
                      name="tarif"
                      value={formData.tarif || ''}
                      onChange={onChange}
                      className="bg-white"
                      required
                    />
                  </div>

                  <label className="mt-4 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active ?? true}
                      onChange={onChange}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Metode aktif untuk penetapan permohonan baru
                    </span>
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Data Parameter</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Pilih parameter lama atau buat parameter baru.
                      </p>
                    </div>

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
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                        required
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
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                        required
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

                      <CurrencyInput
                        name="tarif"
                        value={formData.tarif || ''}
                        onChange={onChange}
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

                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active ?? true}
                      onChange={onChange}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Aktif untuk penetapan permohonan baru
                    </span>
                  </label>
                </div>
              </>
            )}
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
              {isEditMode ? 'Simpan Perubahan' : 'Tambah Parameter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
