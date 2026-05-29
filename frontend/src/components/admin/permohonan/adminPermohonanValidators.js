import {
  asTrimmedText,
  compareYmd,
  getTodayYmd,
  isBlank,
} from '../../../utils/formValidation';
import { usesOfficerSampling } from './adminPermohonanHelpers';
import { validateOperationalTime } from '../../../utils/businessDays';

export function validateAdminRequestDecision({
  selectedRequest,
  decision,
  note,
  selectedSamplingTariffId,
} = {}) {
  if (!selectedRequest?.id_registrasi) return 'Permohonan tidak valid.';
  if (isBlank(decision)) return 'Pilih keputusan validasi terlebih dahulu.';

  if (decision === 'setujui' && usesOfficerSampling(selectedRequest) && isBlank(selectedSamplingTariffId)) {
    return 'Pilih keterangan jarak terlebih dahulu untuk permohonan dengan pengambilan oleh petugas.';
  }

  if (decision === 'tolak' && isBlank(note)) {
    return 'Catatan penolakan permohonan wajib diisi.';
  }

  return '';
}

export function validateSamplingScheduleForm({ selectedRequest, scheduleForm, isBusinessDay } = {}) {
  if (!selectedRequest?.id_registrasi) return 'Permohonan tidak valid.';
  if (isBlank(scheduleForm?.tanggalPengambilan)) return 'Tanggal pengambilan wajib diisi.';

  const dateCheck = typeof isBusinessDay === 'function'
    ? isBusinessDay(scheduleForm.tanggalPengambilan)
    : { valid: true };

  if (!dateCheck.valid) return dateCheck.reason || 'Tanggal pengambilan tidak valid.';

  if (compareYmd(scheduleForm.tanggalPengambilan, getTodayYmd()) < 0) {
    return 'Tanggal pengambilan tidak boleh sebelum hari ini.';
  }

  if (isBlank(scheduleForm?.jamPengambilan)) return 'Jam pengambilan wajib dipilih.';

  const timeCheck = validateOperationalTime(scheduleForm.jamPengambilan, 'Jam jadwal');
  if (!timeCheck.valid) return timeCheck.reason;

  if (usesOfficerSampling(selectedRequest) && isBlank(scheduleForm?.idPegawaiPcc)) {
    return 'PCC wajib dipilih untuk pengambilan sampel oleh petugas.';
  }

  return '';
}

const REQUIRED_RECEIPT_FIELDS = [
  ['kondisi', 'kondisi sampel'],
  ['acuan_pengambilan_sampel', 'acuan pengambilan sampel'],
  ['lokasi_spesifik', 'lokasi spesifik'],
  ['koordinat', 'koordinat'],
];

export function validateSampleReceiptForms({ sampelFormList } = {}) {
  const rows = Array.isArray(sampelFormList) ? sampelFormList : [];

  if (!rows.length) return 'Tidak ada sampel untuk di-generate.';

  const isSamplingDateMissing = rows.some((form) => isBlank(form?.tanggal_pengambilan_sampel));
  if (isSamplingDateMissing) return 'Tanggal pengambilan sampel wajib diisi.';

  for (let index = 0; index < rows.length; index += 1) {
    const form = rows[index] || {};
    const label = form.sample_label || form.sampleLabel || `sampel #${index + 1}`;

    const missingField = REQUIRED_RECEIPT_FIELDS.find(([field]) => isBlank(form[field]));
    if (missingField) return `Lengkapi ${missingField[1]} pada ${label}.`;
  }

  return '';
}

export function validatePickupScheduleForm(pickupForm = {}, isBusinessDay = null) {
  if (isBlank(pickupForm.tanggalPengambilan)) return 'Tanggal pengambilan wajib diisi.';
  if (compareYmd(pickupForm.tanggalPengambilan, getTodayYmd()) < 0) {
    return 'Tanggal pengambilan LHU tidak boleh sebelum hari ini.';
  }

  const dateCheck = typeof isBusinessDay === 'function'
    ? isBusinessDay(pickupForm.tanggalPengambilan)
    : { valid: true };

  if (!dateCheck.valid) return dateCheck.reason || 'Tanggal pengambilan LHU harus hari kerja.';
  if (isBlank(pickupForm.jamPengambilan)) return 'Jam pengambilan wajib diisi.';

  const timeCheck = validateOperationalTime(pickupForm.jamPengambilan, 'Jam pengambilan LHU');
  if (!timeCheck.valid) return timeCheck.reason;

  return '';
}

export function validatePickupCompletionForm(pickupForm = {}) {
  if (isBlank(pickupForm.namaPengambil)) return 'Nama pengambil wajib diisi.';
  return '';
}

export function cleanAdminNote(value) {
  return asTrimmedText(value);
}
