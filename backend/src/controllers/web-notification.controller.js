const webNotificationService = require('../services/notification/web-notification.service');
const pushNotificationService = require('../services/notification/push-notification.service');

class WebNotificationController {
  list = async (req, res) => {
    try {
      const data = await webNotificationService.listForCurrentUser(req.user, req.query || {});
      return res.json({
        success: true,
        message: 'Notifikasi berhasil diambil.',
        data,
      });
    } catch (error) {
      console.error('listWebNotifications error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal mengambil notifikasi.',
      });
    }
  };

  unreadCount = async (req, res) => {
    try {
      const count = await webNotificationService.countUnreadForCurrentUser(req.user);
      return res.json({
        success: true,
        message: 'Jumlah notifikasi belum dibaca berhasil diambil.',
        data: { count },
      });
    } catch (error) {
      console.error('countWebNotifications error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal mengambil jumlah notifikasi.',
      });
    }
  };

  markRead = async (req, res) => {
    try {
      const data = await webNotificationService.markAsRead(req.user, req.params.id);
      return res.json({
        success: true,
        message: 'Notifikasi ditandai sudah dibaca.',
        data,
      });
    } catch (error) {
      console.error('markWebNotificationRead error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal menandai notifikasi.',
      });
    }
  };



  getPushConfig = async (req, res) => {
    try {
      const data = pushNotificationService.getConfig();
      return res.json({
        success: true,
        message: 'Konfigurasi push notification berhasil diambil.',
        data,
      });
    } catch (error) {
      console.error('getPushConfig error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal mengambil konfigurasi push notification.',
      });
    }
  };

  getPushStatus = async (req, res) => {
    try {
      const data = await pushNotificationService.getSubscriptionStatus(req.user);
      return res.json({
        success: true,
        message: 'Status push notification berhasil diambil.',
        data,
      });
    } catch (error) {
      console.error('getPushStatus error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal mengambil status push notification.',
      });
    }
  };

  subscribePush = async (req, res) => {
    try {
      const data = await pushNotificationService.saveSubscription(
        req.user,
        req.body?.subscription || req.body,
        req.get('user-agent') || ''
      );
      return res.json({
        success: true,
        message: 'Push notification berhasil diaktifkan.',
        data,
      });
    } catch (error) {
      console.error('subscribePushNotification error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal mengaktifkan push notification.',
      });
    }
  };

  unsubscribePush = async (req, res) => {
    try {
      const data = await pushNotificationService.unsubscribe(
        req.user,
        req.body?.endpoint || req.body?.subscription?.endpoint || req.body
      );
      return res.json({
        success: true,
        message: 'Push notification berhasil dinonaktifkan.',
        data,
      });
    } catch (error) {
      console.error('unsubscribePushNotification error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal menonaktifkan push notification.',
      });
    }
  };

  markAllRead = async (req, res) => {
    try {
      const data = await webNotificationService.markAllAsRead(req.user);
      return res.json({
        success: true,
        message: 'Semua notifikasi ditandai sudah dibaca.',
        data,
      });
    } catch (error) {
      console.error('markAllWebNotificationsRead error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal menandai semua notifikasi.',
      });
    }
  };
}

const webNotificationController = new WebNotificationController();

module.exports = {
  listWebNotifications: webNotificationController.list,
  getUnreadWebNotificationCount: webNotificationController.unreadCount,
  markWebNotificationRead: webNotificationController.markRead,
  markAllWebNotificationsRead: webNotificationController.markAllRead,
  getPushNotificationConfig: webNotificationController.getPushConfig,
  getPushNotificationStatus: webNotificationController.getPushStatus,
  subscribePushNotification: webNotificationController.subscribePush,
  unsubscribePushNotification: webNotificationController.unsubscribePush,
  WebNotificationController,
};
