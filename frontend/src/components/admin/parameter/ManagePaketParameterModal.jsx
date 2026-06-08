import { useMemo, useState } from 'react';
import { ArrowLeft, Edit2, Loader2, Lock, Plus, Trash2, X } from 'lucide-react';
import { stripHtml } from './parameterFormatters';
import { SafeHtml } from './SafeHtml';
import { ScientificTextarea } from './AdminKelolaParameterFormControls';

function getNilaiValue(formValue, idPktBm) {
  return formValue?.nilai_by_paket?.[idPktBm] ?? '';
}

function MatrixValueInput({ paket, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {paket.klasifikasi || paket.id_pkt_bm}
      </label>
      <input
        type="text"
        name={`nilai_by_paket.${paket.id_pkt_bm}`}
        value={value || ''}
        onChange={onChange}
        placeholder="Contoh: 3 atau 6–9"
        maxLength={30}
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
      />
      <p className="mt-1 text-xs text-gray-400">{paket.id_pkt_bm}</p>
    </div>
  );
}

function PaketParameterFormDialog({
  mode,
  selectedItem,
  availableParametersOption,
  paketParamForm,
  editingPaketParam,
  onClose,
  onAddChange,
  onAddSubmit,
  onEditChange,
  onUpdateSubmit,
}) {
  const isEdit = mode === 'edit';
  const formValue = isEdit ? editingPaketParam : paketParamForm;
  const paketItems = selectedItem?.paket_items || [];

  if (!mode) return null;

  const handleSubmit = async (event) => {
    const success = isEdit ? await onUpdateSubmit(event) : await onAddSubmit(event);
    if (success !== false) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit Baris Matrix Baku Mutu' : 'Tambah Baris Matrix Baku Mutu'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Satuan dan keterangan berlaku pada parameter dalam kelompok ini. Nilai baku mutu diisi per klasifikasi.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {!isEdit ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Parameter <span className="text-red-500">*</span>
              </label>
              <select
                name="id_parameter"
                value={paketParamForm.id_parameter || ''}
                onChange={onAddChange}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Pilih Parameter</option>
                {availableParametersOption.map((parameter) => (
                  <option key={parameter.id_parameter} value={parameter.id_parameter}>
                    {stripHtml(parameter.nama_parameter)} ({parameter.kategori_parameter || parameter.kategori?.nama_kategori || '-'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Parameter</p>
              <p className="mt-1 font-medium text-gray-900">
                <SafeHtml value={editingPaketParam?.parameter?.nama_parameter || editingPaketParam?.nama_parameter} />
              </p>
              <p className="text-xs text-gray-500">
                {editingPaketParam?.parameter?.id_parameter || editingPaketParam?.id_parameter || '-'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ScientificTextarea
              label="Satuan BM"
              value={formValue?.satuan_bm || ''}
              onChange={(value) => {
                const event = { target: { name: 'satuan_bm', value } };
                return isEdit ? onEditChange(event) : onAddChange(event);
              }}
              placeholder="Contoh: mg/L, °C, MPN/100 mL, atau -"
              maxLength={20}
              rows={2}
            />

            <ScientificTextarea
              label="Keterangan"
              value={formValue?.ket_bm || ''}
              onChange={(value) => {
                const event = { target: { name: 'ket_bm', value } };
                return isEdit ? onEditChange(event) : onAddChange(event);
              }}
              placeholder="Opsional"
              maxLength={100}
              rows={2}
            />
          </div>

          <div>
            <div className="mb-3">
              <h4 className="font-semibold text-gray-900">Nilai Baku Mutu per Klasifikasi</h4>
              <p className="text-sm text-gray-500">Kosongkan klasifikasi yang memang tidak memiliki nilai untuk parameter ini.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paketItems.map((paket) => (
                <MatrixValueInput
                  key={paket.id_pkt_bm}
                  paket={paket}
                  value={getNilaiValue(formValue, paket.id_pkt_bm)}
                  onChange={isEdit ? onEditChange : onAddChange}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            {isEdit ? 'Simpan Matrix' : 'Tambahkan ke Matrix'}
          </button>
        </div>
      </form>
    </div>
  );
}

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
  const [dialogMode, setDialogMode] = useState(null);
  const isLocked = Boolean(selectedItem?.is_locked);
  const paketItems = selectedItem?.paket_items || [];

  const availableParametersOption = useMemo(() => {
    const usedParameterIds = new Set((paketParameters || []).map((item) => item.id_parameter));
    return (parametersOption || []).filter((parameter) => !usedParameterIds.has(parameter.id_parameter));
  }, [paketParameters, parametersOption]);

  if (!selectedItem) return null;

  const closeDialog = () => {
    setDialogMode(null);
    onCancelEdit();
  };

  const openAddDialog = () => {
    onCancelEdit();
    setDialogMode('add');
  };

  const openEditDialog = (item) => {
    onStartEdit(item);
    setDialogMode('edit');
  };

  const colSpan = 4 + paketItems.length + (isLocked ? 0 : 1);

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Kelompok
      </button>

      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-gray-900">Kelola Matrix Baku Mutu</h2>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    <Lock className="h-3.5 w-3.5" />
                    Terkunci
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Tampilan ini mengikuti konsep matrix: parameter, satuan, dan keterangan disimpan sebagai baris; nilai baku mutu diisi per klasifikasi.
              </p>

              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Regulasi</p>
                    <p className="mt-1 font-medium text-gray-900">{selectedItem?.reg_bm?.instansi || '-'}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{selectedItem?.reg_bm?.ref_reg || selectedItem?.id_reg_bm || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Jenis Sampel</p>
                    <p className="mt-1 font-medium text-gray-900">{selectedItem?.jenis_sampel_label || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Klasifikasi</p>
                    <p className="mt-1 font-medium text-gray-900">{paketItems.length} klasifikasi</p>
                    <p className="mt-1 text-xs text-gray-500">{paketItems.map((item) => item.klasifikasi).filter(Boolean).join(', ') || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {!isLocked && (
              <button
                type="button"
                onClick={openAddDialog}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Tambah Parameter
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {isLocked && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Matrix baku mutu dikunci</p>
                  <p className="mt-1">
                    Salah satu klasifikasi dalam kelompok ini sudah dipakai pada LHU. Parameter, satuan, keterangan, dan nilai baku mutu tidak bisa diubah.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Daftar Parameter Matrix</h3>
              <p className="text-sm text-gray-500">{paketParameters.length} parameter dalam kelompok ini</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 font-medium text-gray-600">
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[220px] bg-gray-50 px-4 py-3">Parameter</th>
                    <th className="min-w-[140px] px-4 py-3">Kategori</th>
                    <th className="min-w-[120px] px-4 py-3">Satuan BM</th>
                    <th className="min-w-[180px] px-4 py-3">Keterangan</th>
                    {paketItems.map((paket) => (
                      <th key={paket.id_pkt_bm} className="min-w-[140px] px-4 py-3 text-center">
                        {paket.klasifikasi || paket.id_pkt_bm}
                      </th>
                    ))}
                    {!isLocked && <th className="min-w-[90px] px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {isModalLoading ? (
                    <tr>
                      <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                          Memuat matrix baku mutu...
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {paketParameters.map((item) => (
                        <tr key={`${selectedItem.group_key}-${item.id_parameter}`} className="transition-colors hover:bg-gray-50">
                          <td className="sticky left-0 z-10 bg-white px-4 py-3 hover:bg-gray-50">
                            <p className="font-medium text-gray-900">
                              <SafeHtml value={item.parameter?.nama_parameter || item.nama_parameter} />
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.parameter?.id_parameter || item.id_parameter || '-'}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {item.kategori_parameter || item.parameter?.kategori_parameter || item.parameter?.kategori?.nama_kategori || '-'}
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            <SafeHtml value={item.satuan_bm || '-'} />
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            <SafeHtml value={item.ket_bm || '-'} />
                          </td>

                          {paketItems.map((paket) => (
                            <td key={paket.id_pkt_bm} className="px-4 py-3 text-center font-semibold text-gray-900">
                              <SafeHtml value={item.nilai_by_paket?.[paket.id_pkt_bm] || '-'} />
                            </td>
                          ))}

                          {!isLocked && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditDialog(item)}
                                  className="rounded p-1.5 text-gray-600 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDelete({ ...item, paket_items: paketItems })}
                                  className="rounded p-1.5 text-gray-600 transition-all hover:bg-red-50 hover:text-red-600"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}

                      {paketParameters.length === 0 && (
                        <tr>
                          <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-500">
                            Belum ada parameter dalam kelompok baku mutu ini
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
      </section>

      <PaketParameterFormDialog
        mode={dialogMode}
        selectedItem={selectedItem}
        availableParametersOption={availableParametersOption}
        paketParamForm={paketParamForm}
        editingPaketParam={editingPaketParam}
        onClose={closeDialog}
        onAddChange={onAddChange}
        onAddSubmit={onAddSubmit}
        onEditChange={onEditChange}
        onUpdateSubmit={onUpdateSubmit}
      />
    </>
  );
}
