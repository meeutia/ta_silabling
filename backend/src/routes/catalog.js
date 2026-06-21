const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalog.controller');

router.get('/sample-types', catalogController.getSampleTypes);
router.get('/bm-standards', catalogController.getBmStandards);
router.get('/baku-mutu', catalogController.getPaketBm);
router.get('/packages', catalogController.getPaketBm);
router.get('/sample-types/:id/packages', catalogController.getPaketBmByJenisSampel);
router.get('/sample-types/:id/parameters', catalogController.getParameterBySampleType);
router.get('/packages/:id/parameters', catalogController.getParameterByPackage);
router.get('/parameter-tariffs', catalogController.getParameterTariffs);
router.get('/pickup-tariffs', catalogController.getPickupTariffs);

module.exports = router;
