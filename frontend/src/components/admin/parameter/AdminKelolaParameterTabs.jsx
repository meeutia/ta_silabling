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

function ActiveStatusBadge({ isActive }) {
  return normalizeBool(isActive) ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <XCircle className="w-3.5 h-3.5" />
      Nonaktif
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

function ActionButtons({ onEdit, onDelete, deleteTitle = 'Hapus' }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
        title="Edit"
      >
        <Edit2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all"
        title={deleteTitle}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function StatusToggleButton({ item, onToggle }) {
  const isActive = normalizeBool(item?.is_active);

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
          isActive
            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }`}
        title={isActive ? 'Nonaktifkan acuan' : 'Aktifkan kembali acuan'}
      >
        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
      </button>
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

function ParameterMetodeTable({ rows, onEdit, onDelete }) {
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
                <ActionButtons onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <EmptyRow colSpan="8">Tidak ada parameter & metode ditemukan</EmptyRow>
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
                    Acuan dikunci, hanya status yang bisa diubah
                  </p>
                )}
              </td>

              <td className="px-4 py-3">
                <ActiveStatusBadge isActive={item.is_active} />
              </td>

              <td className="px-4 py-3">
                {item.is_locked || item.can_delete === false ? (
                  <StatusToggleButton item={item} onToggle={() => onToggleStatus('regulasi', item)} />
                ) : (
                  <ActionButtons
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item)}
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

function PaketTable({ rows, onEdit, onDelete, onManage, onToggleStatus }) {
  return (
    <TableShell>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
          <tr>
            <th className="px-4 py-3">Regulasi</th>
            <th className="px-4 py-3">Jenis Sampel</th>
            <th className="px-4 py-3">Nama Paket</th>
            <th className="px-4 py-3">Klasifikasi</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Parameter</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {rows.map((item) => (
            <tr key={item.id_pkt_bm} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-700 min-w-[260px]">
                <p className="font-medium text-gray-900">{item.reg_bm?.instansi || '-'}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{item.reg_bm?.ref_reg || '-'}</p>
              </td>

              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                {item.jenis_sampel?.jenis_sampel || '-'}
              </td>

              <td className="px-4 py-3 text-gray-900 font-medium min-w-[200px]">
                <p>{item.nama_pkt || '-'}</p>
                {item.is_locked && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                    <Lock className="h-3.5 w-3.5" />
                    Acuan dikunci, hanya status yang bisa diubah
                  </p>
                )}
              </td>

              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {item.klasifikasi || '-'}
              </td>

              <td className="px-4 py-3">
                <ActiveStatusBadge isActive={item.is_active} />
              </td>

              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => onManage(item)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Kelola
                </button>
              </td>

              <td className="px-4 py-3">
                {item.is_locked || item.can_delete === false ? (
                  <StatusToggleButton item={item} onToggle={() => onToggleStatus('paket', item)} />
                ) : (
                  <ActionButtons
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item)}
                  />
                )}
              </td>
            </tr>
          ))}

          {rows.length === 0 && <EmptyRow colSpan="7">Tidak ada paket baku mutu ditemukan</EmptyRow>}
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
      <PaketTable
        rows={rowsByTab.paket}
        onEdit={(item) => onOpenModal('edit_paket', item)}
        onDelete={(item) => onDeleteConfirm('paket', item)}
        onManage={onManagePaket}
        onToggleStatus={onToggleStatus}
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
            {activeTab === 'parameter_metode' && (
              <Toolbar
                searchQuery={searchQuery}
                searchPlaceholder={searchPlaceholder}
                filterStatus={filterStatus}
                filterOptions={filterOptions}
                onSearchChange={onSearchChange}
                onFilterChange={onFilterChange}
              />
            )}
            <TableHeader count={rowsCount} addButtonLabel={addButtonLabel} onAdd={onAdd} />
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
  );
}
