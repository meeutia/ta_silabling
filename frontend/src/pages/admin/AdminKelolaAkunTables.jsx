import {
  Building2,
  Eye,
  Loader2,
  Plus,
  Search,
  UserCog,
} from 'lucide-react';
import {
  dash,
  getStatus,
  initials,
  STAFF_ROLES,
  STATUS_OPTIONS,
} from './AdminKelolaAkun.helpers';

function StatusBadge({ status }) {
  const current = status || 'Nonaktif';

  const className =
    current === 'Aktif'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
      {current}
    </span>
  );
}

export function Header({ activeTab, onAddStaff }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Kelola Akun</h1>
          <p className="text-sm text-gray-600">
            Kelola akun petugas laboratorium dan pantau pelanggan yang mendaftar mandiri.
          </p>
        </div>

        {activeTab === 'staff' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onAddStaff}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Tambah Petugas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TabButton({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-4 border-b-2 text-sm font-semibold transition-colors ${active
          ? 'border-emerald-600 text-emerald-700'
          : 'border-transparent text-gray-500 hover:text-gray-800'
        }`}
    >
      {label}
      <span
        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}
      >
        {count}
      </span>
    </button>
  );
}

export function FilterBar({
  activeTab,
  search,
  setSearch,
  staffRole,
  setStaffRole,
  staffStatus,
  setStaffStatus,
  customerStatus,
  setCustomerStatus,
}) {
  return (
    <div className="p-4 md:p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={activeTab === 'staff' ? 'Cari nama, NIK, email, username, atau role...' : 'Cari pelanggan, PIC, email, atau status akun...'}
            className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            {activeTab === 'staff' ? (
              <>
                <FilterSelect value={staffRole} onChange={setStaffRole} options={STAFF_ROLES} widthClass="w-40 sm:w-48" />
                <FilterSelect value={staffStatus} onChange={setStaffStatus} options={STATUS_OPTIONS} widthClass="w-36 sm:w-40" />
              </>
            ) : (
              <FilterSelect value={customerStatus} onChange={setCustomerStatus} options={STATUS_OPTIONS} widthClass="w-36 sm:w-40" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, widthClass }) {
  return (
    <div className={`relative ${widthClass}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-lg border border-emerald-500 bg-white py-2 pl-4 pr-8 text-xs font-semibold text-emerald-700 shadow-sm outline-none transition hover:bg-emerald-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
      >
        <option className="bg-white text-gray-900">Semua</option>
        {options.map((option) => (
          <option key={option} className="bg-white text-gray-900">{option}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600">▾</span>
    </div>
  );
}

export function StaffTable({ rows, loading, onView }) {
  return (
    <TableShell
      loading={loading}
      empty={!rows.length}
      emptyText="Belum ada akun petugas."
    >
      <table className="w-full min-w-[920px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <Th>Petugas</Th>
            <Th>Role</Th>
            <Th>Kontak</Th>
            <Th>Status</Th>
            <Th align="right">Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = getStatus(row);

            return (
              <tr key={row.nik} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name || row.namaPegawai || row.nama_pegawai || row.username} />
                    <div>
                      <p className="font-semibold text-gray-900">{dash(row.name || row.namaPegawai || row.nama_pegawai)}</p>
                      <p className="text-sm text-gray-500">Username: {dash(row.username)}</p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{dash(row.role)}</p>
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{dash(row.email)}</p>
                  <p className="text-sm text-gray-500">{dash(row.phone || row.noWa || row.no_wa)}</p>
                </td>

                <td className="px-6 py-4">
                  <StatusBadge status={status} />
                </td>

                <td className="px-6 py-4">
                  <ActionButtons onView={() => onView(row)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

export function CustomerTable({
  rows,
  loading,
  onView,
}) {
  return (
    <TableShell
      loading={loading}
      empty={!rows.length}
      emptyText="Belum ada akun pelanggan."
    >
      <table className="w-full min-w-[980px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <Th>Pelanggan</Th>
            <Th>PIC</Th>
            <Th>Kontak</Th>
            <Th>Portal</Th>
            <Th>Status</Th>
            <Th align="right">Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = getStatus(row);
            const hasPortal = Boolean(row.hasPortalAccount || row.hasPortalAccess || row.portalUsername || row.username);
            return (
              <tr key={row.idPelanggan || row.id_pelanggan || row.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.company || row.namaInstansi || row.nama_instansi || row.name} icon="building" />
                    <div>
                      <p className="font-semibold text-gray-900">{dash(row.company || row.namaInstansi || row.nama_instansi)}</p>
                      <p className="text-xs text-gray-500">ID: {dash(row.idPelanggan || row.id_pelanggan || row.id)}</p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{dash(row.pic || row.name)}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{dash(row.address || row.alamat)}</p>
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{dash(row.contactEmail || row.emailKontak || row.email_kontak || row.email)}</p>
                  <p className="text-sm text-gray-500">{dash(row.phone || row.noTelp || row.no_telp)}</p>
                </td>

                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{hasPortal ? dash(row.portalUsername || row.username) : 'Belum aktif'}</p>
                    <p className="text-xs text-gray-500">
                      {hasPortal ? dash(row.portalEmail || row.userEmail || row.user_email) : 'Pelanggan membuat akun sendiri'}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <StatusBadge status={status} />
                </td>

                <td className="px-6 py-4">
                  <ActionButtons onView={() => onView(row)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

function TableShell({ children, loading, empty, emptyText }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          Memuat data akun...
        </div>
      ) : empty ? (
        <div className="p-16 flex flex-col items-center justify-center text-gray-500">
          <UserCog className="w-10 h-10 text-gray-300 mb-3" />
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th
      className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${align === 'right' ? 'text-right' : 'text-left'
        }`}
    >
      {children}
    </th>
  );
}

function Avatar({ name, icon = 'user' }) {
  return (
    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
      {icon === 'building' ? <Building2 className="w-5 h-5" /> : initials(name)}
    </div>
  );
}

function ActionButtons({ onView }) {
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={onView}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
      >
        <Eye className="h-4 w-4" />
        Detail
      </button>
    </div>
  );
}
