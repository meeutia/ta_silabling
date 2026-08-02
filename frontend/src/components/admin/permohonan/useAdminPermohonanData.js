import { useCallback, useState } from 'react';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { adminPermohonanApi } from '../../../api/adminPermohonanApi';
import { showError } from '../../../utils/feedback';

export function useAdminPermohonanData({ setSaving }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestList, setRequestList] = useState([]);

  const fetchRequestDetail = useCallback((idRegistrasi) => {
    return adminPermohonanApi.getRequestDetail(idRegistrasi);
  }, []);

  const handleOpenDetail = useCallback(async (item) => {
    setSaving(true);

    try {
      const detail = await fetchRequestDetail(item.id_registrasi);
      setSelectedRequest(detail);
    } catch (error) {
      showError(error.message || 'Gagal mengambil detail permohonan.');
    } finally {
      setSaving(false);
    }
  }, [fetchRequestDetail, setSaving]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');

    try {
      const rows = await adminPermohonanApi.getRequests();
      setRequestList(rows);
      return rows;
    } catch (error) {
      if (!silent) setError(error?.message || 'Gagal terhubung ke server.');
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchData);

  return {
    selectedRequest,
    setSelectedRequest,
    loading,
    error,
    requestList,
    fetchData,
    fetchRequestDetail,
    handleOpenDetail,
  };
}
