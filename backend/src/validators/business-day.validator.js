const { Op } = require('sequelize');
const { Sampel, PenugasanItem, Lhu, LhuSampel } = require('../models/Associations');
const ReferenceService = require('../services/reference.service');
const { fail, asTrimmedText } = require('./common.validator');
const {
  asYmd,
  buildTestingBusinessTimeline,
  getTodayYmd,
  validateTestingPhaseDate,
  validateWithinBusinessWindow,
} = require('../utils/business-day.util');

function extractNoSampelFromAssignmentItem(item = {}) {
  const samples = new Set();

  const noSampelList = item.no_sampel || item.noSampel || item.samples || [];
  if (Array.isArray(noSampelList)) {
    noSampelList.forEach((value) => {
      const text = asTrimmedText(value);
      if (text) samples.add(text);
    });
  }

  const pairs = Array.isArray(item.pairs) ? item.pairs : [];
  pairs.forEach((pair) => {
    const text = asTrimmedText(pair?.no_sampel || pair?.noSampel);
    if (text) samples.add(text);
  });

  return [...samples];
}

async function loadSamplesMap(noSampelList = []) {
  const unique = [...new Set(noSampelList.map(asTrimmedText).filter(Boolean))];
  if (!unique.length) return new Map();

  const rows = await Sampel.findAll({
    where: { no_sampel: { [Op.in]: unique } },
    attributes: ['no_sampel', 'diterima_pada'],
  });

  return new Map(rows.map((row) => [row.no_sampel, row]));
}

function getSampleReceivedDate(sample) {
  return asYmd(sample?.diterima_pada);
}

function getWorkflowCurrentYmd(referenceYmd) {
  const todayYmd = getTodayYmd();
  const startYmd = asYmd(referenceYmd);

  if (!startYmd) return todayYmd;

  // Local/dev data can contain sample receipt dates that are later than the
  // machine clock. Do not block an already valid workflow solely because the
  // server date is behind the sample receipt date; use the receipt date as the
  // effective workflow date for the lower-bound check.
  return todayYmd < startYmd ? startYmd : todayYmd;
}


async function loadHolidayRows() {
  try {
    return await ReferenceService.getHariLibur();
  } catch (error) {
    const err = new Error(`Gagal memvalidasi tanggal merah: ${error.message || 'referensi hari libur tidak tersedia'}.`);
    err.statusCode = 500;
    throw err;
  }
}

function validateDeadlineAgainstSample({ noSampel, sample, deadline, label = 'Deadline', holidays = [] }) {
  const receivedYmd = getSampleReceivedDate(sample);

  if (!receivedYmd) {
    return `Sampel ${noSampel} belum memiliki tanggal penerimaan. Terima sampel terlebih dahulu sebelum membuat/menyelesaikan penugasan.`;
  }

  return validateTestingPhaseDate({
    value: deadline,
    receivedYmd,
    label,
    holidays,
  });
}

const validateAssignmentBusinessTimeline = async (req, res, next) => {
  try {
    const assignments = Array.isArray(req.body?.assignments) ? req.body.assignments : [];
    const allNoSampel = assignments.flatMap(extractNoSampelFromAssignmentItem);
    const samplesMap = await loadSamplesMap(allNoSampel);
    const holidays = await loadHolidayRows();

    for (let index = 0; index < assignments.length; index += 1) {
      const item = assignments[index] || {};
      const deadline = item.tanggal_tenggat || item.tanggalTenggat;
      const itemSamples = extractNoSampelFromAssignmentItem(item);

      if (!deadline) continue;

      for (const noSampel of itemSamples) {
        const sample = samplesMap.get(noSampel);
        if (!sample) return fail(res, `Sampel ${noSampel} tidak ditemukan.`);

        const message = validateDeadlineAgainstSample({
          noSampel,
          sample,
          deadline,
          label: `Deadline item penugasan #${index + 1}`,
          holidays,
        });

        if (message) return fail(res, message);
      }
    }

    next();
  } catch (error) {
    return fail(res, 'Gagal memvalidasi timeline penugasan analis.', 500);
  }
};

