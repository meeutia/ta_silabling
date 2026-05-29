const {
  asTrimmedText,
  fail,
  isBlank,
  validateStringParamId,
  validateYmdField,
} = require('./common.validator');

function isValidHasilPair(item = {}) {
  const kode = asTrimmedText(item.kodeLka || item.kode_lka);
  const noSampel = asTrimmedText(item.noSampel || item.no_sampel);
  return Boolean(kode && noSampel);
}


function isValidResultExpression(value) {
  const text = asTrimmedText(value);
  if (!text) return false;
  if (text === '-') return true;

  const decimalNumber = '-?\\d+(?:,\\d+)?';
  const comparator = '(?:[<>]=?|≤|≥)?';
  const superscriptExponent = '[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+';
  const normalExponent = '[+-]?\\d+';

  return [
    new RegExp(`^${comparator}${decimalNumber}$`),
    new RegExp(`^${comparator}${decimalNumber}[Ee]${normalExponent}$`),
    new RegExp(`^${comparator}${decimalNumber}×10${superscriptExponent}$`),
    new RegExp(`^${comparator}${decimalNumber}×10${normalExponent}$`),
  ].some((pattern) => pattern.test(text));
}

const validatePenugasanDetailId = validateStringParamId('idPenugasanDetail', 'ID detail penugasan', 12);
const validatePenugasanId = validateStringParamId('idPenugasan', 'ID penugasan', 10);

const validateCreateAssignment = (req, res, next) => {
  const { idUserAnalis, assignments } = req.body || {};

  if (isBlank(idUserAnalis)) return fail(res, 'Analis wajib dipilih.');
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return fail(res, 'Minimal harus ada satu item yang ditugaskan.');
  }

  for (let index = 0; index < assignments.length; index += 1) {
    const item = assignments[index] || {};
    const pairs = Array.isArray(item.pairs) ? item.pairs : [];
    const noSampelList = Array.isArray(item.no_sampel || item.noSampel)
      ? (item.no_sampel || item.noSampel)
      : [];
    const representativeFpmId = asTrimmedText(item.id_fppl_parameter_metode || item.idFpplParameterMetode || pairs[0]?.id_fppl_parameter_metode || pairs[0]?.idFpplParameterMetode);

    if (!representativeFpmId && pairs.length === 0) {
      return fail(res, `Parameter/metode pada item penugasan #${index + 1} wajib dipilih.`);
    }

    if (pairs.length === 0 && noSampelList.length === 0) {
      return fail(res, `Minimal satu nomor sampel wajib dipilih pada item penugasan #${index + 1}.`);
    }

    for (const pair of pairs) {
      if (isBlank(pair?.id_fppl_parameter_metode || pair?.idFpplParameterMetode) || isBlank(pair?.no_sampel || pair?.noSampel)) {
        return fail(res, `Pasangan parameter dan nomor sampel pada item #${index + 1} tidak lengkap.`);
      }
    }

    const deadline = item.tanggal_tenggat || item.tanggalTenggat;
    const deadlineError = validateYmdField({ value: deadline, label: `Deadline item penugasan #${index + 1}`, required: false, notBeforeToday: true });
    if (deadlineError) return fail(res, deadlineError);

    if (asTrimmedText(item.catatan_detail || item.catatanDetail).length > 1000) {
      return fail(res, `Catatan detail penugasan #${index + 1} maksimal 1000 karakter.`);
    }
  }

  if (asTrimmedText(req.body.catatanPenugasan).length > 1000) {
    return fail(res, 'Catatan penugasan maksimal 1000 karakter.');
  }

  next();
};

const validateWorksheetDraft = (req, res, next) => {
  const body = req.body || {};
  const startDate = body.tanggalMulaiPengujian || body.tanggal_mulai_pengujian;
  const endDate = body.tanggalSelesaiPengujian || body.tanggal_selesai_pengujian;

  const startError = validateYmdField({ value: startDate, label: 'Tanggal mulai pengujian', required: false });
  if (startError) return fail(res, startError);

  const endError = validateYmdField({ value: endDate, label: 'Tanggal selesai pengujian', required: false });
  if (endError) return fail(res, endError);

  if (startDate && endDate && asTrimmedText(endDate) < asTrimmedText(startDate)) {
    return fail(res, 'Tanggal selesai tidak boleh sebelum tanggal mulai pengujian.');
  }

  if (asTrimmedText(body.dhlAkuades || body.dhl_akuades).length > 100) {
    return fail(res, 'DHL akuades maksimal 100 karakter.');
  }

  next();
};

