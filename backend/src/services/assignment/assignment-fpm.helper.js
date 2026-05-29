const { pickObject, pickArray } = require('./assignment-object.helper');

function pairKey(fpmId, noSampel) {
  return `${String(fpmId || '').trim()}::${String(noSampel || '').trim()}`;
}

function methodGroupKeyFromFpm(fpm = {}) {
  const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
  return String(
    fpm.id_metode_parameter ||
      fpm.idMetodeParameter ||
      parameterMetode.id_metode_parameter ||
      parameterMetode.idMetodeParameter ||
      fpm.id_parameter ||
      fpm.idParameter ||
      fpm.id_fppl_parameter_metode ||
      ''
  );
}

function assertFpmParameterMethodConsistency(fpmRows = []) {
  const methodKeys = new Set(
    (Array.isArray(fpmRows) ? fpmRows : [])
      .map(methodGroupKeyFromFpm)
      .filter(Boolean)
  );

  if (methodKeys.size > 1) {
    throw new Error('Sampel dalam satu detail penugasan harus memakai parameter dan metode yang sama.');
  }
}

function assignmentGroupKey(fpm = {}) {
  const fpplSampel = pickObject(fpm, ['fppl_sampel', 'FpplSampel']) || {};
  const idRegistrasi = fpm.id_registrasi || fpplSampel.id_registrasi || '';
  return [idRegistrasi, methodGroupKeyFromFpm(fpm)].join('::');
}

function getStatusOrderValue(status) {
  if (status === 'Dalam Pengujian') return 2;
  if (status === 'Selesai') return 3;
  return 1;
}

function getScheduleDateTime(row = {}) {
  const time = new Date(`${row.tanggal_jadwal || '1900-01-01'} ${row.jam_jadwal || '00:00:00'}`).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getScheduleIdOrder(row = {}) {
  const numeric = String(row.id_jadwal || '').match(/\d+/g)?.join('');
  return Number(numeric || 0);
}

function getActiveJadwalFromFppl(fppl = {}) {
  const jadwalRows = pickArray(fppl, [
    'jadwal_sampels',
    'JadwalSampels',
    'jadwalSampels',
    'jadwal_sampel',
    'jadwalSampel',
  ]);

  return jadwalRows
    .filter((jadwal) => String(jadwal?.status_jadwal || '').trim().toLowerCase() !== 'dibatalkan')
    .sort((a, b) => (
      getScheduleIdOrder(b) - getScheduleIdOrder(a) ||
      getScheduleDateTime(b) - getScheduleDateTime(a)
    ))[0] || null;
}

function getAssociatedFpmsFromSample(sample = {}) {
  return pickArray(sample, [
    'parameter_metodes',
    'ParameterMetodes',
    'parameterMetodes',
    'fppl_parameter_metodes',
    'FpplParameterMetodes',
    'FpplParameterMetode',
    'fpplParameterMetodes',
    'parameter_metode_fppl',
  ]);
}

function assignmentPendingKey(idMetodeParameter, noSampel) {
  return `${String(idMetodeParameter || '').trim()}::${String(noSampel || '').trim()}`;
}

function sortSamplesForAssignment(a = {}, b = {}) {
  const aNo = String(a.no_sampel || a.noSampel || '');
  const bNo = String(b.no_sampel || b.noSampel || '');

  const extractNumber = (value) => {
    const match = String(value || '').match(/^(\d+)/);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  };

  const numberDiff = extractNumber(aNo) - extractNumber(bNo);
  if (numberDiff !== 0) return numberDiff;

  return aNo.localeCompare(bNo, 'id', { numeric: true, sensitivity: 'base' });
}

function toTinyInt(value) {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  return value ? 1 : 0;
}

function isSubkontrakFpm(fpm = {}, parameterMetode = {}) {
  return toTinyInt(fpm.is_subkontrak || parameterMetode.is_subkontrak) === 1;
}

function isInternalCapableFpm(fpm = {}, parameterMetode = {}) {
  return !isSubkontrakFpm(fpm, parameterMetode);
}

module.exports = {
  pairKey,
  methodGroupKeyFromFpm,
  assertFpmParameterMethodConsistency,
  assignmentGroupKey,
  getStatusOrderValue,
  getActiveJadwalFromFppl,
  getAssociatedFpmsFromSample,
  assignmentPendingKey,
  sortSamplesForAssignment,
  toTinyInt,
  isSubkontrakFpm,
  isInternalCapableFpm,
};