async function loadSamplesByPenugasanDetail(idPenugasanDetail) {
  const items = await PenugasanItem.findAll({
    where: { id_penugasan_detail: idPenugasanDetail },
    attributes: ['no_sampel'],
  });

  const noSampelList = items.map((item) => item.no_sampel).filter(Boolean);
  const samplesMap = await loadSamplesMap(noSampelList);

  return noSampelList.map((noSampel) => ({
    noSampel,
    sample: samplesMap.get(noSampel),
  }));
}

function getWorksheetDatePayload(req) {
  const body = req.body || {};
  const worksheet = body.worksheet || body;

  return {
    startDate: worksheet.tanggalMulaiPengujian || worksheet.tanggal_mulai_pengujian,
    endDate: worksheet.tanggalSelesaiPengujian || worksheet.tanggal_selesai_pengujian,
  };
}

const validateWorksheetBusinessTimeline = async (req, res, next) => {
  try {
    const idPenugasanDetail = req.params.idPenugasanDetail;
    const { startDate, endDate } = getWorksheetDatePayload(req);

    if (!startDate && !endDate) return next();

    const samples = await loadSamplesByPenugasanDetail(idPenugasanDetail);
    if (!samples.length) return fail(res, 'Detail penugasan belum memiliki sampel terkait.');

    const holidays = await loadHolidayRows();

    for (const { noSampel, sample } of samples) {
      const receivedYmd = getSampleReceivedDate(sample);
      if (!receivedYmd) {
        return fail(res, `Sampel ${noSampel} belum memiliki tanggal penerimaan. Tanggal pengujian belum bisa disimpan.`);
      }

      if (startDate) {
        const startMessage = validateTestingPhaseDate({
          value: startDate,
          receivedYmd,
          label: `Tanggal mulai pengujian sampel ${noSampel}`,
          holidays,
        });
        if (startMessage) return fail(res, startMessage);
      }

      if (endDate) {
        const endMessage = validateTestingPhaseDate({
          value: endDate,
          receivedYmd,
          label: `Tanggal selesai pengujian sampel ${noSampel}`,
          holidays,
        });
        if (endMessage) return fail(res, endMessage);
      }
    }

    next();
  } catch (error) {
    return fail(res, 'Gagal memvalidasi timeline worksheet analis.', 500);
  }
};

const validateSubkontrakBusinessTimeline = async (req, res, next) => {
  try {
    const results = Array.isArray(req.body?.results) ? req.body.results : [];
    const noSampelList = results.map((item) => item?.no_sampel || item?.noSampel).filter(Boolean);
    const samplesMap = await loadSamplesMap(noSampelList);
    const holidays = await loadHolidayRows();

    for (let index = 0; index < results.length; index += 1) {
      const item = results[index] || {};
      const noSampel = asTrimmedText(item.no_sampel || item.noSampel);
      const receiveDate = item.tanggal_terima_hasil || item.tanggalTerimaHasil;

      if (!receiveDate) continue;

      const sample = samplesMap.get(noSampel);
      if (!sample) return fail(res, `Sampel ${noSampel} tidak ditemukan.`);

      const receivedYmd = getSampleReceivedDate(sample);
      if (!receivedYmd) return fail(res, `Sampel ${noSampel} belum memiliki tanggal penerimaan.`);

      const message = validateTestingPhaseDate({
        value: receiveDate,
        receivedYmd,
        label: `Tanggal terima hasil subkontrak sampel ${noSampel || `#${index + 1}`}`,
        holidays,
      });
      if (message) return fail(res, message);
    }

    next();
  } catch (error) {
    return fail(res, 'Gagal memvalidasi timeline hasil subkontrak.', 500);
  }
};

