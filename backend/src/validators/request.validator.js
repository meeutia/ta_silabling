const { errorResponse } = require('../utils/response');
const {
  asTrimmedText,
  validateStringParamId,
  validateTimeField,
  validateYmdField,
} = require('./common.validator');
const { validateOperationalTime } = require('../utils/schedule-policy.util');

const validateCreateRequest = (req, res, next) => {
  const {
    namaInstansi, pic, emailPic, noTelp, alamat,
    maksudPengujian, maksudLainnya, metodePengambilan,
    tanggalPengambilan, jamPengambilan, alamatPengambilan,
    estimasiDiterima,
    sampleEntries
  } = req.body;

  const asTrimmed = (val) => (typeof val === 'string' ? val.trim() : '');
  const sanitizePhone = (val) => String(val ?? '').replace(/\D+/g, '');
  const isNonEmpty = (val) => asTrimmed(val).length > 0;
  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asTrimmed(val));
  const isValidPhone = (val) => /^0\d{8,14}$/.test(sanitizePhone(val));

  if (!isNonEmpty(namaInstansi) || !isNonEmpty(pic) || !isNonEmpty(emailPic) || !isNonEmpty(noTelp) || !isNonEmpty(alamat)) {
    return errorResponse(res, 'Data pelanggan tidak lengkap.', 400);
  }

  if (!isValidEmail(emailPic)) {
    return errorResponse(res, 'Email PIC harus memakai format email yang benar, misalnya nama@instansi.com.', 400);
  }

  if (!isValidPhone(noTelp)) {
    return errorResponse(res, 'No. Telp / HP hanya boleh berisi angka, harus diawali 0, dan berisi 9–15 digit.', 400);
  }

  req.body.emailPic = asTrimmed(emailPic).toLowerCase();
  req.body.noTelp = sanitizePhone(noTelp);

  const cleanedEntries = Array.isArray(sampleEntries) ? sampleEntries : [];

  if (!isNonEmpty(maksudPengujian) || !isNonEmpty(metodePengambilan) || cleanedEntries.length === 0) {
    return errorResponse(res, 'Data permohonan tidak lengkap.', 400);
  }

  if (asTrimmed(maksudPengujian).toLowerCase() === 'lainnya' && !isNonEmpty(maksudLainnya)) {
    return errorResponse(res, 'Maksud pengujian lainnya wajib diisi.', 400);
  }

  let sampleReferenceDate = '';

  if (asTrimmed(metodePengambilan) === 'laboratorium') {
    if (!isNonEmpty(tanggalPengambilan) || !isNonEmpty(jamPengambilan) || !isNonEmpty(alamatPengambilan)) {
      return errorResponse(res, 'Data pengambilan sampel oleh laboratorium wajib lengkap.', 400);
    }

    const sampleDateError = validateYmdField({
      value: tanggalPengambilan,
      label: 'Tanggal rencana pengambilan sampel',
      required: true,
      notBeforeToday: true,
    });
    if (sampleDateError) return errorResponse(res, sampleDateError, 400);

    const sampleTimeError = validateTimeField({
      value: jamPengambilan,
      label: 'Jam rencana pengambilan sampel',
      required: true,
    });
    if (sampleTimeError) return errorResponse(res, sampleTimeError, 400);

    sampleReferenceDate = tanggalPengambilan;
  } else if (asTrimmed(metodePengambilan) === 'kirim') {
    if (!isNonEmpty(estimasiDiterima)) {
      return errorResponse(res, 'Estimasi tanggal sampel diterima wajib diisi.', 400);
    }

    const estimateDateError = validateYmdField({
      value: estimasiDiterima,
      label: 'Estimasi tanggal sampel diterima',
      required: true,
      notBeforeToday: true,
    });
    if (estimateDateError) return errorResponse(res, estimateDateError, 400);

    sampleReferenceDate = estimasiDiterima;
  } else {
    return errorResponse(res, 'Metode pengambilan sampel tidak valid.', 400);
  }

  const hasInvalidEntry = cleanedEntries.some((e) => {
    const parameterList = Array.isArray(e?.parameters) ? e.parameters : [];
    const hasInvalidParameter = parameterList.some((p) => {
      if (typeof p === 'string') return p.trim().length === 0;
      if (typeof p === 'object' && p !== null) return !p.id_parameter;

      return true;
    });

    const standar = e?.idRegBm || e?.id_reg_bm;
    return !e?.jenisSampel || !standar || parameterList.length === 0 || hasInvalidParameter || Number(e?.jumlahSampel || 0) < 1;
  });

  if (hasInvalidEntry) {
    return errorResponse(res, 'Setiap sampel wajib memiliki jenis sampel, parameter uji, dan jumlah sampel minimal 1.', 400);
  }

  next();
};

