const express = require('express');
const { verifyToken } = require('../middlewares/auth');
const {
  listWebNotifications,
  getUnreadWebNotificationCount,
  markWebNotificationRead,
  markAllWebNotificationsRead,
  getPushNotificationConfig,
  getPushNotificationStatus,
  subscribePushNotification,
  unsubscribePushNotification,
} = require('../controllers/web-notification.controller');

const router = express.Router();

router.use(verifyToken);

router.get('/push/config', getPushNotificationConfig);
router.get('/push/status', getPushNotificationStatus);
router.post('/push/subscribe', subscribePushNotification);
router.delete('/push/subscribe', unsubscribePushNotification);

router.get('/', listWebNotifications);
router.get('/unread-count', getUnreadWebNotificationCount);
router.patch('/read-all', markAllWebNotificationsRead);
router.patch('/:id/read', markWebNotificationRead);

module.exports = router;