const validateWorksheetResults = (req, res, next) => {
  const { results } = req.body || {};

  if (!Array.isArray(results)) {
    return fail(res, 'Data hasil pengujian harus berupa array.');
  }

  for (let index = 0; index < results.length; index += 1) {
    const row = results[index] || {};
    const noSampel = row.noSampel || row.no_sampel;
    const hasil = row.hasil;

    if (isBlank(noSampel)) return fail(res, `Nomor sampel pada hasil #${index + 1} wajib diisi.`);

    if (!isBlank(hasil) && !isValidResultExpression(hasil)) {
      return fail(res, `Hasil untuk sampel ${noSampel} harus berupa angka atau format batas, contoh: 7,5 atau <0,01.`);
    }

    if (asTrimmedText(row.catatanHasil || row.catatan_hasil).length > 1000) {
      return fail(res, `Catatan hasil untuk sampel ${noSampel} maksimal 1000 karakter.`);
    }
  }

  next();
};

const validateWorksheetSubmit = (req, res, next) => {
  const { worksheet = {}, results } = req.body || {};

  if (!Array.isArray(results) || results.length === 0) {
    return fail(res, 'Hasil pengujian sampel wajib diisi.');
  }

  const startDate = worksheet.tanggalMulaiPengujian || worksheet.tanggal_mulai_pengujian;
  const endDate = worksheet.tanggalSelesaiPengujian || worksheet.tanggal_selesai_pengujian;

  const startError = validateYmdField({ value: startDate, label: 'Tanggal pengerjaan', required: true });
  if (startError) return fail(res, startError);

  const endError = validateYmdField({ value: endDate, label: 'Tanggal selesai', required: true });
  if (endError) return fail(res, endError);

  if (asTrimmedText(endDate) < asTrimmedText(startDate)) {
    return fail(res, 'Tanggal selesai tidak boleh sebelum tanggal pengerjaan.');
  }

  if (isBlank(worksheet.dhlAkuades || worksheet.dhl_akuades)) {
    return fail(res, 'DHL akuades wajib diisi.');
  }

  if (isBlank(worksheet.fileWorksheetPath || worksheet.file_worksheet_path)) {
    return fail(res, 'File Worksheet wajib diupload.');
  }

  for (let index = 0; index < results.length; index += 1) {
    const row = results[index] || {};
    const noSampel = row.noSampel || row.no_sampel;
    const hasil = row.hasil;

    if (isBlank(noSampel)) return fail(res, `Nomor sampel pada hasil #${index + 1} wajib diisi.`);
    if (isBlank(hasil)) return fail(res, `Hasil untuk sampel ${noSampel} wajib diisi.`);
    if (!isValidResultExpression(hasil)) {
      return fail(res, `Hasil untuk sampel ${noSampel} harus berupa angka atau format batas, contoh: 7,5 atau <0,01.`);
    }
  }

  next();
};


const validateUpdateDeadline = (req, res, next) => {
  const deadline = req.body?.tanggalTenggat || req.body?.tanggal_tenggat || req.body?.deadline;
  const deadlineError = validateYmdField({
    value: deadline,
    label: 'Deadline penugasan',
    required: true,
    notBeforeToday: false,
  });

  if (deadlineError) return fail(res, deadlineError);

  next();
};

const validateSubkontrakResults = (req, res, next) => {
  const { results } = req.body || {};

  if (!Array.isArray(results) || results.length === 0) {
    return fail(res, 'Minimal satu hasil subkontrak harus dikirim.');
  }

  for (let index = 0; index < results.length; index += 1) {
    const item = results[index] || {};
    const noSampel = item.no_sampel || item.noSampel;
    const fpmId = item.id_fppl_parameter_metode || item.idFpplParameterMetode;
    const hasil = item.hasil;

    if (isBlank(noSampel) || isBlank(fpmId)) {
      return fail(res, `Nomor sampel dan parameter/metode pada hasil subkontrak #${index + 1} wajib diisi.`);
    }

    if (isBlank(hasil)) return fail(res, `Hasil untuk sampel ${noSampel} wajib diisi.`);
    if (!isValidResultExpression(hasil)) {
      return fail(res, `Hasil untuk sampel ${noSampel} harus berupa angka atau format batas, contoh: 7,5 atau <0,01.`);
    }

    const receiveDate = item.tanggal_terima_hasil || item.tanggalTerimaHasil;
    const receiveDateError = validateYmdField({ value: receiveDate, label: `Tanggal terima hasil sampel ${noSampel}`, required: false });
    if (receiveDateError) return fail(res, receiveDateError);
  }

  next();
};

