import {
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';

export function SubkontrakDetailModal({
  selectedGroup,
  onClose,
  formatDateOnly,
  getMonitorStatusClass,
  getSubkontrakRowKey,
  subkontrakDrafts,
  onChangeDraft,
  normalizeResultExpressionInput,
  getTodayInputValue,
  onSave,
  saving,
}) {
  if (!selectedGroup) return null;

  const isPersistedComplete = (selectedGroup.rows || []).every((row) =>
    String(row.hasil || row.hasil_pengujian || '').trim()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">Detail Hasil Subkontrak</h3>
            <p className="text-sm text-emerald-100">
              Input hasil per nomor sampel. Data disimpan ke LKA dan LKA hasil.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white transition-all hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Parameter
              </p>
              <p className="text-sm font-semibold text-gray-900">{selectedGroup.parameter}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Metode
              </p>
              <p className="text-sm font-semibold text-gray-900">{selectedGroup.metode}</p>
              <p className="mt-1 text-xs text-gray-500">{selectedGroup.acuanMetode}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getMonitorStatusClass(selectedGroup.statusRingkas)}`}
              >
                {selectedGroup.statusRingkas}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    No Sampel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Pelanggan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Jenis Sampel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Hasil
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Tanggal Hasil
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {selectedGroup.rows.map((row) => {
                  const key = getSubkontrakRowKey(row);
                  const draft = subkontrakDrafts[key] || {};
                  const persistedHasil = String(row.hasil || row.hasil_pengujian || '').trim();
                  const persistedTanggalHasil =
                    row.tanggal_terima_hasil ||
                    row.tanggalTerimaHasil ||
                    row.tanggal_hasil ||
                    row.tanggalHasil ||
                    null;
                  const isPersisted = Boolean(persistedHasil);

                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {row.no_sampel || row.noSampel}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.pelanggan || '-'}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.jenis_sampel || row.jenisSampel || '-'}
                      </td>

                      <td className="px-4 py-3">
                        {isPersisted ? (
                          <span className="block min-w-[180px] text-sm text-gray-700">
                            {persistedHasil || '-'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={draft.hasil || ''}
                            onChange={(e) =>
                              onChangeDraft(
                                row,
                                'hasil',
                                normalizeResultExpressionInput(e.target.value)
                              )
                            }
                            placeholder="Contoh: 7,5 atau <0,01"
                            className="min-w-[180px] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                          />
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isPersisted ? (
                          <span className="block text-sm text-gray-700">
                            {persistedTanggalHasil
                              ? formatDateOnly?.(persistedTanggalHasil) || persistedTanggalHasil
                              : '-'}
                          </span>
                        ) : (
                          <input
                            type="date"
                            value={draft.tanggal_terima_hasil || getTodayInputValue()}
                            min={getTodayInputValue()}
                            onChange={(e) =>
                              onChangeDraft(row, 'tanggal_terima_hasil', e.target.value)
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {!isPersistedComplete && (
          <div className="flex shrink-0 items-center justify-end border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              Simpan Hasil Subkontrak
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AssignAnalystModal({
  show,
  onClose,
  analysts,
  selectedAnalyst,
  onChangeSelectedAnalyst,
  catatanPenugasan,
  onChangeCatatanPenugasan,
  assignmentDrafts,
  buildAvailableGroupOptions,
  pendingGroupMap,
  handleChangeDraftGroup,
  handleChangeDraftNote,
  getTodayInputValue,
  getMaxDeadlineForDraft,
  handleChangeDraftDeadline,
  deadlineErrorByDraft,
  removeDraftRow,
  handleToggleSample,
  isInsituItem,
  formatDateOnly,
  addDraftRow,
  canAddMoreDrafts,
  onSave,
  saving,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-white">Buat Penugasan Analis</h3>
            <p className="text-sm text-emerald-100">
              Pilih parameter-metode, lalu tentukan no sampel yang akan ditugaskan.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Pilih Analis <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedAnalyst}
                  onChange={(e) => onChangeSelectedAnalyst(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Pilih analis</option>
                  {analysts.map((analyst) => (
                    <option key={analyst.id} value={analyst.id}>
                      {analyst.nama}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Catatan Penugasan
              </label>
              <input
                type="text"
                value={catatanPenugasan}
                onChange={(e) => onChangeCatatanPenugasan(e.target.value)}
                placeholder="Opsional"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {assignmentDrafts.map((draft) => {
              const options = buildAvailableGroupOptions(draft);
              const selectedGroup = pendingGroupMap.get(draft.selectedGroupKey);
              const selectedGroupSamples = selectedGroup?.sampleOptions || [];

              return (
                <div
                  key={draft.key}
                  className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50/50 p-4 transition-colors hover:border-emerald-300"
                >
                  <div className="flex min-w-[1080px] flex-nowrap items-end gap-3">
                    <div className="min-w-[540px] flex-[2.2]">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Parameter Metode <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={draft.selectedGroupKey}
                          onChange={(e) => handleChangeDraftGroup(draft.key, e.target.value)}
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Pilih parameter metode</option>
                          {options.map((group) => (
                            <option key={group.groupKey} value={group.groupKey}>
                              {group.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    <div className="min-w-[260px] flex-1">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Catatan
                      </label>
                      <input
                        type="text"
                        value={draft.catatanDetail || ''}
                        onChange={(e) => handleChangeDraftNote(draft.key, e.target.value)}
                        placeholder="Opsional"
                        maxLength={1000}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="w-[190px] shrink-0">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Deadline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={draft.deadline}
                        min={getTodayInputValue()}
                        max={getMaxDeadlineForDraft(draft)}
                        onChange={(e) => handleChangeDraftDeadline(draft.key, e.target.value)}
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-transparent focus:ring-2 ${
                          deadlineErrorByDraft[draft.key]
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-emerald-500'
                        }`}
                      />

                      {deadlineErrorByDraft[draft.key] && (
                        <p className="mt-1 text-xs text-red-600">
                          {deadlineErrorByDraft[draft.key]}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-end justify-end gap-2">
                      {assignmentDrafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDraftRow(draft.key)}
                          className="rounded-lg p-2 text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedGroup && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Parameter Metode Terpilih</p>
                          <h4 className="mt-1 font-bold text-gray-900">{selectedGroup.label}</h4>
                          <p className="mt-1 text-sm text-gray-600">
                            {selectedGroup.totalAvailableSamples} sampel tersedia
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-sm font-medium text-gray-700">
                          Pilih Sampel <span className="text-red-500">*</span>
                        </p>

                        <div className="space-y-2">
                          {selectedGroupSamples.map((sample) => {
                            const selected = draft.selectedSampleRefs.includes(sample.ref);

                            return (
                              <label
                                key={sample.ref}
                                className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 transition-all ${
                                  selected
                                    ? 'border-emerald-600 bg-emerald-50'
                                    : 'border-gray-300 bg-white hover:border-emerald-400'
                                }`}
                              >
                                <div className="flex min-w-0 items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => handleToggleSample(draft.key, sample.ref)}
                                    className="mt-1 h-4 w-4 text-emerald-600"
                                  />

                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {sample.noSampel}
                                    </p>

                                    {isInsituItem(sample) && (
                                      <p className="text-xs text-gray-500">Insitu</p>
                                    )}

                                    <p className="text-xs text-gray-500">
                                      {sample.pelanggan || '-'} • {sample.jenisSampel || '-'}
                                    </p>

                                    <p className="text-xs text-gray-500">
                                      {sample.regBm || '-'}
                                    </p>

                                    {sample.receiptDate && (
                                      <p className="text-xs text-gray-500">
                                        Diterima: {formatDateOnly(sample.receiptDate)} • Max deadline: {formatDateOnly(sample.maxDeadlineByReceipt)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addDraftRow}
              disabled={!canAddMoreDrafts}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-300 py-2.5 text-sm font-medium text-emerald-600 transition-all hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Tambah Parameter Metode
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border-2 border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition-all hover:bg-gray-100 disabled:opacity-50"
          >
            Batal
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Simpan Penugasan
          </button>
        </div>
      </div>
    </div>
  );
}
