import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { dashboardApi } from '../../api/dashboardApi';
import { formatDashboardLoadError, loadDashboardSources } from './dashboardFetch';
import {
  asArray,
  countWhere,
  formatRelativeTime,
  getCustomerName,
  getRegistrationNumber,
  getRequestStatus,
  getRowDate,
  getSampleTypeName,
  sortByNewest,
} from './dashboardUtils';

const KASI_PENDING_STATUSES = new Set([
  'Menunggu Penentuan Parameter',
  'Menunggu Penentuan Metode',
  'Menunggu Verifikasi Kasi',
]);

const KASI_VERIFIED_STATUSES = new Set([
  'Menunggu Pembayaran',
  'Menunggu Sampel',
  'Proses Pengujian',
  'Selesai',
]);

export function useKasiDashboardData() {
  const [requests, setRequests] = useState([]);
  const [lhuQueue, setLhuQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setErrorMessage('');

    try {
      const { data, errors, failedAll } = await loadDashboardSources([
        { key: 'requests', label: 'permohonan', fetcher: () => dashboardApi.getRequests(), fallback: [] },
        { key: 'lhuQueue', label: 'queue LHU Kasi', fetcher: () => dashboardApi.getKasiLhuQueue(), fallback: [] },
      ]);

      setRequests(asArray(data.requests));
      setLhuQueue(asArray(data.lhuQueue));
      if (!silent || errors.length > 0) {
        setErrorMessage(formatDashboardLoadError(errors, 'Dashboard Kasi dimuat sebagian.', 'Gagal memuat dashboard Kasi.', failedAll));
      }
    } catch (error) {
      if (!silent) setErrorMessage(error?.message || 'Gagal memuat dashboard Kasi.');
      if (!silent) {
        setRequests([]);
        setLhuQueue([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load);

  return useMemo(() => {
    const sortedRequests = sortByNewest(requests);
    const pendingRequests = countWhere(sortedRequests, (row) => KASI_PENDING_STATUSES.has(getRequestStatus(row)));
    const verifiedRequests = countWhere(sortedRequests, (row) => KASI_VERIFIED_STATUSES.has(getRequestStatus(row)));
    const totalTesting = countWhere(sortedRequests, (row) => getRequestStatus(row) === 'Proses Pengujian' || getRequestStatus(row) === 'Selesai');

    const recentRequests = sortedRequests.slice(0, 5).map((row) => ({
      noReg: getRegistrationNumber(row),
      pelanggan: getCustomerName(row),
      jenisSampel: getSampleTypeName(row),
      status: getRequestStatus(row),
    }));

    const recentActivities = [
      ...sortedRequests.slice(0, 3).map((row) => ({
        time: formatRelativeTime(getRowDate(row)),
        action: `Permohonan ${getRegistrationNumber(row)} berstatus ${getRequestStatus(row)}`,
      })),
      ...lhuQueue.slice(0, 2).map((row) => ({
        time: formatRelativeTime(getRowDate(row)),
        action: `LHU sementara ${row?.no_sampel || row?.noSampel || row?.nomor_lhu || row?.nomorLhu || '-'} perlu diverifikasi`,
      })),
    ].slice(0, 5);

    return {
      loading,
      errorMessage,
      pendingRequests,
      verifiedRequests,
      pendingLhu: lhuQueue.length,
      totalTesting,
      recentRequests,
      recentActivities,
    };
  }, [errorMessage, loading, lhuQueue, requests]);
}
