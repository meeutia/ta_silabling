const { LHU_STATUS } = require('../../constants/lhu-status.constant');

function isFinalLhuStatus(status) {
  return String(status || '').trim() === LHU_STATUS.APPROVED_FINAL;
}

function isPickedUpStatus(status) {
  return String(status || '').trim() === 'Sudah Diambil';
}

module.exports = {
  LHU_STATUS,
  isFinalLhuStatus,
  isPickedUpStatus,
};
