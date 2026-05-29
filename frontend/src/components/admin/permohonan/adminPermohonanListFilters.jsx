import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import { StatusBadge } from '../../common/StatusBadge';
import { getTodayYmd } from '../../../utils/businessDays';
import { getCustomerProfile } from './adminPermohonanHelpers';

export const ACTIVE_REQUEST_STATUSES = [
  FPPL_STATUSES.MENUNGGU_VERIFIKASI,
  FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
  FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
  FPPL_STATUSES.MENUNGGU_SAMPEL,
  FPPL_STATUSES.PROSES_PENGUJIAN,
  FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
];

export const HISTORY_REQUEST_STATUSES = [
  FPPL_STATUSES.SELESAI,
  FPPL_STATUSES.DIBATALKAN,
  FPPL_STATUSES.DIBATALKAN_PELANGGAN,
  FPPL_STATUSES.DITOLAK_ADMIN,
  FPPL_STATUSES.DITOLAK_KASI,
  FPPL_STATUSES.DITOLAK_PENYELIA,
];

export const getTabFilterOptions = (activeTab) => {
  if (activeTab === 'Pengambilan') {
    return ['Semua', 'Belum Dijadwalkan', 'Dijadwalkan', 'Disetujui Pelanggan', 'Disetujui Admin'];
  }

  if (activeTab === 'Riwayat') {
    return ['Semua', 'Selesai', 'Dibatalkan', 'Dibatalkan Pelanggan', 'Ditolak Admin', 'Ditolak Kasi', 'Ditolak Penyelia'];
  }

  return [
    'Semua',
    'Menunggu Verifikasi',
    'Menunggu Penentuan Metode',
    'Menunggu Pembayaran',
    'Menunggu Sampel',
    'Proses Pengujian',
    'Menunggu Penjadwalan LHU',
    'Menunggu Pengambilan LHU',
  ];
};

export const getStatusFilterValue = (filterLabel) => {
  const map = {
    'Menunggu Verifikasi': FPPL_STATUSES.MENUNGGU_VERIFIKASI,
    'Menunggu Penentuan Metode': FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
    'Menunggu Pembayaran': FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
    'Menunggu Sampel': FPPL_STATUSES.MENUNGGU_SAMPEL,
    'Proses Pengujian': FPPL_STATUSES.PROSES_PENGUJIAN,
    'Menunggu Penjadwalan LHU': FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
    'Menunggu Pengambilan LHU': FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
    Selesai: FPPL_STATUSES.SELESAI,
    Dibatalkan: FPPL_STATUSES.DIBATALKAN,
    'Dibatalkan Pelanggan': FPPL_STATUSES.DIBATALKAN_PELANGGAN,
    'Ditolak Admin': FPPL_STATUSES.DITOLAK_ADMIN,
    'Ditolak Kasi': FPPL_STATUSES.DITOLAK_KASI,
    'Ditolak Penyelia': FPPL_STATUSES.DITOLAK_PENYELIA,
  };

  return map[filterLabel] || filterLabel;
};

export const filterRequestRows = ({ requestList, activeTab, activeStatusFilter, searchQuery }) => {
  const query = String(searchQuery || '').toLowerCase();

  return requestList
    .filter((item) => {
      const normalizedStatus = normalizeFpplStatus(item.status_fppl);
      const customer = getCustomerProfile(item);

      const matchesSearch =
        (item.id_registrasi || '').toLowerCase().includes(query) ||
        (customer?.nama_instansi || '').toLowerCase().includes(query) ||
        (customer?.pic || '').toLowerCase().includes(query);

      const matchesTab =
        activeTab === 'Riwayat'
          ? HISTORY_REQUEST_STATUSES.includes(normalizedStatus)
          : ACTIVE_REQUEST_STATUSES.includes(normalizedStatus);

      const matchesFilter =
        activeStatusFilter === 'Semua'
          ? true
          : normalizedStatus === getStatusFilterValue(activeStatusFilter);

      return matchesSearch && matchesTab && matchesFilter;
    })
    .sort((a, b) => new Date(b.tanggal_pendaftaran).getTime() - new Date(a.tanggal_pendaftaran).getTime());
};

export const countActiveRequestRows = (requestList) => {
  return requestList.filter((item) =>
    ACTIVE_REQUEST_STATUSES.includes(normalizeFpplStatus(item.status_fppl))
  ).length;
};

export const countHistoryRequestRows = (requestList) => {
  return requestList.filter((item) =>
    HISTORY_REQUEST_STATUSES.includes(normalizeFpplStatus(item.status_fppl))
  ).length;
};

export const getPickupStatusBadge = (status) => (
  <StatusBadge status={status || 'Belum Dijadwalkan'} />
);

export const getPickupScheduleLabel = (row, formatDateTime) => {
  if (!row?.tanggal_pengambilan) return '-';
  return formatDateTime(row.tanggal_pengambilan, row.jam_pengambilan);
};

export const isPickupToday = (row) => {
  if (!row?.tanggal_pengambilan) return false;
  const today = getTodayYmd();
  return row.tanggal_pengambilan === today;
};

export const filterPickupRows = ({ pickupRows, activeStatusFilter, searchQuery }) => {
  const query = String(searchQuery || '').toLowerCase();

  return pickupRows
    .filter((item) => {
      const matchesSearch =
        String(item.id_registrasi || '').toLowerCase().includes(query) ||
        String(item.nomor_fppl || '').toLowerCase().includes(query) ||
        String(item.pelanggan || '').toLowerCase().includes(query);

      const matchesFilter =
        activeStatusFilter === 'Semua'
          ? true
          : item.status_pengambilan === activeStatusFilter;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aHasSchedule = a?.tanggal_pengambilan ? 0 : 1;
      const bHasSchedule = b?.tanggal_pengambilan ? 0 : 1;

      if (aHasSchedule !== bHasSchedule) return aHasSchedule - bHasSchedule;

      const dateA = new Date(`${a?.tanggal_pengambilan || '9999-12-31'}T${String(a?.jam_pengambilan || '23:59').slice(0, 5)}:00`).getTime();
      const dateB = new Date(`${b?.tanggal_pengambilan || '9999-12-31'}T${String(b?.jam_pengambilan || '23:59').slice(0, 5)}:00`).getTime();

      return dateA - dateB;
    });
};
