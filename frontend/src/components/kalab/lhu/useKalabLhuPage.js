import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, FileText } from 'lucide-react';
import { lhuReviewApi } from '../../../api/lhuReviewApi';
import { showError, showSuccess, showWarning } from '../../../utils/feedback';
import {
  getErrorMessage,
  getFilePath,
  getFileUrl,
  getKalabStatusLhu as getStatusLhu,
  getNomorLhu,
} from '../../lhu/lhuReviewUtils';
import { validateKalabApprove } from '../../lhu/lhuReviewValidators';
import { isKalabApprovalLhuStatus } from '../../../utils/workflowAccessRules';

function filterKalabRows(rows = [], keyword = '') {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) return rows;

  return rows.filter((item) =>
    [
      item.nomorLhu,
      item.nomor_lhu,
      item.noSampel,
      item.no_sampel,
      item.idRegistrasi,
      item.id_registrasi,
      item.jenisSampel,
      item.jenis_sampel,
      item.namaPkt,
      item.nama_pkt,
      item.statusLhu,
      item.status_lhu,
      item.acuanPengambilanSampel,
      item.acuan_pengambilan_sampel,
      item.keteranganSampel,
      item.keterangan_sampel,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedKeyword))
  );
}

export function useKalabLhuPage({ initialLhuNumber = '' } = {}) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingQueue, setLoadingQueue] = useState(true);

  const [activeTab, setActiveTab] = useState('Persetujuan');
  const [historyRows, setHistoryRows] = useState([]);
  const [allHistoryRows, setAllHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [selectedRow, setSelectedRow] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [actionLoading, setActionLoading] = useState('');
  const [confirmApproveModal, setConfirmApproveModal] = useState({
    open: false,
    nomorLhu: '',
  });

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);

    try {
      const data = await lhuReviewApi.getKalabQueue();
      setRows(data || []);
    } catch (error) {
      showError(getErrorMessage(error, 'Gagal memuat antrean Kepala Lab.'));
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const allRows = (await lhuReviewApi.getLhuFinalizationHistory()) || [];

      const approvedRows = allRows.filter((row) => {
        const status = String(getStatusLhu(row)).toLowerCase();
        return status.includes('disahkan');
      });

      setAllHistoryRows(allRows);
      setHistoryRows(approvedRows);
    } catch (error) {
      showError(getErrorMessage(error, 'Gagal memuat riwayat LHU.'));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    loadHistory();
  }, [loadQueue, loadHistory]);

  const setTab = useCallback((tab) => {
    setActiveTab(tab);
    setSearch('');
  }, []);

  const currentRows = activeTab === 'Riwayat' ? historyRows : rows;
  const currentLoading = activeTab === 'Riwayat' ? loadingHistory : loadingQueue;

  const filteredRows = useMemo(
    () => filterKalabRows(currentRows, search),
    [currentRows, search]
  );

  const dashboardSummary = useMemo(() => {
    const waitingCount = rows.length;

    const approvedCount = allHistoryRows.filter((item) => {
      const status = String(getStatusLhu(item)).toLowerCase();
      return status.includes('disahkan');
    }).length;

    const uniqueNomorLhu = new Set(
      [...rows, ...allHistoryRows]
        .map((item) => getNomorLhu(item))
        .filter(Boolean)
    );

    return {
      waitingCount,
      approvedCount,
      totalLhu: uniqueNomorLhu.size,
    };
  }, [rows, allHistoryRows]);

  const dashboardMetrics = useMemo(
    () => [
      {
        label: 'Menunggu Verifikasi',
        sublabel: 'LHU baru',
        value: dashboardSummary.waitingCount,
        icon: Clock,
        color: 'text-amber-700',
        iconBg: 'bg-amber-50',
        trend: 'Prioritas Kalab',
        onClick: () => {
          setActiveTab('Persetujuan');
          setSearch('');
        },
      },
      {
        label: 'LHU Disetujui',
        sublabel: 'Sudah disahkan',
        value: dashboardSummary.approvedCount,
        icon: CheckCircle,
        color: 'text-emerald-700',
        iconBg: 'bg-emerald-50',
        trend: 'Riwayat final',
        onClick: () => {
          setActiveTab('Riwayat');
          setSearch('disahkan');
        },
      },
      {
        label: 'Total LHU',
        sublabel: 'Semua waktu',
        value: dashboardSummary.totalLhu,
        icon: FileText,
        color: 'text-blue-700',
        iconBg: 'bg-blue-50',
        trend: 'Akumulasi',
        onClick: () => {
          setActiveTab('Persetujuan');
          setSearch('');
        },
      },
    ],
    [dashboardSummary]
  );

  const closeConfirmApproveModal = useCallback(() => {
    setConfirmApproveModal({ open: false, nomorLhu: '' });
  }, []);

  const closeModal = useCallback(() => {
    setSelectedRow(null);
    setDetailData(null);
    setShowModal(false);
    setLoadingDetail(false);
    setActionLoading('');
    setConfirmApproveModal({ open: false, nomorLhu: '' });
  }, []);

  const openDetail = useCallback(
    async (row) => {
      const nomorLhu = getNomorLhu(row);

      if (!nomorLhu) {
        showWarning('Nomor LHU tidak valid.');
        return;
      }

      setSelectedRow(row);
      setDetailData(null);
      setShowModal(true);
      setLoadingDetail(true);

      try {
        const data = await lhuReviewApi.getLhuDetailByNomor(nomorLhu);
        setDetailData(data || null);
      } catch (error) {
        showError(getErrorMessage(error, 'Gagal memuat detail LHU.'));
        closeModal();
      } finally {
        setLoadingDetail(false);
      }
    },
    [closeModal]
  );

  useEffect(() => {
    const nomorLhu = String(initialLhuNumber || '').trim();
    if (!nomorLhu || loadingQueue || loadingHistory) return;

    const allRows = [...rows, ...allHistoryRows];
    const targetRow = allRows.find((row) => getNomorLhu(row) === nomorLhu) || { nomor_lhu: nomorLhu };
    const targetStatus = String(getStatusLhu(targetRow)).toLowerCase();

    if (targetStatus.includes('disahkan')) {
      setActiveTab('Riwayat');
    } else {
      setActiveTab('Persetujuan');
    }

    openDetail(targetRow);
    // initialLhuNumber hanya digunakan sebagai deep-link pembuka modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLhuNumber, loadingQueue, loadingHistory]);

  const openPdf = useCallback(async (filePathOrItem) => {
    let filePath = typeof filePathOrItem === 'string'
      ? filePathOrItem
      : getFilePath(filePathOrItem || {});

    const nomorLhu = typeof filePathOrItem === 'object'
      ? getNomorLhu(filePathOrItem)
      : '';

    if (nomorLhu) {
      try {
        const data = await lhuReviewApi.getLhuDetailByNomor(nomorLhu);
        filePath = getFilePath(data?.lhu || data || {}) || filePath;
      } catch (error) {
        showError(getErrorMessage(error, 'Gagal mengambil ulang URL PDF LHU.'));
        return;
      }
    }

    const url = getFileUrl(filePath);

    if (!url) {
      showWarning('File PDF belum tersedia.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleApprove = useCallback(() => {
    const nomorLhu = getNomorLhu(selectedRow);
    const currentStatus = getStatusLhu(detailData?.lhu || selectedRow);

    if (!isKalabApprovalLhuStatus(currentStatus)) {
      showWarning('LHU ini tidak berada pada tahap persetujuan Kepala Lab.');
      return;
    }

    const validationMessage = validateKalabApprove({
      selectedRow,
      detailRows: detailData?.details || [],
    });

    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setConfirmApproveModal({
      open: true,
      nomorLhu,
    });
  }, [detailData, selectedRow]);

  const confirmApproveLhu = useCallback(async () => {
    const nomorLhu = confirmApproveModal.nomorLhu || getNomorLhu(selectedRow);

    if (!nomorLhu) {
      showWarning('Nomor LHU tidak valid.');
      return;
    }

    setActionLoading('approve');

    try {
      const data = await lhuReviewApi.approveKalabLhu(nomorLhu);
      showSuccess(data.message || `LHU berhasil disahkan. Nomor resmi: ${data?.data?.nomorLhu || data?.data?.nomor_lhu || '-'}.`);
      closeConfirmApproveModal();
      closeModal();
      await Promise.all([loadQueue(), loadHistory()]);
      setActiveTab('Riwayat');
    } catch (error) {
      showError(getErrorMessage(error, 'Gagal menyetujui LHU.'));
    } finally {
      setActionLoading('');
    }
  }, [
    closeConfirmApproveModal,
    closeModal,
    confirmApproveModal.nomorLhu,
    loadHistory,
    loadQueue,
    selectedRow,
  ]);

  const lhuInfo = detailData?.lhu || {};
  const pelangganInfo = detailData?.pelanggan || {};
  const detailRows = detailData?.details || [];
  const akreditasi = detailData?.akreditasi || null;

  const selectedNomorLhu =
    getNomorLhu(selectedRow) || lhuInfo.nomor_lhu || lhuInfo.nomorLhu || '';

  const selectedFilePath = getFilePath(lhuInfo) || getFilePath(selectedRow);
  const selectedPdfUrl = getFileUrl(selectedFilePath);

  const statusFromDetail = getStatusLhu(lhuInfo);
  const statusFromRow = getStatusLhu(selectedRow);

  const selectedStatus =
    statusFromDetail && statusFromDetail !== '-'
      ? statusFromDetail
      : statusFromRow;

  const canApproveOrRevise =
    activeTab === 'Persetujuan' &&
    isKalabApprovalLhuStatus(selectedStatus);

  return {
    activeTab,
    akreditasi,
    actionLoading,
    canApproveOrRevise,
    closeModal,
    closeConfirmApproveModal,
    confirmApproveLhu,
    confirmApproveModal,
    currentLoading,
    dashboardMetrics,
    detailRows,
    filteredRows,
    handleApprove,
    lhuInfo,
    pelangganInfo,
    loadingDetail,
    openDetail,
    openPdf,
    search,
    selectedFilePath,
    selectedNomorLhu,
    selectedPdfUrl,
    selectedRow,
    setSearch,
    setTab,
    showModal,
  };
}
