import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analisAssignmentApi } from '../../../api/analisAssignmentApi';
import { getLkaRevisionHistory } from '../../../api/lkaRevisionApi';
import { buildTestingBusinessTimeline, compareYmd, isBusinessDayYmd } from '../../../utils/businessDays';
import { applyLkaRevisionHistoryToRows, getKodeLkaFromWorkDetail } from '../../../utils/lkaRevisionRowAdapter';
import {
  MAX_WORKSHEET_FILES,
  formatDateInput,
  getAcuanPengambilanSampel,
  getAbnormalitasSampel,
  getFileExtension,
  getFileNameFromPath,
  getJamPenerimaanSampel,
  getKondisiSampel,
  getKoordinatSampel,
  getKasiPengujianRevisionNote,
  getPenyeliaRevisionNote,
  getProgressStats,
  getTanggalPenerimaanSampel,
  getTanggalPengambilanSampel,
  getWorksheetUploadEndpoints,
  isPerluRevisiStatus,
  isRowUnderRevision,
  isValidNumericResult,
  normalizeStatus,
  normalizeWorksheetFiles,
  serializeWorksheetFiles,
  validateWorksheetFile,
} from './analisDetailUtils';

function getWorksheetRevisionFallback(detail = {}) {
  return String(
    detail?.worksheet?.catatanRevisi ||
      detail?.worksheet?.catatan_revisi ||
      detail?.catatanRevisi ||
      detail?.catatan_revisi ||
      ''
  ).trim();
}

function mapDetailResultRows(samples = [], detail = {}) {
  const fallbackRevisionNote = getWorksheetRevisionFallback(detail);
  const kodeLka = getKodeLkaFromWorkDetail(detail);

  return samples.map((row) => {
    const rowStatus = row.statusReviewHasil || row.status_review_hasil || '';
    const rowPenyeliaRevisionNote =
      getPenyeliaRevisionNote(row) ||
      (isPerluRevisiStatus(rowStatus) ? fallbackRevisionNote : '');
    const rowKasiRevisionNote = getKasiPengujianRevisionNote(row);
    const rowRevisionNote = rowPenyeliaRevisionNote || rowKasiRevisionNote || '';
    const revisiPenyeliaBy = row.revisiPenyeliaBy || row.revisi_penyelia_by || row.direvisiOleh || row.direvisi_oleh || null;
    const revisiPenyeliaAt = row.revisiPenyeliaAt || row.revisi_penyelia_at || row.direvisiPada || row.direvisi_pada || null;
    const revisiKasiBy = row.revisiKasiPengujianBy || row.revisi_kasi_pengujian_by || null;
    const revisiKasiAt = row.revisiKasiPengujianAt || row.revisi_kasi_pengujian_at || null;

    return ({
    kodeLka: row.kodeLka || row.kode_lka || kodeLka || '',
    kode_lka: row.kode_lka || row.kodeLka || kodeLka || '',

    noSampel: row.noSampel || row.no_sampel,
    no_sampel: row.no_sampel || row.noSampel,


    statusReviewHasil: row.statusReviewHasil || row.status_review_hasil || '',
    status_review_hasil: row.status_review_hasil || row.statusReviewHasil || '',

    catatanRevisiHasilPenyelia: rowPenyeliaRevisionNote,
    catatan_revisi_hasil_penyelia: rowPenyeliaRevisionNote,

    catatanRevisiHasilKasiPengujian: rowKasiRevisionNote,
    catatan_revisi_hasil_kasi_pengujian: rowKasiRevisionNote,

    catatanRevisiHasil: rowRevisionNote,
    catatan_revisi_hasil: rowRevisionNote,

    revisiPenyeliaBy,
    revisi_penyelia_by: revisiPenyeliaBy,
    revisiPenyeliaAt,
    revisi_penyelia_at: revisiPenyeliaAt,

    revisiKasiPengujianBy: revisiKasiBy,
    revisi_kasi_pengujian_by: revisiKasiBy,
    revisiKasiPengujianAt: revisiKasiAt,
    revisi_kasi_pengujian_at: revisiKasiAt,

    direvisiOleh: revisiPenyeliaBy || revisiKasiBy || null,
    direvisi_oleh: revisiPenyeliaBy || revisiKasiBy || null,

    direvisiPada: revisiPenyeliaAt || revisiKasiAt || null,
    direvisi_pada: revisiPenyeliaAt || revisiKasiAt || null,

    jenisSampel: row.jenisSampel || row.jenis_sampel || '',
    jenis_sampel: row.jenis_sampel || row.jenisSampel || '',

    tanggalPengambilanSampel: getTanggalPengambilanSampel(row),
    tanggal_pengambilan_sampel: getTanggalPengambilanSampel(row),

    tanggalPenerimaan: getTanggalPenerimaanSampel(row),
    tanggal_penerimaan: getTanggalPenerimaanSampel(row),

    jamPenerimaan: getJamPenerimaanSampel(row),
    jam_penerimaan: getJamPenerimaanSampel(row),

    kondisiSampel: getKondisiSampel(row),
    kondisi_sampel: getKondisiSampel(row),

    abnormalitasSampel: getAbnormalitasSampel(row),
    abnormalitas_sampel: getAbnormalitasSampel(row),

    acuanPengambilanSampel: getAcuanPengambilanSampel(row),
    acuan_pengambilan_sampel: getAcuanPengambilanSampel(row),

    koordinat: getKoordinatSampel(row),

    hasil: row.hasil || '',

    catatanHasil:
      row.catatanHasil ||
      row.catatan_hasil ||
      '',

    catatan_hasil:
      row.catatan_hasil ||
      row.catatanHasil ||
      '',
    });
  });
}



