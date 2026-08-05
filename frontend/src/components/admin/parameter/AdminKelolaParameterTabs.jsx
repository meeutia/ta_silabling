import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Truck,
  Lock,
} from 'lucide-react';
import { SafeHtml } from './SafeHtml';
import { formatCurrency, normalizeBool } from './parameterFormatters';

const ADMIN_TOGGLE_SWITCH_CSS = `
.cl-toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cl-switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  cursor: pointer;
}

.cl-switch > input {
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  z-index: -1;
  position: absolute;
  right: 6px;
  top: -8px;
  display: block;
  margin: 0;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  background-color: rgb(0, 0, 0, 0.38);
  outline: none;
  opacity: 0;
  transform: scale(1);
  pointer-events: none;
  transition: opacity 0.3s 0.1s, transform 0.2s 0.1s;
}

.cl-switch > span::before {
  content: "";
  float: right;
  display: inline-block;
  margin: 5px 0 5px 10px;
  border-radius: 7px;
  width: 36px;
  height: 14px;
  background-color: rgb(0, 0, 0, 0.38);
  vertical-align: top;
  transition: background-color 0.2s, opacity 0.2s;
}

.cl-switch > span::after {
  content: "";
  position: absolute;
  top: 2px;
  right: 16px;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  background-color: #fff;
  box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
  transition: background-color 0.2s, transform 0.2s;
}

.cl-switch > input:checked {
  right: -10px;
  background-color: #85b8b7;
}

.cl-switch > input:checked + span::before {
  background-color: #85b8b7;
}

.cl-switch > input:checked + span::after {
  background-color: #018786;
  transform: translateX(16px);
}

.cl-switch:hover > input {
  opacity: 0.04;
}

.cl-switch > input:focus {
  opacity: 0.12;
}

.cl-switch:hover > input:focus {
  opacity: 0.16;
}

.cl-switch > input:active {
  opacity: 1;
  transform: scale(0);
  transition: transform 0s, opacity 0s;
}

.cl-switch > input:active + span::before {
  background-color: #8f8f8f;
}

.cl-switch > input:checked:active + span::before {
  background-color: #85b8b7;
}

.cl-switch > input:disabled {
  opacity: 0;
}

.cl-switch > input:disabled + span::before {
  background-color: #ddd;
}

.cl-switch > input:checked:disabled + span::before {
  background-color: #bfdbda;
}

.cl-switch > input:checked:disabled + span::after {
  background-color: #61b5b4;
}
`;


function CategoryBadge({ category }) {
  const normalized = String(category || '-').toUpperCase();
  const colorMap = {
    FISIKA: 'bg-blue-100 text-blue-700',
    KIMIA: 'bg-purple-100 text-purple-700',
    MIKROBIOLOGI: 'bg-orange-100 text-orange-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
        colorMap[normalized] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {category || '-'}
    </span>
  );
}

function AkreditasiBadge({ value }) {
  return normalizeBool(value) ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Terakreditasi
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      Tidak
    </span>
  );
}

function SubkontrakBadge({ value }) {
  return normalizeBool(value) ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <Truck className="w-3.5 h-3.5" />
      Subkontrak
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <XCircle className="w-3.5 h-3.5" />
      Regular
    </span>
  );
}

