import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { useLocation, useNavigate } from 'react-router-dom';
import { lhuReviewApi } from '../../../api/lhuReviewApi';
import { showError, showSuccess, showWarning } from '../../../utils/feedback';
import {
  getCatatanRevisi,
  getErrorMessage,
  getNomorLhu,
  getNoSampel,
  getStatusReview,
  getLkaHasilTargetKey,
} from '../../lhu/lhuReviewUtils';
import { validateKasiApprove, validateKasiRevision } from '../../lhu/lhuReviewValidators';

const KASI_QUEUE_STATUSES = new Set([
  'menunggu review kasi pengujian',
  'menunggu verifikasi kasi pengujian',
  'disetujui penyelia',
  'revisi kasi pengujian',
]);
const KASI_HISTORY_STATUSES = new Set([
  'disetujui kasi pengujian',
]);

function normalizeKasiReviewStatus(row) {
  return String(getStatusReview(row) || '').trim().toLowerCase();
}

function isQueueReviewRow(row) {
  const status = normalizeKasiReviewStatus(row);
  return KASI_QUEUE_STATUSES.has(status);
}

function isHistoryReviewRow(row) {
  const status = normalizeKasiReviewStatus(row);
  return KASI_HISTORY_STATUSES.has(status);
}

function getReviewRowIdentity(row) {
  return [
    getNoSampel(row),
    getNomorLhu(row),
    row?.idRegistrasi,
    row?.id_registrasi,
    row?.id,
  ]
    .map((value) => String(value || '').trim())
    .find(Boolean) || JSON.stringify(row || {});
}

function mergeUniqueReviewRows(primaryRows = [], secondaryRows = []) {
  const map = new Map();

  [...primaryRows, ...secondaryRows].forEach((row) => {
    const key = getReviewRowIdentity(row);
    if (!map.has(key)) {
      map.set(key, row);
    }
  });

  return Array.from(map.values());
}