const validateLhuFinalizationBusinessTimeline = async (req, res, next) => {
  try {
    const rawList = req.body?.noSampelList || req.body?.no_sampel_list || req.body?.noSampels || req.body?.no_sampels;
    const noSampelList = [...new Set((Array.isArray(rawList) ? rawList : String(rawList || req.body?.noSampel || req.body?.no_sampel || '').split(','))
      .map(asTrimmedText)
      .filter(Boolean))];

    if (!noSampelList.length) return next();

    const samplesMap = await loadSamplesMap(noSampelList);
    const holidays = await loadHolidayRows();

    for (const noSampel of noSampelList) {
      const sample = samplesMap.get(noSampel);
      if (!sample) return fail(res, `Sampel ${noSampel} tidak ditemukan.`);

      const receivedYmd = getSampleReceivedDate(sample);
      if (!receivedYmd) return fail(res, `Sampel ${noSampel} belum memiliki tanggal penerimaan.`);

      const message = validateWithinBusinessWindow({
        value: getWorkflowCurrentYmd(receivedYmd),
        startYmd: receivedYmd,
        maxBusinessDay: 12,
        label: `Tanggal finalisasi LHU sampel ${noSampel}`,
        holidays,
      });
      if (message) return fail(res, message);
    }

    next();
  } catch (error) {
    return fail(res, 'Gagal memvalidasi timeline finalisasi LHU.', 500);
  }
};

async function loadLhuSampleRows(nomorLhu) {
  const lhuNo = asTrimmedText(nomorLhu);
  if (!lhuNo) return [];

  return LhuSampel.findAll({
    where: { nomor_lhu: lhuNo },
    attributes: ['nomor_lhu', 'no_sampel', 'urutan_sampel'],
    order: [
      ['urutan_sampel', 'ASC'],
      ['no_sampel', 'ASC'],
    ],
  });
}

const validateKalabApprovalBusinessTimeline = async (req, res, next) => {
  try {
    const nomorLhu = asTrimmedText(
      req.body?.nomorLhu ||
        req.body?.nomor_lhu ||
        req.query?.nomorLhu ||
        req.query?.nomor_lhu ||
        req.params?.nomorLhu ||
        req.params?.nomor_lhu
    );
    if (!nomorLhu) return next();

    const lhu = await Lhu.findByPk(nomorLhu, { attributes: ['nomor_lhu'] });
    if (!lhu) return fail(res, `LHU ${nomorLhu} tidak ditemukan.`);

    const lhuSampleRows = await loadLhuSampleRows(nomorLhu);
    const noSampelList = lhuSampleRows
      .map((row) => asTrimmedText(row.no_sampel || row.noSampel))
      .filter(Boolean);

    if (!noSampelList.length) {
      return fail(res, `LHU ${nomorLhu} belum memiliki sampel terkait.`);
    }

    const samplesMap = await loadSamplesMap(noSampelList);
    const holidays = await loadHolidayRows();

    for (const noSampel of noSampelList) {
      const sample = samplesMap.get(noSampel);
      if (!sample) return fail(res, `Sampel ${noSampel} tidak ditemukan.`);

      const receivedYmd = getSampleReceivedDate(sample);
      if (!receivedYmd) return fail(res, `Sampel ${noSampel} belum memiliki tanggal penerimaan.`);

      const message = validateWithinBusinessWindow({
        value: getWorkflowCurrentYmd(receivedYmd),
        startYmd: receivedYmd,
        maxBusinessDay: 12,
        label: `Tanggal approval LHU sampel ${noSampel}`,
        holidays,
      });
      if (message) return fail(res, message);
    }

    next();
  } catch (error) {
    console.error('validateKalabApprovalBusinessTimeline error:', error);
    return fail(
      res,
      `Gagal memvalidasi timeline approval LHU.${error?.message ? ` ${error.message}` : ''}`,
      500
    );
  }
};

module.exports = {
  validateAssignmentBusinessTimeline,
  validateKalabApprovalBusinessTimeline,
  validateLhuFinalizationBusinessTimeline,
  validateSubkontrakBusinessTimeline,
  validateWorksheetBusinessTimeline,
};
