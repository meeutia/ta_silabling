const express = require('express');
const { verifyToken, authorizeRoles } = require('../middlewares/auth');
const Roles = require('../constants/roles');
const {
  listEmailLogs,
  getEmailSummary,
  getEmailTypes,
} = require('../controllers/notification-email.controller');

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles(Roles.ADMIN));

router.get('/', listEmailLogs);
router.get('/summary', getEmailSummary);
router.get('/types', getEmailTypes);

module.exports = router;
