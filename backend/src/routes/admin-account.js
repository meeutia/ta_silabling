const express = require('express');

const router = express.Router();

const {
  getRoles,

  getStaffAccounts,
  getStaffAccountDetail,
  createStaffAccount,
  updateStaffStatus,
  resetStaffPassword,

  getCustomerAccounts,
  getCustomerAccountDetail,
  updateCustomerStatus,
  resetCustomerPassword,
} = require('../controllers/admin-account.controller');

const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const Roles = require('../constants/roles');

router.use(verifyToken);
router.use(authorizeRoles(Roles.ADMIN));

router.get('/roles', getRoles);

router.get('/staff', getStaffAccounts);
router.post('/staff', createStaffAccount);
router.get('/staff/:nik', getStaffAccountDetail);
router.patch('/staff/:nik/status', updateStaffStatus);
router.patch('/staff/:nik/reset-password', resetStaffPassword);

router.get('/customers', getCustomerAccounts);
router.get('/customers/:idPelanggan', getCustomerAccountDetail);
router.patch('/customers/:idPelanggan/status', updateCustomerStatus);
router.patch('/customers/:idPelanggan/reset-password', resetCustomerPassword);

module.exports = router;