function getWorksheetReceiptDate(detail = {}, resultRows = []) {
  const worksheet = detail?.worksheet || {};
  return (
    detail?.tanggalPenerimaan ||
    detail?.tanggal_penerimaan ||
    worksheet?.tanggalPenerimaan ||
    worksheet?.tanggal_penerimaan ||
    resultRows?.[0]?.tanggal_penerimaan ||
    resultRows?.[0]?.tanggalPenerimaan ||
    ''
  );
}

function validateWorksheetTestingWindow(form = {}, detail = {}, resultRows = [], holidayDateSet = new Set()) {
  const receiptDate = getWorksheetReceiptDate(detail, resultRows);
  if (!receiptDate) return '';

  const timeline = buildTestingBusinessTimeline(receiptDate, (dateValue) => isBusinessDayYmd(dateValue, holidayDateSet));
  const testingEnd = timeline.testingEnd;

  if (form.tanggalMulaiPengujian && !isBusinessDayYmd(form.tanggalMulaiPengujian, holidayDateSet)) {
    return 'Tanggal pengerjaan harus hari kerja dan tidak boleh Sabtu/Minggu/tanggal merah.';
  }

  if (form.tanggalSelesaiPengujian && !isBusinessDayYmd(form.tanggalSelesaiPengujian, holidayDateSet)) {
    return 'Tanggal selesai harus hari kerja dan tidak boleh Sabtu/Minggu/tanggal merah.';
  }

  if (form.tanggalMulaiPengujian && compareYmd(form.tanggalMulaiPengujian, receiptDate) < 0) {
    return 'Tanggal pengerjaan tidak boleh sebelum tanggal sampel diterima admin.';
  }

  if (form.tanggalSelesaiPengujian && compareYmd(form.tanggalSelesaiPengujian, receiptDate) < 0) {
    return 'Tanggal selesai tidak boleh sebelum tanggal sampel diterima admin.';
  }

  if (testingEnd && form.tanggalMulaiPengujian && compareYmd(form.tanggalMulaiPengujian, testingEnd) > 0) {
    return `Tanggal pengerjaan maksimal hari kerja ke-9 fase pengujian (${testingEnd}).`;
  }

  if (testingEnd && form.tanggalSelesaiPengujian && compareYmd(form.tanggalSelesaiPengujian, testingEnd) > 0) {
    return `Tanggal selesai pengujian maksimal hari kerja ke-9 (${testingEnd}).`;
  }

  return '';
}

function isFinishDateBeforeStartDate(form = {}) {
  const startDate = new Date(form.tanggalMulaiPengujian);
  const finishDate = new Date(form.tanggalSelesaiPengujian);

  return (
    form.tanggalMulaiPengujian &&
    form.tanggalSelesaiPengujian &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(finishDate.getTime()) &&
    finishDate < startDate
  );
}