export function useKasiLhuReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState('antrean');

  const [showModal, setShowModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNotesById, setRevisionNotesById] = useState({});
  const [selectedRevisionIds, setSelectedRevisionIds] = useState([]);
  const [selectedRevisionTargets, setSelectedRevisionTargets] = useState({});
  const [actionLoading, setActionLoading] = useState('');
  const [approveModal, setApproveModal] = useState({ open: false, noSampel: '' });
  const [detailMode, setDetailMode] = useState('queue');

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setLoadingQueue(true);

    try {
      const data = await lhuReviewApi.getKasiReviewQueue();
      const queueRows = (data || []).filter(isQueueReviewRow);
      const historyRowsFromQueue = (data || []).filter(isHistoryReviewRow);

      setRows(queueRows);
      setHistoryRows((prev) => mergeUniqueReviewRows(prev, historyRowsFromQueue));
    } catch (error) {
      if (!silent) showError(getErrorMessage(error, 'Gagal memuat antrean review hasil Kasi Pengujian.'));
    } finally {
      if (!silent) setLoadingQueue(false);
    }
  }, []);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setLoadingHistory(true);

    try {
      const data = await lhuReviewApi.getKasiReviewHistory();
      const historyRowsFromApi = (data || []).filter(isHistoryReviewRow);
      setHistoryRows((prev) => mergeUniqueReviewRows(historyRowsFromApi, prev));
    } catch (error) {
      if (!silent) showError(getErrorMessage(error, 'Gagal memuat riwayat persetujuan Kasi Pengujian.'));
    } finally {
      if (!silent) setLoadingHistory(false);
    }
  }, []);

  const fetchAll = useCallback(async (silent = false) => {
    await Promise.all([
      fetchQueue(silent),
      fetchHistory(silent)
    ]);
  }, [fetchQueue, fetchHistory]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAutoRefresh(fetchAll);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const nextTab = params.get('tab');
    const nextSearch = params.get('q');

    if (['antrean', 'riwayat'].includes(nextTab)) {
      setActiveTab(nextTab);
    }

    if (nextSearch !== null) {
      setSearchQuery(nextSearch);
    }
  }, [location.search]);

  const filteredRows = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter((row) =>
      [
        row.noSampel,
        row.no_sampel,
        row.idRegistrasi,
        row.id_registrasi,
        row.nomorFppl,
        row.nomor_fppl,
        row.jenisSampel,
        row.jenis_sampel,
        row.tanggalPengambilanSampel,
        row.tanggal_pengambilan_sampel,
        row.tanggalPenerimaan,
        row.tanggal_penerimaan,
        row.acuanPengambilanSampel,
        row.acuan_pengambilan_sampel,
        row.abnormalitasSampel,
        row.abnormalitas_sampel,
        row.statusReviewHasil,
        row.statusReviewHasil,
        row.catatanRevisiHasilPenyelia,
        row.catatan_revisi_hasil_penyelia,
        row.catatanRevisiHasilKasiPengujian,
        row.catatan_revisi_hasil_kasi_pengujian,
        row.catatanRevisiHasil,
        row.catatan_revisi_hasil,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [rows, searchQuery]);

  const filteredHistoryRows = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) return historyRows;

    return historyRows.filter((row) =>
      [
        getNomorLhu(row),
        row.noSampel,
        row.no_sampel,
        row.idRegistrasi,
        row.id_registrasi,
        row.nomorFppl,
        row.nomor_fppl,
        row.jenisSampel,
        row.jenis_sampel,
        row.namaPkt,
        row.nama_pkt,
        row.statusReviewHasil,
        row.statusReviewHasil,
        row.statusLhu,
        row.status_lhu,
        row.catatanRevisiHasilPenyelia,
        row.catatan_revisi_hasil_penyelia,
        row.catatanRevisiHasilKasiPengujian,
        row.catatan_revisi_hasil_kasi_pengujian,
        row.catatanRevisiHasil,
        row.catatan_revisi_hasil,
        row.keteranganSampel,
        row.keterangan_sampel,
        row.acuanPengambilanSampel,
        row.acuan_pengambilan_sampel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [historyRows, searchQuery]);

  const summary = useMemo(() => {
    const total = rows.length;

    const menunggu = rows.filter((row) =>
      String(getStatusReview(row)).toLowerCase().includes('menunggu')
    ).length;

    const revisi = rows.filter((row) =>
      String(getStatusReview(row)).toLowerCase().includes('revisi')
    ).length;

    const totalParameter = rows.reduce(
      (sum, row) => sum + Number(row.totalParameter || row.total_parameter || 0),
      0
    );

    return {
      total,
      menunggu,
      revisi,
      totalParameter,
    };
  }, [rows]);

  const selectMetricContext = useCallback((context) => {
    if (context === 'menunggu') {
      setActiveTab('antrean');
      setSearchQuery('menunggu');
      return;
    }

    if (context === 'revisi') {
      setActiveTab('antrean');
      setSearchQuery('revisi');
      return;
    }

    if (context === 'riwayat') {
      setActiveTab('riwayat');
      setSearchQuery('');
      return;
    }

    setActiveTab('antrean');
    setSearchQuery('');
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedSample(null);
    setDetailData(null);
    setRevisionOpen(false);
    setRevisionNotesById({});
    setSelectedRevisionIds([]);
    setSelectedRevisionTargets({});
    setActionLoading('');
    setApproveModal({ open: false, noSampel: '' });
    setDetailMode('queue');

    if (location.search) {
      navigate('/kasi/lhu', { replace: true });
    }
  }, [location.search, navigate]);

  const openModal = useCallback(
    async (row) => {
      const noSampel = getNoSampel(row);

      if (!noSampel) {
        showWarning('Nomor sampel tidak valid.');
        return;
      }

      setDetailMode('queue');
      setSelectedSample(row);
      setDetailData(null);
      setRevisionOpen(false);
      setRevisionNotesById({});
      setSelectedRevisionIds([]);
      setShowModal(true);
      setLoadingDetail(true);

      try {
        const data = await lhuReviewApi.getKasiReviewDetail(noSampel);
        setDetailData(data || null);
      } catch (error) {
        showError(getErrorMessage(error, 'Gagal memuat detail review hasil.'));
        closeModal();
      } finally {
        setLoadingDetail(false);
      }
    },
    [closeModal]
  );

  const openApproveModal = useCallback((noSampel) => {
    const validationMessage = validateKasiApprove({
      noSampel,
      resultRows: detailData?.results || [],
    });

    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setApproveModal({
      open: true,
      noSampel: String(noSampel || '').trim(),
    });
  }, [detailData]);

  const closeApproveModal = useCallback(() => {
    if (actionLoading) return;
    setApproveModal({ open: false, noSampel: '' });
  }, [actionLoading]);

  const handleApprove = useCallback(
    async () => {
      const noSampel = approveModal.noSampel;

      const validationMessage = validateKasiApprove({
        noSampel,
        resultRows: detailData?.results || [],
      });

      if (validationMessage) {
        showWarning(validationMessage);
        return;
      }

      setActionLoading(`approve-${noSampel}`);

      try {
        const data = await lhuReviewApi.approveKasiReview(noSampel);
        showSuccess(data.message || 'Hasil sampel berhasil disetujui.');

        const currentSampleInfo = detailData?.sample || selectedSample || {};
        const currentResults = Array.isArray(detailData?.results) ? detailData.results : [];
        const reviewedAt = new Date().toISOString();
        const totalParameter =
          currentSampleInfo?.totalParameter ||
          currentSampleInfo?.total_parameter ||
          currentResults.length ||
          0;

        const approvedRow = {
          ...(selectedSample || {}),
          ...(currentSampleInfo || {}),
          noSampel,
          no_sampel: noSampel,
          statusReviewHasil: 'Disetujui Kasi Pengujian',
          status_review_hasil: 'Disetujui Kasi Pengujian',
          totalParameter,
          total_parameter: totalParameter,
          totalSelesai: totalParameter,
          total_selesai: totalParameter,
          kasiPengujianReviewAt: reviewedAt,
          kasi_pengujian_review_at: reviewedAt,
        };

        setRows((prev) =>
          (prev || []).filter((row) => getNoSampel(row) !== noSampel)
        );

        setHistoryRows((prev) =>
          mergeUniqueReviewRows([approvedRow], prev || [])
        );
        setActiveTab('riwayat');
        setApproveModal({ open: false, noSampel: '' });
        closeModal();
        await fetchQueue();
        await fetchHistory();
      } catch (error) {
        showError(getErrorMessage(error, 'Gagal menyetujui hasil sampel.'));
      } finally {
        setActionLoading('');
      }
    },
    [
      approveModal.noSampel,
      closeModal,
      detailData,
      fetchHistory,
      fetchQueue,
      selectedSample,
    ]
  );

  const toggleRevisionResult = useCallback((target = {}) => {
    const key = getLkaHasilTargetKey(target);
    if (!key) return;

    setSelectedRevisionIds((prev) => {
      const current = new Set(prev || []);

      if (current.has(key)) {
        current.delete(key);
      } else {
        current.add(key);
      }

      return Array.from(current);
    });

    setSelectedRevisionTargets((prev) => {
      const next = { ...(prev || {}) };
      if (next[key]) delete next[key];
      else next[key] = target;
      return next;
    });

    setRevisionNotesById((prev) => {
      const next = { ...(prev || {}) };

      if (Object.prototype.hasOwnProperty.call(next, key)) {
        delete next[key];
      } else {
        next[key] = '';
      }

      return next;
    });
  }, []);

  const updateRevisionNote = useCallback((target = {}, value) => {
    const key = getLkaHasilTargetKey(target);
    if (!key) return;

    setRevisionNotesById((prev) => ({
      ...(prev || {}),
      [key]: value,
    }));
  }, []);

  const cancelRevision = useCallback(() => {
    setRevisionOpen(false);
    setRevisionNotesById({});
    setSelectedRevisionIds([]);
    setSelectedRevisionTargets({});
  }, []);

  const openRevision = useCallback(() => {
    setRevisionOpen(true);
    setSelectedRevisionIds([]);
    setSelectedRevisionTargets({});
    setRevisionNotesById({});
  }, []);

  const handleSubmitRevision = useCallback(
    async (noSampel) => {
      const validationMessage = validateKasiRevision({
        noSampel,
        selectedRevisionIds,
        revisionNotesById,
      });

      if (validationMessage) {
        showWarning(validationMessage);
        return;
      }

      const revisions = selectedRevisionIds.map((key) => {
        const target = selectedRevisionTargets[String(key)] || {};
        return {
          kodeLka: target.kodeLka || target.kode_lka,
          kode_lka: target.kode_lka || target.kodeLka,
          noSampel: target.noSampel || target.no_sampel,
          no_sampel: target.no_sampel || target.noSampel,
          catatanRevisi: String(revisionNotesById[String(key)] || '').trim(),
        };
      });

      setActionLoading(`revise-${noSampel}`);

      try {
        const data = await lhuReviewApi.requestKasiReviewRevision({
          noSampel,
          revisions,
        });

        showSuccess(data.message || 'Revisi hasil berhasil dikirim.');
        closeModal();
        await fetchQueue();
      } catch (error) {
        showError(getErrorMessage(error, 'Gagal mengirim revisi hasil sampel.'));
      } finally {
        setActionLoading('');
      }
    },
    [closeModal, fetchQueue, revisionNotesById, selectedRevisionIds, selectedRevisionTargets]
  );

  const openHistoryDetail = useCallback(async (item) => {
    const noSampel = getNoSampel(item);

    if (!noSampel) {
      showWarning('Nomor sampel tidak valid.');
      return;
    }

    setDetailMode('history');
    setSelectedSample(item);
    setDetailData(null);
    setRevisionOpen(false);
    setRevisionNotesById({});
    setSelectedRevisionIds([]);
    setSelectedRevisionTargets({});
    setShowModal(true);
    setLoadingDetail(true);

    try {
      const data = await lhuReviewApi.getKasiReviewDetail(noSampel);
      setDetailData(data || null);
    } catch (error) {
      showError(getErrorMessage(error, 'Gagal memuat detail hasil yang sudah disetujui.'));
      closeModal();
    } finally {
      setLoadingDetail(false);
    }
  }, [closeModal]);

  const sampleInfo = detailData?.sample || selectedSample || {};
  const resultRows = useMemo(() => detailData?.results || [], [detailData]);
  const selectedNoSampel = getNoSampel(sampleInfo) || getNoSampel(selectedSample);
  const selectedStatus = detailMode === 'history'
    ? 'Disetujui Kasi Pengujian'
    : getStatusReview(sampleInfo);
  const selectedCatatanRevisi = getCatatanRevisi(sampleInfo);
  const selectedRevisionRows = useMemo(() => {
    const selectedSet = new Set((selectedRevisionIds || []).map(String));
    return resultRows.filter((row) => {
      const rowId = String(getLkaHasilTargetKey(row) || '');
      return selectedSet.has(rowId);
    });
  }, [resultRows, selectedRevisionIds]);

  const canReview = detailMode !== 'history' && ['menunggu', 'revisi'].some((keyword) =>
    String(selectedStatus || '').toLowerCase().includes(keyword)
  );

  return {
    rows,
    filteredRows,
    filteredHistoryRows,
    loadingQueue,
    loadingHistory,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    summary,
    selectMetricContext,
    showModal,
    selectedSample,
    sampleInfo,
    resultRows,
    loadingDetail,
    revisionOpen,
    revisionNotesById,
    updateRevisionNote,
    selectedRevisionIds,
    actionLoading,
    selectedNoSampel,
    selectedStatus,
    selectedCatatanRevisi,
    selectedRevisionRows,
    canReview,
    openModal,
    closeModal,
    openRevision,
    cancelRevision,
    approveModal,
    openApproveModal,
    closeApproveModal,
    handleApprove,
    toggleRevisionResult,
    handleSubmitRevision,
    openHistoryDetail,
  };
}
