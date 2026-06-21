import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE } from '../../utils/api';
import { formatDateOnly, formatDateTime as formatDateTimeLabel } from '../../utils/formatters';
import { getCustomerProfile } from '../../components/admin/permohonan/adminPermohonanHelpers';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AdminPermohonanListView } from '../../components/admin/permohonan/AdminPermohonanListView';
import { AdminLhuPickupModal } from '../../components/admin/permohonan/AdminLhuPickupModal';
import { AdminPermohonanDetailView } from '../../components/admin/permohonan/AdminPermohonanDetailView';
import { useAdminLhuPickup } from '../../components/admin/permohonan/useAdminLhuPickup';
import { useAdminPermohonanValidation } from '../../components/admin/permohonan/useAdminPermohonanValidation';
import {
  filterPickupRows,
  filterRequestRows,
  countActiveRequestRows,
  countHistoryRequestRows,
  getPickupScheduleLabel as getPickupScheduleLabelValue,
  getPickupStatusBadge,
  getTabFilterOptions as getAdminTabFilterOptions,
  isPickupToday,
} from '../../components/admin/permohonan/adminPermohonanListFilters';
import {
  getAdminSampleRows,
  getLhuFilePath,
  getLhuStatusBadge,
  getRequestPickupInfo,
  getRequestTrackingSteps,
  getSampleTrackingSteps,
} from '../../components/admin/permohonan/adminPermohonanTimeline';
import { buildTimeOptions, formatTimelineDateValue } from '../../components/admin/permohonan/adminPermohonanSchedule';
import { useAdminPermohonanSampling } from '../../components/admin/permohonan/useAdminPermohonanSampling';
import { useAdminPermohonanData } from '../../components/admin/permohonan/useAdminPermohonanData';
import { openFileInNewTab } from '../../components/admin/permohonan/adminPermohonanFiles';
import { getParameterList, getSampleTypeList } from '../../components/admin/permohonan/adminPermohonanSummary';
import { showError, showSuccess } from '../../utils/feedback';
import { adminPermohonanApi } from '../../api/adminPermohonanApi';

const ADMIN_SCHEDULE_TIME_OPTIONS = buildTimeOptions();

const ADMIN_PERMOHONAN_PATH = '/admin/permohonan';

function normalizeAdminTabParam(value = '') {
  const text = String(value || '').trim().toLowerCase();
  if (['pengambilan', 'lhu-pickup', 'pickup', 'pengambilan-lhu'].includes(text)) return 'Pengambilan';
  if (['riwayat', 'history'].includes(text)) return 'Riwayat';
  return 'Aktif';
}

function getDirectPickupRegistrationId(search = '') {
  const params = new URLSearchParams(search || '');
  return String(
    params.get('pickup') ||
      params.get('jadwalkan') ||
      params.get('jadwal_lhu') ||
      params.get('jadwalLhu') ||
      params.get('idRegistrasi') ||
      params.get('id_registrasi') ||
      ''
  ).trim();
}

