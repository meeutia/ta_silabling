const emailDeliveryAuditService = require('../services/notification/email-delivery-audit.service');

class NotificationEmailController {
  list = async (req, res) => {
    try {
      const data = await emailDeliveryAuditService.listEmailLogs(req.query || {});
      return res.json({
        success: true,
        message: 'Log pengiriman email berhasil diambil.',
        data,
      });
    } catch (error) {
      console.error('listEmailLogs error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal mengambil log pengiriman email.',
      });
    }
  };

  summary = async (req, res) => {
    try {
      const data = await emailDeliveryAuditService.getEmailSummary();
      return res.json({
        success: true,
        message: 'Ringkasan pengiriman email berhasil diambil.',
        data,
      });
    } catch (error) {
      console.error('emailSummary error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal mengambil ringkasan pengiriman email.',
      });
    }
  };

  types = async (req, res) => {
    try {
      const data = await emailDeliveryAuditService.getKnownNotificationTypes();
      return res.json({
        success: true,
        message: 'Daftar tipe notifikasi email berhasil diambil.',
        data,
      });
    } catch (error) {
      console.error('emailTypes error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Gagal mengambil daftar tipe notifikasi email.',
      });
    }
  };
}

const notificationEmailController = new NotificationEmailController();

module.exports = {
  listEmailLogs: notificationEmailController.list,
  getEmailSummary: notificationEmailController.summary,
  getEmailTypes: notificationEmailController.types,
  NotificationEmailController,
};
