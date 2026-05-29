const sequelize = require('../../config/database');
const {
  LkaRevisi,
  LkaRevisiItem,
} = require('../../models/Associations');

async function nextRunningId(tableName, fieldName, prefix, padLength, transaction) {
  const [[row]] = await sequelize.query(
    `SELECT ${fieldName} AS value FROM ${tableName} WHERE ${fieldName} LIKE :prefix ORDER BY ${fieldName} DESC LIMIT 1`,
    {
      replacements: { prefix: `${prefix}%` },
      transaction,
    }
  );

  const lastValue = row?.value || '';
  const lastNumber = Number(String(lastValue).replace(prefix, '')) || 0;
  return `${prefix}${String(lastNumber + 1).padStart(padLength, '0')}`;
}

async function nextLkaRevisiId(transaction) {
  return nextRunningId('lka_revisi', 'id_revisi_lka', 'RVL-', 6, transaction);
}

async function nextLkaRevisiItemId(transaction) {
  return nextRunningId('lka_revisi_item', 'id_revisi_item', 'RVI-', 6, transaction);
}


const LKA_REVISION_ITEM_STATUSES = new Set([
  'Menunggu Review Penyelia',
  'Ditolak Penyelia',
  'Disetujui untuk Analis',
  'Diperbaiki Analis',
  'Disetujui Penyelia',
  'Disetujui Kasi',
]);

function normalizeLkaRevisionItemStatus(status, revisionStatus = '') {
  const value = String(status || '').trim();
  if (LKA_REVISION_ITEM_STATUSES.has(value)) return value;

  if (String(revisionStatus || '').trim() === 'Menunggu Persetujuan Penyelia') {
    return 'Menunggu Review Penyelia';
  }

  return 'Disetujui untuk Analis';
}

async function createLkaRevisionLog({
  kodeLka,
  sumberRevisi,
  levelRevisi = 'HASIL',
  catatanUmum = null,
  diajukanOleh = null,
  ditinjauOleh = null,
  statusRevisi = 'Dikirim ke Analis',
  items = [],
}, transaction) {
  const revisionId = await nextLkaRevisiId(transaction);
  await LkaRevisi.create(
    {
      id_revisi_lka: revisionId,
      kode_lka: kodeLka,
      sumber_revisi: sumberRevisi,
      level_revisi: levelRevisi,
      catatan_umum: catatanUmum,
      diajukan_oleh: diajukanOleh,
      diajukan_pada: new Date(),
      ditinjau_oleh: ditinjauOleh || null,
      ditinjau_pada: ditinjauOleh ? new Date() : null,
      status_revisi: statusRevisi,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  for (const item of items) {
    const itemId = await nextLkaRevisiItemId(transaction);
    const statusItemRevisi = normalizeLkaRevisionItemStatus(
      item.statusItemRevisi || item.status_item_revisi,
      statusRevisi
    );

    await LkaRevisiItem.create(
      {
        id_revisi_item: itemId,
        id_revisi_lka: revisionId,
        kode_lka: item.kodeLka || item.kode_lka || kodeLka,
        no_sampel: item.noSampel || item.no_sampel || null,
        catatan_revisi: item.catatanRevisi || item.catatan_revisi || catatanUmum || null,
        status_item_revisi: statusItemRevisi,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );
  }

  return revisionId;
}

function groupRevisionRowsByLka(rows = []) {
  const groups = new Map();

  rows.forEach((row) => {
    const kodeLka = row.kode_lka || row.kodeLka;
    if (!kodeLka) return;
    if (!groups.has(kodeLka)) groups.set(kodeLka, []);
    groups.get(kodeLka).push(row);
  });

  return groups;
}

module.exports = {
  createLkaRevisionLog,
  groupRevisionRowsByLka,
};
