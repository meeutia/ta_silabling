const express = require('express');
const lhuController = require('../controllers/lhu.controller');
const lhuPickupController = require('../controllers/lhu-pickup.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();
const Roles = require('../constants/roles');
const {
  validateFinalizeLhu,
  validateKalabApproval,
  validateLhuPickupCompletion,
  validateLhuPickupSchedule,
} = require('../validators/lhu.validator');
const {
  validateKalabApprovalBusinessTimeline,
  validateLhuFinalizationBusinessTimeline,
} = require('../validators/business-day.validator');
router.use(verifyToken);

router.get('/references/personel', authorizeRoles(Roles.QC), lhuController.getPersonelOptions);
router.get('/detail', authorizeRoles(Roles.QC, Roles.KALAB, Roles.KASI), lhuController.getLhuDetail);

router.get('/finalization-queue', authorizeRoles(Roles.QC), lhuController.getFinalizationQueue);
router.get('/finalization/detail', authorizeRoles(Roles.QC), lhuController.getFinalizationDetail);
router.get('/finalization/paket-bm', authorizeRoles(Roles.QC), lhuController.getPaketBmOptions);
router.get('/finalization/preview', authorizeRoles(Roles.QC), lhuController.previewFinalization);
router.post('/finalization/finalize', authorizeRoles(Roles.QC), validateFinalizeLhu, validateLhuFinalizationBusinessTimeline, lhuController.finalizeLhu);
router.get('/finalization/history', authorizeRoles(Roles.QC, Roles.KALAB, Roles.KASI), lhuController.getFinalizationHistory);

router.get('/kalab/queue', authorizeRoles(Roles.KALAB), lhuController.getKalabApprovalQueue);
router.post('/kalab/approve', authorizeRoles(Roles.KALAB), validateKalabApproval, validateKalabApprovalBusinessTimeline, lhuController.approveByKalab);

router.get('/pickup/queue', authorizeRoles(Roles.ADMIN), lhuPickupController.getPickupQueue);
router.post('/pickup/schedule', authorizeRoles(Roles.ADMIN), validateLhuPickupSchedule, lhuPickupController.schedulePickup);
router.post('/pickup/complete', authorizeRoles(Roles.ADMIN), validateLhuPickupCompletion, lhuPickupController.completePickup);

module.exports = router;