const { Op } = require('sequelize');
const {
  PenugasanItem,
  Lka,
  LkaHasil,
  LkaRevisi,
  LkaRevisiItem,
} = require('../../models/Associations');
const { LKA_HASIL_STATUS } = require('./assignment.constants');
const { getPlain, pickArray } = require('./assignment-object.helper');
const { parseWorksheetFiles } = require('./assignment-worksheet-files.helper');
const { getLkaHasilStatus } = require('./assignment-status.helper');
const { normalizeRevisionSource } = require('./assignment-revision.helper');

function isValidResultExpression(value) {
  const text = String(value || '').trim();

  if (!text) return false;

  if (text === '-') return true;

  const decimalNumber = '-?\\d+(?:,\\d+)?';
  const comparator = '(?:[<>]=?|≤|≥)?';
  const superscriptExponent = '[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+';
  const normalExponent = '[+-]?\\d+';

  const patterns = [
    new RegExp(`^${comparator}${decimalNumber}$`),
    new RegExp(`^${comparator}${decimalNumber}[Ee]${normalExponent}$`),
    new RegExp(`^${comparator}${decimalNumber}×10${superscriptExponent}$`),
    new RegExp(`^${comparator}${decimalNumber}×10${normalExponent}$`),
  ];

  return patterns.some((pattern) => pattern.test(text));
}


function normalizeResultRows(results = []) {
  const seen = new Set();

  return (Array.isArray(results) ? results : [])
    .map((item) => ({
      noSampel: String(
        item?.noSampel ||
        item?.no_sampel ||
        ''
      ).trim(),

      hasil:
        item?.hasil == null
          ? ''
          : String(item.hasil).trim(),

      catatanHasil:
        item?.catatanHasil == null &&
        item?.catatan_hasil == null &&
        item?.abnormalitasSampel == null &&
        item?.abnormalitas_sampel == null &&
        item?.abnormalitasContoh == null &&
        item?.abnormalitas_contoh == null
          ? ''
          : String(
              item?.catatanHasil ??
              item?.catatan_hasil ??
              item?.abnormalitasSampel ??
              item?.abnormalitas_sampel ??
              item?.abnormalitasContoh ??
              item?.abnormalitas_contoh ??
              ''
            ).trim(),
    }))
    .filter((item) => item.noSampel)
    .filter((item) => {
      if (seen.has(item.noSampel)) return false;
      seen.add(item.noSampel);
      return true;
    });
}


