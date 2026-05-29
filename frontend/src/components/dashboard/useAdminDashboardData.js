import { useEffect, useMemo, useState } from 'react';
import { dashboardApi } from '../../api/dashboardApi';
import { formatDashboardLoadError, loadDashboardSources } from './dashboardFetch';
import {
  asArray,
  countWhere,
  formatRelativeTime,
  getCustomerName,
  getPickupScheduleDate,
  getRegistrationNumber,
  getRequestStatus,
  getRowDate,
  getSampleTypeName,
  isToday,
  sortByNewest,
} from './dashboardUtils';
import { FPPL_STATUSES, normalizeFpplStatus } from '../../utils/fpplStatus';

const STATUS_GROUPS = {
  newRequest: new Set([FPPL_STATUSES.MENUNGGU_VERIFIKASI]),
  waitingPayment: new Set([FPPL_STATUSES.MENUNGGU_PEMBAYARAN]),
  waitingSample: new Set([FPPL_STATUSES.MENUNGGU_SAMPEL]),
  testing: new Set([FPPL_STATUSES.PROSES_PENGUJIAN]),
  completed: new Set([FPPL_STATUSES.SELESAI]),
};

function getNormalizedRequestStatus(row) {
  return normalizeFpplStatus(getRequestStatus(row));
}

function statusIn(row, statusSet) {
  return statusSet.has(getNormalizedRequestStatus(row));
}

export function useAdminDashboardData() {
  const [requests, setRequests] = useState([]);
  const [pickupRows, setPickupRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const { data, errors, failedAll } = await loadDashboardSources([
          { key: 'requests', label: 'permohonan', fetcher: () => dashboardApi.getRequests(), fallback: [] },
          { key: 'pickupRows', label: 'pickup LHU', fetcher: () => dashboardApi.getLhuPickupQueue(), fallback: [] },
        ]);

        if (ignore) return;
        setRequests(asArray(data.requests));
        setPickupRows(asArray(data.pickupRows));
        setErrorMessage(formatDashboardLoadError(errors, 'Dashboard Admin dimuat sebagian.', 'Gagal memuat dashboard Admin.', failedAll));
      } catch (error) {
        if (ignore) return;
        setErrorMessage(error?.message || 'Gagal memuat dashboard Admin.');
        setRequests([]);
        setPickupRows([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  return useMemo(() => {
    const sortedRequests = sortByNewest(requests);
    const newRequestCount = countWhere(sortedRequests, (row) => statusIn(row, STATUS_GROUPS.newRequest));
    const waitingPaymentCount = countWhere(sortedRequests, (row) => statusIn(row, STATUS_GROUPS.waitingPayment));
    const waitingSampleCount = countWhere(sortedRequests, (row) => statusIn(row, STATUS_GROUPS.waitingSample));
    const testingCount = countWhere(sortedRequests, (row) => statusIn(row, STATUS_GROUPS.testing));
    const completedCount = countWhere(sortedRequests, (row) => statusIn(row, STATUS_GROUPS.completed));

    const todayNewRequests = countWhere(sortedRequests, (row) => isToday(getRowDate(row)) && statusIn(row, STATUS_GROUPS.newRequest));
    const todayPickup = countWhere(pickupRows, (row) => isToday(getPickupScheduleDate(row)));

    const recentActivities = sortedRequests.slice(0, 5).map((row) => ({
      time: formatRelativeTime(getRowDate(row)),
      action: `Permohonan ${getRegistrationNumber(row)} berstatus ${getNormalizedRequestStatus(row)}`,
      user: getCustomerName(row),
    }));

    const recentRequests = sortedRequests.slice(0, 5).map((row) => ({
      noReg: getRegistrationNumber(row),
      pelanggan: getCustomerName(row),
      jenisSampel: getSampleTypeName(row),
      status: getNormalizedRequestStatus(row),
    }));

    return {
      loading,
      errorMessage,
      metrics: {
        newRequestCount,
        waitingPaymentCount,
        waitingSampleCount,
        testingCount,
        completedCount,
        todayNewRequests,
        todayPickup,
      },
      recentActivities,
      recentRequests,
    };
  }, [errorMessage, loading, pickupRows, requests]);
}
