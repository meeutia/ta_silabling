const RequestStatus = require('../../constants/request-status');
const {
  SCHEDULE_CHANGE_STATUS,
  SCHEDULE_STATUS,
} = require('../../constants/workflow-status.constant');

function normalizeStatus(value) {
  return RequestStatus.normalizeRequestStatus(String(value || '').trim());
}

function createWorkflowError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function isRequestCompleted(status) {
  return normalizeStatus(status) === RequestStatus.COMPLETED;
}

function assertRequestNotCompleted(status, message = 'Permohonan sudah selesai dan tidak dapat diproses ulang.') {
  if (isRequestCompleted(status)) {
    throw createWorkflowError(message);
  }
}

function isLhuPickedUp(schedule = {}) {
  return normalizeStatus(schedule.status_pengambilan) === SCHEDULE_STATUS.PICKED_UP || Boolean(schedule.diambil_pada);
}

function assertLhuNotPickedUp(schedule = {}, message = 'LHU sudah diambil dan tidak dapat diproses ulang.') {
  if (isLhuPickedUp(schedule)) {
    throw createWorkflowError(message);
  }
}

function isScheduleChangePending(status) {
  return normalizeStatus(status) === SCHEDULE_CHANGE_STATUS.PENDING;
}

function assertScheduleChangePending(status, message = 'Pengajuan perubahan jadwal sudah diproses.') {
  if (!isScheduleChangePending(status)) {
    throw createWorkflowError(message);
  }
}

function assertCanApproveScheduleChange({ requestStatus, schedule, scheduleKind = 'LHU' } = {}) {
  assertRequestNotCompleted(requestStatus);

  if (normalizeStatus(scheduleKind).toUpperCase() === 'LHU') {
    assertLhuNotPickedUp(schedule);
  }
}

module.exports = {
  normalizeStatus,
  createWorkflowError,
  isRequestCompleted,
  assertRequestNotCompleted,
  isLhuPickedUp,
  assertLhuNotPickedUp,
  isScheduleChangePending,
  assertScheduleChangePending,
  assertCanApproveScheduleChange,
};
