import { Eye, Loader2, Search } from 'lucide-react';

export function KasiPermohonanListSection({
  activeTab,
  setActiveTab,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  filteredRequests,
  isLoading,
  error,
  formatDateOnly,
  handleViewDetail,
}) {
  return (
    <>
{/* Header */}
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => {
            setActiveTab('Verifikasi Permintaan');
            setActiveFilter('Semua');
            setSearchQuery('');
          }}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'Verifikasi Permintaan'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Verifikasi Permintaan
        </button>
        <button
          onClick={() => {
            setActiveTab('Riwayat');
            setActiveFilter('Semua');
            setSearchQuery('');
          }}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'Riwayat'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Riwayat Verifikasi
        </button>
      </div>
      
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor registrasi, pelanggan, sampel, atau status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      
        <div className="flex justify-end">
          <div className="relative w-40 sm:w-44">
            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className="w-full appearance-none rounded-lg border border-emerald-500 bg-white py-2 pl-4 pr-8 text-xs font-semibold text-emerald-700 shadow-sm outline-none transition hover:bg-emerald-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
            >
              {(activeTab === 'Riwayat'
                ? ['Semua', 'Disetujui', 'Ditolak']
                : ['Semua', 'Menunggu', 'Disetujui', 'Ditolak']
              ).map((filter) => (
                <option key={filter} value={filter} className="bg-white text-gray-900">
                  {filter}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600">▾</span>
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nomor Registrasi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nama Pelanggan</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Jenis Sampel</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-600" />
                    Memuat data permohonan...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Tidak ada data yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.noReg} className="hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.noReg}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDateOnly(request.tanggal)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{request.pelanggan}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{request.jenisSampel}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'Menunggu Penentuan Metode'
                          ? 'bg-amber-100 text-amber-700'
                          : request.status === 'Ditolak'
                            ? 'bg-red-100 text-red-700'
                            : request.status === 'Disetujui'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetail(request)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
