import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { lhuReviewApi } from '../../../api/lhuReviewApi';
import { showError, showSuccess, showWarning } from '../../../utils/feedback';
import {
  getErrorMessage,
  getFilePath,
  getFileUrl,
  getNomorLhu,
  getNoSampel,
  getStatusLhu,
  pickValue,
} from '../../lhu/lhuReviewUtils';
import { getPktValue } from './qcLhuUtils';
import { buildQcFinalizePayload, validateQcFinalize } from '../../lhu/lhuReviewValidators';
import { isQcEditableLhuStatus } from '../../../utils/workflowAccessRules';

export function useQcLhuPage({ initialLhuNumber = '' } = {}) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('finalisasi');

  const [queue, setQueue] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);

  const [search, setSearch] = useState('');
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [selectedSample, setSelectedSample] = useState(null);
  const [detailMode, setDetailMode] = useState('finalisasi');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [detailOrder, setDetailOrder] = useState([]);

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmFinalizeModal, setConfirmFinalizeModal] = useState({
    open: false,
    sampleLabel: '',
  });

  const [form, setForm] = useState({
    idPktBm: '',
    sampleNos: [],
  });


  function isQueueReadyForQc(item = {}) {
    const totalSampel = Number(item.totalSampel || item.total_sampel || 0);
    const totalSampelSiap = Number(item.totalSampelSiap || item.total_sampel_siap || 0);
    const totalParameter = Number(item.totalParameter || item.total_parameter || 0);
    const totalSelesai = Number(item.totalSelesai || item.total_selesai || 0);

    return totalSampel > 0 && totalSampelSiap === totalSampel && totalParameter > 0 && totalSelesai === totalParameter;
  }

  const getRequestId = (item = {}) => item.idRegistrasi || item.id_registrasi || getNoSampel(item);
  const getSampleNos = (item = {}) => {
    const values = item.defaultSampleNos || item.default_sample_nos || item.sampleNos || item.sample_nos || [];
    return Array.isArray(values) ? values.filter(Boolean) : String(values || '').split(',').map((value) => value.trim()).filter(Boolean);
  };

  function getDetailRowId(row = {}, index = 0) {
    return String(
      row.id_fppl_parameter_metode ||
        row.idFpplParameterMetode ||
        row.id_metode_parameter ||
        row.idMetodeParameter ||
        row.id_parameter_metode ||
        row.idParameterMetode ||
        row.id_parameter ||
        row.idParameter ||
        [
          row.nama_parameter_snapshot || row.namaParameterSnapshot || row.nama_parameter || row.namaParameter || 'row',
          row.metode_snapshot || row.metodeSnapshot || row.nama_metode || row.namaMetode || row.metode || '',
          row.acuan_metode_snapshot || row.acuanMetodeSnapshot || row.acuan_metode || row.acuanMetode || '',
        ].join('|') ||
        `row-${index}`
    );
  }

  function setDetailOrderFromRows(rows = []) {
    const nextOrder = (Array.isArray(rows) ? rows : []).map((row, index) => getDetailRowId(row, index));
    setDetailOrder(nextOrder);
  }

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);

    try {
      const data = await lhuReviewApi.getQcFinalizationQueue();
      setQueue((data || []).filter(isQueueReadyForQc));
    } catch (error) {
      showError(getErrorMessage(error, 'Gagal memuat antrean finalisasi LHU.'));
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const data = await lhuReviewApi.getLhuFinalizationHistory();
      setHistoryRows(data || []);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const nextTab = params.get('tab');
    const nextSearch = params.get('q');

    if (['finalisasi', 'history'].includes(nextTab)) {
      setActiveTab(nextTab);
    }

    if (nextSearch !== null) {
      setSearch(nextSearch);
    }
  }, [location.search]);

  const filteredQueue = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return queue;

    return queue.filter((item) =>
      [
        item.noSampel,
        item.no_sampel,
        ...(Array.isArray(item.sampleNos || item.sample_nos) ? (item.sampleNos || item.sample_nos) : []),
        item.totalSampel,
        item.total_sampel,
        item.nomorFppl,
        item.nomor_fppl,
        item.idRegistrasi,
        item.id_registrasi,
        item.jenisSampel,
        item.jenis_sampel,
        item.statusLhu,
        item.status_lhu,
        item.tanggalPengambilanSampel,
        item.tanggal_pengambilan_sampel,
        item.tanggalPenerimaan,
        item.tanggal_penerimaan,
        item.acuanPengambilanSampel,
        item.acuan_pengambilan_sampel,
        item.abnormalitasSampel,
        item.abnormalitas_sampel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [queue, search]);

  const filteredHistoryRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return historyRows;

    return historyRows.filter((item) =>
      [
        item.nomorLhu,
        item.nomor_lhu,
        item.nomorFppl,
        item.nomor_fppl,
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
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [historyRows, search]);

  const summary = useMemo(() => {
    const total = queue.length;

    const belumDibuat = queue.filter((item) => {
      const status = String(getStatusLhu(item)).toLowerCase();
      return status.includes('menunggu qc') || status.includes('draft') || status.includes('belum');
    }).length;

    const menungguKalab = historyRows.filter((item) =>
      String(getStatusLhu(item)).toLowerCase().includes('menunggu persetujuan kepala lab')
    ).length;

    const disahkan = historyRows.filter((item) =>
      String(getStatusLhu(item)).toLowerCase().includes('disahkan')
    ).length;

    return {
      total,
      belumDibuat,
      menungguKalab,
      disahkan,
    };
  }, [queue, historyRows]);

  async function loadPreviewFor(identifier, idPktBm, sampleNos = form.sampleNos) {
    const requestId = String(identifier || '').trim();
    const paketId = String(idPktBm || '').trim();
    const selectedNos = Array.isArray(sampleNos) ? sampleNos.filter(Boolean) : [];

    if (!requestId || !paketId || selectedNos.length === 0) {
      setPreviewData(null);
      return;
    }

    setLoadingPreview(true);

    try {
      const data = await lhuReviewApi.getLhuFinalizationPreview(requestId, paketId, selectedNos);
      setPreviewData(data || null);
      setDetailOrderFromRows(data?.details || data?.detailLhu || data?.detail_lhu || []);
    } catch (error) {
      setPreviewData(null);
      showError(getErrorMessage(error, 'Gagal membuat preview LHU.'));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function openFinalizationDetail(item) {
    const requestId = getRequestId(item);

    if (!requestId) {
      showWarning('ID registrasi tidak valid.');
      return;
    }

    const initialSampleNos = getSampleNos(item);

    setSelectedSample(item);
    setDetailMode('finalisasi');
    setDetailData(null);
    setPreviewData(null);
    setDetailOrder([]);
    setShowDetailModal(true);
    setLoadingDetail(true);

    setForm({
      idPktBm: '',
      sampleNos: initialSampleNos,
    });

    try {
      const detail = await lhuReviewApi.getLhuFinalizationDetail(requestId) || {};
      setDetailData(detail);
      setDetailOrderFromRows(detail?.details || detail?.detailLhu || detail?.detail_lhu || []);

      const detailSamples = detail.samples || detail.sampels || [];
      const availableNos = detailSamples.map((sample) => sample.noSampel || sample.no_sampel).filter(Boolean);
      const selectedNos = initialSampleNos.length
        ? initialSampleNos.filter((noSampel) => availableNos.includes(noSampel))
        : availableNos;

      const nextForm = {
        idPktBm: detail.lhu?.id_pkt_bm || detail.lhu?.idPktBm || item.idPktBm || item.id_pkt_bm || '',
        sampleNos: selectedNos,
      };

      setForm(nextForm);

      if (nextForm.idPktBm && selectedNos.length) {
        await loadPreviewFor(requestId, nextForm.idPktBm, selectedNos);
      }
    } catch (error) {
      showError(getErrorMessage(error, 'Gagal memuat detail finalisasi LHU.'));
      closeDetail();
    } finally {
      setLoadingDetail(false);
    }
  }

  async function openHistoryDetail(item) {
    const nomorLhu = getNomorLhu(item);

    if (!nomorLhu) {
      showWarning('Nomor LHU tidak valid.');
      return;
    }

    setSelectedSample(item);
    setDetailMode('history');
    setDetailData(null);
    setPreviewData(null);
    setDetailOrder([]);

    setShowDetailModal(true);
    setLoadingDetail(true);

    try {
      const data = await lhuReviewApi.getLhuDetailByNomor(nomorLhu);
      setDetailData(data || null);
      setDetailOrderFromRows(data?.details || data?.detailLhu || data?.detail_lhu || []);
    } catch (error) {
      showError(getErrorMessage(error, 'Gagal memuat detail LHU.'));
      closeDetail();
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeDetail() {
    setSelectedSample(null);
    setDetailMode('finalisasi');
    setShowDetailModal(false);
    setDetailData(null);
    setPreviewData(null);
    setDetailOrder([]);
    setLoadingDetail(false);
    setLoadingPreview(false);
    setSubmitting(false);
    setConfirmFinalizeModal({ open: false, sampleLabel: '' });
    setForm({
      idPktBm: '',
      sampleNos: [],
    });
  }



  useEffect(() => {
    const nomorLhu = String(initialLhuNumber || '').trim();
    if (!nomorLhu || loadingHistory) return;

    const targetRow = historyRows.find((row) => getNomorLhu(row) === nomorLhu) || { nomor_lhu: nomorLhu };
    setActiveTab('history');
    openHistoryDetail(targetRow);
    // initialLhuNumber hanya digunakan untuk deep-link pembuka modal riwayat QC.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLhuNumber, loadingHistory]);

  function moveSampleRow(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    const currentNos = Array.isArray(form.sampleNos) ? [...form.sampleNos] : [];
    if (!currentNos.length || fromIndex >= currentNos.length || toIndex >= currentNos.length) return;

    const nextNos = [...currentNos];
    const [moved] = nextNos.splice(fromIndex, 1);
    nextNos.splice(toIndex, 0, moved);

    setForm((prev) => ({ ...prev, sampleNos: nextNos }));
    setPreviewData(null);

    if (form.idPktBm && nextNos.length) {
      loadPreviewFor(getRequestId(selectedSample), form.idPktBm, nextNos);
    }
  }


  function handleFinalize() {
    if (!isQcEditableLhuStatus(selectedStatus)) {
      showWarning('LHU sudah masuk tahap approval Kepala Lab atau sudah disahkan, sehingga tidak bisa difinalisasi ulang oleh QC.');
      return;
    }

    const validationMessage = validateQcFinalize({
      selectedSample,
      form,
      detailRows: displayDetails,
    });

    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    const sampleLabel = Array.isArray(form.sampleNos) ? form.sampleNos.join(', ') : '';
    setConfirmFinalizeModal({ open: true, sampleLabel });
  }

  function closeConfirmFinalizeModal() {
    if (submitting) return;
    setConfirmFinalizeModal({ open: false, sampleLabel: '' });
  }

  async function confirmFinalizeLhu() {
    setSubmitting(true);

    try {
      const data = await lhuReviewApi.finalizeLhu(
        buildQcFinalizePayload({ selectedSample, form, detailRows: displayDetails })
      );

      const nomorLhu = data.data?.nomorLhu || data.data?.nomor_lhu;

      showSuccess(
        nomorLhu
          ? `LHU ${nomorLhu} berhasil dibuat dan dikirim ke Kepala Lab.`
          : 'LHU berhasil dibuat dan dikirim ke Kepala Lab.'
      );

      setConfirmFinalizeModal({ open: false, sampleLabel: '' });
      closeDetail();
      await loadQueue();
      await loadHistory();
      setActiveTab('history');
    } catch (error) {
      showError(getErrorMessage(error, 'Gagal finalisasi LHU.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function openPdf(filePathOrItem) {
    let filePath = typeof filePathOrItem === 'string' ? filePathOrItem : getFilePath(filePathOrItem || {});
    const nomorLhu = typeof filePathOrItem === 'object' ? getNomorLhu(filePathOrItem) : '';

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
  }

  const sampleInfo = detailData?.sample || {};
  const lhuInfo = detailData?.lhu || detailData?.lhuInfo || detailData || {};
  const paketBmOptions = detailData?.paketBmOptions || detailData?.paket_bm_options || [];
  const pelangganInfo = detailData?.pelanggan || detailData?.customer || detailData?.pemohon || {};

  const selectedNoSampel =
    (Array.isArray(form.sampleNos) && form.sampleNos.length ? form.sampleNos.join(', ') : '') ||
    getNoSampel(selectedSample) ||
    lhuInfo.no_sampel ||
    lhuInfo.noSampel ||
    '';

  const selectedNomorLhu =
    getNomorLhu(selectedSample) ||
    lhuInfo.nomor_lhu ||
    lhuInfo.nomorLhu ||
    '';

  const selectedStatus = pickValue(
    lhuInfo.status_lhu,
    lhuInfo.statusLhu,
    selectedSample?.statusLhu,
    selectedSample?.status_lhu,
    'Menunggu QC'
  );

  const hasExistingLhu = Boolean(
    lhuInfo.nomor_lhu ||
      lhuInfo.nomorLhu ||
      selectedSample?.nomorLhu ||
      selectedSample?.nomor_lhu
  );

  function dedupeDetails(details = []) {
    const map = new Map();

    (Array.isArray(details) ? details : []).forEach((row, index) => {
      const key = getDetailRowId(row, index);
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          ...row,
          samples: Array.isArray(row.samples || row.sampels) ? [...(row.samples || row.sampels)] : [],
          sampels: Array.isArray(row.sampels || row.samples) ? [...(row.sampels || row.samples)] : [],
          hasil_by_sample: { ...(row.hasil_by_sample || row.hasilBySample || {}) },
          hasilBySample: { ...(row.hasilBySample || row.hasil_by_sample || {}) },
        });
      }

      const current = map.get(key);
      const noSampel = String(row.no_sampel || row.noSampel || '').trim();
      const hasil = row.hasil || row.hasil_snapshot || row.hasilSnapshot || '';

      if (noSampel) {
        current.hasil_by_sample[noSampel] = hasil;
        current.hasilBySample[noSampel] = hasil;
        if (!current.samples.includes(noSampel)) current.samples.push(noSampel);
        if (!current.sampels.includes(noSampel)) current.sampels.push(noSampel);
        current.hasil = current.samples.map((sampleNo) => `${sampleNo}: ${current.hasil_by_sample[sampleNo] || '-'}`).join('\n');
        current.hasil_snapshot = current.hasil;
        current.hasilSnapshot = current.hasil;
      }
    });

    return Array.from(map.values());
  }
  const rawDisplayDetails =
    previewData?.details ||
    previewData?.detailLhu ||
    previewData?.detail_lhu ||
    detailData?.details ||
    (hasExistingLhu ? detailData?.detail_lhu : []) ||
    [];

  const baseDisplayDetails = dedupeDetails(rawDisplayDetails);
  const displayDetails = [...baseDisplayDetails].sort((a, b) => {
    const indexA = detailOrder.indexOf(getDetailRowId(a));
    const indexB = detailOrder.indexOf(getDetailRowId(b));

    const orderA = indexA >= 0 ? indexA : Number(a.urutan_lhu || a.urutanLhu || 9999);
    const orderB = indexB >= 0 ? indexB : Number(b.urutan_lhu || b.urutanLhu || 9999);

    return orderA - orderB;
  });

  function moveDetailRow(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    const currentIds = displayDetails.map((row, index) => getDetailRowId(row, index));
    const nextIds = [...currentIds];
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, moved);
    setDetailOrder(nextIds);
  }

  const displayAkreditasi =
    previewData?.akreditasi ||
    detailData?.akreditasi ||
    null;

  const previewPaket =
    previewData?.paketBm ||
    previewData?.paket_bm ||
    paketBmOptions.find((pkt) => getPktValue(pkt) === form.idPktBm);

  const selectedFilePath =
    getFilePath(lhuInfo) ||
    getFilePath(selectedSample);


  return {
    activeTab,
    setActiveTab,
    queue,
    historyRows,
    search,
    setSearch,
    loadingQueue,
    loadingHistory,
    selectedSample,
    setSelectedSample,
    detailMode,
    setDetailMode,
    showDetailModal,
    setShowDetailModal,
    detailData,
    setDetailData,
    previewData,
    setPreviewData,
    loadingDetail,
    loadingPreview,
    submitting,
    form,
    setForm,
    loadQueue,
    loadHistory,
    filteredQueue,
    filteredHistoryRows,
    summary,
    loadPreviewFor,
    openFinalizationDetail,
    openHistoryDetail,
    closeDetail,
    handleFinalize,
    confirmFinalizeModal,
    closeConfirmFinalizeModal,
    confirmFinalizeLhu,
    openPdf,
    sampleInfo,
    lhuInfo,
    paketBmOptions,
    pelangganInfo,
    selectedNoSampel,
    selectedNomorLhu,
    selectedStatus,
    canFinalizeSelectedLhu: isQcEditableLhuStatus(selectedStatus),
    hasExistingLhu,
    dedupeDetails,
    rawDisplayDetails,
    displayDetails,
    detailOrder,
    moveDetailRow,
    moveSampleRow,
    displayAkreditasi,
    previewPaket,
    selectedFilePath,
    getRequestId,
    getSampleNos,
  };

}
