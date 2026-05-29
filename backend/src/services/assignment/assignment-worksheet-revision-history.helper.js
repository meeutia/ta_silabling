const {
  LkaRevisi,
  LkaRevisiItem,
  User,
} = require('../../models/Associations');
const { getPlain, pickArray, pickObject } = require('./assignment-object.helper');

async function loadRevisionRowsForLka(kodeLka, transaction = null) {
  const kode = String(kodeLka || '').trim();
  if (!kode) return [];

  const rows = await LkaRevisi.findAll({
    where: { kode_lka: kode },
    include: [{ model: LkaRevisiItem, as: 'items', required: false }],
    order: [
      ['diajukan_pada', 'ASC'],
      [{ model: LkaRevisiItem, as: 'items' }, 'id_revisi_item', 'ASC'],
    ],
    transaction: transaction || undefined,
  });

  return rows.map(getPlain).filter(Boolean);
}

async function getLkaRevisionHistory(kodeLka) {
  const kode = String(kodeLka || '').trim();
  if (!kode) throw new Error('Kode LKA wajib dikirim.');

  const rows = await LkaRevisi.findAll({
    where: { kode_lka: kode },
    include: [
      {
        model: LkaRevisiItem,
        as: 'items',
        required: false,
      },
      { model: User, as: 'PengajuRevisi', required: false, attributes: ['nik', 'username'] },
      { model: User, as: 'PeninjauRevisi', required: false, attributes: ['nik', 'username'] },
    ],
    order: [
      ['diajukan_pada', 'ASC'],
      ['id_revisi_lka', 'ASC'],
      [{ model: LkaRevisiItem, as: 'items' }, 'id_revisi_item', 'ASC'],
    ],
  });

  return rows.map((instance) => {
    const row = getPlain(instance);
    const items = pickArray(row, ['items', 'lka_revisi_items', 'LkaRevisiItems']).map((item) => ({
      idRevisiItem: item.id_revisi_item,
      id_revisi_item: item.id_revisi_item,
      kodeLka: item.kode_lka || row.kode_lka || null,
      kode_lka: item.kode_lka || row.kode_lka || null,
      noSampel: item.no_sampel || null,
      no_sampel: item.no_sampel || null,
      statusItemRevisi: item.status_item_revisi || null,
      status_item_revisi: item.status_item_revisi || null,
      catatanRevisi: item.catatan_revisi || null,
      catatan_revisi: item.catatan_revisi || null,
    }));
    const pengaju = pickObject(row, ['PengajuRevisi']) || {};
    const peninjau = pickObject(row, ['PeninjauRevisi']) || {};

    return {
      idRevisiLka: row.id_revisi_lka,
      id_revisi_lka: row.id_revisi_lka,
      kodeLka: row.kode_lka,
      kode_lka: row.kode_lka,
      sumberRevisi: row.sumber_revisi,
      sumber_revisi: row.sumber_revisi,
      levelRevisi: row.level_revisi,
      level_revisi: row.level_revisi,
      catatanUmum: row.catatan_umum || null,
      catatan_umum: row.catatan_umum || null,
      diajukanOleh: row.diajukan_oleh,
      diajukan_oleh: row.diajukan_oleh,
      diajukanOlehNama: pengaju.username || row.diajukan_oleh || null,
      diajukan_oleh_nama: pengaju.username || row.diajukan_oleh || null,
      diajukanPada: row.diajukan_pada,
      diajukan_pada: row.diajukan_pada,
      statusRevisi: row.status_revisi,
      status_revisi: row.status_revisi,
      ditinjauOleh: row.ditinjau_oleh || null,
      ditinjau_oleh: row.ditinjau_oleh || null,
      ditinjauOlehNama: peninjau.username || row.ditinjau_oleh || null,
      ditinjau_oleh_nama: peninjau.username || row.ditinjau_oleh || null,
      ditinjauPada: row.ditinjau_pada || null,
      ditinjau_pada: row.ditinjau_pada || null,
      catatanTinjauan: row.catatan_tinjauan || null,
      catatan_tinjauan: row.catatan_tinjauan || null,
      items,
      revisi_items: items,
    };
  });
}

module.exports = {
  getLkaRevisionHistory,
  loadRevisionRowsForLka,
};
