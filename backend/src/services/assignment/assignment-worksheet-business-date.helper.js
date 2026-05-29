const { Op } = require('sequelize');
const { Sampel } = require('../../models/Associations');
const ReferenceService = require('../reference.service');
const { asYmd, isBusinessDay, validateTestingPhaseDate } = require('../../utils/business-day.util');
const { getPlain } = require('./assignment-object.helper');
const { getSampleNosForPenugasanDetail } = require('./assignment-lhu-lock.helper');

async function getHolidayDateSet() {
  const holidays = await ReferenceService.getHariLibur();
  return new Set((Array.isArray(holidays) ? holidays : []).map((item) => asYmd(item?.date)).filter(Boolean));
}

async function getReceiptDateForPenugasanDetail(idPenugasanDetail, transaction = null) {
  const sampleNos = await getSampleNosForPenugasanDetail(idPenugasanDetail, transaction);
  if (!sampleNos.length) return null;

  const samples = await Sampel.findAll({
    where: { no_sampel: { [Op.in]: sampleNos } },
    attributes: ['diterima_pada'],
    transaction,
  });

  return samples
    .map((row) => asYmd(getPlain(row)?.diterima_pada))
    .filter(Boolean)
    .sort()[0] || null;
}

async function assertWorksheetBusinessDatesOrThrow(idPenugasanDetail, tanggalMulaiPengujian, tanggalSelesaiPengujian, transaction = null) {
  const holidays = await getHolidayDateSet();
  const dateRows = [
    ['Tanggal pengerjaan', asYmd(tanggalMulaiPengujian)],
    ['Tanggal selesai', asYmd(tanggalSelesaiPengujian)],
  ].filter(([, value]) => Boolean(value));

  for (const [label, value] of dateRows) {
    if (!isBusinessDay(value, holidays)) {
      throw new Error(`${label} harus hari kerja dan tidak boleh Sabtu/Minggu/tanggal merah.`);
    }
  }

  if (tanggalMulaiPengujian && tanggalSelesaiPengujian && asYmd(tanggalSelesaiPengujian) < asYmd(tanggalMulaiPengujian)) {
    throw new Error('Tanggal selesai tidak boleh sebelum tanggal pengerjaan.');
  }

  const receiptDate = await getReceiptDateForPenugasanDetail(idPenugasanDetail, transaction);
  if (!receiptDate) return;

  if (tanggalMulaiPengujian) {
    const message = validateTestingPhaseDate({ value: tanggalMulaiPengujian, receivedYmd: receiptDate, label: 'Tanggal pengerjaan', holidays });
    if (message) throw new Error(message);
  }

  if (tanggalSelesaiPengujian) {
    const message = validateTestingPhaseDate({ value: tanggalSelesaiPengujian, receivedYmd: receiptDate, label: 'Tanggal selesai', holidays });
    if (message) throw new Error(message);
  }
}

module.exports = {
  getHolidayDateSet,
  getReceiptDateForPenugasanDetail,
  assertWorksheetBusinessDatesOrThrow,
};
