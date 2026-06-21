const express = require('express');
const fileController = require('../controllers/file.controller');

const router = express.Router();

router.get('/worksheet', fileController.openWorksheet);
router.get('/lhu', fileController.openLhu);
router.get('/invoice', fileController.openInvoice);

module.exports = router;
