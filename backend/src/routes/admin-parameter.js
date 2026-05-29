const express = require('express');
const router = express.Router();
const AdminParameterController = require('../controllers/admin-parameter.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const Roles = require('../constants/roles');

// Protect all routes: only Admin can access
router.use(verifyToken, authorizeRoles(Roles.ADMIN));

// ==========================================
// 1. Parameter & Metode Uji
// ==========================================
router.get('/', AdminParameterController.getAllParameterMetode);
router.get('/list-kategori-parameter', AdminParameterController.getKategoriParameters);
router.get('/list-parameters', AdminParameterController.getParameters);
router.get('/list-methods', AdminParameterController.getMethods);
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
router.get('/paket', AdminParameterController.getAllPaket);
router.post('/paket', AdminParameterController.createPaket);
router.put('/paket/:id', AdminParameterController.updatePaket);
router.delete('/paket/:id', AdminParameterController.deletePaket);

// ==========================================
// 4. Detail Paket Baku Mutu
// ==========================================
router.get('/paket/:id/parameters', AdminParameterController.getPaketParameters);
router.post('/paket/:id/parameters', AdminParameterController.addPaketParameter);
router.put('/paket/parameters/:id_pkt_bm_param', AdminParameterController.updatePaketParameter);
router.delete('/paket/parameters/:id_pkt_bm_param', AdminParameterController.deletePaketParameter);

// ==========================================
// 5. Tarif Pengambilan
// ==========================================
router.get('/tarif-pengambilan', AdminParameterController.getAllTarifPengambilan);
router.post('/tarif-pengambilan', AdminParameterController.createTarifPengambilan);
router.put('/tarif-pengambilan/:id', AdminParameterController.updateTarifPengambilan);
router.delete('/tarif-pengambilan/:id', AdminParameterController.deleteTarifPengambilan);

module.exports = router;
