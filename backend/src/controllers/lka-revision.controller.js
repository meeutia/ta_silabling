'use strict';

const lkaRevisionDisplayService = require('../services/lka-revision-display.service');

function success(res, message, data = null) {
  return res.status(200).json({ success: true, message, data });
}

function fail(res, error, fallbackMessage = 'Terjadi kesalahan.') {
  if (process.env.NODE_ENV !== 'production') {
    console.error(fallbackMessage, error);
  }
  return res.status(500).json({ success: false, message: error?.message || fallbackMessage });
}

async function getByKodeLka(req, res) {
  try {
    const kodeLka = req.params.kodeLka || req.query.kodeLka || req.query.kode_lka;
    const data = await lkaRevisionDisplayService.getRevisionDisplayByKodeLka(kodeLka, { user: req.user });
    return success(res, 'Riwayat revisi LKA berhasil diambil.', data);
  } catch (error) {
    return fail(res, error, 'Gagal mengambil riwayat revisi LKA.');
  }
}

async function getByTarget(req, res) {
  try {
    const kodeLka = req.params.kodeLka || req.query.kodeLka || req.query.kode_lka;
    const noSampel = req.params.noSampel || req.query.noSampel || req.query.no_sampel;
    const revisions = await lkaRevisionDisplayService.getRevisionHistoryByTarget(kodeLka, noSampel, { user: req.user });
    return success(res, 'Riwayat revisi hasil LKA berhasil diambil.', {
      kodeLka,
      kode_lka: kodeLka,
      noSampel,
      no_sampel: noSampel,
      revisions,
      revision_items: revisions,
      sumberUtama: 'lka_revisi',
      sumber_utama: 'lka_revisi',
    });
  } catch (error) {
    return fail(res, error, 'Gagal mengambil riwayat revisi hasil LKA.');
  }
}

module.exports = {
  getByKodeLka,
  getByTarget,
};