async function upsertWorksheetResults(idPenugasanDetail, kodeLka, results, transaction) {
  const normalizedResults = normalizeResultRows(results);

  const lka = await Lka.findOne({
    where: { kode_lka: kodeLka },
    attributes: ['kode_lka', 'status_lka'],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  const revisionScope = await getLkaRevisionScope(kodeLka, transaction);
  const isRevisionLka = lka?.status_lka === 'Perlu Perbaikan';

  if (isRevisionLka && revisionScope.hasSpecificRevisionRows) {
    const invalidRows = normalizedResults.filter(
      (item) => !revisionScope.revisionSampleSet.has(String(item.noSampel || '').trim())
    );

    if (invalidRows.length > 0) {
      throw new Error(
        `Hanya hasil sampel yang diminta revisi yang boleh diubah: ${Array.from(revisionScope.revisionSampleSet).join(', ')}.`
      );
    }
  }

  if (!normalizedResults.length) {
    throw new Error('Hasil pengujian belum diisi.');
  }

  const itemRows = await PenugasanItem.findAll({
    where: { id_penugasan_detail: idPenugasanDetail },
    attributes: ['no_sampel'],
    transaction,
  });

  const validSampleSet = new Set(itemRows.map((row) => row.no_sampel));

  for (const item of normalizedResults) {
    if (!validSampleSet.has(item.noSampel)) {
      throw new Error(`Sampel ${item.noSampel} tidak termasuk tugas ini.`);
    }

    if (item.hasil && !isValidResultExpression(item.hasil)) {
      throw new Error(`Hasil untuk sampel ${item.noSampel} harus berupa angka atau format batas, contoh: 7,5 atau <0,01.`);
    }

    const existing = await LkaHasil.findOne({
      where: { kode_lka: kodeLka, no_sampel: item.noSampel },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (existing) {
      await existing.update(
        {
          hasil: item.hasil || null,
          catatan_hasil: item.catatanHasil || null,
          statusReviewHasil: existing.statusReviewHasil || LKA_HASIL_STATUS.DRAFT,
        },
        { transaction }
      );
    } else {
      await LkaHasil.create(
        {
          kode_lka: kodeLka,
          no_sampel: item.noSampel,
          hasil: item.hasil || null,
          catatan_hasil: String(item.catatanHasil || '').trim() ? String(item.catatanHasil).trim() : null,
          statusReviewHasil: LKA_HASIL_STATUS.DRAFT,
        },
        { transaction }
      );
    }
  }
}


async function getLkaRevisionScope(kodeLka, transaction = null) {
  const rows = await LkaHasil.findAll({
    where: { kode_lka: kodeLka },
    attributes: ['kode_lka', 'no_sampel', 'statusReviewHasil'],
    transaction,
  });

  const plainRows = rows.map(getPlain).filter(Boolean);
  const revisionRows = plainRows.filter(
    (row) => getLkaHasilStatus(row) === LKA_HASIL_STATUS.REVISION
  );

  return {
    rows: plainRows,
    revisionRows,
    hasSpecificRevisionRows: revisionRows.length > 0,
    allRowsRevision:
      plainRows.length > 0 &&
      revisionRows.length === plainRows.length,
    revisionSampleSet: new Set(
      revisionRows.map((row) => String(row.no_sampel || '').trim()).filter(Boolean)
    ),
  };
}


function isRevisionStillOpenForAnalystItem(status) {
  return ['Menunggu Review Penyelia', 'Disetujui untuk Analis'].includes(String(status || '').trim());
}


function isKasiRevisionItemCompletedAfterSupervisorReview(status) {
  return ['Ditolak Penyelia', 'Disetujui Penyelia', 'Disetujui Kasi'].includes(String(status || '').trim());
}


function isRevisionLogCompleted(revision = {}, items = []) {
  const source = normalizeRevisionSource(revision.sumber_revisi || revision.sumberRevisi);

  if (!items.length) return true;

  if (source === 'KASI_PENGUJIAN') {
    return items.every((item) =>
      isKasiRevisionItemCompletedAfterSupervisorReview(item.status_item_revisi || item.statusItemRevisi)
    );
  }

  return !items.some((item) =>
    isRevisionStillOpenForAnalystItem(item.status_item_revisi || item.statusItemRevisi)
  );
}


async function syncRevisionLogCompletion(kodeLka, transaction = null) {
  const kode = String(kodeLka || '').trim();
  if (!kode) return;

  const rows = await LkaRevisi.findAll({
    where: {
      kode_lka: kode,
      status_revisi: 'Dikirim ke Analis',
    },
    include: [{ model: LkaRevisiItem, as: 'items', required: false }],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  for (const row of rows) {
    const plain = getPlain(row);
    const items = pickArray(plain, ['items', 'lka_revisi_items', 'LkaRevisiItems']);

    if (isRevisionLogCompleted(plain, items)) {
      await row.update(
        {
          status_revisi: 'Selesai',
          updated_at: new Date(),
        },
        { transaction }
      );
    }
  }
}


async function markRevisionItemsWorkedByAnalyst(kodeLka, noSampels = [], transaction = null) {
  const kode = String(kodeLka || '').trim();
  const sampleNos = Array.from(
    new Set((Array.isArray(noSampels) ? noSampels : [noSampels])
      .map((item) => String(item || '').trim())
      .filter(Boolean))
  );

  if (!kode) return;

  if (sampleNos.length > 0) {
    await LkaRevisiItem.update(
      {
        status_item_revisi: 'Diperbaiki Analis',
        updated_at: new Date(),
      },
      {
        where: {
          kode_lka: kode,
          no_sampel: { [Op.in]: sampleNos },
          status_item_revisi: 'Disetujui untuk Analis',
        },
        transaction,
      }
    );
  }

  await syncRevisionLogCompletion(kode, transaction);
}


async function markRevisionItemsApprovedByPenyelia(kodeLka, noSampels = [], transaction = null) {
  const kode = String(kodeLka || '').trim();
  const sampleNos = Array.from(
    new Set((Array.isArray(noSampels) ? noSampels : [noSampels])
      .map((item) => String(item || '').trim())
      .filter(Boolean))
  );

  if (!kode || sampleNos.length === 0) return;

  await LkaRevisiItem.update(
    {
      status_item_revisi: 'Disetujui Penyelia',
      updated_at: new Date(),
    },
    {
      where: {
        kode_lka: kode,
        no_sampel: { [Op.in]: sampleNos },
        status_item_revisi: { [Op.in]: ['Diperbaiki Analis', 'Disetujui untuk Analis'] },
      },
      transaction,
    }
  );

  await syncRevisionLogCompletion(kode, transaction);
}


async function markRevisionItemsApprovedByKasi(kodeLka, noSampels = [], transaction = null) {
  const kode = String(kodeLka || '').trim();
  const sampleNos = Array.from(
    new Set((Array.isArray(noSampels) ? noSampels : [noSampels])
      .map((item) => String(item || '').trim())
      .filter(Boolean))
  );

  if (!kode || sampleNos.length === 0) return;

  await LkaRevisiItem.update(
    {
      status_item_revisi: 'Disetujui Kasi',
      updated_at: new Date(),
    },
    {
      where: {
        kode_lka: kode,
        no_sampel: { [Op.in]: sampleNos },
        status_item_revisi: { [Op.in]: ['Diperbaiki Analis', 'Disetujui Penyelia', 'Disetujui untuk Analis'] },
      },
      transaction,
    }
  );

  await syncRevisionLogCompletion(kode, transaction);
}


async function assertWorksheetReadyToSubmit(idPenugasanDetail, kodeLka, transaction) {
  const lka = await Lka.findOne({
    where: { kode_lka: kodeLka },
    include: [{ model: LkaHasil, required: false }],
    transaction,
  });

  if (!lka) {
    throw new Error('Data LKA tidak ditemukan.');
  }

  const itemRows = await PenugasanItem.findAll({
    where: { id_penugasan_detail: idPenugasanDetail },
    attributes: ['no_sampel'],
    transaction,
  });

  const totalSampel = itemRows.length;
  const validSampleSet = new Set(itemRows.map((row) => row.no_sampel));

  const plain = getPlain(lka);
  const hasilRows = pickArray(plain, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']);

  const worksheetFiles = parseWorksheetFiles(plain.file_worksheet_path);

  if (!worksheetFiles.length) {
    throw new Error('Upload minimal satu file LKA sebelum dikirim ke penyelia.');
  }

  if (totalSampel === 0) {
    throw new Error('Tidak ada sampel pada detail penugasan ini.');
  }

  const totalHasilTerisi = hasilRows.filter((row) =>
    validSampleSet.has(row.no_sampel) &&
    String(row.hasil || '').trim()
  ).length;

  if (totalHasilTerisi < totalSampel) {
    throw new Error('Semua hasil pengujian per sampel wajib diisi sebelum dikirim.');
  }
}

module.exports = {
  normalizeResultRows,
  getLkaRevisionScope,
  upsertWorksheetResults,
  assertWorksheetReadyToSubmit,
  markRevisionItemsWorkedByAnalyst,
  markRevisionItemsApprovedByPenyelia,
  markRevisionItemsApprovedByKasi,
};
