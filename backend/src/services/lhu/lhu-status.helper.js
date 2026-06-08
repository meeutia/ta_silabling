const { LHU_STATUS } = require('../../constants/lhu-status.constant');
class LhuStatusHelper {
isFinalLhuStatus = (status) => {
        return String(status || '').trim() === LHU_STATUS.APPROVED_FINAL;
    };
    isPickedUpStatus = (status) => {
        return String(status || '').trim() === 'Sudah Diambil';
    };
}
module.exports = new LhuStatusHelper();
module.exports.LhuStatusHelper = LhuStatusHelper;

module.exports.LHU_STATUS = LHU_STATUS;
