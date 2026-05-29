import { useCallback, useEffect, useState } from 'react';
import { registrationApi } from '../../../api/registrationApi';
import { compareYmd, getTodayYmd } from '../../../utils/businessDays';
import { showWarning } from '../../../utils/feedback';
import {
  STORAGE_PREFIX,
  TOTAL_REGISTRATION_STEPS,
} from './registrationConstants';
import {
  buildTimeOptions,
  isBusinessDayDate,
} from './registrationDateUtils';
import {
  buildRegistrationPayload,
  createDefaultFormData,
  createEmptySampleEntry,
  mapBmStandardsToOptions,
  mapEntryStandardsToOptions,
  mapHolidaysToLookup,
  mapParametersToOptions,
  mapSampleTypesToOptions,
} from './registrationMappers';
import {
  trimRegistrationTextFields,
  validateRegistrationStep,
  validateRegistrationSubmission,
} from './registrationValidators';


export function useRegistrationPage({
  onSubmit,
  onNavigate,
  userData,
  onSessionExpired,
}) {
  const userId = userData?.nik || 'guest';
  const isEditMode = false;
  const storageKey = STORAGE_PREFIX + userId;
  const defaultFormData = createDefaultFormData(userData);

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showTariffModal, setShowTariffModal] = useState(false);

  const [waterTypes, setWaterTypes] = useState([]);
  const [_bmStandardOptions, setBmStandardOptions] = useState([]);
  const [entryStandardOptions, setEntryStandardOptions] = useState({});
  const [entryStandardErrors, setEntryStandardErrors] = useState({});
  const [entryParameterLists, setEntryParameterLists] = useState({});
  const [entryParameterErrors, setEntryParameterErrors] = useState({});
  const [samplingTariffs, setSamplingTariffs] = useState([]);

  const [customerProfiles, setCustomerProfiles] = useState([]);
  const [holidayDateSet, setHolidayDateSet] = useState(new Set());
  const [holidayNameByDate, setHolidayNameByDate] = useState({});
  const [dateErrors, setDateErrors] = useState({});

  const timeOptions = buildTimeOptions();
  const totalSteps = TOTAL_REGISTRATION_STEPS;

  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultFormData,
          ...parsed,
          sampleEntries: Array.isArray(parsed?.sampleEntries) && parsed.sampleEntries.length > 0
            ? parsed.sampleEntries.map((entry) => ({
              ...createEmptySampleEntry(),
              ...entry,
              idRegBm: entry?.idRegBm || entry?.id_reg_bm || '',
            }))
            : defaultFormData.sampleEntries,
        };
      }
    } catch {
      // Ignore invalid localStorage data and fall back to defaults.
    }

    return defaultFormData;
  });

  useEffect(() => {
    if (isEditMode) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    } catch {
      // Ignore storage write failures.
    }
  }, [formData, storageKey, isEditMode]);

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [sampleRows, standardRows, tariffRows] = await Promise.all([
          registrationApi.getSampleTypes(),
          registrationApi.getBmStandards(),
          registrationApi.getPickupTariffs(),
        ]);

        setWaterTypes(mapSampleTypesToOptions(sampleRows));
        setBmStandardOptions(mapBmStandardsToOptions(standardRows));
        setSamplingTariffs(tariffRows || []);
      } catch {
        // Abaikan kegagalan data opsional.
      }
    };

    fetchReferenceData();
  }, []);

  useEffect(() => {
    const fetchCustomerProfiles = async () => {
      try {
        const rows = await registrationApi.getCustomerProfiles();
        setCustomerProfiles(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          onSessionExpired?.();
        }
      }
    };

    fetchCustomerProfiles();
  }, [onSessionExpired]);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const rows = await registrationApi.getHolidays();
        const { dates, names } = mapHolidaysToLookup(rows);
        setHolidayDateSet(dates);
        setHolidayNameByDate(names);
      } catch {
        // Abaikan kegagalan data opsional.
      }
    };

    fetchHolidays();
  }, []);

  const fetchParametersForEntry = useCallback(async (index, jenisSampelId, idRegBm) => {
    if (!jenisSampelId || !idRegBm) {
      setEntryParameterLists((prev) => ({ ...prev, [index]: [] }));
      setEntryParameterErrors((prev) => ({ ...prev, [index]: '' }));
      return;
    }

    try {
      const rows = await registrationApi.getParametersBySampleTypeAndStandard(jenisSampelId, idRegBm);
      const mapped = mapParametersToOptions(rows);

      setEntryParameterLists((prev) => ({
        ...prev,
        [index]: mapped,
      }));

      setEntryParameterErrors((prev) => ({
        ...prev,
        [index]: mapped.length === 0 ? 'Tidak ada parameter yang sudah memiliki metode untuk standar ini.' : '',
      }));
    } catch (err) {
      setEntryParameterLists((prev) => ({ ...prev, [index]: [] }));
      setEntryParameterErrors((prev) => ({
        ...prev,
        [index]: err?.message || 'Tidak bisa memuat parameter uji dari server.',
      }));
    }
  }, []);

  const fetchStandardsForEntry = useCallback(async (index, jenisSampelId) => {
    if (!jenisSampelId) {
      setEntryStandardOptions((prev) => ({ ...prev, [index]: [] }));
      setEntryStandardErrors((prev) => ({ ...prev, [index]: '' }));
      return;
    }

    try {
      const rows = await registrationApi.getBmStandards({ idJenisSampel: jenisSampelId });
      const mapped = mapEntryStandardsToOptions(rows);

      setEntryStandardOptions((prev) => ({
        ...prev,
        [index]: mapped,
      }));

      setEntryStandardErrors((prev) => ({
        ...prev,
        [index]: mapped.length === 0
          ? 'Tidak ada standar baku mutu untuk jenis sampel ini.'
          : '',
      }));
    } catch (err) {
      setEntryStandardOptions((prev) => ({ ...prev, [index]: [] }));
      setEntryStandardErrors((prev) => ({
        ...prev,
        [index]: err?.message || 'Tidak bisa memuat standar baku mutu dari server.',
      }));
    }
  }, []);

  useEffect(() => {
    formData.sampleEntries.forEach((entry, idx) => {
      if (entry.jenisSampel && !entryStandardOptions[idx]) {
        fetchStandardsForEntry(idx, entry.jenisSampel);
      }

      if (entry.jenisSampel && entry.idRegBm && !entryParameterLists[idx]) {
        fetchParametersForEntry(idx, entry.jenisSampel, entry.idRegBm);
      }
    });
  }, [
    formData.sampleEntries,
    entryStandardOptions,
    entryParameterLists,
    fetchStandardsForEntry,
    fetchParametersForEntry,
  ]);

  const isRequestEditDisabled = false;

  const isLockedRequestEditField = () => false;

  const lockedSectionClass = isRequestEditDisabled
    ? 'opacity-75 pointer-events-none select-none'
    : '';

  const lockedInputClass = isRequestEditDisabled
    ? 'bg-gray-100 cursor-not-allowed text-gray-600'
    : '';

  const handleInputChange = (e) => {
    if (isLockedRequestEditField(e.target.name)) return;

    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRadioChange = (value) => {
    if (isRequestEditDisabled) return;

    setFormData({ ...formData, maksudPengujian: value });
  };

  const handleMetodeChange = (value) => {
    if (isRequestEditDisabled) return;

    setFormData((prev) => {
      const base = {
        ...prev,
        metodePengambilan: value,
        alamatPengambilan: '',
      };

      if (value === 'laboratorium') {
        return {
          ...base,
          estimasiDiterima: '',
        };
      }

      if (value === 'kirim') {
        return {
          ...base,
          tanggalPengambilan: '',
          jamPengambilan: '',
        };
      }

      return {
        ...base,
        tanggalPengambilan: '',
        jamPengambilan: '',
        estimasiDiterima: '',
      };
    });
  };

  const addSampleEntry = () => {
    setFormData({
      ...formData,
      sampleEntries: [...formData.sampleEntries, createEmptySampleEntry()],
    });
  };

  const removeSampleEntry = (index) => {
    const newEntries = formData.sampleEntries.filter((_, i) => i !== index);
    const newParamLists = { ...entryParameterLists };
    delete newParamLists[index];
    setEntryParameterLists(newParamLists);
    setFormData({ ...formData, sampleEntries: newEntries.length > 0 ? newEntries : [createEmptySampleEntry()] });
  };

  const updateSampleEntry = (index, field, value) => {
    const newEntries = [...formData.sampleEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };

    if (field === 'jenisSampel') {
      newEntries[index].idRegBm = '';
      newEntries[index].parameters = [];

      setEntryStandardErrors((prev) => ({ ...prev, [index]: '' }));
      setEntryParameterErrors((prev) => ({ ...prev, [index]: '' }));
      setEntryStandardOptions((prev) => ({ ...prev, [index]: [] }));
      setEntryParameterLists((prev) => ({ ...prev, [index]: [] }));

      fetchStandardsForEntry(index, value);
    }

    if (field === 'idRegBm') {
      newEntries[index].parameters = [];
      setEntryParameterErrors((prev) => ({ ...prev, [index]: '' }));
      fetchParametersForEntry(index, newEntries[index].jenisSampel, value);
    }

    if (field === 'parameters') {
      setEntryParameterErrors((prev) => ({ ...prev, [index]: '' }));
    }

    setFormData({ ...formData, sampleEntries: newEntries });
  };

  const isBusinessDay = (dateStr) => {
    return isBusinessDayDate(dateStr, holidayDateSet, holidayNameByDate);
  };

  const minSelectableDate = getTodayYmd();

  const handleDateChange = (e) => {
    const { name, value } = e.target;

    if (isLockedRequestEditField(name)) return;

    if (compareYmd(value, minSelectableDate) < 0) {
      setDateErrors((prev) => ({ ...prev, [name]: '⛔ Tanggal tidak boleh sebelum hari ini' }));
      setFormData((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    const dayValidation = isBusinessDay(value);
    if (!dayValidation.valid) {
      setDateErrors((prev) => ({ ...prev, [name]: `⛔ ${dayValidation.reason} — pilih hari kerja lain` }));
      setFormData((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    setDateErrors((prev) => ({ ...prev, [name]: null }));
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    const normalizedFormData = trimRegistrationTextFields(formData);
    const validationMessage = validateRegistrationStep(currentStep, normalizedFormData, {
      dateErrors,
    });

    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    if (normalizedFormData !== formData) {
      setFormData(normalizedFormData);
    }

    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    const normalizedFormData = trimRegistrationTextFields(formData);
    const validationMessage = validateRegistrationSubmission(normalizedFormData, {
      dateErrors,
      isAgreed,
    });

    if (validationMessage) {
      setSubmitError(validationMessage);
      showWarning(validationMessage);
      setFormData(normalizedFormData);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = buildRegistrationPayload(normalizedFormData);

      await registrationApi.createRequest(payload);

      localStorage.removeItem(storageKey);

      setShowSuccess(true);
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setSubmitError('Sesi login berakhir. Silakan login ulang.');
        onSessionExpired?.();
      } else {
        setSubmitError(err?.message || 'Tidak bisa menghubungi server.');
      }
    }

    setSubmitting(false);
  };

  const handleViewStatus = () => {
    onSubmit(formData);
    onNavigate('status');
  };

  const getRequestDetails = () => {
    return formData.sampleEntries.filter(
      (entry) => entry.jenisSampel && entry.parameters.length > 0
    );
  };

  return {
    currentStep,
    totalSteps,
    showSuccess,
    isAgreed,
    setIsAgreed,
    submitting,
    submitError,
    showTariffModal,
    setShowTariffModal,
    waterTypes,
    entryStandardOptions,
    entryStandardErrors,
    entryParameterLists,
    entryParameterErrors,
    samplingTariffs,
    customerProfiles,
    timeOptions,
    formData,
    setFormData,
    isEditMode,
    isRequestEditDisabled,
    lockedSectionClass,
    lockedInputClass,
    dateErrors,
    minSelectableDate,
    handleInputChange,
    handleRadioChange,
    handleMetodeChange,
    addSampleEntry,
    removeSampleEntry,
    updateSampleEntry,
    handleDateChange,
    handleNext,
    handleBack,
    handleSubmitForm,
    handleViewStatus,
    getRequestDetails,
  };
}
