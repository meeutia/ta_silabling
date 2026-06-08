const ActivityLogService = require('../activity-log.service');
const { WORKFLOW_SOURCE } = require('../../constants/workflow-status.constant');
class WorkflowLogService {
normalizeNullable = (value) => {
        if (value === undefined || value === '')
            return null;
        return value;
    };
    logStatusTransition = async ({ entityType, entityId, action = 'STATUS_CHANGED', statusBefore = null, statusAfter = null, source = WORKFLOW_SOURCE.SYSTEM, note = null, actorNik = null, createdAt = null, transaction = null, }) => {
        if (!entityType || !entityId)
            return null;
        return ActivityLogService.logStatusChange({
            entityType,
            entityId,
            action,
            statusBefore: this.normalizeNullable(statusBefore),
            statusAfter: this.normalizeNullable(statusAfter),
            source,
            note: this.normalizeNullable(note),
            actorNik: this.normalizeNullable(actorNik),
            createdAt,
            transaction,
        });
    };
    logStatusTransitionIfMissing = async ({ entityType, entityId, action = 'STATUS_CHANGED', statusBefore = null, statusAfter = null, source = WORKFLOW_SOURCE.SYSTEM, note = null, actorNik = null, createdAt = null, transaction = null, }) => {
        if (!entityType || !entityId)
            return null;
        return ActivityLogService.createActivityLogIfMissing({
            entityType,
            entityId,
            action,
            statusBefore: this.normalizeNullable(statusBefore),
            statusAfter: this.normalizeNullable(statusAfter),
            source,
            note: this.normalizeNullable(note),
            actorNik: this.normalizeNullable(actorNik),
            createdAt,
        }, { transaction });
    };
    logSystemNote = async ({ entityType, entityId, action, note, actorNik = null, transaction = null, }) => {
        return this.logStatusTransition({
            entityType,
            entityId,
            action,
            source: WORKFLOW_SOURCE.SYSTEM,
            note,
            actorNik,
            transaction,
        });
    };
    getStatusHistory = async (entityType, entityId, options = {}) => {
        return ActivityLogService.getLogsForEntity(entityType, entityId, options);
    };
    getRequestTimeline = async (requestId, options = {}) => {
        return ActivityLogService.getRequestTimelineLogs(requestId, options);
    };
    ensureRequestTimeline = async (requestId, options = {}) => {
        return ActivityLogService.ensureRequestActivityLogs(requestId, options);
    };
}
module.exports = new WorkflowLogService();
module.exports.WorkflowLogService = WorkflowLogService;
