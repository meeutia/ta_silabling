'use strict';

const { Op } = require('sequelize');
const { LkaRevisi, LkaRevisiItem } = require('../models/Associations');
const revisionSource = require('./lka-revision-source.service');
const Roles = require('../constants/roles');

function normalizeString(value) {
  return String(value || '').trim();
}

function getRoleId(options = {}) {
  return options.roleId || options.id_role || options.user?.id_role || options.user?.role || null;
}

function buildVisibilityWhere(roleId) {
  if (roleId === Roles.ANALIS) {
    return {
      [Op.or]: [
        { sumber_revisi: 'PENYELIA' },
        { status_revisi: { [Op.in]: ['Dikirim ke Analis', 'Disetujui untuk Analis', 'Diperbaiki Analis', 'Disetujui Penyelia', 'Selesai'] } },
      ],
    };
  }
  if (roleId === Roles.PENYELIA) {
    return {
      [Op.or]: [
        { sumber_revisi: { [Op.ne]: 'KASI_PENGUJIAN' } },
        { status_revisi: { [Op.in]: ['Menunggu Persetujuan Penyelia', 'Disetujui Penyelia', 'Dikirim ke Analis', 'Selesai', 'Ditolak Penyelia'] } },
      ],
    };
  }
  if (roleId === Roles.KASI) {
    return {
      [Op.or]: [
        { sumber_revisi: 'KASI_PENGUJIAN' },
        { sumber_revisi: 'PENYELIA' },
        { status_revisi: { [Op.in]: ['Menunggu Verifikasi Kasi Pengujian', 'Ditolak Penyelia', 'Disetujui Penyelia', 'Dikirim ke Analis', 'Selesai'] } },
      ],
    };
  }
  return {};
}

function mapRevisionRow(revision = {}, item = {}) {
  const itemNote = item.catatan_revisi || null;
  return {
    idRevisiLka: revision.id_revisi_lka,
    id_revisi_lka: revision.id_revisi_lka,
    idRevisiItem: item.id_revisi_item,
    id_revisi_item: item.id_revisi_item,
    kodeLka: revision.kode_lka,
    kode_lka: revision.kode_lka,
    noSampel: item.no_sampel,
    no_sampel: item.no_sampel,
    sumberRevisi: revision.sumber_revisi,
    sumber_revisi: revision.sumber_revisi,
    levelRevisi: revision.level_revisi,
    level_revisi: revision.level_revisi,
    statusRevisi: revision.status_revisi,
    status_revisi: revision.status_revisi,
    catatanUmum: revision.catatan_umum,
    catatan_umum: revision.catatan_umum,
    catatanRevisi: itemNote,
    catatan_revisi: itemNote,
    catatanTampil: itemNote || revision.catatan_umum || null,
    catatan_tampil: itemNote || revision.catatan_umum || null,
    diajukanOleh: revision.diajukan_oleh,
    diajukan_oleh: revision.diajukan_oleh,
    diajukanPada: revision.diajukan_pada,
    diajukan_pada: revision.diajukan_pada,
    ditinjauOleh: revision.ditinjau_oleh,
    ditinjau_oleh: revision.ditinjau_oleh,
    ditinjauPada: revision.ditinjau_pada,
    ditinjau_pada: revision.ditinjau_pada,
    catatanTinjauan: revision.catatan_tinjauan,
    catatan_tinjauan: revision.catatan_tinjauan,
  };
}

function plain(row) {
  return row ? row.get({ plain: true }) : null;
}

async function getRevisionRows(where, options = {}) {
  const rows = await LkaRevisi.findAll({
    where,
    include: [{ model: LkaRevisiItem, as: 'items', required: false }],
    order: [
      ['diajukan_pada', 'ASC'],
      ['id_revisi_lka', 'ASC'],
      [{ model: LkaRevisiItem, as: 'items' }, 'id_revisi_item', 'ASC'],
    ],
    transaction: options.transaction || null,
  });

  return rows.map(plain).filter(Boolean);
}

async function getRevisionHistoryByKodeLka(kodeLka, options = {}) {
  const kode = normalizeString(kodeLka);
  if (!kode) return [];

  const visibility = buildVisibilityWhere(getRoleId(options));
  const revisions = await getRevisionRows({ kode_lka: kode, ...visibility }, options);

  return revisions.flatMap((revision) => {
    const items = Array.isArray(revision.items) && revision.items.length ? revision.items : [{}];
    return items.map((item) => mapRevisionRow(revision, item));
  });
}

async function getRevisionHistoryByTarget(kodeLka, noSampel, options = {}) {
  const kode = normalizeString(kodeLka);
  const sample = normalizeString(noSampel);
  if (!kode || !sample) return [];

  const visibility = buildVisibilityWhere(getRoleId(options));
  const revisions = await getRevisionRows({ kode_lka: kode, ...visibility }, options);

  return revisions.flatMap((revision) =>
    (Array.isArray(revision.items) ? revision.items : [])
      .filter((item) => item.kode_lka === kode && item.no_sampel === sample)
      .map((item) => mapRevisionRow(revision, item))
  );
}

async function getRevisionDisplayByKodeLka(kodeLka, options = {}) {
  const kode = normalizeString(kodeLka);
  if (!kode) return { kodeLka: kode, revisions: [], sourceRows: [] };

  const [revisions, sourceRows] = await Promise.all([
    getRevisionHistoryByKodeLka(kode, options),
    revisionSource.getRevisionSourceByKodeLka(kode, options),
  ]);

  return {
    kodeLka: kode,
    kode_lka: kode,
    revisions,
    revision_items: revisions,
    sourceRows,
    source_rows: sourceRows,
    sumberUtama: 'lka_revisi',
    sumber_utama: 'lka_revisi',
  };
}

module.exports = {
  getRevisionHistoryByKodeLka,
  getRevisionHistoryByTarget,
  getRevisionDisplayByKodeLka,
};
