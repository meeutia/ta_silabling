import { Eye, Loader2, Search } from 'lucide-react';
import {
  formatHistoryDate,
  getHistoryCustomerProfile,
  getHistoryRegistrationDate,
  getHistoryRequestId,
  getHistoryStatus,
  getHistoryStatusBadge,
  getHistoryVerificationDate,
  HISTORY_FILTERS,
} from './statusHistoryUtils.jsx';

function StatusHistoryHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">Status & Riwayat Sampel</h1>
      <p className="text-gray-600">Monitor status permohonan dan riwayat pengujian sampel Anda</p>
    </div>
  );
}

function StatusHistoryToolbar({ searchQuery, setSearchQuery, activeFilter, setActiveFilter }) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nomor registrasi, jenis sampel, instansi, atau status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex justify-end">
        <div className="relative w-40 sm:w-48">
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="w-full appearance-none rounded-lg border border-emerald-500 bg-white py-2 pl-4 pr-8 text-xs font-semibold text-emerald-700 shadow-sm outline-none transition hover:bg-emerald-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
          >
            {HISTORY_FILTERS.map((filter) => (
              <option key={filter} value={filter} className="bg-white text-gray-900">
                {filter}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600">▾</span>
        </div>
      </div>
    </div>
  );
}

function StatusHistoryState({ loading, error }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-600">Memuat data permohonan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return null;
}

function StatusHistoryTable({ filteredRequests, detailLoadingId, onViewDetail }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                Nomor Registrasi
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                Tanggal Daftar
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                Nama Instansi
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                Tanggal Verifikasi
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => {
                const requestId = getHistoryRequestId(request);

                return (
                  <tr key={requestId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {requestId || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatHistoryDate(getHistoryRegistrationDate(request))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs">
                        {getHistoryCustomerProfile(request)?.nama_instansi || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getHistoryStatusBadge(getHistoryStatus(request))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatHistoryDate(getHistoryVerificationDate(request))}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => onViewDetail(request)}
                        disabled={detailLoadingId === requestId}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {detailLoadingId === requestId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        {detailLoadingId === requestId ? 'Memuat...' : 'Lihat Detail'}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    <p className="text-sm">Tidak ada data yang ditemukan</p>
                    <p className="text-xs mt-1">Belum ada permohonan pengujian yang didaftarkan</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusHistorySections({
  activeFilter,
  detailLoadingId,
  error,
  filteredRequests,
  handleViewRequestDetail,
  loading,
  requests,
  searchQuery,
  setActiveFilter,
  setSearchQuery,
}) {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <StatusHistoryHeader />

        <StatusHistoryToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />

        <StatusHistoryState loading={loading} error={error} />

        {!loading && !error && (
          <StatusHistoryTable
            filteredRequests={filteredRequests}
            detailLoadingId={detailLoadingId}
            onViewDetail={handleViewRequestDetail}
          />
        )}

        {!loading && !error && (
          <div className="mt-4 text-sm text-gray-600">
            Menampilkan {filteredRequests.length} dari {requests.length} permohonan
          </div>
        )}
      </div>
    </div>
  );
}
