const express = require('express');
const router = express.Router();
const AdminParameterController = require('../controllers/admin-parameter.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const Roles = require('../constants/roles');

const SubcontractRequestController = require('../controllers/subcontract-request.controller');
const {
  validateApproveSubcontractRequest,
  validateRejectSubcontractRequest,
} = require('../validators/request.validator');

// Protect all routes: only Admin can access
router.use(verifyToken, authorizeRoles(Roles.ADMIN));

// ==========================================
// 1. Parameter & Metode Uji
// ==========================================
router.get('/subcontract-requests', SubcontractRequestController.getAdminSubcontractRequests);
router.get('/subcontract-requests/:requestId', SubcontractRequestController.getAdminSubcontractRequestDetail);
router.put('/subcontract-requests/:requestId/approve', validateApproveSubcontractRequest, SubcontractRequestController.approveSubcontractRequest);
router.put('/subcontract-requests/:requestId/reject', validateRejectSubcontractRequest, SubcontractRequestController.rejectSubcontractRequest);

router.get('/', AdminParameterController.getAllParameterMetode);
router.get('/list-kategori-parameter', AdminParameterController.getKategoriParameters);
router.get('/list-parameters', AdminParameterController.getParameters);
router.get('/list-methods', AdminParameterController.getMethods);
router.get('/list-klasifikasi', AdminParameterController.getKlasifikasi);
router.get('/list-satuan', AdminParameterController.getSatuan);
router.get('/list-jenis-sampel', AdminParameterController.getJenisSampel);
router.post('/', AdminParameterController.createParameterMetode);
router.put('/:id', AdminParameterController.updateParameterMetode);
router.delete('/:id', AdminParameterController.deleteParameterMetode);

// ==========================================
// 2. Regulasi (reg_bm)
// ==========================================
router.get('/regulasi', AdminParameterController.getAllRegulasi);
router.post('/regulasi', AdminParameterController.createRegulasi);
router.put('/regulasi/:id', AdminParameterController.updateRegulasi);
router.delete('/regulasi/:id', AdminParameterController.deleteRegulasi);

// ==========================================
// 3. Paket Baku Mutu (pkt_bm)
// ==========================================
router.put('/paket-groups/:id_reg_bm/:id_jenis_sampel/status', AdminParameterController.updatePaketKelompokStatus);
router.get('/paket', AdminParameterController.getAllPaket);
router.post('/paket', AdminParameterController.createPaket);
router.put('/paket/:id', AdminParameterController.updatePaket);
router.delete('/paket/:id', AdminParameterController.deletePaket);

// ==========================================
// 4. Detail Paket Baku Mutu
// ==========================================
router.get('/paket/:id/parameters', AdminParameterController.getPaketParameters);
router.post('/paket/:id/parameters', AdminParameterController.addPaketParameter);
router.put('/paket/:id_pkt_bm/parameters/:id_parameter', AdminParameterController.updatePaketParameter);
router.delete('/paket/:id_pkt_bm/parameters/:id_parameter', AdminParameterController.deletePaketParameter);

// ==========================================
// 5. Tarif Pengambilan
// ==========================================
router.get('/tarif-pengambilan', AdminParameterController.getAllTarifPengambilan);
router.post('/tarif-pengambilan', AdminParameterController.createTarifPengambilan);
router.put('/tarif-pengambilan/:id', AdminParameterController.updateTarifPengambilan);
router.delete('/tarif-pengambilan/:id', AdminParameterController.deleteTarifPengambilan);

module.exports = router;
