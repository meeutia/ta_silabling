const express = require('express');
const router = express.Router();
const CustomerRequestController = require('../controllers/customer-request.controller');
const RequestWorkflowController = require('../controllers/request-workflow.controller');
const ScheduleChangeController = require('../controllers/schedule-change.controller');
const SubcontractRequestController = require('../controllers/subcontract-request.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const Roles = require('../constants/roles');
const {
  validateCreateRequest,
  validateUpdateRequest,
  validateVerifyRequest,
  validateAssignMethods,
  validateRejectRevision,
  validateCustomerPaymentAction,
  validateDeferredPaymentNote,
  validateSamplingSchedule,
  validateReceiveSamples,
  validateRequestIdParam,
  validateScheduleChangeRequest,
  validateScheduleChangeDecision,
  validateScheduleConfirmation,
  validateCreateSubcontractRequest,
  validateStep1Data,
} = require('../validators/request.validator');

router.get('/schedule/holidays', RequestWorkflowController.getScheduleHolidays);

router.use(verifyToken);


router.get('/support/admin-contact', authorizeRoles(Roles.CUSTOMER, Roles.ADMIN, Roles.KASI, Roles.PENYELIA), CustomerRequestController.getAdminContact);

router.get('/schedule-changes', authorizeRoles(Roles.ADMIN), ScheduleChangeController.listScheduleChangeRequests);
router.post('/schedule-changes', authorizeRoles(Roles.CUSTOMER), validateScheduleChangeRequest, ScheduleChangeController.createScheduleChangeRequest);
router.post('/schedule-changes/:idPengajuan/decision', authorizeRoles(Roles.ADMIN), validateScheduleChangeDecision, ScheduleChangeController.decideScheduleChangeRequest);
router.post('/schedule-changes/:idPengajuan/cancel', authorizeRoles(Roles.CUSTOMER, Roles.ADMIN), ScheduleChangeController.cancelScheduleChangeRequest);

router.route('/')
  .post(authorizeRoles(Roles.CUSTOMER), validateCreateRequest, CustomerRequestController.createRequest)
  .get(authorizeRoles(Roles.CUSTOMER, Roles.ADMIN, Roles.KASI, Roles.PENYELIA), CustomerRequestController.listRequests);

router.post('/validate-step1', authorizeRoles(Roles.CUSTOMER), validateStep1Data, CustomerRequestController.validateStep1);

router.get('/analysts/options', authorizeRoles(Roles.PENYELIA), RequestWorkflowController.getAnalystOptions);

router.get('/:id/activity-logs', authorizeRoles(Roles.CUSTOMER, Roles.ADMIN, Roles.KASI, Roles.PENYELIA), validateRequestIdParam, CustomerRequestController.getRequestActivityLogs);

router.get('/:id/invoice/pdf', authorizeRoles(Roles.CUSTOMER, Roles.ADMIN, Roles.KASI), validateRequestIdParam, CustomerRequestController.downloadInvoicePdf);

router.route('/:id')
  .get(authorizeRoles(Roles.CUSTOMER, Roles.ADMIN, Roles.KASI, Roles.PENYELIA), validateRequestIdParam, CustomerRequestController.detailRequest)
  .put(authorizeRoles(Roles.CUSTOMER), validateRequestIdParam, validateUpdateRequest, CustomerRequestController.updateRequest);

router.post('/:id/schedule-confirmation', authorizeRoles(Roles.CUSTOMER), validateRequestIdParam, validateScheduleConfirmation, ScheduleChangeController.confirmScheduleApproval);

router.post('/:id/payment', authorizeRoles(Roles.CUSTOMER), validateRequestIdParam, validateCustomerPaymentAction, CustomerRequestController.processPaymentDecision);
router.post('/:id/payment/deferred', authorizeRoles(Roles.ADMIN, Roles.KASI), validateRequestIdParam, validateDeferredPaymentNote, RequestWorkflowController.markDeferredPayment);

router.route('/:id/sampling-schedule').post(authorizeRoles(Roles.ADMIN), validateRequestIdParam, validateSamplingSchedule, RequestWorkflowController.createOrUpdateSamplingSchedule).put(authorizeRoles(Roles.ADMIN), validateRequestIdParam, validateSamplingSchedule, RequestWorkflowController.createOrUpdateSamplingSchedule);

router.post('/:id/samples/receive', authorizeRoles(Roles.ADMIN), validateRequestIdParam, validateReceiveSamples, RequestWorkflowController.receiveSamplesAndGenerateCodes);

router.put('/:id/verify', authorizeRoles(Roles.ADMIN), validateRequestIdParam, validateVerifyRequest, RequestWorkflowController.verifyRequest);

router.route('/:id/methods').get(authorizeRoles(Roles.KASI), validateRequestIdParam, RequestWorkflowController.getKasiRequestDetail).put(authorizeRoles(Roles.KASI), validateRequestIdParam, validateAssignMethods, RequestWorkflowController.assignMethods);

router.post('/:id/subcontract-requests', authorizeRoles(Roles.KASI), validateRequestIdParam, validateCreateSubcontractRequest, SubcontractRequestController.createSubcontractRequest);

router.put('/:id/reject', authorizeRoles(Roles.KASI), validateRequestIdParam, validateRejectRevision, RequestWorkflowController.rejectRequest);

router.post('/:id/assignments', authorizeRoles(Roles.PENYELIA), (req, res) => res.status(410).json({ success: false, message: 'Endpoint penugasan lama sudah tidak digunakan. Gunakan POST /assignments.' }));


module.exports = router;