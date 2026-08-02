import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { getApiErrorMessage } from '../../../api/httpClient';
import { penyeliaPenugasanApi } from '../../../api/penyeliaPenugasanApi';
import { showError, showSuccess } from '../../../utils/feedback';

export function usePenyeliaPenugasanData() {
  const [activeTab, setActiveTab] = useState('buat');
  const [searchQuery, setSearchQuery] = useState('');

  const [pendingItems, setPendingItems] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [monitorRows, setMonitorRows] = useState([]);
  const [pendingKasiRevisions, setPendingKasiRevisions] = useState([]);

  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingMonitor, setLoadingMonitor] = useState(true);
  const [loadingKasiRevisions, setLoadingKasiRevisions] = useState(false);
  const [reviewingKasiRevisionId, setReviewingKasiRevisionId] = useState('');
  const [errorPending, setErrorPending] = useState('');
  const [errorKasiRevisions, setErrorKasiRevisions] = useState('');

  const [holidayDateSet, setHolidayDateSet] = useState(new Set());
  const [holidayNameByDate, setHolidayNameByDate] = useState({});

  const fetchAnalysts = useCallback(async () => {
    try {
      const rows = await penyeliaPenugasanApi.getAnalysts();
      setAnalysts(rows || []);
    } catch {
      // Abaikan kegagalan data opsional.
    }
  }, []);

  const fetchPendingItems = useCallback(async (silent = false) => {
    if (!silent) setLoadingPending(true);
    if (!silent) setErrorPending('');

    try {
      const rows = await penyeliaPenugasanApi.getPendingItems();
      setPendingItems(rows || []);
    } catch (err) {
      if (!silent) setErrorPending(getApiErrorMessage(err, 'Gagal terhubung ke server.'));
    } finally {
      if (!silent) setLoadingPending(false);
    }
  }, []);

  const fetchMonitorRows = useCallback(async (silent = false) => {
    if (!silent) setLoadingMonitor(true);

    try {
      const rows = await penyeliaPenugasanApi.getMonitorRows();
      setMonitorRows(rows || []);
    } catch {
      // Abaikan kegagalan data opsional.
    } finally {
      if (!silent) setLoadingMonitor(false);
    }
  }, []);


  const fetchPendingKasiRevisions = useCallback(async (silent = false) => {
    if (!silent) setLoadingKasiRevisions(true);
    if (!silent) setErrorKasiRevisions('');

    try {
      const rows = await penyeliaPenugasanApi.getPendingKasiRevisionRequests();
      setPendingKasiRevisions(rows || []);
    } catch (err) {
      if (!silent) setErrorKasiRevisions(getApiErrorMessage(err, 'Gagal memuat revisi dari Kasi Pengujian.'));
    } finally {
      if (!silent) setLoadingKasiRevisions(false);
    }
  }, []);

  const reviewKasiRevisionRequest = useCallback(
    async (idRevisiLka, action) => {
      const revisionId = String(idRevisiLka || '').trim();

      if (!revisionId) {
        showError('ID revisi tidak valid.');
        return;
      }

      setReviewingKasiRevisionId(revisionId);

      try {
        const response = await penyeliaPenugasanApi.reviewKasiRevisionRequest(revisionId, {
          action,
        });

        showSuccess(response?.message || 'Tinjauan revisi Kasi berhasil disimpan.');
        await Promise.all([fetchPendingKasiRevisions(), fetchMonitorRows()]);
      } catch (err) {
        showError(getApiErrorMessage(err, 'Gagal meninjau revisi Kasi.'));
      } finally {
        setReviewingKasiRevisionId('');
      }
    },
    [fetchMonitorRows, fetchPendingKasiRevisions]
  );

  const fetchHolidays = useCallback(async () => {
    try {
      const rows = await penyeliaPenugasanApi.getHolidays();

      const dateSet = new Set();
      const dateMap = {};

      (rows || []).forEach((item) => {
        const dateValue = String(item?.date || '').slice(0, 10);
        if (!dateValue) return;

        dateSet.add(dateValue);
        dateMap[dateValue] = item.nama || 'Hari libur nasional';
      });

      setHolidayDateSet(dateSet);
      setHolidayNameByDate(dateMap);
    } catch {
      // Abaikan kegagalan data opsional.
    }
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    await Promise.all([
      fetchPendingItems(silent),
      fetchMonitorRows(silent),
      fetchPendingKasiRevisions(silent)
    ]);
  }, [fetchPendingItems, fetchMonitorRows, fetchPendingKasiRevisions]);

  useEffect(() => {
    fetchAnalysts();
    fetchAll();
    fetchHolidays();
  }, [fetchAnalysts, fetchAll, fetchHolidays]);

  useAutoRefresh(fetchAll);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    pendingItems,
    analysts,
    monitorRows,
    pendingKasiRevisions,
    loadingPending,
    loadingMonitor,
    loadingKasiRevisions,
    reviewingKasiRevisionId,
    errorPending,
    errorKasiRevisions,
    holidayDateSet,
    holidayNameByDate,
    fetchPendingItems,
    fetchMonitorRows,
    fetchPendingKasiRevisions,
    reviewKasiRevisionRequest,
  };
}