function ActionButtons({ onEdit, onDelete, deleteTitle = 'Hapus', showEdit = true, showDelete = true }) {
  if (!showEdit && !showDelete) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {showEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}

      {showDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all"
          title={deleteTitle}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function StatusToggleButton({ item, onToggle }) {
  const isActive = normalizeBool(item?.is_active);

  return (
    <div className="cl-toggle-switch" title={isActive ? 'Nonaktifkan' : 'Aktifkan'}>
      <label className="cl-switch" aria-label={isActive ? 'Nonaktifkan data' : 'Aktifkan data'}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={onToggle}
        />
        <span />
      </label>
    </div>
  );
}

function Toolbar({
  searchQuery,
  searchPlaceholder,
  filterStatus,
  filterOptions,
  onSearchChange,
  onFilterChange,
}) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {filterOptions.length > 0 && (
        <div className="flex justify-end">
          <div className="relative w-36 sm:w-44">
            <select
              value={filterStatus}
              onChange={(event) => onFilterChange(event.target.value)}
              className="w-full appearance-none rounded-lg border border-emerald-500 bg-white py-2 pl-4 pr-8 text-xs font-semibold text-emerald-700 shadow-sm outline-none transition hover:bg-emerald-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
            >
              {filterOptions.map((status) => (
                <option key={status} value={status} className="bg-white text-gray-900">
                  {status}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600">▾</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TableHeader({ count, addButtonLabel, onAdd }) {
  return (
    <div className="flex items-center justify-end gap-4 mb-3">
      <span className="text-sm text-gray-500">
        Menampilkan <span className="font-semibold text-gray-700">{count}</span> data
      </span>

      <button
        type="button"
        onClick={onAdd}
        className="w-fit shrink-0 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium shadow-sm inline-flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {addButtonLabel}
      </button>
    </div>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-gray-500">
        {children}
      </td>
    </tr>
  );
}

function TableShell({ children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function ParameterMetodeTable({ rows, onEdit, onDelete, onToggleStatus }) {
  return (
    <TableShell>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
          <tr>
            <th className="px-4 py-3">Parameter</th>
            <th className="px-4 py-3">Kategori</th>
            <th className="px-4 py-3">Metode</th>
            <th className="px-4 py-3">Acuan</th>
            <th className="px-4 py-3">Tarif</th>
            <th className="px-4 py-3">Akreditasi</th>
            <th className="px-4 py-3">Subkontrak</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.map((item) => (
            <tr key={item.id_metode_parameter} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">
                  <SafeHtml value={item.parameter?.nama_parameter} />
                </p>
                <p className="text-xs text-gray-500">{item.parameter?.id_parameter}</p>
              </td>

              <td className="px-4 py-3">
                <CategoryBadge category={item.parameter?.kategori_parameter || item.parameter?.kategori?.nama_kategori} />
              </td>

              <td className="px-4 py-3 text-gray-700 min-w-[180px]">
                {item.metode?.nama_metode || '-'}
              </td>

              <td className="px-4 py-3 text-gray-600 min-w-[180px]">
                {item.acuan_metode || '-'}
              </td>

              <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                {formatCurrency(item.tarif)}
              </td>

              <td className="px-4 py-3">
                <AkreditasiBadge value={item.is_terakreditasi} />
              </td>

              <td className="px-4 py-3">
                <SubkontrakBadge value={item.is_subkontrak} />
              </td>

              <td className="px-4 py-3">
                <StatusToggleButton item={item} onToggle={() => onToggleStatus('param_metode', item)} />
              </td>

              <td className="px-4 py-3">
                <ActionButtons
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                  showEdit={item.can_edit !== false}
                  showDelete={item.can_delete !== false}
                />
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <EmptyRow colSpan="9">Tidak ada parameter & metode ditemukan</EmptyRow>
          )}
        </tbody>
      </table>
    </TableShell>
  );
}

function RegulasiTable({ rows, onEdit, onDelete, onToggleStatus }) {
  return (
    <TableShell>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
          <tr>
            <th className="px-4 py-3">Instansi</th>
            <th className="px-4 py-3">Referensi Regulasi</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.map((item) => (
            <tr key={item.id_reg_bm} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                  {item.instansi || '-'}
                </span>
              </td>

              <td className="px-4 py-3 text-gray-700 min-w-[360px]">
                <p>{item.ref_reg || '-'}</p>
                {item.is_locked && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                    <Lock className="h-3.5 w-3.5" />
                    Sudah digunakan pada LHU, hanya status yang bisa diubah
                  </p>
                )}
                {!item.is_locked && item.can_delete === false && (
                  <p className="mt-1 text-xs text-gray-500">
                    Acuan sudah punya relasi. Perubahan status dilakukan melalui switch aktif/nonaktif.
                  </p>
                )}
              </td>

              <td className="px-4 py-3">
                <StatusToggleButton item={item} onToggle={() => onToggleStatus('regulasi', item)} />
              </td>

              <td className="px-4 py-3">
                {item.is_locked ? (
                  <span className="block text-right text-xs text-gray-400">-</span>
                ) : (
                  <ActionButtons
                    onEdit={() => onEdit(item)}
                    onDelete={() => {}}
                    showEdit={item.can_edit_master !== false}
                    showDelete={false}
                  />
                )}
              </td>
            </tr>
          ))}

          {rows.length === 0 && <EmptyRow colSpan="4">Tidak ada regulasi ditemukan</EmptyRow>}
        </tbody>
      </table>
    </TableShell>
  );
}


function PaketGroupTable({ rows, onManage, onToggleStatus }) {
  return (
    <TableShell>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
          <tr>
            <th className="px-4 py-3">Regulasi</th>
            <th className="px-4 py-3">Jenis Sampel</th>
            <th className="px-4 py-3">Klasifikasi</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Matrix Baku Mutu</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.map((item) => (
            <tr key={item.group_key} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-700 min-w-[320px]">
                <p className="font-medium text-gray-900">{item.reg_bm?.instansi || '-'}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{item.reg_bm?.ref_reg || item.id_reg_bm || '-'}</p>
              </td>

              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                {item.jenis_sampel_label || '-'}
              </td>

              <td className="px-4 py-3 min-w-[280px]">
                <div className="flex flex-wrap gap-1.5">
                  {(item.paket_items || []).map((paket) => (
                    <span
                      key={paket.id_pkt_bm}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {paket.klasifikasi || paket.id_pkt_bm}
                      {paket.is_locked && <Lock className="h-3 w-3 text-amber-600" />}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {item.total_klasifikasi || 0} klasifikasi dalam satu kelompok baku mutu
                </p>
              </td>

              <td className="px-4 py-3">
                <StatusToggleButton item={item} onToggle={() => onToggleStatus('paket_group', item)} />
                {item.is_locked && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                    <Lock className="h-3.5 w-3.5" />
                    Ada klasifikasi terkunci
                  </p>
                )}
              </td>

              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onManage(item)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Kelola Matrix
                </button>
              </td>
            </tr>
          ))}

          {rows.length === 0 && <EmptyRow colSpan="5">Tidak ada kelompok baku mutu ditemukan</EmptyRow>}
        </tbody>
      </table>
    </TableShell>
  );
}


function TarifPengambilanTable({ rows, onEdit, onDelete }) {
  return (
    <TableShell>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
          <tr>
            <th className="px-4 py-3">Keterangan Jarak / Area</th>
            <th className="px-4 py-3">Tarif Pengambilan</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.map((item) => (
            <tr key={item.id_tarif_pengambilan} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{item.keterangan_jarak || '-'}</p>
              </td>

              <td className="px-4 py-3 text-gray-900 font-medium">
                {formatCurrency(item.tarif)}
              </td>

              <td className="px-4 py-3">
                <ActionButtons onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
              </td>
            </tr>
          ))}

          {rows.length === 0 && <EmptyRow colSpan="4">Tidak ada data tarif pengambilan</EmptyRow>}
        </tbody>
      </table>
    </TableShell>
  );
}

function TabBody({
  activeTab,
  rowsByTab,
  onOpenModal,
  onDeleteConfirm,
  onManagePaket,
  onToggleStatus,
}) {
  if (activeTab === 'parameter_metode') {
    return (
      <ParameterMetodeTable
        rows={rowsByTab.parameterMetode}
        onEdit={(item) => onOpenModal('edit_param_metode', item)}
        onDelete={(item) => onDeleteConfirm('param_metode', item)}
        onToggleStatus={onToggleStatus}
      />
    );
  }

  if (activeTab === 'regulasi') {
    return (
      <RegulasiTable
        rows={rowsByTab.regulasi}
        onEdit={(item) => onOpenModal('edit_regulasi', item)}
        onDelete={(item) => onDeleteConfirm('regulasi', item)}
        onToggleStatus={onToggleStatus}
      />
    );
  }

  if (activeTab === 'paket_baku_mutu') {
    return (
      <PaketGroupTable
        rows={rowsByTab.paket}
        onManage={onManagePaket}
        onToggleStatus={onToggleStatus}
      />
    );
  }

  if (activeTab === 'subcontract_request') {
    return (
      <SubcontractRequestTable
        rows={rowsByTab.subcontractRequests}
        onReview={(item) => onOpenModal('review_subcontract', item)}
      />
    );
  }

  return (
    <TarifPengambilanTable
      rows={rowsByTab.tarifPengambilan}
      onEdit={(item) => onOpenModal('edit_tarif', item)}
      onDelete={(item) => onDeleteConfirm('tarif', item)}
    />
  );
}

function SubcontractRequestTable({ rows, onReview }) {
  return (
    <TableShell>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
          <tr>
            <th className="px-4 py-3">No. Registrasi</th>
            <th className="px-4 py-3">Parameter Uji</th>
            <th className="px-4 py-3">Waktu Permintaan</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((item) => (
            <tr key={item.id_permintaan_subkontrak} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">
                {item.id_registrasi || item.fppl?.id_registrasi || '-'}
              </td>
              <td className="px-4 py-3 text-gray-700">
                {item.fppl_parameter_metode?.parameter?.nama_parameter || item.parameter?.nama_parameter || item.parameter_name || '-'}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(item.diajukan_pada || item.created_at).toLocaleString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  item.status_permintaan === 'MENUNGGU_ADMIN'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : item.status_permintaan === 'SELESAI'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : item.status_permintaan === 'DITOLAK'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-gray-50 text-gray-800 border-gray-200'
                }`}>
                  {item.status_permintaan === 'MENUNGGU_ADMIN' ? 'Menunggu Admin'
                    : item.status_permintaan === 'SELESAI' ? 'Selesai'
                    : item.status_permintaan === 'DITOLAK' ? 'Ditolak'
                    : item.status_permintaan}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {item.status_permintaan === 'MENUNGGU_ADMIN' ? (
                  <button
                    onClick={() => onReview(item)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    Proses
                  </button>
                ) : (
                  <button
                    onClick={() => onReview(item)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    Detail
                  </button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <EmptyRow colSpan="6">Tidak ada data permintaan subkontrak</EmptyRow>}
        </tbody>
      </table>
    </TableShell>
  );
}

export function AdminKelolaParameterTabs({
  activeTab,
  tabs,
  isLoading,
  searchQuery,
  searchPlaceholder,
  filterStatus,
  filterOptions,
  rowsCount,
  addButtonLabel,
  rowsByTab,
  onChangeTab,
  onSearchChange,
  onFilterChange,
  onAdd,
  onOpenModal,
  onDeleteConfirm,
  onManagePaket,
  onToggleStatus,
}) {
  return (
    <>
      <style>{ADMIN_TOGGLE_SWITCH_CSS}</style>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChangeTab(tab.key)}
                className={`px-6 py-4 font-medium transition-all relative whitespace-nowrap ${
                  isActive
                    ? 'text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm">Memuat data...</p>
            </div>
          </div>
        ) : (
          <>
            {(activeTab === 'parameter_metode' || activeTab === 'subcontract_request') && (
              <Toolbar
                searchQuery={searchQuery}
                searchPlaceholder={searchPlaceholder}
                filterStatus={filterStatus}
                filterOptions={filterOptions}
                onSearchChange={onSearchChange}
                onFilterChange={onFilterChange}
              />
            )}
            {activeTab !== 'subcontract_request' && (
              <TableHeader count={rowsCount} addButtonLabel={addButtonLabel} onAdd={onAdd} />
            )}
            <TabBody
              activeTab={activeTab}
              rowsByTab={rowsByTab}
              onOpenModal={onOpenModal}
              onDeleteConfirm={onDeleteConfirm}
              onManagePaket={onManagePaket}
              onToggleStatus={onToggleStatus}
            />
          </>
        )}
      </div>
      </div>
    </>
  );
}
