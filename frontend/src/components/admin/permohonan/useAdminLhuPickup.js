import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { adminPermohonanApi } from '../../../api/adminPermohonanApi';
import { showError, showSuccess, showWarning } from '../../../utils/feedback';
import {
  validatePickupCompletionForm,
  validatePickupScheduleForm,
} from './adminPermohonanValidators';
import { buildTimeOptions, isBusinessDayDate } from './adminPermohonanSchedule';
import { canCompleteLhuPickup, canScheduleLhuPickup, getLhuPickupActionMessage } from '../../../utils/workflowAccessRules';

const PICKUP_TIME_OPTIONS = buildTimeOptions();

const EMPTY_PICKUP_FORM = {
  tanggalPengambilan: '',
  jamPengambilan: '',
  catatan: '',
  namaPengambil: '',
};

const buildSchedulePickupForm = (row) => ({
  tanggalPengambilan: row?.tanggal_pengambilan || '',
  jamPengambilan: row?.jam_pengambilan ? String(row.jam_pengambilan).slice(0, 5) : '',
  catatan: '',
  namaPengambil: '',
});

export function useAdminLhuPickup({
  selectedRequest,
  setSelectedRequest,
  setSaving,
  fetchData,
  fetchRequestDetail,
}) {
  const [pickupRows, setPickupRows] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupError, setPickupError] = useState('');
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [pickupModalMode, setPickupModalMode] = useState(null);
  const [pickupForm, setPickupForm] = useState(EMPTY_PICKUP_FORM);
  const [showCompletePickupConfirm, setShowCompletePickupConfirm] = useState(false);
  const [holidayDateSet, setHolidayDateSet] = useState(new Set());
  const [holidayNameByDate, setHolidayNameByDate] = useState({});

  const [isPickupModalLoading, setIsPickupModalLoading] = useState(false);
  const [isSavingPickupSchedule, setIsSavingPickupSchedule] = useState(false);



  useEffect(() => {
    let mounted = true;

    adminPermohonanApi
      .getLhuPickupReferences()
      .then(({ holidays = [] } = {}) => {
        if (!mounted) return;

        const nextSet = new Set();
        const nextNames = {};

        holidays.forEach((item) => {
          const date = item?.date || item?.tanggal || item?.tanggal_libur;
          if (!date) return;
          const ymd = String(date).slice(0, 10);
          nextSet.add(ymd);
          nextNames[ymd] = item?.nama || item?.nama_libur || 'Tanggal merah';
        });

        setHolidayDateSet(nextSet);
        setHolidayNameByDate(nextNames);
      })
      .catch(() => {
        if (!mounted) return;
        setHolidayDateSet(new Set());
        setHolidayNameByDate({});
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isBusinessDay = useCallback(
    (dateStr) => isBusinessDayDate(dateStr, holidayDateSet, holidayNameByDate),
    [holidayDateSet, holidayNameByDate]
  );

  const resetPickupForm = useCallback(() => {
    setPickupForm(EMPTY_PICKUP_FORM);
  }, []);

  const fetchPickupQueue = useCallback(async (silent = false) => {
    if (!silent) setPickupLoading(true);
    if (!silent) setPickupError('');

    try {
      const rows = await adminPermohonanApi.getPickupQueue();
      setPickupRows(rows);
      return rows;
    } catch (error) {
      if (!silent) setPickupError(error?.message || 'Gagal terhubung ke server.');
      return [];
    } finally {
      if (!silent) setPickupLoading(false);
    }
  }, []);

  useAutoRefresh(fetchPickupQueue);

  const openSchedulePickupModal = useCallback((row) => {
    if (!canScheduleLhuPickup(row)) {
      showWarning('Pengambilan LHU sudah selesai dan tidak bisa dijadwalkan ulang.');
      return;
    }

    setIsSavingPickupSchedule(false);
    setIsPickupModalLoading(false);
    setSelectedPickup(row);
    setPickupModalMode('schedule');
    setPickupForm(buildSchedulePickupForm(row));
  }, []);

  const openCompletePickupModal = useCallback((row) => {
    if (!canCompleteLhuPickup(row)) {
      showWarning(getLhuPickupActionMessage(row) || 'Pengambilan LHU belum bisa ditandai.');
      return;
    }

    setIsSavingPickupSchedule(false);
    setIsPickupModalLoading(false);
    setSelectedPickup(row);
    setPickupModalMode('complete');
    setShowCompletePickupConfirm(false);
    resetPickupForm();
  }, [resetPickupForm]);

  const closePickupModal = useCallback(() => {
    setIsSavingPickupSchedule(false);
    setIsPickupModalLoading(false);
    setSelectedPickup(null);
    setPickupModalMode(null);
    setShowCompletePickupConfirm(false);
    resetPickupForm();
  }, [resetPickupForm]);

  const requestCompletePickupConfirmation = useCallback(() => {
    if (!selectedPickup) return;

    const validationMessage = validatePickupCompletionForm(pickupForm);

    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setShowCompletePickupConfirm(true);
  }, [pickupForm, selectedPickup]);

  const cancelCompletePickupConfirmation = useCallback(() => {
    setShowCompletePickupConfirm(false);
  }, []);

  const handleSavePickupSchedule = useCallback(async () => {
    if (!selectedPickup) return false;

    const validationMessage = validatePickupScheduleForm(pickupForm, isBusinessDay);

    if (validationMessage) {
      showWarning(validationMessage);
      return false;
    }

    setIsSavingPickupSchedule(true);

    try {
      const data = await adminPermohonanApi.savePickupSchedule({
        idRegistrasi: selectedPickup.id_registrasi,
        tanggalPengambilan: pickupForm.tanggalPengambilan,
        jamPengambilan: pickupForm.jamPengambilan,
        catatan: pickupForm.catatan,
      });

      showSuccess(data.message || 'Jadwal pengambilan LHU berhasil disimpan.');
      closePickupModal();
      await fetchPickupQueue();
      return true;
    } catch (error) {
      showError(error?.message || 'Gagal menyimpan jadwal pengambilan LHU.');
      return false;
    } finally {
      setIsSavingPickupSchedule(false);
    }
  }, [closePickupModal, fetchPickupQueue, isBusinessDay, pickupForm, selectedPickup]);

  const handleCompletePickup = useCallback(async () => {
    if (!selectedPickup) return false;

    const validationMessage = validatePickupCompletionForm(pickupForm);

    if (validationMessage) {
      showWarning(validationMessage);
      setShowCompletePickupConfirm(false);
      return false;
    }

    setIsSavingPickupSchedule(true);

    try {
      const data = await adminPermohonanApi.completePickup({
        idRegistrasi: selectedPickup.id_registrasi,
        namaPengambil: pickupForm.namaPengambil.trim(),
      });

      showSuccess(data.message || 'Pengambilan LHU berhasil ditandai.');
      setShowCompletePickupConfirm(false);
      closePickupModal();
      await fetchPickupQueue();
      await fetchData();

      if (selectedRequest?.id_registrasi === selectedPickup.id_registrasi) {
        const refreshedDetail = await fetchRequestDetail(selectedPickup.id_registrasi);
        setSelectedRequest(refreshedDetail);
      }

      return true;
    } catch (error) {
      showError(error?.message || 'Gagal menandai pengambilan LHU.');
      return false;
    } finally {
      setIsSavingPickupSchedule(false);
    }
  }, [
    closePickupModal,
    fetchData,
    fetchPickupQueue,
    fetchRequestDetail,
    pickupForm,
    selectedPickup,
    selectedRequest?.id_registrasi,
    setSelectedRequest,
  ]);

  return {
    pickupRows,
    pickupLoading,
    pickupError,
    selectedPickup,
    pickupModalMode,
    pickupForm,
    showCompletePickupConfirm,
    setPickupForm,
    fetchPickupQueue,
    openSchedulePickupModal,
    openCompletePickupModal,
    closePickupModal,
    requestCompletePickupConfirmation,
    cancelCompletePickupConfirmation,
    handleSavePickupSchedule,
    handleCompletePickup,
    isPickupBusinessDay: isBusinessDay,
    pickupTimeOptions: PICKUP_TIME_OPTIONS,
    isPickupModalLoading,
    isSavingPickupSchedule,
  };
}