function buildWorksheetFormFromPayload(worksheet = {}) {
  const worksheetFiles = normalizeWorksheetFiles(worksheet);

  return {
    tanggalMulaiPengujian: formatDateInput(
      worksheet.tanggalMulaiPengujian ||
      worksheet.tanggal_mulai_pengujian
    ),
    tanggalSelesaiPengujian: formatDateInput(
      worksheet.tanggalSelesaiPengujian ||
      worksheet.tanggal_selesai_pengujian
    ),
    dhlAkuades: worksheet.dhlAkuades || worksheet.dhl_akuades || '',
    fileWorksheetPath: worksheetFiles[0]?.path || worksheet.fileWorksheetPath || '',
    worksheetFiles,
  };
}

export function useAnalisDetailSampel({ idPenugasanDetail }) {
  const [loading, setLoading] = useState(true);
  const [savingResults, setSavingResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [worksheetForm, setWorksheetForm] = useState({
    tanggalMulaiPengujian: '',
    tanggalSelesaiPengujian: '',
    dhlAkuades: '',
    fileWorksheetPath: '',
    worksheetFiles: [],
  });
  const [resultRows, setResultRows] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [showDhlScientificHelper, setShowDhlScientificHelper] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [holidayDateSet, setHolidayDateSet] = useState(new Set());
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });

    setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 3500);
  }, []);

  const handleInsertDhlSymbol = useCallback((symbol) => {
    setWorksheetForm((prev) => {
      const currentValue = String(prev.dhlAkuades || '').trim();

      return {
        ...prev,
        dhlAkuades: currentValue
          ? `${currentValue} ${symbol}`
          : symbol,
      };
    });
  }, []);

  const isLhuLocked = useMemo(() => {
    return Boolean(
      detail?.isLhuGenerated ||
      detail?.is_lhu_generated ||
      detail?.isLhuLocked ||
      detail?.is_lhu_locked
    );
  }, [detail]);

  const isReadOnly = useMemo(() => {
    if (isLhuLocked) return true;

    const detailStatus = normalizeStatus(detail?.statusDetail || detail?.status_detail);
    const lkaStatus = normalizeStatus(
      detail?.worksheet?.statusLka ||
      detail?.worksheet?.status_lka
    );

    const revisionStatuses = new Set([
      'perlu revisi',
      'perlu perbaikan',
      'revisi',
    ]);

    const lockedStatuses = new Set([
      'worksheet terkirim',
      'menunggu review',
      'menunggu verifikasi penyelia',
      'disetujui',
      'disetujui penyelia',
      'selesai',
    ]);

    if (
      revisionStatuses.has(detailStatus) ||
      revisionStatuses.has(lkaStatus)
    ) {
      return false;
    }

    if (
      lockedStatuses.has(detailStatus) ||
      lockedStatuses.has(lkaStatus)
    ) {
      return true;
    }

    return false;
  }, [detail, isLhuLocked]);

  const isRevisionMode = useMemo(() => {
    const detailStatus = normalizeStatus(detail?.statusDetail || detail?.status_detail);
    const lkaStatus = normalizeStatus(
      detail?.worksheet?.statusLka ||
      detail?.worksheet?.status_lka
    );

    return (
      isPerluRevisiStatus(detailStatus) ||
      isPerluRevisiStatus(lkaStatus)
    );
  }, [detail]);

  const hasSpecificRevisionRows = useMemo(() => {
    return resultRows.some((row) => isRowUnderRevision(row));
  }, [resultRows]);

  const isAllRowsRevision = useMemo(() => {
    return (
      resultRows.length > 0 &&
      resultRows.every((row) => isRowUnderRevision(row))
    );
  }, [resultRows]);

  const canEditWorksheetMeta = useMemo(() => {
    if (isReadOnly) return false;
    if (!isRevisionMode) return true;
    if (!hasSpecificRevisionRows) return true;

    return isAllRowsRevision;
  }, [isReadOnly, isRevisionMode, hasSpecificRevisionRows, isAllRowsRevision]);

  const canEditResultRow = useCallback((row) => {
    if (isReadOnly) return false;
    if (!isRevisionMode) return true;
    if (!hasSpecificRevisionRows) return true;

    return isRowUnderRevision(row);
  }, [isReadOnly, isRevisionMode, hasSpecificRevisionRows]);

  const editableResultRows = useMemo(() => {
    return resultRows.filter((row) => canEditResultRow(row));
  }, [resultRows, canEditResultRow]);

  const progressStats = useMemo(() => getProgressStats(resultRows), [resultRows]);
  const worksheetFiles = worksheetForm.worksheetFiles || [];

  const loadDetail = useCallback(async () => {
    if (!idPenugasanDetail) return;

    setLoading(true);
    setError('');

    try {
      const data = await analisAssignmentApi.getWorkDetail(idPenugasanDetail);
      const payload = data.data || {};
      const worksheet = payload.worksheet || {};
      const samples = payload.samples || payload.results || [];

      let mappedRows = mapDetailResultRows(samples, payload);
      const kodeLka = getKodeLkaFromWorkDetail(payload);

      if (kodeLka) {
        try {
          const revisionPayload = await getLkaRevisionHistory(kodeLka);
          mappedRows = applyLkaRevisionHistoryToRows(mappedRows, revisionPayload);
        } catch (revisionError) {
          console.warn('[phase42] Gagal mengambil riwayat revisi LKA, gunakan data hasil yang tersedia.', revisionError);
        }
      }

      setDetail(payload);
      setWorksheetForm(buildWorksheetFormFromPayload(worksheet));
      setResultRows(mappedRows);
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [idPenugasanDetail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    let mounted = true;

    analisAssignmentApi
      .getHolidays()
      .then((rows) => {
        if (!mounted) return;

        const nextSet = new Set();
        (Array.isArray(rows) ? rows : []).forEach((item) => {
          const date = item?.date || item?.tanggal || item?.tanggal_libur;
          if (date) nextSet.add(String(date).slice(0, 10));
        });

        setHolidayDateSet(nextSet);
      })
      .catch(() => {
        if (!mounted) return;
        setHolidayDateSet(new Set());
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleWorksheetFileChange = useCallback(async (event) => {
    if (isReadOnly) {
      showToast('File tidak dapat diubah karena LKA sudah dikirim.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    const currentFiles = worksheetForm.worksheetFiles || [];

    if (currentFiles.length + selectedFiles.length > MAX_WORKSHEET_FILES) {
      showToast(`Maksimal upload ${MAX_WORKSHEET_FILES} file LKA.`, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validationError = selectedFiles
      .map(validateWorksheetFile)
      .find(Boolean);

    if (validationError) {
      showToast(validationError, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    try {
      let lastMessage = 'Gagal upload file LKA.';
      let uploadedFiles = [];

      for (const endpoint of getWorksheetUploadEndpoints(idPenugasanDetail)) {
        try {
          const formData = new FormData();

          selectedFiles.forEach((file) => {
            formData.append('files', file);
          });

          const data = await analisAssignmentApi.uploadWorksheetFile(endpoint, formData);

          uploadedFiles =
            data.data?.files ||
            data.files ||
            [];

          if (!uploadedFiles.length && data.data?.filePath) {
            uploadedFiles = [
              {
                path: data.data.filePath,
                originalName: getFileNameFromPath(data.data.filePath),
                mimeType: null,
                size: null,
                ext: getFileExtension(data.data.filePath),
                uploadedAt: new Date().toISOString(),
              },
            ];
          }

          break;
        } catch (err) {
          lastMessage = err.message || lastMessage;

          // Kalau backend sudah menerima endpoint tetapi menolak file dengan 400,
          // jangan dicoba lagi ke endpoint alias karena hasilnya pasti sama dan
          // hanya membuat console menampilkan dua error 400.
          if (err?.status && err.status !== 404 && err.status !== 405) {
            break;
          }
        }
      }

      if (!uploadedFiles.length) {
        showToast(lastMessage, 'error');
        return;
      }

      const normalizedUploadedFiles = normalizeWorksheetFiles({
        worksheetFiles: uploadedFiles,
      });

      setWorksheetForm((prev) => {
        const nextFiles = [
          ...(prev.worksheetFiles || []),
          ...normalizedUploadedFiles,
        ];

        return {
          ...prev,
          worksheetFiles: nextFiles,
          fileWorksheetPath: nextFiles[0]?.path || '',
        };
      });

      showToast('File LKA berhasil diupload.');
    } catch {
      showToast('Gagal terhubung ke server saat upload file.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [idPenugasanDetail, isReadOnly, showToast, worksheetForm.worksheetFiles]);

  const handleRemoveWorksheetFile = useCallback((fileIndex) => {
    if (isReadOnly) {
      showToast('File tidak dapat dihapus karena LKA sudah dikirim.', 'error');
      return;
    }

    setWorksheetForm((prev) => {
      const nextFiles = prev.worksheetFiles.filter((_, index) => index !== fileIndex);

      return {
        ...prev,
        worksheetFiles: nextFiles,
        fileWorksheetPath: nextFiles[0]?.path || '',
      };
    });
  }, [isReadOnly, showToast]);

  const buildResultPayload = useCallback(() => {
    const sourceRows = isRevisionMode && hasSpecificRevisionRows
      ? editableResultRows
      : resultRows;

    return sourceRows.map((row) => ({
    
      noSampel: row.noSampel || row.no_sampel,
      no_sampel: row.no_sampel || row.noSampel,

      hasil: row.hasil || '',

      catatanHasil:
        row.catatanHasil ||
        row.catatan_hasil ||
        '',

      catatan_hasil:
        row.catatan_hasil ||
        row.catatanHasil ||
        '',
    }));
  }, [editableResultRows, hasSpecificRevisionRows, isRevisionMode, resultRows]);

  const getRowsToValidate = useCallback(() => {
    return isRevisionMode && hasSpecificRevisionRows
      ? editableResultRows
      : resultRows;
  }, [editableResultRows, hasSpecificRevisionRows, isRevisionMode, resultRows]);

  const getMissingSubmitFields = useCallback(() => {
    const missing = [];

    if (!String(worksheetForm.tanggalMulaiPengujian || '').trim()) {
      missing.push('Tanggal pengerjaan');
    }

    if (!String(worksheetForm.tanggalSelesaiPengujian || '').trim()) {
      missing.push('Tanggal selesai');
    }

    if (!String(worksheetForm.dhlAkuades || '').trim()) {
      missing.push('DHL akuades');
    }

    if (!worksheetForm.worksheetFiles?.length) {
      missing.push('File Worksheet');
    }

    const rowsToValidate = getRowsToValidate();

    if (!rowsToValidate.length) {
      missing.push('Hasil Pengujian Sampel');
    } else {
      const emptyResults = rowsToValidate.filter(
        (row) => !String(row.hasil || '').trim()
      );

      if (emptyResults.length > 0) {
        missing.push('Semua hasil pengujian sampel yang perlu diperbaiki');
      }
    }

    return missing;
  }, [getRowsToValidate, worksheetForm]);

  const validateNumericResults = useCallback(() => {
    const rowsToValidate = getRowsToValidate();

    return rowsToValidate.find(
      (row) =>
        String(row.hasil || '').trim() &&
        !isValidNumericResult(row.hasil)
    );
  }, [getRowsToValidate]);

  const saveWorksheetAndResults = useCallback(async () => {
    await analisAssignmentApi.saveWorksheet(idPenugasanDetail, {
      tanggalMulaiPengujian: worksheetForm.tanggalMulaiPengujian || null,
      tanggalSelesaiPengujian: worksheetForm.tanggalSelesaiPengujian || null,
      dhlAkuades: worksheetForm.dhlAkuades || null,
      fileWorksheetPath: worksheetForm.worksheetFiles.length
        ? serializeWorksheetFiles(worksheetForm.worksheetFiles)
        : null,
    });

    await analisAssignmentApi.saveResults(idPenugasanDetail, {
      results: buildResultPayload(),
    });
  }, [buildResultPayload, idPenugasanDetail, worksheetForm]);

  const handleSaveResults = useCallback(async () => {
    if (isReadOnly) {
      showToast('Hasil tidak dapat diubah karena LKA sudah dikirim.', 'error');
      return;
    }

    const rowsToValidate = getRowsToValidate();

    if (!rowsToValidate.length) {
      showToast('Tidak ada sampel yang bisa diubah pada tugas ini.', 'error');
      return;
    }

    const invalidResult = validateNumericResults();

    if (invalidResult) {
      showToast(
        `Hasil sampel ${invalidResult.noSampel || invalidResult.no_sampel} harus berupa angka. Gunakan koma untuk desimal, contoh: 7,5.`,
        'error'
      );
      return;
    }

    if (isFinishDateBeforeStartDate(worksheetForm)) {
      showToast('Tanggal selesai tidak boleh sebelum tanggal pengerjaan.', 'error');
      return;
    }

    const testingWindowError = validateWorksheetTestingWindow(worksheetForm, detail, resultRows, holidayDateSet);
    if (testingWindowError) {
      showToast(testingWindowError, 'error');
      return;
    }

    setSavingResults(true);

    try {
      await saveWorksheetAndResults();

      showToast('Data LKA dan hasil pengujian berhasil disimpan.');
      loadDetail();
    } catch (err) {
      showToast(err.message || 'Gagal terhubung ke server.', 'error');
    } finally {
      setSavingResults(false);
    }
  }, [detail, getRowsToValidate, holidayDateSet, isReadOnly, loadDetail, resultRows, saveWorksheetAndResults, showToast, validateNumericResults, worksheetForm]);

  const handleSubmitWorksheet = useCallback(async () => {
    if (isReadOnly) {
      showToast('Worksheet sudah dikirim dan tidak dapat diubah.', 'error');
      return;
    }

    const missingFields = getMissingSubmitFields();

    if (missingFields.length > 0) {
      showToast(
        `Lengkapi data berikut sebelum mengirim: ${missingFields.join(', ')}.`,
        'error'
      );
      return;
    }

    const invalidResult = validateNumericResults();

    if (invalidResult) {
      showToast(
        `Hasil sampel ${invalidResult.noSampel || invalidResult.no_sampel} harus berupa angka. Gunakan koma untuk desimal, contoh: 7,5.`,
        'error'
      );
      return;
    }

    if (isFinishDateBeforeStartDate(worksheetForm)) {
      showToast('Tanggal selesai tidak boleh sebelum tanggal pengerjaan.', 'error');
      return;
    }

    const testingWindowError = validateWorksheetTestingWindow(worksheetForm, detail, resultRows, holidayDateSet);
    if (testingWindowError) {
      showToast(testingWindowError, 'error');
      return;
    }

    setSubmitting(true);

    try {
      await analisAssignmentApi.submitWorksheet(idPenugasanDetail, {
        worksheet: {
          tanggalMulaiPengujian: worksheetForm.tanggalMulaiPengujian,
          tanggalSelesaiPengujian: worksheetForm.tanggalSelesaiPengujian,
          dhlAkuades: worksheetForm.dhlAkuades,
          fileWorksheetPath: serializeWorksheetFiles(worksheetForm.worksheetFiles),
        },
        results: buildResultPayload(),
      });

      showToast('Worksheet dan hasil berhasil dikirim ke Penyelia.');
      loadDetail();
    } catch (err) {
      showToast(err.message || 'Gagal terhubung ke server.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [buildResultPayload, detail, getMissingSubmitFields, holidayDateSet, idPenugasanDetail, isReadOnly, loadDetail, resultRows, showToast, validateNumericResults, worksheetForm]);

  const handleOpenPreview = useCallback(async (file) => {
    setPreviewFile(file);
    setPreviewPayload(null);
    setPreviewError('');
    setLoadingPreview(true);

    try {
      const data = await analisAssignmentApi.previewWorksheet(file.path);
      setPreviewPayload(data.data || null);
    } catch (err) {
      setPreviewError(err.message || 'Gagal terhubung ke server saat memuat preview.');
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
    setPreviewPayload(null);
    setPreviewError('');
    setLoadingPreview(false);
  }, []);

  return {
    loading,
    savingResults,
    submitting,
    uploading,
    error,
    detail,
    worksheetForm,
    setWorksheetForm,
    resultRows,
    setResultRows,
    previewFile,
    showDhlScientificHelper,
    setShowDhlScientificHelper,
    previewPayload,
    loadingPreview,
    previewError,
    toast,
    setToast,
    fileInputRef,
    isReadOnly,
    isLhuLocked,
    canEditWorksheetMeta,
    canEditResultRow,
    isRevisionMode,
    hasSpecificRevisionRows,
    progressStats,
    worksheetFiles,
    handleInsertDhlSymbol,
    handleWorksheetFileChange,
    handleRemoveWorksheetFile,
    handleSaveResults,
    handleSubmitWorksheet,
    handleOpenPreview,
    handleClosePreview,
  };
}
