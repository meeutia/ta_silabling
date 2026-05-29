const {
  Fppl,
  FpplSampel,
  FpplParameterMetode,
  PenugasanDetail,
  PktBm,
  PktBmParam,
  PktBmPm,
  Lhu,
  TarifPengambilan,
} = require('../models/Associations');

function buildUsageMessage(label, usages, operation = 'diubah/dihapus') {
  const activeUsages = Object.entries(usages || {})
    .filter(([, count]) => Number(count || 0) > 0)
    .map(([name, count]) => `${name}: ${count}`)
    .join(', ');

  if (!activeUsages) return null;

  return `${label} tidak dapat ${operation} karena sudah dipakai pada data historis (${activeUsages}). Buat data baru jika ada perubahan.`;
}

async function getParameterMetodeUsage(idMetodeParameter, options = {}) {
  const transaction = options.transaction || null;
  const [fpplItems, penugasanDetails, paketBmMethods] = await Promise.all([
    FpplParameterMetode.count({ where: { id_metode_parameter: idMetodeParameter }, transaction }),
    PenugasanDetail.count({ where: { id_metode_parameter: idMetodeParameter }, transaction }),
    PktBmPm.count({ where: { id_metode_parameter: idMetodeParameter }, transaction }),
  ]);

  return {
    fppl_parameter_metode: fpplItems,
    penugasan_detail: penugasanDetails,
    pkt_bm_pm: paketBmMethods,
  };
}

async function getRegBmUsage(idRegBm, options = {}) {
  const transaction = options.transaction || null;
  const [fpplSamples, paketBm] = await Promise.all([
    FpplSampel.count({ where: { id_reg_bm: idRegBm }, transaction }),
    PktBm.count({ where: { id_reg_bm: idRegBm }, transaction }),
  ]);

  return {
    fppl_sampel: fpplSamples,
    pkt_bm: paketBm,
  };
}

async function getPktBmUsage(idPktBm, options = {}) {
  const transaction = options.transaction || null;
  const [lhuRows, pktParams] = await Promise.all([
    Lhu.count({ where: { id_pkt_bm: idPktBm }, transaction }),
    PktBmParam.count({ where: { id_pkt_bm: idPktBm }, transaction }),
  ]);

  return {
    lhu: lhuRows,
    pkt_bm_param: pktParams,
  };
}

async function getPktBmParamUsage(idPktBmParam, options = {}) {
  const transaction = options.transaction || null;
  const pktParam = await PktBmParam.findByPk(idPktBmParam, { transaction });
  const idPktBm = pktParam?.id_pkt_bm || null;

  const [methodRows, lhuRows] = await Promise.all([
    PktBmPm.count({ where: { id_pkt_bm_param: idPktBmParam }, transaction }),
    idPktBm ? Lhu.count({ where: { id_pkt_bm: idPktBm }, transaction }) : 0,
  ]);

  return {
    pkt_bm_pm: methodRows,
    lhu_dengan_paket_ini: lhuRows,
  };
}

async function getTarifPengambilanUsage(idTarifPengambilan, options = {}) {
  const transaction = options.transaction || null;
  const fpplRows = await Fppl.count({ where: { id_tarif_pengambilan: idTarifPengambilan }, transaction });

  return {
    fppl: fpplRows,
  };
}

async function assertUnusedForMasterChange({ label, usageGetter, id, operation = 'diubah/dihapus', transaction }) {
  const usages = await usageGetter(id, { transaction });
  const message = buildUsageMessage(label, usages, operation);

  if (message) {
    const error = new Error(message);
    error.code = 'PROTECTED_MASTER_IN_USE';
    error.usages = usages;
    throw error;
  }

  return usages;
}

function getTotalUsage(usages = {}) {
  return Object.values(usages || {}).reduce((sum, count) => sum + Number(count || 0), 0);
}

function hasAnyUsage(usages = {}) {
  return getTotalUsage(usages) > 0;
}

module.exports = {
  buildUsageMessage,
  getParameterMetodeUsage,
  getRegBmUsage,
  getPktBmUsage,
  getPktBmParamUsage,
  getTarifPengambilanUsage,
  getTotalUsage,
  hasAnyUsage,
  assertUnusedForMasterChange,
};
