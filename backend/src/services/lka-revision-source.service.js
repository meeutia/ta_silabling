'use strict';

/**
 * Sumber runtime revisi LKA berbasis model Sequelize.
 * Identitas hasil LKA adalah pasangan kode_lka + no_sampel.
 */

const { Op } = require('sequelize');
const { LkaRevisi, LkaRevisiItem } = require('../models/Associations');

function normalizeTargets(targets = []) {
  return (Array.isArray(targets) ? targets : [targets])
    .map((item) => ({
      kode_lka: String(item?.kode_lka || item?.kodeLka || '').trim(),
      no_sampel: String(item?.no_sampel || item?.noSampel || '').trim(),
    }))
    .filter((item) => item.kode_lka && item.no_sampel);
}

async function viewExists() {
  // Tidak lagi memakai database view; sumber resmi dibaca dari model lka_revisi + lka_revisi_item.
  return true;
}

function plain(row) {
  return row ? row.get({ plain: true }) : null;
}

function buildSourceRow(kodeLka, noSampel, revisions = []) {
  const matching = revisions
    .filter((revision) => {
      const items = Array.isArray(revision.items) ? revision.items : [];
      return items.some((item) => item.kode_lka === kodeLka && item.no_sampel === noSampel);
    })
    .sort((a, b) => new Date(b.diajukan_pada || 0) - new Date(a.diajukan_pada || 0));

  const latestBySource = (source) => {
    const revision = matching.find((row) => row.sumber_revisi === source);
    if (!revision) return { revision: null, item: null };

    const item = (Array.isArray(revision.items) ? revision.items : [])
      .filter((row) => row.kode_lka === kodeLka && row.no_sampel === noSampel)
      .sort((a, b) => String(b.id_revisi_item || '').localeCompare(String(a.id_revisi_item || '')))[0] || null;

    return { revision, item };
  };

  const penyelia = latestBySource('PENYELIA');
  const kasi = latestBySource('KASI_PENGUJIAN');
  const latestLkaNote = matching.find((row) => row.level_revisi === 'LKA') || null;

  return {
    kode_lka: kodeLka,
    no_sampel: noSampel,
    catatan_revisi_hasil_penyelia_source: penyelia.item?.catatan_revisi || null,
    catatan_revisi_hasil_kasi_pengujian_source: kasi.item?.catatan_revisi || null,
    revisi_penyelia_by_source: penyelia.revision?.diajukan_oleh || null,
    revisi_penyelia_at_source: penyelia.revision?.diajukan_pada || null,
    revisi_kasi_pengujian_by_source: kasi.revision?.diajukan_oleh || null,
    revisi_kasi_pengujian_at_source: kasi.revision?.diajukan_pada || null,
    catatan_revisi_lka_source: latestLkaNote?.catatan_umum || null,
    jumlah_revisi_hasil_source: matching.reduce((total, revision) => {
      const count = (Array.isArray(revision.items) ? revision.items : [])
        .filter((item) => item.kode_lka === kodeLka && item.no_sampel === noSampel).length;
      return total + count;
    }, 0),
  };
}

async function getRevisionRowsByKodeLka(kodeLka, options = {}) {
  const rows = await LkaRevisi.findAll({
    where: { kode_lka: kodeLka },
    include: [{ model: LkaRevisiItem, as: 'items', required: false }],
    order: [
      ['diajukan_pada', 'DESC'],
      ['id_revisi_lka', 'DESC'],
      [{ model: LkaRevisiItem, as: 'items' }, 'id_revisi_item', 'DESC'],
    ],
    transaction: options.transaction || null,
  });

  return rows.map(plain).filter(Boolean);
}

