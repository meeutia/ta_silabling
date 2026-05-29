import { useCallback, useEffect, useMemo, useState } from 'react';
import { penyeliaPenugasanDetailApi } from '../../../../api/penyeliaPenugasanDetailApi';
import { showError, showSuccess, showWarning } from '../../../../utils/feedback';
import {
  canApproveDetail,
  canEditDetailDeadline,
  canRequestRevisionToAnalyst,
  getKasiRevisionNote,
  getPenyeliaRevisionNote,
  getSampleLkaHasilTargetKey,
  isSampleWaitingPenyelia,
  normalizeReviewWorksheetFiles,
} from './penyeliaPenugasanDetailUtils';

const EMPTY_REVISION_MODAL = {
  open: false,
  detail: null,
  mode: 'all',
  selectedIds: [],
};

const EMPTY_WORKSHEET_MODAL = {
  open: false,
  detail: null,
};

const EMPTY_DEADLINE_MODAL = {
  open: false,
  detail: null,
};

const EMPTY_APPROVE_MODAL = {
  open: false,
  detail: null,
};

const EMPTY_KASI_REVISION_REVIEW_MODAL = {
  open: false,
  revision: null,
};

function buildSummary(detailData) {
  if (!detailData) {
    return {
      totalDetail: 0,
      totalSampel: 0,
      totalWorksheetSubmitted: 0,
      totalMenungguReview: 0,
      totalPerluRevisi: 0,
      totalDisetujui: 0,
    };
  }

  return {
    totalDetail: detailData.totalDetail || 0,
    totalSampel: detailData.totalSampel || 0,
    totalWorksheetSubmitted: detailData.totalWorksheetSubmitted || 0,
    totalMenungguReview: detailData.totalMenungguReview || 0,
    totalPerluRevisi: detailData.totalPerluRevisi || 0,
    totalDisetujui: detailData.totalDisetujui || 0,
  };
}


