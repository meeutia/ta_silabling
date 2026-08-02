const {
  asTrimmedText,
  fail,
  isBlank,
  validateTimeField,
  validateYmdField,
} = require('./common.validator');
const { validateOperationalTime } = require('../utils/schedule-policy.util');

const validateFinalizeLhu = (req, res, next) => {
  const body = req.body || {};
  const rawList = body.no_sampel_list || body.noSampelList || body.sampleNos || body.sample_nos || body.noSampels || body.no_sampels;
  const hasList = Array.isArray(rawList)
    ? rawList.some((item) => !isBlank(item))
    : !isBlank(rawList);

  if (!hasList && isBlank(body.noSampel || body.no_sampel)) return fail(res, 'Minimal satu nomor sampel wajib dikirim.');
  if (isBlank(body.idPktBm || body.id_pkt_bm)) return fail(res, 'Paket baku mutu wajib dipilih.');

  next();
};

const validateLhuPickupSchedule = (req, res, next) => {
  const body = req.body || {};

  if (isBlank(body.idRegistrasi || body.id_registrasi)) return fail(res, 'ID registrasi wajib dikirim.');

  const dateError = validateYmdField({
    value: body.tanggalPengambilan || body.tanggal_pengambilan,
    label: 'Tanggal pengambilan LHU',
    required: true,
    notBeforeToday: true,
  });
  if (dateError) return fail(res, dateError);

  const jamPengambilan = body.jamPengambilan || body.jam_pengambilan;
  const timeError = validateTimeField({
    value: jamPengambilan,
    label: 'Jam pengambilan LHU',
    required: true,
  });
  if (timeError) return fail(res, timeError);

  const operationalTimeError = validateOperationalTime(jamPengambilan, 'Jam pengambilan LHU');
  if (operationalTimeError) return fail(res, operationalTimeError);

  if (asTrimmedText(body.catatan).length > 1000) return fail(res, 'Catatan pengambilan LHU maksimal 1000 karakter.');

  next();
};

const validateLhuPickupCompletion = (req, res, next) => {
  const body = req.body || {};

  if (isBlank(body.idRegistrasi || body.id_registrasi)) return fail(res, 'ID registrasi wajib dikirim.');
  if (isBlank(body.namaPengambil || body.nama_pengambil)) return fail(res, 'Nama pengambil wajib diisi.');
  if (asTrimmedText(body.namaPengambil || body.nama_pengambil).length > 150) return fail(res, 'Nama pengambil maksimal 150 karakter.');

  next();
};

module.exports = {
  validateFinalizeLhu,
  validateLhuPickupCompletion,
  validateLhuPickupSchedule,
};