export function AdminPermohonanPage({ initialRegistrationId = '', onDetailRouteChange = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const directPickupHandledRef = useRef('');

  const directTab = useMemo(() => normalizeAdminTabParam(new URLSearchParams(location.search || '').get('tab')), [location.search]);
  const directPickupRegistrationId = useMemo(() => getDirectPickupRegistrationId(location.search), [location.search]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('Semua');
  const [activeTab, setActiveTab] = useState('Aktif');
  const [expandedSection, setExpandedSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scheduleDecisionNotes, setScheduleDecisionNotes] = useState({});

  const openGeneratedFile = (filePath) => openFileInNewTab(filePath, API_BASE);

  const {
    selectedRequest,
    setSelectedRequest,
    loading,
    error,
    requestList,
    fetchData,
    fetchRequestDetail,

  } = useAdminPermohonanData({ setSaving });

  const {
    validationDecision,
    setValidationDecision,
    validationNote,
    setValidationNote,
    selectedSamplingTariffId,
    setSelectedSamplingTariffId,
    showDeferredPaymentModal,
    setShowDeferredPaymentModal,
    deferredPaymentNote,
    setDeferredPaymentNote,
    handleDeferredPaymentByAdmin,
    handleSaveValidation,
  } = useAdminPermohonanValidation({
    selectedRequest,
    setSelectedRequest,
    setSaving,
    fetchData,
  });

  const {
    pickupRows,
    pickupLoading,
    pickupError,
    selectedPickup,
    pickupModalMode,
    pickupForm,
    setPickupForm,
    showCompletePickupConfirm,
    fetchPickupQueue,
    openSchedulePickupModal,
    openCompletePickupModal,
    closePickupModal,
    requestCompletePickupConfirmation,
    cancelCompletePickupConfirmation,
    handleSavePickupSchedule,
    handleCompletePickup,
    isPickupBusinessDay,
    pickupTimeOptions = ADMIN_SCHEDULE_TIME_OPTIONS,
    isSavingPickupSchedule,
  } = useAdminLhuPickup({
    selectedRequest,
    setSelectedRequest,
    setSaving,
    fetchData,
    fetchRequestDetail,
  });

  const clearPickupRoute = useCallback(({ resetSearch = false } = {}) => {
    const currentPickupRouteKey = directPickupRegistrationId && location.search
      ? `${directPickupRegistrationId}|${location.search}`
      : '';

    directPickupHandledRef.current = currentPickupRouteKey;

    if (resetSearch) {
      setSearchQuery('');
      setActiveStatusFilter('Semua');
    }

    navigate(ADMIN_PERMOHONAN_PATH, { replace: true });
  }, [directPickupRegistrationId, location.search, navigate]);

  const openSchedulePickupModalWithRoute = useCallback((row) => {
    openSchedulePickupModal(row);

    const idRegistrasi = String(row?.id_registrasi || row?.idRegistrasi || '').trim();
    const params = new URLSearchParams({ tab: 'pengambilan' });
    if (idRegistrasi) params.set('pickup', idRegistrasi);

    const nextSearch = `?${params.toString()}`;
    if (idRegistrasi) directPickupHandledRef.current = `${idRegistrasi}|${nextSearch}`;
    navigate(`${ADMIN_PERMOHONAN_PATH}${nextSearch}`, { replace: true });
  }, [navigate, openSchedulePickupModal]);

  const openCompletePickupModalWithRoute = useCallback((row) => {
    openCompletePickupModal(row);

    const idRegistrasi = String(row?.id_registrasi || row?.idRegistrasi || '').trim();
    const params = new URLSearchParams({ tab: 'pengambilan', action: 'complete' });
    if (idRegistrasi) params.set('pickup', idRegistrasi);

    const nextSearch = `?${params.toString()}`;
    if (idRegistrasi) directPickupHandledRef.current = `${idRegistrasi}|${nextSearch}`;
    navigate(`${ADMIN_PERMOHONAN_PATH}${nextSearch}`, { replace: true });
  }, [navigate, openCompletePickupModal]);

  const closePickupModalWithRoute = useCallback(() => {
    closePickupModal();
    clearPickupRoute({ resetSearch: true });
  }, [clearPickupRoute, closePickupModal]);

  const handleSavePickupScheduleWithRoute = useCallback(async () => {
    const success = await handleSavePickupSchedule();
    if (success) clearPickupRoute({ resetSearch: true });
  }, [clearPickupRoute, handleSavePickupSchedule]);

  const handleCompletePickupWithRoute = useCallback(async () => {
    const success = await handleCompletePickup();
    if (success) clearPickupRoute({ resetSearch: true });
  }, [clearPickupRoute, handleCompletePickup]);

  const {
    sampleReceiptError,
    setSampleReceiptError,
    pccOptions,
    samplingTariffList,
    scheduleError,
    setScheduleError,
    scheduleForm,
    setScheduleForm,
    showScheduleInputs,
    setShowScheduleInputs,
    sampelFormList,
    setSampelFormList,
    sampelRef,
    sampleDetailRef,
    timeOptions: scheduleTimeOptions = ADMIN_SCHEDULE_TIME_OPTIONS,
    getActiveSchedule,
    isBusinessDay,
      handleSaveSamplingSchedule,
    generateSampleIds,
  } = useAdminPermohonanSampling({
    selectedRequest,
    setSelectedRequest,
    setExpandedSection,
    setSelectedSamplingTariffId,
    setSaving,
    fetchData,
    fetchRequestDetail,
    formatDate: formatDateOnly,
  });

  useEffect(() => {
    fetchData();
    fetchPickupQueue();
  }, [fetchData, fetchPickupQueue]);

  useEffect(() => {
    if (directTab !== 'Pengambilan') return;
    setActiveTab('Pengambilan');
    setActiveStatusFilter('Semua');
    if (directPickupRegistrationId) setSearchQuery(directPickupRegistrationId);
    fetchPickupQueue();
  }, [directPickupRegistrationId, directTab, fetchPickupQueue]);

  useEffect(() => {
    if (directTab !== 'Pengambilan') {
      directPickupHandledRef.current = '';
    }
  }, [directTab]);

  useEffect(() => {
    if (directTab !== 'Pengambilan' || !directPickupRegistrationId || pickupLoading) return;

    const routeKey = `${directPickupRegistrationId}|${location.search}`;
    if (directPickupHandledRef.current === routeKey) return;

    const targetRow = pickupRows.find((row) => String(row?.id_registrasi || row?.idRegistrasi || '').trim() === directPickupRegistrationId);
    if (!targetRow) return;

    directPickupHandledRef.current = routeKey;
    setActiveTab('Pengambilan');
    setActiveStatusFilter('Semua');
    setSearchQuery(directPickupRegistrationId);

    const params = new URLSearchParams(location.search || '');
    if (params.get('action') === 'complete') {
      openCompletePickupModal(targetRow);
    } else {
      openSchedulePickupModal(targetRow);
    }
  }, [directPickupRegistrationId, directTab, location.search, openCompletePickupModal, openSchedulePickupModal, pickupLoading, pickupRows]);

  useEffect(() => {
    const id = String(initialRegistrationId || '').trim();
    if (!id) return;
    if (selectedRequest?.id_registrasi === id) return;

    let ignore = false;

    const loadInitialDetail = async () => {
      setSaving(true);

      try {
        const detail = await fetchRequestDetail(id);
        if (!ignore) setSelectedRequest(detail);
      } catch (error) {
        if (!ignore) showError(error?.message || 'Gagal mengambil detail permohonan.');
      } finally {
        if (!ignore) setSaving(false);
      }
    };

    loadInitialDetail();

    return () => {
      ignore = true;
    };
  }, [fetchRequestDetail, initialRegistrationId, selectedRequest?.id_registrasi, setSelectedRequest, setSaving]);


  const getStatusBadge = (status) => (
    <StatusBadge status={status} normalize />
  );

  const formatDate = (dateString) => formatDateOnly(dateString);
  const formatDateTime = (dateString, timeString = '') => formatDateTimeLabel(dateString, timeString);

  const formatTimelineDate = (dateValue, timeValue = null) => formatTimelineDateValue(dateValue, timeValue);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
const getTabFilterOptions = () => getAdminTabFilterOptions(activeTab);

const filteredData = filterRequestRows({
  requestList,
  activeTab,
  activeStatusFilter,
  searchQuery,
});

const activeRowsCount = countActiveRequestRows(requestList);
const historyRowsCount = countHistoryRequestRows(requestList);

const filteredPickupRows = filterPickupRows({
  pickupRows,
  activeStatusFilter,
  searchQuery,
});

const pickupRowsCount = pickupRows.length;

const getPickupScheduleLabel = (row) => getPickupScheduleLabelValue(row, formatDateTime);

  const handleOpenDetailWithRoute = async (item) => {
    const idRegistrasi = item?.id_registrasi || item?.idRegistrasi || item?.id || '';
    if (!idRegistrasi) return;

    setSaving(true);

    try {
      const detail = await fetchRequestDetail(idRegistrasi);
      setSelectedRequest(detail);
      onDetailRouteChange?.(idRegistrasi);
    } catch (error) {
      showError(error?.message || 'Gagal mengambil detail permohonan.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackToList = () => {
    setSelectedRequest(null);
    setValidationDecision('');
    setValidationNote('');
    setShowDeferredPaymentModal(false);
    setDeferredPaymentNote('');
    onDetailRouteChange?.('');
  };

  const handleScheduleDecisionNoteChange = (idPengajuan, value) => {
    setScheduleDecisionNotes((previous) => ({
      ...previous,
      [idPengajuan]: value,
    }));
  };

  const handleDecideScheduleChange = async (idPengajuan, action) => {
    const catatan = String(scheduleDecisionNotes[idPengajuan] || '').trim();

    if (action === 'reject' && !catatan) {
      showError('Catatan admin wajib diisi saat menolak pengajuan perubahan jadwal.');
      return;
    }

    setSaving(true);
    try {
      const decisionResult = await adminPermohonanApi.decideScheduleChange(idPengajuan, { action, catatanAdmin: catatan });
      const refreshed = await fetchRequestDetail(selectedRequest.id_registrasi);
      setSelectedRequest(refreshed);
      setScheduleDecisionNotes((previous) => {
        const next = { ...previous };
        delete next[idPengajuan];
        return next;
      });
      await fetchData();
      await fetchPickupQueue();

      const resultData = decisionResult?.data || decisionResult || {};
      const statusPengajuan = resultData.status_pengajuan || resultData.statusPengajuan;
      const autoRejected = Boolean(resultData.autoRejected || resultData.auto_rejected);

      if (autoRejected || statusPengajuan === 'Ditolak') {
        showSuccess(resultData.message || 'Pengajuan jadwal ditolak otomatis karena jadwal sudah selesai.');
      } else {
        showSuccess(action === 'approve' ? 'Pengajuan jadwal disetujui.' : 'Pengajuan jadwal ditolak.');
      }
    } catch (error) {
      showError(error?.message || 'Gagal memproses pengajuan perubahan jadwal.');
    } finally {
      setSaving(false);
    }
  };

  // ===== DETAIL VIEW =====
  if (selectedRequest) {
    return (
      <AdminPermohonanDetailView
        selectedRequest={selectedRequest}
        expandedSection={expandedSection}
        setSelectedRequest={setSelectedRequest}
        setValidationDecision={setValidationDecision}
        setValidationNote={setValidationNote}
        setShowDeferredPaymentModal={setShowDeferredPaymentModal}
        setDeferredPaymentNote={setDeferredPaymentNote}
        getSampleTypeList={getSampleTypeList}
        getParameterList={getParameterList}
        getActiveSchedule={getActiveSchedule}
        getAdminSampleRows={getAdminSampleRows}
        getRequestPickupInfo={getRequestPickupInfo}
        getRequestTrackingSteps={getRequestTrackingSteps}
        formatTimelineDate={formatTimelineDate}
        getSampleTrackingSteps={getSampleTrackingSteps}
        formatDate={formatDate}
        formatDateTime={formatDateTime}
        getStatusBadge={getStatusBadge}
        toggleSection={toggleSection}
        validationDecision={validationDecision}
        validationNote={validationNote}
        selectedSamplingTariffId={selectedSamplingTariffId}
        setSelectedSamplingTariffId={setSelectedSamplingTariffId}
        samplingTariffList={samplingTariffList}
        handleSaveValidation={handleSaveValidation}
        saving={saving}
        showDeferredPaymentModal={showDeferredPaymentModal}
        deferredPaymentNote={deferredPaymentNote}
        handleDeferredPaymentByAdmin={handleDeferredPaymentByAdmin}
        setExpandedSection={setExpandedSection}
        sampelRef={sampelRef}
        sampleDetailRef={sampleDetailRef}
        showScheduleInputs={showScheduleInputs}
        setShowScheduleInputs={setShowScheduleInputs}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        isBusinessDay={isBusinessDay}
        scheduleError={scheduleError}
        setScheduleError={setScheduleError}
        timeOptions={scheduleTimeOptions}
        pccOptions={pccOptions}
        handleSaveSamplingSchedule={handleSaveSamplingSchedule}
        sampelFormList={sampelFormList}
        setSampelFormList={setSampelFormList}
        setSampleReceiptError={setSampleReceiptError}
        sampleReceiptError={sampleReceiptError}
        generateSampleIds={generateSampleIds}
        getLhuFilePath={getLhuFilePath}
        getLhuStatusBadge={getLhuStatusBadge}
        openGeneratedFile={openGeneratedFile}
        getPickupStatusBadge={getPickupStatusBadge}
        handleDecideScheduleChange={handleDecideScheduleChange}
        scheduleDecisionNotes={scheduleDecisionNotes}
        onScheduleDecisionNoteChange={handleScheduleDecisionNoteChange}
        onBackToList={handleBackToList}
      />
    );
  }

  // ===== LIST VIEW =====
  return (
    <>
      <AdminPermohonanListView
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeStatusFilter={activeStatusFilter}
        setActiveStatusFilter={setActiveStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        getTabFilterOptions={getTabFilterOptions}
        loading={loading}
        pickupLoading={pickupLoading}
        error={error}
        pickupError={pickupError}
        filteredData={filteredData}
        filteredPickupRows={filteredPickupRows}
        requestList={requestList}
        pickupRows={pickupRows}
        activeRowsCount={activeRowsCount}
        pickupRowsCount={pickupRowsCount}
        historyRowsCount={historyRowsCount}
        fetchPickupQueue={fetchPickupQueue}
        handleOpenDetail={handleOpenDetailWithRoute}
        openSchedulePickupModal={openSchedulePickupModalWithRoute}
        openCompletePickupModal={openCompletePickupModalWithRoute}
        formatDate={formatDate}
        getCustomerProfile={getCustomerProfile}
        getStatusBadge={getStatusBadge}
        getPickupStatusBadge={getPickupStatusBadge}
        getPickupScheduleLabel={getPickupScheduleLabel}
        isPickupToday={isPickupToday}
      />

      <AdminLhuPickupModal
        mode={pickupModalMode}
        selectedPickup={selectedPickup}
        pickupForm={pickupForm}
        setPickupForm={setPickupForm}
        saving={isSavingPickupSchedule}
        onClose={closePickupModalWithRoute}
        onSaveSchedule={handleSavePickupScheduleWithRoute}
        onRequestCompletePickup={requestCompletePickupConfirmation}
        onCancelCompletePickupConfirm={cancelCompletePickupConfirmation}
        onCompletePickup={handleCompletePickupWithRoute}
        showCompletePickupConfirm={showCompletePickupConfirm}
        isBusinessDay={isPickupBusinessDay}
        timeOptions={pickupTimeOptions}
      />
    </>
  );
}
