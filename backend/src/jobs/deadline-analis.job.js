const notificationService = require('../services/notification/notification.service');

const ONE_HOUR = 60 * 60 * 1000;

let isRunning = false;
let lastRunDate = null;

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shouldRunNow() {
  const now = new Date();
  const todayKey = getTodayKey();

  if (lastRunDate === todayKey) return false;

  // Jalankan sekitar jam 08.00 ke atas
  return now.getHours() >= 8;
}

async function runDeadlineAnalisJob() {
  if (isRunning) return;

  if (!shouldRunNow()) return;

  isRunning = true;

  try {
    await notificationService.notifyDeadlineAnalisDekat({
      daysAhead: 2,
    });

    lastRunDate = getTodayKey();
  } catch (error) {
    console.error('[deadline-analis.job] gagal:', error?.message || error);
  } finally {
    isRunning = false;
  }
}

function startDeadlineAnalisJob() {
  runDeadlineAnalisJob();

  setInterval(() => {
    runDeadlineAnalisJob();
  }, ONE_HOUR);
}

module.exports = {
  startDeadlineAnalisJob,
  runDeadlineAnalisJob,
};