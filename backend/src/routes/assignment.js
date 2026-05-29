const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const {
  uploadWorksheetFileFields,
  validateWorksheetFileSignatures,
} = require('../middlewares/upload.middleware');

const router = express.Router();

const Roles = require('../constants/roles');
const {
  validateCreateAssignment,
  validateKasiReviewApprove,
  validateKasiReviewRevision,
  validatePenugasanDetailId,
  validatePenugasanId,
  validateSubkontrakResults,
  validateWorksheetDraft,
  validateWorksheetResults,
  validateWorksheetSubmit,
  validatePenyeliaReviewRevision,
  validateUpdateDeadline,
} = require('../validators/assignment.validator');
const {
  validateAssignmentBusinessTimeline,
  validateSubkontrakBusinessTimeline,
  validateWorksheetBusinessTimeline,
} = require('../validators/business-day.validator');

router.use(verifyToken);

router.get('/references/analysts', authorizeRoles(Roles.PENYELIA), assignmentController.getAnalysts);
router.get('/pending-items', authorizeRoles(Roles.PENYELIA), assignmentController.getPendingItems);
router.post('/', authorizeRoles(Roles.PENYELIA), validateCreateAssignment, validateAssignmentBusinessTimeline, assignmentController.createAssignment);
router.get('/monitor', authorizeRoles(Roles.PENYELIA), assignmentController.getMonitor);
router.get('/testing-overview', authorizeRoles(Roles.PENYELIA), assignmentController.getTestingOverview);

router.get('/kasi-review/queue', authorizeRoles(Roles.KASI), assignmentController.getKasiReviewQueue);
router.get('/kasi-review/history', authorizeRoles(Roles.KASI), assignmentController.getKasiReviewHistory);
router.get('/kasi-review/detail', authorizeRoles(Roles.KASI), assignmentController.getKasiReviewDetail);
router.post('/kasi-review/approve', authorizeRoles(Roles.KASI), validateKasiReviewApprove, assignmentController.approveKasiReview);
router.post('/kasi-review/revise', authorizeRoles(Roles.KASI), validateKasiReviewRevision, assignmentController.reviseKasiReview);

router.get('/lka/:kodeLka/revisions', authorizeRoles(Roles.ANALIS, Roles.PENYELIA, Roles.KASI), assignmentController.getLkaRevisionHistory);
router.get('/my', authorizeRoles(Roles.ANALIS), assignmentController.getMyAssignments);
router.get('/work/:idPenugasanDetail', authorizeRoles(Roles.ANALIS), validatePenugasanDetailId, assignmentController.getAssignmentWorkDetail);
router.put('/work/:idPenugasanDetail/worksheet', authorizeRoles(Roles.ANALIS), validatePenugasanDetailId, validateWorksheetDraft, validateWorksheetBusinessTimeline, assignmentController.saveWorksheetDraft);
router.put('/work/:idPenugasanDetail/results', authorizeRoles(Roles.ANALIS), validatePenugasanDetailId, validateWorksheetResults, assignmentController.saveWorksheetResults);
router.post('/work/:idPenugasanDetail/submit', authorizeRoles(Roles.ANALIS), validatePenugasanDetailId, validateWorksheetSubmit, validateWorksheetBusinessTimeline, assignmentController.submitWorksheet);

router.get('/work/:idPenugasan/details', authorizeRoles(Roles.PENYELIA), validatePenugasanId, assignmentController.getAssignmentDetailsByPenugasan);
router.get('/review/queue', authorizeRoles(Roles.PENYELIA), assignmentController.getReviewQueue);
router.get('/review/detail/:idPenugasanDetail', authorizeRoles(Roles.PENYELIA), validatePenugasanDetailId, assignmentController.getReviewDetail);
router.put('/details/:idPenugasanDetail/deadline', authorizeRoles(Roles.PENYELIA), validatePenugasanDetailId, validateUpdateDeadline, assignmentController.updateDetailDeadline);
router.post('/details/:idPenugasanDetail/approve', authorizeRoles(Roles.PENYELIA), validatePenugasanDetailId, assignmentController.approveWorksheet);
router.post('/details/:idPenugasanDetail/revise', authorizeRoles(Roles.PENYELIA), validatePenugasanDetailId, validatePenyeliaReviewRevision, assignmentController.reviseWorksheet);
router.get('/revisi-kasi/pending', authorizeRoles(Roles.PENYELIA), assignmentController.getPendingKasiRevisionRequests);
router.post('/revisi-kasi/:idRevisiLka/review', authorizeRoles(Roles.PENYELIA), assignmentController.reviewKasiRevisionRequest);

router.get('/subkontrak-items', authorizeRoles(Roles.PENYELIA), assignmentController.getSubkontrakItems);
router.post('/subkontrak-results', authorizeRoles(Roles.PENYELIA), validateSubkontrakResults, validateSubkontrakBusinessTimeline, assignmentController.saveSubkontrakResults);

const worksheetUploadHandler = [
  uploadWorksheetFileFields,
  validateWorksheetFileSignatures,
  assignmentController.uploadWorksheetFile,
];
router.post('/work/:idPenugasanDetail/upload', authorizeRoles(Roles.ANALIS), validatePenugasanDetailId, worksheetUploadHandler);
router.post('/work/:idPenugasanDetail/worksheet/upload', authorizeRoles(Roles.ANALIS), validatePenugasanDetailId, worksheetUploadHandler);
router.get('/worksheet-url', authorizeRoles(Roles.ANALIS, Roles.PENYELIA, Roles.KASI), assignmentController.getWorksheetAccessUrl);
router.get('/worksheet-preview', authorizeRoles(Roles.ANALIS, Roles.PENYELIA, Roles.KASI), assignmentController.previewWorksheet);
module.exports = router;