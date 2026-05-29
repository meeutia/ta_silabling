import { ChevronDown, FlaskConical, Plus, Trash2 } from 'lucide-react';
import { MultiSelectDropdown } from './MultiSelectDropdown';

export function RegistrationSampleParameterStep({
  formData,
  waterTypes,
  updateSampleEntry,
  entryStandardOptions,
  entryStandardErrors,
  entryParameterLists,
  entryParameterErrors,
  addSampleEntry,
  removeSampleEntry,
}) {
  return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900">Sampel & Parameter Uji</h2>
              </div>

              <p className="text-gray-600 mb-6 text-sm">
                Pilih jenis sampel, standar baku mutu, parameter uji, dan jumlah sampel untuk setiap entri.
              </p>

              <div className="space-y-3">
                {formData.sampleEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:border-emerald-300 transition-colors"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Jenis Sampel <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={entry.jenisSampel}
                            onChange={(e) => updateSampleEntry(index, 'jenisSampel', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none bg-white cursor-pointer pr-10 text-sm"
                          >
                            <option value="">Pilih jenis sampel</option>
                            {waterTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Standar Baku Mutu <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={entry.idRegBm || ''}
                            onChange={(e) => updateSampleEntry(index, 'idRegBm', e.target.value)}
                            disabled={!entry.jenisSampel}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none bg-white cursor-pointer pr-10 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {entry.jenisSampel ? 'Pilih standar baku mutu' : 'Pilih jenis sampel terlebih dahulu'}
                            </option>
                            {(entryStandardOptions[index] || []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {entryStandardErrors[index] && (
                            <p className="mt-1 text-xs text-red-600">{entryStandardErrors[index]}</p>
                          )}
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Parameter Uji <span className="text-red-500">*</span>
                        </label>
                        <MultiSelectDropdown
                          options={entryParameterLists[index] || []}
                          selected={entry.parameters}
                          onChange={(params) => updateSampleEntry(index, 'parameters', params)}
                          placeholder={
                            !entry.jenisSampel
                              ? 'Pilih jenis sampel terlebih dahulu'
                              : !entry.idRegBm
                                ? 'Pilih standar baku mutu terlebih dahulu'
                                : 'Pilih parameter uji...'
                          }
                        />
                        {entryParameterErrors[index] && (
                          <p className="mt-1 text-xs text-red-600">{entryParameterErrors[index]}</p>
                        )}
                      </div>

                      <div className="flex items-end gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Jumlah
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={entry.jumlahSampel}
                            onChange={(e) => updateSampleEntry(index, 'jumlahSampel', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-center"
                          />
                        </div>

                        {formData.sampleEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSampleEntry(index)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-5 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addSampleEntry}
                  className="w-full py-2.5 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Sampel Lain
                </button>
              </div>
            </div>
  );
}