const validateVerifyRequest = (req, res, next) => {
  const { action } = req.body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return errorResponse(res, 'Action harus "approve" atau "reject".', 400);
  }
  next();
};

const normalizeBoolean01 = (value) => {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  return null;
};

const validateAssignMethods = (req, res, next) => {
  const { selections } = req.body;

  if (!Array.isArray(selections) || selections.length === 0) {
    return errorResponse(res, 'Pilihan metode tidak boleh kosong.', 400);
  }

  const hasInvalid = selections.some((s) => {
    if (!s.fpmId || !s.capabilityStatus) return true;

    const capabilityStatus = String(s.capabilityStatus).toUpperCase();
    if (!['MAMPU', 'TIDAK_MAMPU'].includes(capabilityStatus)) return true;

    if (capabilityStatus === 'MAMPU' && !s.methodId) return true;

    const isInsitu = normalizeBoolean01(s.isInsitu ?? s.is_insitu);
    if (![0, 1].includes(isInsitu)) return true;

    return false;
  });

  if (hasInvalid) {
    return errorResponse(
      res,
      'Setiap pilihan wajib memiliki fpmId, capabilityStatus, methodId saat status MAMPU, dan status insitu.',
      400
    );
  }

  next();
};

const validateCustomerPaymentAction = (req, res, next) => {
  const { action, paymentMethodCode } = req.body;

  if (!action || !['approve', 'reject'].includes(action)) {
    return errorResponse(res, 'Action pembayaran harus "approve" atau "reject".', 400);
  }

  if (action === 'approve' && !paymentMethodCode) {
    return errorResponse(res, 'Metode pembayaran wajib dipilih.', 400);
  }

  next();
};

const validateDeferredPaymentNote = (req, res, next) => {
  const { note } = req.body;

  if (!note || !String(note).trim()) {
    return errorResponse(res, 'Catatan Bayar Nanti wajib diisi.', 400);
  }

  next();
};

const validateRejectRevision = (req, res, next) => {
  const { alasan, catatan } = req.body;
  if (req.path.includes('reject') && !alasan) {
    return errorResponse(res, 'Alasan penolakan wajib diisi.', 400);
  }
  if (req.path.includes('revision') && !catatan) {
    return errorResponse(res, 'Catatan perbaikan wajib diisi.', 400);
  }
  next();
};

const validateSamplingSchedule = (req, res, next) => {
  const tanggal = req.body.tanggalPengambilan || req.body.tanggal_jadwal || req.body.scheduleDate || req.body.tanggal;
  const jam = req.body.jamPengambilan || req.body.jam_jadwal || req.body.scheduleTime || req.body.jam;

  const dateError = validateYmdField({
    value: tanggal,
    label: 'Tanggal jadwal',
    required: true,
    notBeforeToday: true,
  });
  if (dateError) return errorResponse(res, dateError, 400);

  const timeError = validateTimeField({
    value: jam,
    label: 'Jam jadwal',
    required: true,
  });
  if (timeError) return errorResponse(res, timeError, 400);

  const operationalTimeError = validateOperationalTime(jam, 'Jam jadwal');
  if (operationalTimeError) return errorResponse(res, operationalTimeError, 400);

  next();
};



const validateScheduleConfirmation = (req, res, next) => {
  const jenis = asTrimmedText(req.body?.jenisJadwal || req.body?.jenis_jadwal || req.body?.type).toUpperCase();

  if (!['SAMPEL', 'LHU', 'SAMPLE', 'SAMPLING', 'PENGAMBILAN_LHU', 'LHU_PICKUP'].includes(jenis)) {
    return errorResponse(res, 'Jenis jadwal harus SAMPEL atau LHU.', 400);
  }

  next();
};

const validateScheduleChangeRequest = (req, res, next) => {
  const body = req.body || {};
  const jenis = asTrimmedText(body.jenisJadwal || body.jenis_jadwal || body.type).toUpperCase();
  const idRegistrasi = asTrimmedText(body.idRegistrasi || body.id_registrasi);
  const tanggal = body.tanggalUsulan || body.tanggal_usulan;
  const jam = body.jamUsulan || body.jam_usulan;
  const alasan = asTrimmedText(body.alasanPengajuan || body.alasan_pengajuan || body.alasan);

  if (!idRegistrasi) return errorResponse(res, 'ID registrasi wajib dikirim.', 400);
  if (!['SAMPEL', 'LHU', 'SAMPLE', 'SAMPLING', 'PENGAMBILAN_LHU', 'LHU_PICKUP'].includes(jenis)) {
    return errorResponse(res, 'Jenis jadwal harus SAMPEL atau LHU.', 400);
  }

  const dateError = validateYmdField({
    value: tanggal,
    label: 'Tanggal usulan',
    required: true,
    notBeforeToday: true,
  });
  if (dateError) return errorResponse(res, dateError, 400);

  const timeError = validateTimeField({
    value: jam,
    label: 'Jam usulan',
    required: true,
  });
  if (timeError) return errorResponse(res, timeError, 400);

  const operationalTimeError = validateOperationalTime(jam, 'Jam usulan');
  if (operationalTimeError) return errorResponse(res, operationalTimeError, 400);

  if (!alasan) return errorResponse(res, 'Alasan perubahan jadwal wajib diisi.', 400);
  if (alasan.length > 1000) return errorResponse(res, 'Alasan perubahan jadwal maksimal 1000 karakter.', 400);

  next();
};

