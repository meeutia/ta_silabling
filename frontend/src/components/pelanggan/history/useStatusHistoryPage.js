import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError } from '../../../api/httpClient';
import { customerRequestApi } from '../../../api/customerRequestApi';
import {
  filterHistoryRequests,
  getHistoryRequestId,
  buildHistoryDetailPayload,
} from './statusHistoryUtils.jsx';

export function useStatusHistoryPage({
  authToken,
  onSessionExpired,
  onViewDetail,
  paymentReturnInfo,
  onPaymentReturnConsumed,
}) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const handledPaymentReturnKeyRef = useRef('');
  const onViewDetailRef = useRef(onViewDetail);
  const onPaymentReturnConsumedRef = useRef(onPaymentReturnConsumed);
  const onSessionExpiredRef = useRef(onSessionExpired);

  useEffect(() => {
    onViewDetailRef.current = onViewDetail;
  }, [onViewDetail]);

  useEffect(() => {
    onPaymentReturnConsumedRef.current = onPaymentReturnConsumed;
  }, [onPaymentReturnConsumed]);

  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  const paymentReturnKey = paymentReturnInfo?.key || '';
  const paymentReturnRegistrationId = paymentReturnInfo?.idRegistrasi || '';
  const paymentReturnStatus = paymentReturnInfo?.payment || '';

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const nextFilter = params.get('filter') || params.get('status');
    const nextSearch = params.get('q');

    if (['Semua', 'Aktif', 'Selesai'].includes(nextFilter)) {
      setActiveFilter(nextFilter);
    }

    if (nextSearch !== null) {
      setSearchQuery(nextSearch);
    }
  }, [location.search]);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await customerRequestApi.getRequests();
        const nextRequests = Array.isArray(data) ? data : [];

        if (ignore) return;
        setRequests(nextRequests);

        if (paymentReturnKey && handledPaymentReturnKeyRef.current !== paymentReturnKey) {
          handledPaymentReturnKeyRef.current = paymentReturnKey;

          const registrationNumber = paymentReturnRegistrationId;
          if (registrationNumber) {
            setDetailLoadingId(registrationNumber);

            const requestFromList = nextRequests.find(
              (request) => getHistoryRequestId(request) === registrationNumber
            );

            const fallbackRequest = requestFromList || {
              id_registrasi: registrationNumber,
              status_fppl: paymentReturnStatus === 'success' ? 'Menunggu Sampel' : undefined,
            };

            const listPayload = buildHistoryDetailPayload(fallbackRequest, fallbackRequest);
            onViewDetailRef.current?.(listPayload);

            try {
              const detail = await customerRequestApi.getDetail(registrationNumber);
              if (!ignore) {
                onViewDetailRef.current?.(buildHistoryDetailPayload(detail, listPayload));
              }
            } catch (err) {
              if (err instanceof ApiError && [401, 403].includes(err.status)) {
                if (!ignore) {
                  setError('Sesi login berakhir. Silakan login ulang.');
                  onSessionExpiredRef.current?.();
                }
                return;
              }

              // Kalau detail gagal dimuat, data dari tabel tetap ditampilkan agar user tidak blank.
              if (!ignore) {
                setError(err?.message || 'Gagal memuat detail permohonan setelah pembayaran.');
              }
            } finally {
              if (!ignore) setDetailLoadingId(null);
            }
          }

          onPaymentReturnConsumedRef.current?.();
        }
      } catch (err) {
        if (err instanceof ApiError && [401, 403].includes(err.status)) {
          setError('Sesi login berakhir. Silakan login ulang.');
          onSessionExpiredRef.current?.();
          return;
        }

        setError(err?.message || 'Gagal terhubung ke server.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [authToken, paymentReturnKey, paymentReturnRegistrationId, paymentReturnStatus]);

  const handleViewRequestDetail = async (request) => {
    const requestId = getHistoryRequestId(request);
    if (!requestId) {
      setError('ID permohonan tidak valid.');
      return;
    }

    setDetailLoadingId(requestId);
    setError('');

    const listPayload = buildHistoryDetailPayload(request, request);

    // Tampilkan halaman detail langsung dari data baris tabel.
    // Data ini sudah terbukti punya tanggal daftar/verifikasi karena tabel menampilkannya.
    onViewDetail(listPayload);

    try {
      const data = await customerRequestApi.getDetail(requestId);
      onViewDetail(buildHistoryDetailPayload(data, listPayload));
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status)) {
        setError('Sesi login berakhir. Silakan login ulang.');
        onSessionExpired?.();
        return;
      }

      setError(err?.message || 'Gagal memuat detail permohonan.');
    } finally {
      setDetailLoadingId(null);
    }
  };

  const filteredRequests = useMemo(
    () => filterHistoryRequests(requests, searchQuery, activeFilter),
    [requests, searchQuery, activeFilter]
  );

  return {
    activeFilter,
    detailLoadingId,
    error,
    filteredRequests,
    handleViewRequestDetail,
    loading,
    requests,
    searchQuery,
    setActiveFilter,
    setSearchQuery,
  };
}
