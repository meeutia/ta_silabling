const ActivityLogService = require('../activity-log.service');
const { WORKFLOW_SOURCE } = require('../../constants/workflow-status.constant');

function normalizeNullable(value) {
  if (value === undefined || value === '') return null;
  return value;
}

async function logStatusTransition({
  entityType,
  entityId,
  action = 'STATUS_CHANGED',
  statusBefore = null,
  statusAfter = null,
  source = WORKFLOW_SOURCE.SYSTEM,
  note = null,
  actorNik = null,
  createdAt = null,
  transaction = null,
}) {
  if (!entityType || !entityId) return null;

  return ActivityLogService.logStatusChange({
    entityType,
    entityId,
    action,
    statusBefore: normalizeNullable(statusBefore),
    statusAfter: normalizeNullable(statusAfter),
    source,
    note: normalizeNullable(note),
    actorNik: normalizeNullable(actorNik),
    createdAt,
    transaction,
  });
}


async function logStatusTransitionIfMissing({
  entityType,
  entityId,
  action = 'STATUS_CHANGED',
  statusBefore = null,
  statusAfter = null,
  source = WORKFLOW_SOURCE.SYSTEM,
  note = null,
  actorNik = null,
  createdAt = null,
  transaction = null,
}) {
  if (!entityType || !entityId) return null;

  return ActivityLogService.createActivityLogIfMissing(
    {
      entityType,
      entityId,
      action,
      statusBefore: normalizeNullable(statusBefore),
      statusAfter: normalizeNullable(statusAfter),
      source,
      note: normalizeNullable(note),
      actorNik: normalizeNullable(actorNik),
      createdAt,
    },
    { transaction }
  );
}

async function logSystemNote({
  entityType,
  entityId,
  action,
  note,
  actorNik = null,
  transaction = null,
}) {
  return logStatusTransition({
    entityType,
    entityId,
    action,
    source: WORKFLOW_SOURCE.SYSTEM,
    note,
    actorNik,
    transaction,
  });
}

async function getStatusHistory(entityType, entityId, options = {}) {
  return ActivityLogService.getLogsForEntity(entityType, entityId, options);
}

async function getRequestTimeline(requestId, options = {}) {
  return ActivityLogService.getRequestTimelineLogs(requestId, options);
}

async function ensureRequestTimeline(requestId, options = {}) {
  return ActivityLogService.ensureRequestActivityLogs(requestId, options);
}

module.exports = {
  logStatusTransition,
  logStatusTransitionIfMissing,
  logSystemNote,
  getStatusHistory,
  getRequestTimeline,
  ensureRequestTimeline,
};
