import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { dashboardApi } from '../../api/dashboardApi';
import { formatDashboardLoadError, loadDashboardSources } from './dashboardFetch';
import {
  asArray,
  countWhere,
  formatDashboardDate,
  getRegistrationNumber,
  getRequestStatus,
  getRowDate,
  getSampleTypeName,
  getStatusColorClass,
  isSameMonth,
  normalizeStatusText,
  sortByNewest,
} from './dashboardUtils';

function isInProcess(row) {
  const status = normalizeStatusText(getRequestStatus(row));
  return status && !status.includes('selesai') && !status.includes('disahkan') && !status.includes('batal') && !status.includes('tolak');
}

function isCompleted(row) {
  const status = normalizeStatusText(getRequestStatus(row));
  return status.includes('selesai') || status.includes('disahkan');
}

export function usePelangganDashboardData() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setErrorMessage('');

    try {
      const { data, errors, failedAll } = await loadDashboardSources([
        { key: 'requests', label: 'permohonan pelanggan', fetcher: () => dashboardApi.getRequests(), fallback: [] },
      ]);

      setRequests(asArray(data.requests));
      if (!silent || errors.length > 0) {
        setErrorMessage(formatDashboardLoadError(errors, 'Dashboard pelanggan dimuat sebagian.', 'Gagal memuat dashboard pelanggan.', failedAll));
      }
    } catch (error) {
      if (!silent) setErrorMessage(error?.message || 'Gagal memuat dashboard pelanggan.');
      if (!silent) setRequests([]);
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
    const monthlyCount = countWhere(sortedRequests, (row) => isSameMonth(getRowDate(row)));

    const recentActivities = sortedRequests.slice(0, 5).map((row) => {
      const status = getRequestStatus(row);
      return {
        id: getRegistrationNumber(row),
        type: getSampleTypeName(row),
        date: formatDashboardDate(getRowDate(row)),
        status,
        statusColor: getStatusColorClass(status),
      };
    });

    return {
      loading,
      errorMessage,
      totalTesting: requests.length,
      inProcessCount: countWhere(sortedRequests, isInProcess),
      completedCount: countWhere(sortedRequests, isCompleted),
      monthlyCount,
      recentActivities,
    };
  }, [errorMessage, loading, requests]);
}