const validatePenyeliaReviewRevision = (req, res, next) => {
  const body = req.body || {};
  const note = body.catatanRevisi || body.catatan_revisi || body.catatan;
  const revisions =
    body.catatanRevisiPerSampel ||
    body.catatan_revisi_per_sampel ||
    body.revisions ||
    body.revisi ||
    body.revisionItems ||
    body.revision_items ||
    null;

  if (Array.isArray(revisions) && revisions.length > 0) {
    const seen = new Set();

    for (let index = 0; index < revisions.length; index += 1) {
      const item = revisions[index] || {};
      const itemNote = item.catatanRevisi || item.catatan_revisi || item.catatan || item.note;
      const key = `${asTrimmedText(item.kodeLka || item.kode_lka)}|${asTrimmedText(item.noSampel || item.no_sampel)}`;

      if (!isValidHasilPair(item)) {
        return fail(res, `Target hasil revisi pada sampel #${index + 1} wajib berisi kode_lka dan no_sampel.`);
      }

      if (seen.has(key)) {
        return fail(res, `Target revisi duplikat pada ${key}.`);
      }

      seen.add(key);

      if (isBlank(itemNote)) {
        return fail(res, `Catatan revisi sampel #${index + 1} wajib diisi.`);
      }

      if (asTrimmedText(itemNote).length > 1000) {
        return fail(res, `Catatan revisi sampel #${index + 1} maksimal 1000 karakter.`);
      }
    }

    return next();
  }

  if (isBlank(note)) return fail(res, 'Catatan revisi wajib diisi.');
  if (asTrimmedText(note).length > 1000) return fail(res, 'Catatan revisi maksimal 1000 karakter.');

  next();
};

const validateKasiReviewApprove = (req, res, next) => {
  const noSampel = req.body?.noSampel || req.body?.no_sampel || req.query?.noSampel || req.query?.no_sampel;
  if (isBlank(noSampel)) return fail(res, 'Nomor sampel wajib dikirim.');
  next();
};

const validateKasiReviewRevision = (req, res, next) => {
  const noSampel = req.body?.noSampel || req.body?.no_sampel || req.query?.noSampel || req.query?.no_sampel;
  const revisions = req.body?.revisions || req.body?.revisi || req.body?.revisionItems || req.body?.revision_items || null;

  if (isBlank(noSampel)) return fail(res, 'Nomor sampel wajib dikirim.');

  if (!Array.isArray(revisions) || revisions.length === 0) {
    return fail(res, 'Pilih minimal satu parameter/metode yang perlu direvisi.');
  }

  const seen = new Set();

  for (let index = 0; index < revisions.length; index += 1) {
    const item = revisions[index] || {};
    const note = item.catatanRevisi || item.catatan_revisi || item.catatan || item.note;
    const key = `${asTrimmedText(item.kodeLka || item.kode_lka)}|${asTrimmedText(item.noSampel || item.no_sampel)}`;

    if (!isValidHasilPair(item)) {
      return fail(res, `Target revisi pada parameter #${index + 1} wajib berisi kode_lka dan no_sampel.`);
    }

    if (seen.has(key)) {
      return fail(res, `Parameter/metode revisi duplikat pada ${key}.`);
    }

    seen.add(key);

    if (isBlank(note)) {
      return fail(res, `Catatan revisi parameter #${index + 1} wajib diisi.`);
    }

    if (asTrimmedText(note).length > 1000) {
      return fail(res, `Catatan revisi parameter #${index + 1} maksimal 1000 karakter.`);
    }
  }

  next();
};

module.exports = {
  validateCreateAssignment,
  validateKasiReviewApprove,
  validateKasiReviewRevision,
  validatePenugasanDetailId,
  validatePenugasanId,
  validateSubkontrakResults,
  validateWorksheetDraft,
  validateWorksheetResults,
  validateWorksheetSubmit,
  validatePenyeliaReviewRevision,
  validateUpdateDeadline,
};