async function getRevisionSourceByTargets(targets = [], options = {}) {
  const rowsTarget = normalizeTargets(targets);
  if (!rowsTarget.length) return new Map();

  const kodeList = [...new Set(rowsTarget.map((row) => row.kode_lka))];
  const revisionsByKode = new Map();

  for (const kode of kodeList) {
    revisionsByKode.set(kode, await getRevisionRowsByKodeLka(kode, options));
  }

  const result = new Map();
  rowsTarget.forEach((target) => {
    const source = buildSourceRow(target.kode_lka, target.no_sampel, revisionsByKode.get(target.kode_lka) || []);
    result.set(`${target.kode_lka}|${target.no_sampel}`, source);
  });

  return result;
}

async function getRevisionSourceByKodeLka(kodeLka, options = {}) {
  const kode = String(kodeLka || '').trim();
  if (!kode) return [];

  const revisions = await getRevisionRowsByKodeLka(kode, options);
  const targets = [];
  revisions.forEach((revision) => {
    (Array.isArray(revision.items) ? revision.items : []).forEach((item) => {
      if (item.kode_lka && item.no_sampel) {
        targets.push({ kode_lka: item.kode_lka, no_sampel: item.no_sampel });
      }
    });
  });

  const uniqueTargets = Array.from(
    new Map(targets.map((item) => [`${item.kode_lka}|${item.no_sampel}`, item])).values()
  );

  return uniqueTargets
    .map((target) => buildSourceRow(target.kode_lka, target.no_sampel, revisions))
    .sort((a, b) => String(a.no_sampel || '').localeCompare(String(b.no_sampel || '')));
}

function buildRevisionResponse(row = {}, source = null) {
  const penyeliaNote = source?.catatan_revisi_hasil_penyelia_source || null;
  const kasiNote = source?.catatan_revisi_hasil_kasi_pengujian_source || null;
  const combinedNote = penyeliaNote || kasiNote || null;

  const penyeliaBy = source?.revisi_penyelia_by_source || null;
  const kasiBy = source?.revisi_kasi_pengujian_by_source || null;
  const combinedBy = penyeliaBy || kasiBy || null;

  const penyeliaAt = source?.revisi_penyelia_at_source || null;
  const kasiAt = source?.revisi_kasi_pengujian_at_source || null;
  const combinedAt = penyeliaAt || kasiAt || null;

  return {
    kodeLka: row.kode_lka || row.kodeLka || source?.kode_lka || null,
    kode_lka: row.kode_lka || row.kodeLka || source?.kode_lka || null,
    noSampel: row.no_sampel || row.noSampel || source?.no_sampel || null,
    no_sampel: row.no_sampel || row.noSampel || source?.no_sampel || null,

    catatanRevisiHasilPenyelia: penyeliaNote,
    catatan_revisi_hasil_penyelia: penyeliaNote,
    catatanRevisiHasilKasiPengujian: kasiNote,
    catatan_revisi_hasil_kasi_pengujian: kasiNote,

    revisiPenyeliaBy: penyeliaBy,
    revisi_penyelia_by: penyeliaBy,
    revisiPenyeliaAt: penyeliaAt,
    revisi_penyelia_at: penyeliaAt,

    revisiKasiPengujianBy: kasiBy,
    revisi_kasi_pengujian_by: kasiBy,
    revisiKasiPengujianAt: kasiAt,
    revisi_kasi_pengujian_at: kasiAt,

    catatanRevisiHasil: combinedNote,
    catatan_revisi_hasil: combinedNote,
    direvisiOleh: combinedBy,
    direvisi_oleh: combinedBy,
    direvisiPada: combinedAt,
    direvisi_pada: combinedAt,

    revisionSource: source ? 'lka_revisi' : 'none',
    revision_source: source ? 'lka_revisi' : 'none',
    jumlahRevisiHasilSource: Number(source?.jumlah_revisi_hasil_source || 0),
    jumlah_revisi_hasil_source: Number(source?.jumlah_revisi_hasil_source || 0),
  };
}

module.exports = {
  viewExists,
  getRevisionSourceByTargets,
  getRevisionSourceByKodeLka,
  buildRevisionResponse,
};
