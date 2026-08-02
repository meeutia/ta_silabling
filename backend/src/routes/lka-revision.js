'use strict';

const express = require('express');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const Roles = require('../constants/roles');
const controller = require('../controllers/lka-revision.controller');

const router = express.Router();

router.use(verifyToken);

router.get(
  '/lka/:kodeLka',
  authorizeRoles(Roles.ANALIS, Roles.PENYELIA, Roles.KASI, Roles.QC),
  controller.getByKodeLka
);

// Gunakan query string untuk no_sampel karena format nomor sampel berisi garis miring.
router.get(
  '/hasil',
  authorizeRoles(Roles.ANALIS, Roles.PENYELIA, Roles.KASI, Roles.QC),
  controller.getByTarget
);

module.exports = router;
