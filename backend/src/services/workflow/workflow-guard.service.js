const RequestStatus = require('../../constants/request-status');
const { SCHEDULE_CHANGE_STATUS, SCHEDULE_STATUS, } = require('../../constants/workflow-status.constant');
class WorkflowGuardService {
normalizeStatus = (value) => {
        return RequestStatus.normalizeRequestStatus(String(value || '').trim());
    };
    createWorkflowError = (message, statusCode = 400) => {
        const err = new Error(message);
        err.statusCode = statusCode;
        return err;
    };
    isRequestCompleted = (status) => {
        return this.normalizeStatus(status) === RequestStatus.COMPLETED;
    };
    assertRequestNotCompleted = (status, message = 'Permohonan sudah selesai dan tidak dapat diproses ulang.') => {
        if (this.isRequestCompleted(status)) {
            throw this.createWorkflowError(message);
        }
    };
    isLhuPickedUp = (schedule = {}) => {
        return this.normalizeStatus(schedule.status_pengambilan) === SCHEDULE_STATUS.PICKED_UP || Boolean(schedule.diambil_pada);
    };
    assertLhuNotPickedUp = (schedule = {}, message = 'LHU sudah diambil dan tidak dapat diproses ulang.') => {
        if (this.isLhuPickedUp(schedule)) {
            throw this.createWorkflowError(message);
        }
    };
    isScheduleChangePending = (status) => {
        return this.normalizeStatus(status) === SCHEDULE_CHANGE_STATUS.PENDING;
    };
    assertScheduleChangePending = (status, message = 'Pengajuan perubahan jadwal sudah diproses.') => {
        if (!this.isScheduleChangePending(status)) {
            throw this.createWorkflowError(message);
        }
    };
    assertCanApproveScheduleChange = ({ requestStatus, schedule, scheduleKind = 'LHU' } = {}) => {
        this.assertRequestNotCompleted(requestStatus);
        if (this.normalizeStatus(scheduleKind).toUpperCase() === 'LHU') {
            this.assertLhuNotPickedUp(schedule);
        }
    };
}
module.exports = new WorkflowGuardService();
module.exports.WorkflowGuardService = WorkflowGuardService;
