const express = require('express');
const lhuController = require('../controllers/lhu.controller');
const lhuPickupController = require('../controllers/lhu-pickup.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();
const Roles = require('../constants/roles');
const {
  validateFinalizeLhu,
  validateLhuPickupCompletion,
  validateLhuPickupSchedule,
} = require('../validators/lhu.validator');
const {
  validateLhuFinalizationBusinessTimeline,
} = require('../validators/business-day.validator');
router.use(verifyToken);

router.get('/references/personel', authorizeRoles(Roles.QC), lhuController.getPersonelOptions);
router.get('/detail', authorizeRoles(Roles.QC, Roles.KASI), lhuController.getLhuDetail);

router.get('/finalization-queue', authorizeRoles(Roles.QC), lhuController.getFinalizationQueue);
router.get('/finalization/detail', authorizeRoles(Roles.QC), lhuController.getFinalizationDetail);
router.get('/finalization/paket-bm', authorizeRoles(Roles.QC), lhuController.getPaketBmOptions);
router.get('/finalization/preview', authorizeRoles(Roles.QC), lhuController.previewFinalization);
router.post('/finalization/finalize', authorizeRoles(Roles.QC), validateFinalizeLhu, validateLhuFinalizationBusinessTimeline, lhuController.finalizeLhu);
router.get('/finalization/history', authorizeRoles(Roles.QC, Roles.KASI), lhuController.getFinalizationHistory);


router.get('/pickup/holidays', authorizeRoles(Roles.ADMIN), lhuPickupController.getHolidays);
router.get('/pickup/queue', authorizeRoles(Roles.ADMIN), lhuPickupController.getPickupQueue);
router.post('/pickup/schedule', authorizeRoles(Roles.ADMIN), validateLhuPickupSchedule, lhuPickupController.schedulePickup);
router.post('/pickup/complete', authorizeRoles(Roles.ADMIN), validateLhuPickupCompletion, lhuPickupController.completePickup);

// Signed LHU Endpoints
const lhuSignedFileController = require('../controllers/lhu-signed-file.controller');
const { uploadSignedLhuFile, validateSignedLhuFileSignature, cleanupUploadedSignedLhuFile } = require('../middlewares/upload.middleware');

router.post(
  '/:nomorLhu/signed-file',
  authorizeRoles(Roles.ADMIN),
  uploadSignedLhuFile,
  validateSignedLhuFileSignature,
  lhuSignedFileController.upload,
  cleanupUploadedSignedLhuFile
);

router.put(
  '/:nomorLhu/signed-file',
  authorizeRoles(Roles.ADMIN),
  uploadSignedLhuFile,
  validateSignedLhuFileSignature,
  lhuSignedFileController.replace,
  cleanupUploadedSignedLhuFile
);

router.get(
  '/:nomorLhu/signed-file',
  authorizeRoles(Roles.ADMIN, Roles.CUSTOMER),
  lhuSignedFileController.open
);

module.exports = router;