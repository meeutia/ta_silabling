const { Op } = require('sequelize');
const { SUBKONTRAK_ASSIGNMENT_TYPE } = require('./assignment.constants');

function internalAssignmentWhere(extra = {}) {
  return {
    ...extra,
    [Op.or]: [
      { jenis_penugasan: null },
      { jenis_penugasan: { [Op.ne]: SUBKONTRAK_ASSIGNMENT_TYPE } },
    ],
  };
}

function subkontrakAssignmentWhere(extra = {}) {
  return {
    ...extra,
    jenis_penugasan: SUBKONTRAK_ASSIGNMENT_TYPE,
  };
}

function isSubkontrakAssignment(penugasan = {}) {
  return String(penugasan.jenis_penugasan || penugasan.jenisPenugasan || '')
    .trim()
    .toUpperCase() === SUBKONTRAK_ASSIGNMENT_TYPE;
}

module.exports = {
  internalAssignmentWhere,
  subkontrakAssignmentWhere,
  isSubkontrakAssignment,
};
