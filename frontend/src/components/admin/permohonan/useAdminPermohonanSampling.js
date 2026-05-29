import { useCallback, useEffect, useRef, useState } from 'react';
import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import { buildSampleReceivePayload } from './adminPermohonanPayloads';
import {
  buildInitialSampleReceiptForms,
  buildTimeOptions,
  getActiveScheduleFromRequest,
  getInitialScheduleDateFromRequest,
  getInitialScheduleTimeFromRequest,
  isBusinessDayDate,
} from './adminPermohonanSchedule';
import { adminPermohonanApi } from '../../../api/adminPermohonanApi';
import { showError, showSuccess, showWarning } from '../../../utils/feedback';
import {
  validateSampleReceiptForms,
  validateSamplingScheduleForm,
} from './adminPermohonanValidators';

const TIME_OPTIONS = buildTimeOptions();

export function useAdminPermohonanSampling({
  selectedRequest,
  setSelectedRequest,
  setExpandedSection,
  setSelectedSamplingTariffId,
  setSaving,
  fetchData,
  fetchRequestDetail,
}) {
  const [sampleReceiptError, setSampleReceiptError] = useState('');
  const [holidayDateSet, setHolidayDateSet] = useState(new Set());
  const [holidayNameByDate, setHolidayNameByDate] = useState({});
  const [pccOptions, setPccOptions] = useState([]);
  const [samplingTariffList, setSamplingTariffList] = useState([]);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    tanggalPengambilan: '',
    jamPengambilan: '',
    idPegawaiPcc: '',
  });
  const [showScheduleInputs, setShowScheduleInputs] = useState(false);
  const [sampelFormList, setSampelFormList] = useState([]);
  const sampelRef = useRef(null);
  const sampleDetailRef = useRef(null);

  const getActiveSchedule = useCallback(
    (requestItem) => getActiveScheduleFromRequest(requestItem),
    []
  );

  const getInitialScheduleDate = useCallback(
    (requestItem) => getInitialScheduleDateFromRequest(requestItem),
    []
  );

  const getInitialScheduleTime = useCallback(
    (requestItem) => getInitialScheduleTimeFromRequest(requestItem),
    []
  );

  const isBusinessDay = useCallback(
    (dateStr) => isBusinessDayDate(dateStr, holidayDateSet, holidayNameByDate),
    [holidayDateSet, holidayNameByDate]
  );

  const handleSaveSamplingSchedule = useCallback(async () => {
    if (!selectedRequest) return;

    const validationMessage = validateSamplingScheduleForm({
      selectedRequest,
      scheduleForm,
      isBusinessDay,
    });

    if (validationMessage) {
      setScheduleError(validationMessage);
      showWarning(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const activeSchedule = getActiveSchedule(selectedRequest);
      const isUpdate = !!activeSchedule;

      const data = await adminPermohonanApi.saveSamplingSchedule(
        selectedRequest.id_registrasi,
        isUpdate,
        {
          tanggalPengambilan: scheduleForm.tanggalPengambilan,
          jamPengambilan: scheduleForm.jamPengambilan,
          idPegawaiPcc: scheduleForm.idPegawaiPcc,
        }
      );

      await fetchData();

      const refreshedDetail = await fetchRequestDetail(selectedRequest.id_registrasi);
      setSelectedRequest(refreshedDetail);
      const refreshedStatus = normalizeFpplStatus((refreshedDetail || selectedRequest)?.status_fppl);
      setExpandedSection(refreshedStatus === FPPL_STATUSES.MENUNGGU_SAMPEL ? 'sampel' : 'jadwal');
      setScheduleError('');
      setSampelFormList(
        refreshedStatus === FPPL_STATUSES.MENUNGGU_SAMPEL
          ? buildInitialSampleReceiptForms(refreshedDetail || selectedRequest)
          : []
      );
      setSampleReceiptError('');
      setShowScheduleInputs(false);

      showSuccess(data.message || 'Jadwal berhasil disimpan.');
    } catch (error) {
      setScheduleError(error?.message || 'Gagal terhubung ke server.');
    } finally {
      setSaving(false);
    }
  }, [
    selectedRequest,
    isBusinessDay,
    scheduleForm,
    setSaving,
    getActiveSchedule,
    fetchData,
    fetchRequestDetail,
    setSelectedRequest,
    setExpandedSection,
  ]);

  const generateSampleIds = useCallback(async () => {
    if (!selectedRequest) {
      showWarning('Permohonan tidak valid.');
      return;
    }

    const validationMessage = validateSampleReceiptForms({ sampelFormList });

    if (validationMessage) {
      setSampleReceiptError(validationMessage);
      showWarning(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const data = await adminPermohonanApi.receiveSamples(
        selectedRequest.id_registrasi,
        buildSampleReceivePayload(sampelFormList)
      );

      showSuccess(data.message || 'Nomor sampel berhasil dibuat.');

      const refreshedRows = await fetchData();
      const refreshedRequest = refreshedRows.find(
        (item) => item.id_registrasi === selectedRequest.id_registrasi
      );
      const refreshedDetail = await fetchRequestDetail(selectedRequest.id_registrasi);

      setSelectedRequest(refreshedDetail || refreshedRequest || selectedRequest);
      setExpandedSection('info');
      window.setTimeout(() => {
        sampleDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (error) {
      showError(error?.message || 'Gagal terhubung ke server.');
    } finally {
      setSaving(false);
    }
  }, [
    selectedRequest,
    sampelFormList,
    setSaving,
    fetchData,
    fetchRequestDetail,
    setSelectedRequest,
    setExpandedSection,
  ]);

  useEffect(() => {
    const fetchScheduleReferences = async () => {
      try {
        const { holidays, pccEmployees, pickupTariffs } = await adminPermohonanApi.getScheduleReferences();
        const dateSet = new Set();
        const dateMap = {};

        holidays.forEach((item) => {
          dateSet.add(item.date);
          dateMap[item.date] = item.nama;
        });

        setHolidayDateSet(dateSet);
        setHolidayNameByDate(dateMap);
        setPccOptions(pccEmployees);
        setSamplingTariffList(pickupTariffs);
      } catch {
        setHolidayDateSet(new Set());
        setHolidayNameByDate({});
        setPccOptions([]);
        setSamplingTariffList([]);
      }
    };

    fetchScheduleReferences();
  }, []);

  useEffect(() => {
    if (!selectedRequest) return;

    const activeSchedule = getActiveSchedule(selectedRequest);

    setSelectedSamplingTariffId(selectedRequest.id_tarif_pengambilan || '');
    setShowScheduleInputs(false);
    setScheduleError('');

    const tanggal = getInitialScheduleDate(selectedRequest);
    const jam = getInitialScheduleTime(selectedRequest);

    setScheduleForm({
      tanggalPengambilan: tanggal,
      jamPengambilan: jam,
      idPegawaiPcc: activeSchedule?.id_pegawai_pcc || '',
    });

    const normalizedStatus = normalizeFpplStatus(selectedRequest.status_fppl);
    if (
      normalizedStatus === FPPL_STATUSES.MENUNGGU_VERIFIKASI ||
      normalizedStatus === FPPL_STATUSES.MENUNGGU_VERIFIKASI_PEMBAYARAN
    ) {
      setExpandedSection('validasi');
    } else if (
      normalizedStatus === FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER ||
      normalizedStatus === FPPL_STATUSES.MENUNGGU_PEMBAYARAN
    ) {
      setSampelFormList([]);
      setSampleReceiptError('');
      setExpandedSection('jadwal');
    } else if (normalizedStatus === FPPL_STATUSES.MENUNGGU_SAMPEL) {
      if (activeSchedule) {
        setSampelFormList(buildInitialSampleReceiptForms(selectedRequest, activeSchedule));
        setSampleReceiptError('');
      } else {
        setSampelFormList([]);
      }
      setExpandedSection('jadwal');
    } else if (
      normalizedStatus === FPPL_STATUSES.PROSES_PENGUJIAN ||
      normalizedStatus === FPPL_STATUSES.SELESAI
    ) {
      setExpandedSection('timeline');
    } else {
      setExpandedSection('info');
    }
  }, [
    getInitialScheduleDate,
    getInitialScheduleTime,
    selectedRequest,
    getActiveSchedule,
    setExpandedSection,
    setSelectedSamplingTariffId,
  ]);

  return {
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
    timeOptions: TIME_OPTIONS,
    getActiveSchedule,
    isBusinessDay,
    handleSaveSamplingSchedule,
    generateSampleIds,
  };
}
