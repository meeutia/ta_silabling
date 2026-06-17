const { Op } = require('sequelize');
const { Fppl, FpplSampel, FpplParameterMetode, PenugasanDetail, PktBm, PktBmNilai, Lhu, TarifPengambilan, } = require('../models/Associations');
class ProtectedMasterGuardService {
buildUsageMessage = (label, usages, operation = 'diubah/dihapus') => {
        const activeUsages = Object.entries(usages || {})
            .filter(([, count]) => Number(count || 0) > 0)
            .map(([name, count]) => `${name}: ${count}`)
            .join(', ');
        if (!activeUsages)
            return null;
        return `${label} tidak dapat ${operation} karena sudah dipakai pada data historis (${activeUsages}). Buat data baru jika ada perubahan.`;
    };
    getParameterMetodeUsage = async (idMetodeParameter, options = {}) => {
        const transaction = options.transaction || null;
        const [fpplItems, penugasanDetails] = await Promise.all([
            FpplParameterMetode.count({ where: { id_metode_parameter: idMetodeParameter }, transaction }),
            PenugasanDetail.count({ where: { id_metode_parameter: idMetodeParameter }, transaction }),
        ]);
        return { fppl_parameter_metode: fpplItems, penugasan_detail: penugasanDetails };
    };
    getRegBmUsage = async (idRegBm, options = {}) => {
        const transaction = options.transaction || null;
        const [fpplSamples, paketRows] = await Promise.all([
            FpplSampel.count({ where: { id_reg_bm: idRegBm }, transaction }),
            PktBm.findAll({
                where: { id_reg_bm: idRegBm },
                attributes: ['id_pkt_bm'],
                raw: true,
                transaction,
            }),
        ]);
        const paketIds = [...new Set((paketRows || []).map((row) => row.id_pkt_bm).filter(Boolean))];
        const lhuRows = paketIds.length > 0
            ? await Lhu.count({ where: { id_pkt_bm: { [Op.in]: paketIds } }, transaction })
            : 0;
        return {
            fppl_sampel: fpplSamples,
            pkt_bm: paketIds.length,
            lhu: lhuRows,
            lhu_dengan_regulasi_ini: lhuRows,
        };
    };
    getPktBmUsage = async (idPktBm, options = {}) => {
        const transaction = options.transaction || null;
        const [lhuRows, pktNilai] = await Promise.all([
            Lhu.count({ where: { id_pkt_bm: idPktBm }, transaction }),
            PktBmNilai.count({ where: { id_pkt_bm: idPktBm }, transaction }),
        ]);
        return { lhu: lhuRows, pkt_bm_nilai: pktNilai };
    };
    getPktBmParamUsage = async (key, options = {}) => {
        const transaction = options.transaction || null;
        const idPktBm = key?.id_pkt_bm || null;
        const idParameter = key?.id_parameter || null;
        const idRegBm = key?.id_reg_bm || null;
        const idJenisSampel = key?.id_jenis_sampel || null;
        const lhuRows = idPktBm
            ? await Lhu.count({ where: { id_pkt_bm: idPktBm }, transaction })
            : 0;
        let nilaiRows = 0;
        let lhuRowsInGroup = 0;
        if (idRegBm && idJenisSampel && idParameter) {
            const paketRows = await PktBm.findAll({
                where: { id_reg_bm: idRegBm, id_jenis_sampel: idJenisSampel },
                attributes: ['id_pkt_bm'],
                raw: true,
                transaction,
            });
            const paketIds = [...new Set(paketRows.map((row) => row.id_pkt_bm).filter(Boolean))];
            const nilaiInstances = paketIds.length > 0
                ? await PktBmNilai.findAll({
                    where: { id_pkt_bm: { [Op.in]: paketIds }, id_parameter: idParameter },
                    attributes: ['id_pkt_bm'],
                    raw: true,
                    transaction,
                })
                : [];
            nilaiRows = nilaiInstances.length;
            const nilaiPaketIds = [...new Set(nilaiInstances.map((row) => row.id_pkt_bm).filter(Boolean))];
            lhuRowsInGroup = nilaiPaketIds.length > 0
                ? await Lhu.count({ where: { id_pkt_bm: { [Op.in]: nilaiPaketIds } }, transaction })
                : 0;
        }
        return {
            lhu_dengan_paket_ini: lhuRows,
            lhu_dengan_parameter_kelompok: lhuRowsInGroup,
            pkt_bm_nilai_kelompok: nilaiRows,
        };
    };
    getTarifPengambilanUsage = async (idTarifPengambilan, options = {}) => {
        const transaction = options.transaction || null;
        const fpplRows = await Fppl.count({ where: { id_tarif_pengambilan: idTarifPengambilan }, transaction });
        return { fppl: fpplRows };
    };
    assertUnusedForMasterChange = async ({ label, usageGetter, id, operation = 'diubah/dihapus', transaction }) => {
        const usages = await usageGetter(id, { transaction });
        const message = this.buildUsageMessage(label, usages, operation);
        if (message) {
            const error = new Error(message);
            error.code = 'PROTECTED_MASTER_IN_USE';
            error.usages = usages;
            throw error;
        }
        return usages;
    };
    getTotalUsage = (usages = {}) => Object.values(usages || {}).reduce((sum, count) => sum + Number(count || 0), 0);
    hasAnyUsage = (usages = {}) => this.getTotalUsage(usages) > 0;
}
module.exports = new ProtectedMasterGuardService();
module.exports.ProtectedMasterGuardService = ProtectedMasterGuardService;
