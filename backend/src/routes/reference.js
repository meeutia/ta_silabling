const express = require('express');
const router = express.Router();

const {
    getJenisSampel,
    getBmStandards,
    getPaketBm,
    getPaketBmByJenisSampel,
    getTarifPengambilan,
    getParameterTariffs,
    getParameterByPaketBm,
    getParameterByJenisSampel,
    getHariLibur,
    getAdminContact,
    getPccPegawai
} = require('../controllers/reference.controller');

router.get('/sample-types', getJenisSampel);
router.get('/bm-standards', getBmStandards);
router.get('/baku-mutu', getPaketBm);
router.get('/packages', getPaketBm);
router.get('/sample-types/:id/packages', getPaketBmByJenisSampel);
router.get('/sample-types/:id/parameters', getParameterByJenisSampel);
router.get('/packages/:id/parameters', getParameterByPaketBm);
router.get('/parameter-tariffs', getParameterTariffs);
router.get('/pickup-tariffs', getTarifPengambilan);
router.get('/holidays', getHariLibur);
router.get('/admin-contact', getAdminContact);
router.get('/pcc-employees', getPccPegawai);

module.exports = router;