const { Op } = require('sequelize');
const { Lhu, LhuSampel, PenugasanItem } = require('../../models/Associations');
const { LHU_STATUS } = require('../../constants/lhu-status.constant');
const { uniqueSampleNos } = require('./assignment-revision.helper');

const LHU_SOURCE_LOCK_STATUSES = Object.freeze([
  LHU_STATUS.WAIT_KALAB,
  LHU_STATUS.APPROVED_FINAL,
]);

function getPlain(instance) {
  if (!instance) return null;
  if (typeof instance.get === 'function') return instance.get({ plain: true });
  return instance;
}

function buildLhuLockedError(lockedRows = []) {
  const labels = lockedRows
    .map((row) => `${row.no_sampel || '-'} (${row.nomor_lhu || '-'})`)
    .join(', ');

  const error = new Error(
    labels
      ? `Data tidak dapat diubah karena LHU sudah tergenerate: ${labels}.`
      : 'Data tidak dapat diubah karena LHU sudah tergenerate.'
  );
  error.statusCode = 409;
  return error;
}


async function getLockedLhuRowsBySamples(noSampels, transaction = null) {
  const sampleNos = uniqueSampleNos(noSampels);
  if (!sampleNos.length) return [];

  const rows = await LhuSampel.findAll({
    where: { no_sampel: { [Op.in]: sampleNos } },
    include: [
      {
        model: Lhu,
        as: 'lhu',
        required: true,
        where: { status_lhu: { [Op.in]: LHU_SOURCE_LOCK_STATUSES } },
        attributes: ['nomor_lhu', 'status_lhu'],
      },
    ],
    transaction,
  });

  return rows.map((row) => {
    const plain = row.get({ plain: true });
    return {
      nomor_lhu: plain.nomor_lhu || plain.lhu?.nomor_lhu,
      no_sampel: plain.no_sampel,
      status_lhu: plain.lhu?.status_lhu || null,
    };
  });
}


async function assertSamplesEditableBeforeLhu(noSampels, transaction = null) {
  const lockedRows = await getLockedLhuRowsBySamples(noSampels, transaction);
  if (lockedRows.length) {
    throw buildLhuLockedError(lockedRows);
  }
}


async function cancelNonFinalLhusBySamples(noSampels, transaction = null) {
  const sampleNos = uniqueSampleNos(noSampels);
  if (!sampleNos.length) return [];

  const rows = await LhuSampel.findAll({
    where: { no_sampel: { [Op.in]: sampleNos } },
    include: [
      {
        model: Lhu,
        as: 'lhu',
        required: true,
        where: { status_lhu: { [Op.ne]: LHU_STATUS.APPROVED_FINAL } },
        attributes: ['nomor_lhu', 'status_lhu'],
      },
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  const nomorLhus = Array.from(
    new Set(
      rows
        .map((row) => {
          const plain = row.get({ plain: true });
          return plain.nomor_lhu || plain.lhu?.nomor_lhu;
        })
        .filter(Boolean)
    )
  );

  if (!nomorLhus.length) return [];

  await Lhu.update(
    {
      status_lhu: LHU_STATUS.CANCELLED,
      file_lhu_path: null,
      tanggal_penerbitan: null,
      kalab_by: null,
      kalab_at: null,
    },
    {
      where: {
        nomor_lhu: { [Op.in]: nomorLhus },
        status_lhu: { [Op.ne]: LHU_STATUS.APPROVED_FINAL },
      },
      transaction,
    }
  );

  return nomorLhus;
}


async function getSampleNosForPenugasanDetail(idPenugasanDetail, transaction = null) {
  const itemRows = await PenugasanItem.findAll({
    where: { id_penugasan_detail: idPenugasanDetail },
    attributes: ['no_sampel'],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  return uniqueSampleNos(itemRows.map((row) => getPlain(row)?.no_sampel));
}


async function assertPenugasanDetailSamplesEditableBeforeLhu(idPenugasanDetail, transaction = null) {
  const sampleNos = await getSampleNosForPenugasanDetail(idPenugasanDetail, transaction);
  await assertSamplesEditableBeforeLhu(sampleNos, transaction);
  return sampleNos;
}


function toLhuLockPayload(lockedRows = []) {
  const rows = (lockedRows || []).map((row) => ({
    nomorLhu: row.nomor_lhu || row.nomorLhu || null,
    nomor_lhu: row.nomor_lhu || row.nomorLhu || null,
    noSampel: row.no_sampel || row.noSampel || null,
    no_sampel: row.no_sampel || row.noSampel || null,
    statusLhu: row.status_lhu || row.statusLhu || null,
    status_lhu: row.status_lhu || row.statusLhu || null,
  }));

  return {
    isLhuGenerated: rows.length > 0,
    is_lhu_generated: rows.length > 0,
    isLhuLocked: rows.length > 0,
    is_lhu_locked: rows.length > 0,
    canEdit: rows.length === 0,
    can_edit: rows.length === 0,
    lockedLhus: rows,
    locked_lhus: rows,
  };
}


module.exports = {
  getLockedLhuRowsBySamples,
  assertSamplesEditableBeforeLhu,
  cancelNonFinalLhusBySamples,
  getSampleNosForPenugasanDetail,
  assertPenugasanDetailSamplesEditableBeforeLhu,
  toLhuLockPayload,
};
