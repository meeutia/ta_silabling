const notificationService = require('../services/notification/notification.service');

const ONE_HOUR = 60 * 60 * 1000;

class DeadlineAnalisJob {
  constructor({ notificationService } = {}) {
    this.notificationService = notificationService;
    this.isRunning = false;
    this.lastRunDate = null;
  }

  getTodayKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  shouldRunNow = () => {
    const now = new Date();
    const todayKey = this.getTodayKey();

    if (this.lastRunDate === todayKey) return false;

    // Jalankan sekitar jam 08.00 ke atas
    return now.getHours() >= 8;
  };

  runDeadlineAnalisJob = async () => {
    if (this.isRunning) return;

    if (!this.shouldRunNow()) return;

    this.isRunning = true;

    try {
      await this.notificationService.notifyDeadlineAnalisDekat({
        daysAhead: 2,
      });

      this.lastRunDate = this.getTodayKey();
    } catch (error) {
      console.error('[deadline-analis.job] gagal:', error?.message || error);
    } finally {
      this.isRunning = false;
    }
  };

  startDeadlineAnalisJob = () => {
    this.runDeadlineAnalisJob();

    setInterval(() => {
      this.runDeadlineAnalisJob();
    }, ONE_HOUR);
  };
}

module.exports = new DeadlineAnalisJob({ notificationService });
module.exports.DeadlineAnalisJob = DeadlineAnalisJob;
