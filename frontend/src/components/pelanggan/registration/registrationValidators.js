import {
  asTrimmedText,
  getFirstDateError,
  hasAnyValue,
  isBlank,
  isNonEmptyArray,
  isPositiveInteger,
  isValidEmail,
} from '../../../utils/formValidation';
import { compareYmd, getTodayYmd } from '../../../utils/businessDays';
import { isOfficerSampling } from './registrationDateUtils';

export const sanitizePhoneNumber = (value) => {
  const digits = String(value ?? '').replace(/\D+/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? digits.slice(0, 15) : '';
};
export const isValidCustomerPhone = (value) => /^0\d{8,14}$/.test(sanitizePhoneNumber(value));

export function validateCustomerStep(formData = {}) {
  if (isBlank(formData.namaInstansi)) return 'Nama instansi/perusahaan wajib diisi.';
  if (isBlank(formData.pic)) return 'Nama PIC wajib diisi.';
  if (isBlank(formData.emailPic)) return 'Email PIC wajib diisi.';
  if (!isValidEmail(formData.emailPic)) return 'Email PIC harus memakai format email yang benar, misalnya nama@instansi.com.';
  if (isBlank(formData.noTelp)) return 'Nomor telepon wajib diisi.';
  if (!isValidCustomerPhone(formData.noTelp)) return 'No. Telp / HP hanya boleh berisi angka, harus diawali 0, dan berisi 9–15 digit.';
  if (isBlank(formData.alamat)) return 'Alamat pelanggan wajib diisi.';
  return '';
}

export function validatePurposeStep(formData = {}) {
  if (isBlank(formData.maksudPengujian)) return 'Maksud pengujian wajib dipilih.';
  if (formData.maksudPengujian === 'lainnya' && isBlank(formData.maksudLainnya)) {
    return 'Maksud pengujian lainnya wajib diisi.';
  }
  return '';
}

export function validateSamplingStep(formData = {}, dateErrors = {}) {
  if (isBlank(formData.metodePengambilan)) return 'Metode pengambilan sampel wajib dipilih.';

  const dateError = getFirstDateError(dateErrors);
  if (dateError) return dateError;

  const minSelectableDate = getTodayYmd();
  if (formData.metodePengambilan === 'laboratorium') {
    if (isBlank(formData.tanggalPengambilan)) return 'Tanggal pengambilan sampel wajib diisi.';
    if (compareYmd(formData.tanggalPengambilan, minSelectableDate) < 0) return 'Tanggal pengambilan sampel tidak boleh sebelum hari ini.';
    if (isBlank(formData.jamPengambilan)) return 'Jam pengambilan sampel wajib dipilih.';
  }

  if (formData.metodePengambilan === 'kirim') {
    if (isBlank(formData.estimasiDiterima)) return 'Rencana tanggal pengantaran sampel wajib diisi.';
    if (compareYmd(formData.estimasiDiterima, minSelectableDate) < 0) return 'Rencana tanggal pengantaran sampel tidak boleh sebelum hari ini.';
  }

  if (isBlank(formData.alamatPengambilan)) {
    return isOfficerSampling(formData.metodePengambilan)
      ? 'Lokasi pengambilan sampel wajib diisi.'
      : 'Lokasi asal sampel wajib diisi untuk pengambilan mandiri.';
  }

  return '';
}

function isEntryTouched(entry = {}) {
  return hasAnyValue([
    entry.jenisSampel,
    entry.idRegBm,
    entry.jumlahSampel,
    entry.parameters,
  ]);
}

export function validateSampleEntries(sampleEntries = []) {
  const entries = Array.isArray(sampleEntries) ? sampleEntries : [];

  if (!entries.length) return 'Minimal 1 sampel wajib ditambahkan.';

  const touchedEntries = entries.filter(isEntryTouched);
  if (!touchedEntries.length) {
    return 'Isi minimal 1 sampel dengan jenis sampel, standar baku mutu, dan parameter uji.';
  }

  const incompleteIndex = entries.findIndex((entry) => {
    if (!isEntryTouched(entry)) return false;
    return (
      isBlank(entry.jenisSampel) ||
      isBlank(entry.idRegBm) ||
      !isNonEmptyArray(entry.parameters)
    );
  });

  if (incompleteIndex >= 0) {
    return `Lengkapi jenis sampel, standar baku mutu, dan parameter uji pada sampel #${incompleteIndex + 1}.`;
  }

  const invalidQuantityIndex = entries.findIndex((entry) => {
    if (!isEntryTouched(entry)) return false;
    return !isPositiveInteger(entry.jumlahSampel);
  });

  if (invalidQuantityIndex >= 0) {
    return `Jumlah sampel pada sampel #${invalidQuantityIndex + 1} harus berupa angka bulat lebih dari 0.`;
  }

  return '';
}

export function validateRegistrationStep(step, formData = {}, context = {}) {
  if (step === 1) return validateCustomerStep(formData);
  if (step === 2) return validatePurposeStep(formData);
  if (step === 3) return validateSamplingStep(formData, context.dateErrors);
  if (step === 4) return validateSampleEntries(formData.sampleEntries);
  return '';
}

export function validateRegistrationSubmission(formData = {}, context = {}) {
  const stepValidators = [
    validateCustomerStep,
    validatePurposeStep,
    (data) => validateSamplingStep(data, context.dateErrors),
    (data) => validateSampleEntries(data.sampleEntries),
  ];

  for (const validator of stepValidators) {
    const message = validator(formData);
    if (message) return message;
  }

  if (!context.isAgreed) return 'Konfirmasi persetujuan wajib dicentang sebelum mengirim permohonan.';

  return '';
}

export function trimRegistrationTextFields(formData = {}) {
  return {
    ...formData,
    namaInstansi: asTrimmedText(formData.namaInstansi),
    pic: asTrimmedText(formData.pic),
    emailPic: asTrimmedText(formData.emailPic),
    noTelp: sanitizePhoneNumber(formData.noTelp),
    alamat: asTrimmedText(formData.alamat),
    maksudLainnya: asTrimmedText(formData.maksudLainnya),
    alamatPengambilan: asTrimmedText(formData.alamatPengambilan),
  };
}
