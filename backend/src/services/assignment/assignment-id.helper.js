const { Op } = require('sequelize');
const {
  Penugasan,
  PenugasanDetail,
  Lka,
  LkaRevisi,
  LkaRevisiItem,
} = require('../../models/Associations');

const RUNNING_ID_MODEL_MAP = Object.freeze({
  penugasan: {
    model: Penugasan,
    field: 'id_penugasan',
  },
  penugasan_detail: {
    model: PenugasanDetail,
    field: 'id_penugasan_detail',
  },
  lka: {
    model: Lka,
    field: 'kode_lka',
  },
  lka_revisi: {
    model: LkaRevisi,
    field: 'id_revisi_lka',
  },
  lka_revisi_item: {
    model: LkaRevisiItem,
    field: 'id_revisi_item',
  },
});

async function nextRunningId(tableName, fieldName, prefix, pad, transaction) {
  const config = RUNNING_ID_MODEL_MAP[tableName];

  if (!config) {
    throw new Error(`Generator ID untuk tabel ${tableName} belum didaftarkan.`);
  }

  if (config.field !== fieldName) {
    throw new Error(`Field ID ${fieldName} tidak sesuai untuk tabel ${tableName}.`);
  }

  const row = await config.model.findOne({
    where: {
      [fieldName]: {
        [Op.like]: `${prefix}%`,
      },
    },
    attributes: [fieldName],
    order: [[fieldName, 'DESC']],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  const lastId = row?.get(fieldName) || null;
  const lastNumber = lastId ? Number(String(lastId).replace(prefix, '')) || 0 : 0;

  return `${prefix}${String(lastNumber + 1).padStart(pad, '0')}`;
}

module.exports = {
  RUNNING_ID_MODEL_MAP,
  nextRunningId,
};
