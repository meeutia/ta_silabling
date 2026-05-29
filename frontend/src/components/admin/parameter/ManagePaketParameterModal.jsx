import React from 'react';
import { Edit2, Loader2, Lock, Plus, Trash2, X } from 'lucide-react';
import { stripHtml } from './parameterFormatters';
import { SafeHtml } from './SafeHtml';
import { ScientificInput, ScientificTextarea } from './AdminKelolaParameterFormControls';

export function ManagePaketParameterModal({
  selectedItem,
  paketParameters,
  parametersOption,
  isModalLoading,
  paketParamForm,
  editingPaketParam,
  onClose,
  onAddChange,
  onAddSubmit,
  onStartEdit,
  onCancelEdit,
  onEditChange,
  onUpdateSubmit,
  onDelete,
}) {
  const isLocked = Boolean(selectedItem?.is_locked);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Kelola Parameter Paket</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedItem?.nama_pkt || '-'}
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
          {isLocked && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Parameter paket dikunci</p>
                  <p className="mt-1">
                    Paket ini sudah dipakai pada LHU. Parameter baku mutu tidak bisa ditambah, diedit, atau dihapus.
                    Nonaktifkan paket lama lalu buat paket/versi baru jika standar berubah.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLocked && editingPaketParam ? (
            <form
              onSubmit={onUpdateSubmit}
              className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Edit Parameter Baku Mutu</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {editingPaketParam.parameter?.nama_parameter || '-'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Batal Edit
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
                <ScientificInput
                  label="Nilai BM"
                  name="nilai_bm"
                  value={editingPaketParam.nilai_bm || ''}
                  onChange={onEditChange}
                  placeholder="Contoh: ≤ 5 atau 6–9"
                  required
                />

                <ScientificTextarea
                  label="Satuan"
                  value={editingPaketParam.satuan_bm || ''}
                  onChange={(value) =>
                    onEditChange({
                      target: {
                        name: 'satuan_bm',
                        value,
                      },
                    })
                  }
                  placeholder="Contoh: mg/L atau μg/L"
                />

                <ScientificTextarea
                  label="Keterangan"
                  value={editingPaketParam.ket_bm || ''}
                  onChange={(value) =>
                    onEditChange({
                      target: {
                        name: 'ket_bm',
                        value,
                      },
                    })
                  }
                  placeholder="Opsional"
                />

                <div className="pt-7">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-medium shadow-sm shrink-0"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          ) : !isLocked ? (
            <form
              onSubmit={onAddSubmit}
              className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6"
            >
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900">Tambah Parameter ke Paket</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Pilih parameter lalu masukkan nilai baku mutunya.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-3 items-start">
                <div>
                  <label className="block text-sm font-medium text-emerald-900 mb-2">
                    Parameter <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="id_parameter"
                    value={paketParamForm.id_parameter || ''}
                    onChange={onAddChange}
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
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

                <ScientificInput
                  label="Nilai BM"
                  name="nilai_bm"
                  value={paketParamForm.nilai_bm || ''}
                  onChange={onAddChange}
                  placeholder="Contoh: ≤ 5"
                  required
                />

                <ScientificTextarea
                  label="Satuan"
                  value={paketParamForm.satuan_bm || ''}
                  onChange={(value) =>
                    onAddChange({
                      target: {
                        name: 'satuan_bm',
                        value,
                      },
                    })
                  }
                  placeholder="Contoh: mg/L"
                />

                <ScientificTextarea
                  label="Keterangan"
                  value={paketParamForm.ket_bm || ''}
                  onChange={(value) =>
                    onAddChange({
                      target: {
                        name: 'ket_bm',
                        value,
                      },
                    })
                  }
                  placeholder="Opsional"
                />

                <div className="pt-7">
                  <button
                    type="submit"
                    className="w-fit shrink-0 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-sm inline-flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tambahkan
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Parameter</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Nilai BM</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {isModalLoading ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                          Memuat parameter paket...
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {paketParameters.map((item) => (
                        <tr key={item.id_pkt_bm_param} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              <SafeHtml value={item.parameter?.nama_parameter} />
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.parameter?.id_parameter || '-'}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {item.parameter?.kategori_parameter || item.parameter?.kategori?.nama_kategori || '-'}
                          </td>

                          <td className="px-4 py-3 text-gray-900 font-medium">
                            {item.nilai_bm || '-'}
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            <div className="space-y-1">
                              {item.pkt_bm_pms && item.pkt_bm_pms.length > 0 ? (
                                item.pkt_bm_pms.map((pm) => (
                                  <div key={pm.id_pkt_bm_pm} className="flex items-center gap-1.5">
                                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                      {pm.parameter_metode?.metode?.nama_metode || '-'}
                                    </span>
                                    {pm.is_default === 1 && (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold uppercase">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span className="text-gray-400 italic text-xs">Belum ada metode</span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            <SafeHtml value={item.satuan_bm} />
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            <SafeHtml value={item.ket_bm} />
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => !isLocked && onStartEdit(item)}
                                disabled={isLocked}
                                className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                                title={isLocked ? 'Paket sudah dipakai LHU' : 'Edit'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => !isLocked && onDelete(item)}
                                disabled={isLocked}
                                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                                title={isLocked ? 'Paket sudah dipakai LHU' : 'Hapus'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {paketParameters.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                            Belum ada parameter dalam paket ini
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
