const express = require('express');
const CustomerRequestController = require('../controllers/customer-request.controller');
const RequestWorkflowController = require('../controllers/request-workflow.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const Roles = require('../constants/roles');
const { validateCreateRequest, validateVerifyRequest, validateAssignMethods, 
  validateCustomerPaymentAction, validateSamplingSchedule, validateReceiveSamples, 
  validateRequestIdParam } = require('../validators/request.validator');

const router = express.Router();

router.get('/schedule/holidays', RequestWorkflowController.getScheduleHolidays);

router.use(verifyToken);

router.post('/', authorizeRoles(Roles.CUSTOMER), validateCreateRequest, CustomerRequestController.createRequest);
router.get('/', authorizeRoles(Roles.CUSTOMER, Roles.ADMIN, Roles.KASI, Roles.PENYELIA), CustomerRequestController.listRequests);
router.get('/:id', authorizeRoles(Roles.CUSTOMER, Roles.ADMIN, Roles.KASI, Roles.PENYELIA), validateRequestIdParam, CustomerRequestController.detailRequest);
router.put('/:id/verify', authorizeRoles(Roles.ADMIN), validateRequestIdParam, validateVerifyRequest, RequestWorkflowController.verifyRequest);
router.get('/:id/methods', authorizeRoles(Roles.KASI), validateRequestIdParam, RequestWorkflowController.getKasiRequestDetail);
router.put('/:id/methods', authorizeRoles(Roles.KASI), validateRequestIdParam, validateAssignMethods, RequestWorkflowController.assignMethods);
router.post('/:id/sampling-schedule', authorizeRoles(Roles.ADMIN), validateRequestIdParam, validateSamplingSchedule, RequestWorkflowController.createOrUpdateSamplingSchedule);
router.post('/:id/samples/receive', authorizeRoles(Roles.ADMIN), validateRequestIdParam, validateReceiveSamples, RequestWorkflowController.receiveSamplesAndGenerateCodes);

module.exports = router;
