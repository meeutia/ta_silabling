import { useCallback, useEffect, useState } from 'react';
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

  const fetchPendingItems = useCallback(async () => {
    setLoadingPending(true);
    setErrorPending('');

    try {
      const rows = await penyeliaPenugasanApi.getPendingItems();
      setPendingItems(rows || []);
    } catch (err) {
      setErrorPending(getApiErrorMessage(err, 'Gagal terhubung ke server.'));
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const fetchMonitorRows = useCallback(async () => {
    setLoadingMonitor(true);

    try {
      const rows = await penyeliaPenugasanApi.getMonitorRows();
      setMonitorRows(rows || []);
    } catch {
      // Abaikan kegagalan data opsional.
    } finally {
      setLoadingMonitor(false);
    }
  }, []);


  const fetchPendingKasiRevisions = useCallback(async () => {
    setLoadingKasiRevisions(true);
    setErrorKasiRevisions('');

    try {
      const rows = await penyeliaPenugasanApi.getPendingKasiRevisionRequests();
      setPendingKasiRevisions(rows || []);
    } catch (err) {
      setErrorKasiRevisions(getApiErrorMessage(err, 'Gagal memuat revisi dari Kasi Pengujian.'));
    } finally {
      setLoadingKasiRevisions(false);
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

  useEffect(() => {
    fetchAnalysts();
    fetchPendingItems();
    fetchMonitorRows();
    fetchPendingKasiRevisions();
    fetchHolidays();
  }, [fetchAnalysts, fetchPendingItems, fetchMonitorRows, fetchPendingKasiRevisions, fetchHolidays]);

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
