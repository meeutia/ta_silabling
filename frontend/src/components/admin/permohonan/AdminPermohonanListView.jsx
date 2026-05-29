import { Search, Eye, Clock, CheckCircle } from 'lucide-react';
import { LoadingState } from '../../common/LoadingState';
import { EmptyState } from '../../common/EmptyState';
import {
  ACTIVE_LHU_PICKUP_STATUSES,
  canCompleteLhuPickup,
  canScheduleLhuPickup,
  getLhuPickupActionMessage,
} from '../../../utils/workflowAccessRules';

export function AdminPermohonanListView({
  activeTab,
  setActiveTab,
  activeStatusFilter,
  setActiveStatusFilter,
  searchQuery,
  setSearchQuery,
  getTabFilterOptions,
  loading,
  pickupLoading,
  error,
  pickupError,
  filteredData,
  filteredPickupRows,
  requestList,
  pickupRows,
  activeRowsCount,
  pickupRowsCount,
  historyRowsCount,
  fetchPickupQueue,
  handleOpenDetail,
  openSchedulePickupModal,
  openCompletePickupModal,
  formatDate,
  getCustomerProfile,
  getStatusBadge,
  getPickupStatusBadge,
  getPickupScheduleLabel,
  isPickupToday,
}) {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Permohonan Pengujian</h1>
          <p className="text-gray-600">Kelola dan verifikasi permohonan pengujian dari pelanggan</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => {
              setActiveTab('Aktif');
              setActiveStatusFilter('Semua');
              setSearchQuery('');
            }}
            className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'Aktif'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Permohonan Aktif
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {activeRowsCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('Pengambilan');
              setActiveStatusFilter('Semua');
              setSearchQuery('');
              fetchPickupQueue();
            }}
            className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'Pengambilan'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Perlu Pengambilan
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {pickupRowsCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('Riwayat');
              setActiveStatusFilter('Semua');
              setSearchQuery('');
            }}
            className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'Riwayat'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Riwayat Permohonan
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {historyRowsCount}
            </span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'Pengambilan' ? 'Cari ID registrasi, nomor FPPL, pelanggan, atau status...' : 'Cari nomor registrasi, nama instansi, PIC, atau status...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end">
            <div className="relative w-40 sm:w-48">
              <select
                value={activeStatusFilter}
                onChange={(event) => setActiveStatusFilter(event.target.value)}
                className="w-full appearance-none rounded-lg border border-emerald-500 bg-white py-2 pl-4 pr-8 text-xs font-semibold text-emerald-700 shadow-sm outline-none transition hover:bg-emerald-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
              >
                {getTabFilterOptions().map((f) => (
                  <option key={f} value={f} className="bg-white text-gray-900">
                    {f}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600">▾</span>
            </div>
          </div>
        </div>

        {/* Loading */}
        {activeTab !== 'Pengambilan' && loading && (
          <LoadingState title="Memuat data permohonan..." className="p-12" />
        )}

        {activeTab === 'Pengambilan' && pickupLoading && (
          <LoadingState title="Memuat antrean pengambilan LHU..." className="p-12" />
        )}

        {/* Error */}
        {activeTab !== 'Pengambilan' && error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {activeTab === 'Pengambilan' && pickupError && !pickupLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">{pickupError}</p>
          </div>
        )}

        {/* Table Permohonan */}
        {activeTab !== 'Pengambilan' && !loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">No. Registrasi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tanggal</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nama Instansi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">PIC</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Sampling</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8">
                        <EmptyState
                          title={`Tidak ada data ${activeTab === 'Riwayat' ? 'riwayat permohonan' : 'permohonan aktif'}`}
                          description={searchQuery ? `Tidak ada data yang sesuai dengan "${searchQuery}".` : 'Data akan tampil setelah tersedia.'}
                          className="border-0 bg-transparent p-4"
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => (
                      <tr key={item.id_registrasi} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.id_registrasi}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(item.tanggal_pendaftaran)}</td>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-gray-900">{getCustomerProfile(item)?.nama_instansi || '-'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{getCustomerProfile(item)?.pic || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.jenis_pengambilan_sampel || '-'}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(item.status_fppl)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table Pengambilan LHU */}
        {activeTab === 'Pengambilan' && !pickupLoading && !pickupError && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID Registrasi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">No. FPPL</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Pelanggan</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Jumlah</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Jadwal</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPickupRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8">
                        <EmptyState
                          title="Tidak ada permohonan yang perlu pengambilan LHU"
                          description={searchQuery ? `Tidak ada data yang sesuai dengan "${searchQuery}".` : 'Antrean pengambilan LHU akan tampil di sini.'}
                          className="border-0 bg-transparent p-4"
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredPickupRows.map((item) => {
                      const canSchedulePickup = canScheduleLhuPickup(item);
                      const canCompletePickup = canCompleteLhuPickup(item);
                      const pickupActionMessage = getLhuPickupActionMessage(item);

                      return (
                      <tr key={item.id_registrasi} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.id_registrasi}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{item.nomor_fppl || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-gray-900">{item.pelanggan || '-'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span>{item.total_sampel || 0} sampel</span>
                            <span className="text-xs text-gray-500">{item.total_lhu || 0} LHU final</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getPickupStatusBadge(item.status_pengambilan)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item.tanggal_pengambilan ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{getPickupScheduleLabel(item)}</span>
                              {isPickupToday(item) && (
                                <span className="mt-1 w-fit rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                  Hari ini
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Belum ada jadwal</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {canSchedulePickup && (
                              <button
                                type="button"
                                onClick={() => openSchedulePickupModal(item)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
                              >
                                <Clock className="w-4 h-4" />
                                {ACTIVE_LHU_PICKUP_STATUSES.includes(item.status_pengambilan) ? 'Ubah Jadwal' : 'Jadwalkan'}
                              </button>
                            )}

                            {ACTIVE_LHU_PICKUP_STATUSES.includes(item.status_pengambilan) && (
                              <button
                                type="button"
                                onClick={() => canCompletePickup && openCompletePickupModal(item)}
                                disabled={!canCompletePickup}
                                title={pickupActionMessage || 'Tandai LHU sudah diambil'}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 border rounded-lg transition-all text-sm font-medium ${
                                  canCompletePickup
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <CheckCircle className="w-4 h-4" />
                                {canCompletePickup ? 'Sudah Diambil' : 'Belum Waktunya'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab !== 'Pengambilan' && !loading && !error && (
          <div className="mt-4 text-sm text-gray-600">
            Menampilkan {filteredData.length} dari {requestList.length} permohonan
          </div>
        )}

        {activeTab === 'Pengambilan' && !pickupLoading && !pickupError && (
          <div className="mt-4 text-sm text-gray-600">
            Menampilkan {filteredPickupRows.length} dari {pickupRows.length} permohonan siap diambil
          </div>
        )}
      </div>
    </div>
  );
}
