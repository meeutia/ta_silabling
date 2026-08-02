const { Op } = require('sequelize');
const { Lhu, Sampel, PenugasanItem } = require('../../models/Associations');
const { LHU_STATUS } = require('../../constants/lhu-status.constant');
const { uniqueSampleNos } = require('./assignment-revision.helper');
const LHU_SOURCE_LOCK_STATUSES = Object.freeze([
    LHU_STATUS.APPROVED_FINAL,
]);
class AssignmentLhuLockHelper {
    getPlain = (instance) => {
        if (!instance)
            return null;
        if (typeof instance.get === 'function')
            return instance.get({ plain: true });
        return instance;
    };
    buildLhuLockedError = (lockedRows = []) => {
        const labels = lockedRows
            .map((row) => `${row.no_sampel || '-'} (${row.nomor_lhu || '-'})`)
            .join(', ');
        const error = new Error(labels
            ? `Data tidak dapat diubah karena LHU sudah tergenerate: ${labels}.`
            : 'Data tidak dapat diubah karena LHU sudah tergenerate.');
        error.statusCode = 409;
        return error;
    };
    getLockedLhuRowsBySamples = async (noSampels, transaction = null) => {
        const sampleNos = uniqueSampleNos(noSampels);
        if (!sampleNos.length)
            return [];
        const rows = await Sampel.findAll({
            where: {
                no_sampel: { [Op.in]: sampleNos },
                nomor_lhu: { [Op.ne]: null },
            },
            include: [
                {
                    model: Lhu,
                    as: 'lhu',
                    required: true,
                    where: { status_lhu: { [Op.in]: LHU_SOURCE_LOCK_STATUSES } },
                    attributes: ['nomor_lhu', 'status_lhu'],
                },
            ],
            transaction,
        });
        return rows.map((row) => {
            const plain = row.get({ plain: true });
            return {
                nomor_lhu: plain.nomor_lhu || plain.lhu?.nomor_lhu,
                no_sampel: plain.no_sampel,
                status_lhu: plain.lhu?.status_lhu || null,
            };
        });
    };
    assertSamplesEditableBeforeLhu = async (noSampels, transaction = null) => {
        const lockedRows = await this.getLockedLhuRowsBySamples(noSampels, transaction);
        if (lockedRows.length) {
            throw this.buildLhuLockedError(lockedRows);
        }
    };
    cancelNonFinalLhusBySamples = async (noSampels, transaction = null) => {
        const sampleNos = uniqueSampleNos(noSampels);
        if (!sampleNos.length)
            return [];
        const rows = await Sampel.findAll({
            where: {
                no_sampel: { [Op.in]: sampleNos },
                nomor_lhu: { [Op.ne]: null },
            },
            include: [
                {
                    model: Lhu,
                    as: 'lhu',
                    required: true,
                    where: { status_lhu: { [Op.ne]: LHU_STATUS.APPROVED_FINAL } },
                    attributes: ['nomor_lhu', 'status_lhu'],
                },
            ],
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
        const nomorLhus = Array.from(new Set(rows
            .map((row) => {
                const plain = row.get({ plain: true });
                return plain.nomor_lhu || plain.lhu?.nomor_lhu;
            })
            .filter(Boolean)));
        if (!nomorLhus.length)
            return [];
        await Lhu.update({
            status_lhu: LHU_STATUS.CANCELLED,
            file_lhu_path: null,
            tanggal_penerbitan: null,
            kalab_by: null,
            kalab_at: null,
        }, {
            where: {
                nomor_lhu: { [Op.in]: nomorLhus },
                status_lhu: { [Op.ne]: LHU_STATUS.APPROVED_FINAL },
            },
            transaction,
        });
        await Sampel.update({ nomor_lhu: null }, {
            where: { nomor_lhu: { [Op.in]: nomorLhus } },
            transaction,
        });
        return nomorLhus;
    };
    getSampleNosForPenugasanDetail = async (idPenugasanDetail, transaction = null) => {
        const itemRows = await PenugasanItem.findAll({
            where: { id_penugasan_detail: idPenugasanDetail },
            attributes: ['no_sampel'],
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
        return uniqueSampleNos(itemRows.map((row) => this.getPlain(row)?.no_sampel));
    };
    assertPenugasanDetailSamplesEditableBeforeLhu = async (idPenugasanDetail, transaction = null) => {
        const sampleNos = await this.getSampleNosForPenugasanDetail(idPenugasanDetail, transaction);
        await this.assertSamplesEditableBeforeLhu(sampleNos, transaction);
        return sampleNos;
    };
    toLhuLockRequestData = (lockedRows = []) => {
        const rows = (lockedRows || []).map((row) => ({
            nomorLhu: row.nomor_lhu || row.nomorLhu || null,
            noSampel: row.no_sampel || row.noSampel || null,
            statusLhu: row.status_lhu || row.statusLhu || null,
        }));
        return {
            isLhuGenerated: rows.length > 0,
            isLhuLocked: rows.length > 0,
            canEdit: rows.length === 0,
            lockedLhus: rows,
        };
    };
}
module.exports = new AssignmentLhuLockHelper();
module.exports.AssignmentLhuLockHelper = AssignmentLhuLockHelper;
