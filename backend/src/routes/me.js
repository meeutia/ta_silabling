const express = require('express');
const router = express.Router();
const CustomerRequestController = require('../controllers/customer-request.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const Roles = require('../constants/roles');

router.use(verifyToken);
// Only customers have 'my customers' profiles currently
router.get('/customers', authorizeRoles(Roles.CUSTOMER), CustomerRequestController.getMyPelanggans);

module.exports = router;