function toDateInputValue(value) {
  if (!value) return '';
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function buildInitialRevisionNote(detail = {}) {
  const kasiNote = getKasiRevisionNote(detail);
  const penyeliaNote =
    detail?.worksheet?.catatanRevisi ||
    detail?.worksheet?.catatan_revisi ||
    '';

  if (!kasiNote) return penyeliaNote;

  return `[Revisi Kasi Pengujian]\n${kasiNote}\n\nInstruksi Penyelia untuk Analis:\n`;
}

export function usePenyeliaPenugasanDetailPage(idPenugasan, idPenugasanDetail = '') {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [revisionModal, setRevisionModal] = useState(EMPTY_REVISION_MODAL);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionSampleNotes, setRevisionSampleNotes] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [pendingKasiRevisions, setPendingKasiRevisions] = useState([]);
  const [reviewingKasiRevisionId, setReviewingKasiRevisionId] = useState('');
  const [kasiRevisionReviewModal, setKasiRevisionReviewModal] = useState(EMPTY_KASI_REVISION_REVIEW_MODAL);
  const [kasiRevisionReviewAction, setKasiRevisionReviewAction] = useState('approve');
  const [kasiRevisionReviewNote, setKasiRevisionReviewNote] = useState('');

  const [worksheetModal, setWorksheetModal] = useState(EMPTY_WORKSHEET_MODAL);
  const [worksheetDownloadFile, setWorksheetDownloadFile] = useState(null);

  const [deadlineModal, setDeadlineModal] = useState(EMPTY_DEADLINE_MODAL);
  const [deadlineValue, setDeadlineValue] = useState('');
  const [approveModal, setApproveModal] = useState(EMPTY_APPROVE_MODAL);

  const fetchReview = useCallback(async ({ silent = false } = {}) => {
    if (!idPenugasan) return;

    if (!silent) setLoading(true);

    try {
      const data = await penyeliaPenugasanDetailApi.getReviewDetails(idPenugasan, idPenugasanDetail);
      setDetailData(data || null);
    } catch (err) {
      setDetailData(null);
      showError(err.message || 'Gagal memuat detail review penugasan.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [idPenugasan, idPenugasanDetail]);



  const fetchPendingKasiRevisions = useCallback(async () => {
    try {
      const rows = await penyeliaPenugasanDetailApi.getPendingKasiRevisionRequests();
      setPendingKasiRevisions(Array.isArray(rows) ? rows : []);
    } catch {
      setPendingKasiRevisions([]);
    }
  }, []);

  useEffect(() => {
    fetchReview();
    fetchPendingKasiRevisions();
  }, [fetchReview, fetchPendingKasiRevisions]);

  const summary = useMemo(() => buildSummary(detailData), [detailData]);

  const openRevisionModal = useCallback((detail) => {
    const reviewableSamples = (detail.samples || [])
      .filter((sample) => isSampleWaitingPenyelia(sample, detail))
      .filter((sample) => getSampleLkaHasilTargetKey(sample));

    const hasSampleRevisionNotes = reviewableSamples.some((sample) =>
      Boolean(
        getPenyeliaRevisionNote(sample) ||
          sample.catatanRevisi ||
          sample.catatan_revisi
      )
    );

    const initialMode = hasSampleRevisionNotes ? 'selected' : 'all';

    setRevisionModal({
      open: true,
      detail,
      mode: initialMode,
      selectedIds: initialMode === 'selected'
        ? reviewableSamples.map(getSampleLkaHasilTargetKey)
        : [],
    });

    setRevisionNotes(initialMode === 'all' ? buildInitialRevisionNote(detail) : '');
    setRevisionSampleNotes({});
  }, []);

  const closeRevisionModal = useCallback(() => {
    setRevisionModal(EMPTY_REVISION_MODAL);
    setRevisionNotes('');
    setRevisionSampleNotes({});
  }, []);

  const setRevisionMode = useCallback((mode) => {
    setRevisionModal((prev) => ({
      ...prev,
      mode,
      selectedIds: mode === 'selected' ? [] : prev.selectedIds,
    }));

    setRevisionNotes(mode === 'all' ? buildInitialRevisionNote(revisionModal.detail) : '');
    setRevisionSampleNotes({});
  }, [revisionModal.detail]);

  const toggleRevisionSample = useCallback((target = {}) => {
    const key = getSampleLkaHasilTargetKey(target);
    if (!key) return;

    setRevisionModal((prev) => {
      const current = new Set(prev.selectedIds || []);
      const willUncheck = current.has(key);

      if (willUncheck) {
        current.delete(key);
        setRevisionSampleNotes((prevNotes) => {
          const nextNotes = { ...prevNotes };
          delete nextNotes[key];
          return nextNotes;
        });
      } else {
        current.add(key);
      }

      return {
        ...prev,
        mode: 'selected',
        selectedIds: Array.from(current),
      };
    });
  }, []);

  const setRevisionSampleNote = useCallback((target = {}, value) => {
    const key = getSampleLkaHasilTargetKey(target);
    if (!key) return;

    setRevisionSampleNotes((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const buildSelectedSampleRevisionItems = useCallback(() => {
    const selectedKeys = revisionModal.selectedIds || [];
    const samples = revisionModal.detail?.samples || [];
    const byKey = new Map(samples.map((sample) => [getSampleLkaHasilTargetKey(sample), sample]).filter(([key]) => Boolean(key)));

    return selectedKeys.map((key) => {
      const sample = byKey.get(key) || {};
      return {
        kodeLka: sample.kodeLka || sample.kode_lka,
        kode_lka: sample.kode_lka || sample.kodeLka,
        noSampel: sample.noSampel || sample.no_sampel,
        no_sampel: sample.no_sampel || sample.noSampel,
        catatanRevisi: String(revisionSampleNotes[key] || '').trim(),
      };
    });
  }, [revisionModal.selectedIds, revisionModal.detail, revisionSampleNotes]);

  const openWorksheetModal = useCallback((detail) => {
    const files = normalizeReviewWorksheetFiles(detail);

    if (!files.length) {
      showWarning('File worksheet belum tersedia untuk detail ini.');
      return;
    }

    setWorksheetDownloadFile(files[0]);
    setWorksheetModal({
      open: true,
      detail,
    });
  }, []);

  const closeWorksheetModal = useCallback(() => {
    setWorksheetModal(EMPTY_WORKSHEET_MODAL);
    setWorksheetDownloadFile(null);
  }, []);

  const openDeadlineModal = useCallback((detail) => {
    if (!canEditDetailDeadline(detail)) {
      showWarning('Deadline terkunci karena hasil sudah disetujui atau selesai. Deadline tetap bisa diedit jika tenggat sudah lewat tetapi hasil analis belum selesai.');
      return;
    }

    setDeadlineModal({
      open: true,
      detail,
    });
    setDeadlineValue(
      toDateInputValue(detail?.deadline || detail?.tanggalTenggat || detail?.tanggal_tenggat)
    );
  }, []);

  const closeDeadlineModal = useCallback(() => {
    setDeadlineModal(EMPTY_DEADLINE_MODAL);
    setDeadlineValue('');
  }, []);

  const handleSubmitDeadline = useCallback(async () => {
    const detail = deadlineModal.detail;

    if (!detail) return;

    if (!deadlineValue) {
      showWarning('Deadline baru wajib diisi.');
      return;
    }

    setActionLoadingId(detail.idPenugasanDetail);

    try {
      const data = await penyeliaPenugasanDetailApi.updateDeadline(
        detail.idPenugasanDetail,
        { tanggalTenggat: deadlineValue }
      );

      showSuccess(data.message || 'Deadline penugasan berhasil diperbarui.');
      closeDeadlineModal();
      await fetchReview({ silent: true });
    } catch (err) {
      showError(err.message || 'Gagal memperbarui deadline penugasan.');
    } finally {
      setActionLoadingId(null);
    }
  }, [closeDeadlineModal, deadlineModal.detail, deadlineValue, fetchReview]);

  const openApproveModal = useCallback((detail) => {
    if (!canApproveDetail(detail)) {
      showWarning('LKA ini belum siap disetujui atau sedang dalam revisi.');
      return;
    }

    setApproveModal({
      open: true,
      detail,
    });
  }, []);

  const closeApproveModal = useCallback(() => {
    setApproveModal(EMPTY_APPROVE_MODAL);
  }, []);

  const handleSubmitApprove = useCallback(async () => {
    const detail = approveModal.detail;

    if (!detail) return;

    if (!canApproveDetail(detail)) {
      showWarning('LKA ini belum siap disetujui atau sedang dalam revisi.');
      return;
    }

    setActionLoadingId(detail.idPenugasanDetail);

    try {
      const data = await penyeliaPenugasanDetailApi.approveDetail(detail.idPenugasanDetail);
      showSuccess(data.message || 'LKA berhasil disetujui.');
      closeApproveModal();
      await fetchReview({ silent: true });
    } catch (err) {
      showError(err.message || 'Gagal menyetujui LKA.');
    } finally {
      setActionLoadingId(null);
    }
  }, [approveModal.detail, closeApproveModal, fetchReview]);

  const handleSubmitRevision = useCallback(async () => {
    const detail = revisionModal.detail;

    if (!detail) return;

    if (!canRequestRevisionToAnalyst(detail)) {
      showWarning('LKA ini belum bisa diminta revisi ke analis.');
      return;
    }

    const selectedIds =
      revisionModal.mode === 'selected'
        ? revisionModal.selectedIds || []
        : [];

    if (revisionModal.mode === 'selected') {
      if (selectedIds.length === 0) {
        showWarning('Pilih minimal satu hasil sampel yang ingin direvisi.');
        return;
      }

      const emptyNoteIds = selectedIds.filter(
        (hasilKey) => !String(revisionSampleNotes[hasilKey] || '').trim()
      );

      if (emptyNoteIds.length > 0) {
        showWarning('Catatan revisi wajib diisi untuk setiap sampel yang dipilih.');
        return;
      }
    } else if (!revisionNotes.trim()) {
      showWarning('Catatan revisi seluruh LKA wajib diisi.');
      return;
    }

    const catatanRevisi =
      revisionModal.mode === 'selected'
        ? null
        : revisionNotes.trim();
    const selectedRevisionItems =
      revisionModal.mode === 'selected' ? buildSelectedSampleRevisionItems() : [];
    const revisionPayload = {
      catatanRevisi,
      levelRevisi: revisionModal.mode === 'selected' ? 'HASIL' : 'LKA',
      level_revisi: revisionModal.mode === 'selected' ? 'HASIL' : 'LKA',
      hasilTargets: revisionModal.mode === 'selected' ? buildSelectedSampleRevisionItems() : [],
    };

    if (revisionModal.mode === 'selected') {
      revisionPayload.catatanRevisiPerSampel = selectedRevisionItems;
      revisionPayload.revisions = selectedRevisionItems;
    }

    setActionLoadingId(detail.idPenugasanDetail);

    try {
      const data = await penyeliaPenugasanDetailApi.requestRevision(
        detail.idPenugasanDetail,
        revisionPayload
      );

      showSuccess(data.message || 'Permintaan revisi berhasil dikirim.');
      setRevisionModal(EMPTY_REVISION_MODAL);
      setRevisionNotes('');
      setRevisionSampleNotes({});
      await fetchReview({ silent: true });
    } catch (err) {
      showError(err.message || 'Gagal mengirim revisi.');
    } finally {
      setActionLoadingId(null);
    }
  }, [
    buildSelectedSampleRevisionItems,
    fetchReview,
    revisionModal,
    revisionNotes,
    revisionSampleNotes,
  ]);



  const openKasiRevisionReviewModal = useCallback((revision) => {
    if (!revision) {
      showError('Data revisi Kasi tidak valid.');
      return;
    }

    setKasiRevisionReviewModal({
      open: true,
      revision,
    });
    setKasiRevisionReviewAction('approve');
    setKasiRevisionReviewNote('');
  }, []);

  const closeKasiRevisionReviewModal = useCallback(() => {
    if (reviewingKasiRevisionId) return;

    setKasiRevisionReviewModal(EMPTY_KASI_REVISION_REVIEW_MODAL);
    setKasiRevisionReviewAction('approve');
    setKasiRevisionReviewNote('');
  }, [reviewingKasiRevisionId]);

  const handleSubmitKasiRevisionReview = useCallback(async () => {
    const revision = kasiRevisionReviewModal.revision || {};
    const revisionId = String(
      revision.idRevisiLka ||
        revision.id_revisi_lka ||
        revision.id ||
        revision.id_revisi ||
        ''
    ).trim();

    if (!revisionId) {
      showError('ID revisi Kasi tidak valid.');
      return;
    }

    const action = String(kasiRevisionReviewAction || '').trim();

    if (!['approve', 'reject'].includes(action)) {
      showWarning('Pilih keputusan tanggapan penyelia.');
      return;
    }

    setReviewingKasiRevisionId(revisionId);

    try {
      const data = await penyeliaPenugasanDetailApi.reviewKasiRevisionRequest(revisionId, {
        action,
        catatanTinjauan: String(kasiRevisionReviewNote || '').trim() || null,
      });

      showSuccess(data?.message || 'Tinjauan revisi Kasi berhasil disimpan.');
      setKasiRevisionReviewModal(EMPTY_KASI_REVISION_REVIEW_MODAL);
      setKasiRevisionReviewAction('approve');
      setKasiRevisionReviewNote('');
      await Promise.all([fetchReview({ silent: true }), fetchPendingKasiRevisions()]);
    } catch (err) {
      showError(err.message || 'Gagal meninjau revisi Kasi.');
    } finally {
      setReviewingKasiRevisionId('');
    }
  }, [
    fetchPendingKasiRevisions,
    fetchReview,
    kasiRevisionReviewAction,
    kasiRevisionReviewModal.revision,
    kasiRevisionReviewNote,
  ]);

  const handleReviewKasiRevision = useCallback((revision) => {
    openKasiRevisionReviewModal(revision);
  }, [openKasiRevisionReviewModal]);

  return {
    detailData,
    loading,
    summary,
    revisionModal,
    revisionNotes,
    revisionSampleNotes,
    actionLoadingId,
    pendingKasiRevisions,
    reviewingKasiRevisionId,
    kasiRevisionReviewModal,
    kasiRevisionReviewAction,
    kasiRevisionReviewNote,
    worksheetModal,
    worksheetDownloadFile,
    deadlineModal,
    deadlineValue,
    approveModal,
    setRevisionNotes,
    setRevisionSampleNote,
    setKasiRevisionReviewAction,
    setKasiRevisionReviewNote,
    setWorksheetDownloadFile,
    setDeadlineValue,
    openRevisionModal,
    closeRevisionModal,
    setRevisionMode,
    toggleRevisionSample,
    openWorksheetModal,
    closeWorksheetModal,
    openDeadlineModal,
    closeDeadlineModal,
    openApproveModal,
    closeApproveModal,
    openKasiRevisionReviewModal,
    closeKasiRevisionReviewModal,
    handleSubmitApprove,
    handleSubmitRevision,
    handleSubmitDeadline,
    handleSubmitKasiRevisionReview,
    handleReviewKasiRevision,
  };
}
