import { useCallback, useState } from 'react';
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const rows = await adminPermohonanApi.getRequests();
      setRequestList(rows);
      return rows;
    } catch (error) {
      setError(error?.message || 'Gagal terhubung ke server.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

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