const validateScheduleChangeDecision = (req, res, next) => {
  const action = asTrimmedText(req.body?.action).toLowerCase();
  const catatan = asTrimmedText(req.body?.catatanAdmin || req.body?.catatan_admin || req.body?.catatan);

  if (!['approve', 'reject'].includes(action)) {
    return errorResponse(res, 'Action harus approve atau reject.', 400);
  }

  if (action === 'reject' && !catatan) {
    return errorResponse(res, 'Catatan penolakan wajib diisi.', 400);
  }

  if (catatan.length > 1000) {
    return errorResponse(res, 'Catatan admin maksimal 1000 karakter.', 400);
  }

  next();
};

const validatePenyeliaAssignments = (req, res, next) => {
  const { assignments } = req.body;

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return errorResponse(res, 'Data penugasan analis tidak boleh kosong.', 400);
  }

  const hasInvalid = assignments.some((item) => {
    return !String(item?.no_sampel || '').trim()
      || !String(item?.id_fppl_parameter_metode || '').trim()
      || !String(item?.id_user_analis || '').trim();
  });

  if (hasInvalid) {
    return errorResponse(
      res,
      'Setiap penugasan wajib memiliki no_sampel, id_fppl_parameter_metode, dan id_user_analis.',
      400
    );
  }

  next();
};

const validateRequestIdParam = validateStringParamId('id', 'ID registrasi', 15);

const validateReceiveSamples = (req, res, next) => {
  const payload = req.body || {};
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.sampels) ? payload.sampels : [];

  if (!rows.length) {
    return errorResponse(res, 'Data sampel yang diterima wajib dikirim.', 400);
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || {};
    const label = row.no_sampel || row.sample_label || row.sampleLabel || `sampel #${index + 1}`;

    const tanggalPengambilan = row.tanggal_pengambilan_sampel || row.tanggalPengambilanSampel || payload.tanggal_pengambilan_sampel || payload.tanggalPengambilanSampel;

    const sampleDateError = validateYmdField({
      value: tanggalPengambilan,
      label: 'Tanggal pengambilan sampel',
      required: true,
      notBeforeToday: false,
    });
    if (sampleDateError) return errorResponse(res, sampleDateError, 400);

    const condition = row.kondisi_sampel || row.kondisiSampel || row.kondisi || payload.kondisi_sampel || payload.kondisiSampel;
    if (!asTrimmedText(condition)) {
      return errorResponse(res, `Kondisi sampel ${label} wajib diisi.`, 400);
    }

    const acuan = row.acuan_pengambilan_sampel || row.acuanPengambilanSampel || payload.acuan_pengambilan_sampel || payload.acuanPengambilanSampel;
    if (!asTrimmedText(acuan)) {
      return errorResponse(res, `Acuan pengambilan sampel ${label} wajib diisi.`, 400);
    }

    const lokasiSpesifik = row.lokasi_spesifik || row.lokasiSpesifik || payload.lokasi_spesifik || payload.lokasiSpesifik;
    if (!asTrimmedText(lokasiSpesifik)) {
      return errorResponse(res, `Lokasi spesifik sampel ${label} wajib diisi.`, 400);
    }

    if (asTrimmedText(lokasiSpesifik).length > 150) {
      return errorResponse(res, `Lokasi spesifik sampel ${label} maksimal 150 karakter.`, 400);
    }

    const koordinat = row.koordinat || payload.koordinat;
    if (!asTrimmedText(koordinat)) {
      return errorResponse(res, `Koordinat sampel ${label} wajib diisi.`, 400);
    }

    if (asTrimmedText(row.abnormalitas_sampel || row.abnormalitasSampel || row.catatan || payload.abnormalitas_sampel || payload.abnormalitasSampel).length > 1000) {
      return errorResponse(res, `Catatan sampel ${label} maksimal 1000 karakter.`, 400);
    }
  }

  next();
};

module.exports = {
  validateCreateRequest,
  validateVerifyRequest,
  validateAssignMethods,
  validateCustomerPaymentAction,
  validateDeferredPaymentNote,
  validateRejectRevision,
  validateSamplingSchedule,
  validateReceiveSamples,
  validateRequestIdParam,
  validatePenyeliaAssignments,
  validateScheduleChangeRequest,
  validateScheduleChangeDecision,
  validateScheduleConfirmation
};