const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const SUBCONTRACT_REQUEST_STATUS = require('../../constants/subcontract-request-status');
const { NOTIFICATION_TYPE } = require('../../constants/notification.constant');

const PermintaanSubkontrak = require('../../models/PermintaanSubkontrak');
const FpplParameterMetode = require('../../models/FpplParameterMetode');
const FpplSampel = require('../../models/FpplSampel');
const Fppl = require('../../models/Fppl');
const JenisSampel = require('../../models/JenisSampel');
const RegBm = require('../../models/RegBm');
const Parameter = require('../../models/Parameter');
const KategoriParameter = require('../../models/KategoriParameter');
const ParameterMetode = require('../../models/ParameterMetode');
const Metode = require('../../models/Metode');
const { generateNextCode } = require('../admin-parameter.service');
const { createEmailLog } = require('../notification/notification-core.service');
const { getActiveUsersByRole } = require('../notification/notification-query.service');
const Roles = require('../../constants/roles');
const WorkflowLogService = require('../workflow/workflow-log.service');

async function notifySubcontractAdminLocally({ type, referenceId }) {
    const adminRows = await getActiveUsersByRole(Roles.ADMIN);
    for (const admin of adminRows) {
        await createEmailLog({
            idTipeNotifikasi: type,
            nikPenerima: admin.nik,
            referensiTipe: 'FPPL',
            referensiId: referenceId
        });
    }
}

async function notifySubcontractKasiLocally({ type, referenceId }) {
    const kasiRows = await getActiveUsersByRole(Roles.KASI);
    for (const kasi of kasiRows) {
        await createEmailLog({
            idTipeNotifikasi: type,
            nikPenerima: kasi.nik,
            referensiTipe: 'FPPL',
            referensiId: referenceId
        });
    }
}

class SubcontractRequestService {
    constructor() {
        this.adminParameterService = require('../admin-parameter.service');
    }

    async createRequest({ fpmId }) {
        const transaction = await sequelize.transaction();
        try {
            const fpm = await FpplParameterMetode.findByPk(fpmId, {
                include: [
                    { model: Fppl, as: 'fppl' },
                    { model: Parameter, as: 'parameter' }
                ],
                transaction
            });

            if (!fpm) throw new Error('Parameter permohonan tidak ditemukan.');

            if (fpm.fppl.status_fppl !== 'Menunggu Penentuan Metode') {
                throw new Error('Permohonan tidak dalam status Menunggu Penentuan Metode.');
            }

            const existingPending = await PermintaanSubkontrak.findOne({
                where: {
                    id_fppl_parameter_metode: fpmId,
                    status_permintaan: SUBCONTRACT_REQUEST_STATUS.PENDING_ADMIN
                },
                transaction
            });

            if (existingPending) {
                throw new Error('Sudah ada permintaan subkontrak yang menunggu diproses admin untuk parameter ini.');
            }

            const reqId = await generateNextCode({
                model: PermintaanSubkontrak,
                column: 'id_permintaan_subkontrak',
                prefix: 'REQ-SUB',
                padLength: 4,
                transaction
            });

            const req = await PermintaanSubkontrak.create({
                id_permintaan_subkontrak: reqId,
                id_registrasi: fpm.id_registrasi,
                id_fppl_parameter_metode: fpmId,
                id_parameter: fpm.id_parameter,
                status_permintaan: SUBCONTRACT_REQUEST_STATUS.PENDING_ADMIN,
                pending_fpm_key: fpmId
            }, { transaction });

            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: fpm.id_registrasi,
                action: 'MENGAJUKAN_SUBKONTRAK',
                statusBefore: fpm.fppl.status_fppl,
                statusAfter: fpm.fppl.status_fppl,
                source: 'Kasi',
                note: `Mengajukan permintaan subkontrak untuk parameter ${fpm.parameter?.nama_parameter || fpm.id_parameter}`,
                actorNik: null,
                transaction
            });

            await notifySubcontractAdminLocally({
                type: NOTIFICATION_TYPE.SUBCONTRACT_REQUEST_ADMIN,
                referenceId: reqId
            });

            await transaction.commit();
            return req;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async listAdminRequests({ status }) {
        const whereClause = {};
        if (status) {
            whereClause.status_permintaan = status;
        }

        const rows = await PermintaanSubkontrak.findAll({
            where: whereClause,
            include: [
                {
                    model: FpplParameterMetode,
                    as: 'fppl_parameter_metode',
                    include: [
                        { model: Parameter, as: 'parameter' },
                    ]
                },
                { model: Fppl, as: 'fppl', attributes: ['id_registrasi'] }
            ],
            order: [
                ['diajukan_pada', 'DESC']
            ]
        });

        return rows.map(row => {
            const data = row.toJSON();
            const fpm = data.fppl_parameter_metode;
            return {
                ...data,
                parameter_name: fpm?.parameter?.nama_parameter || data.id_parameter,
            };
        });
    }

    async getAdminRequestDetail(requestId) {
        const row = await PermintaanSubkontrak.findByPk(requestId, {
            include: [
                {
                    model: FpplParameterMetode,
                    as: 'fppl_parameter_metode',
                    include: [
                        { 
                            model: Parameter, 
                            as: 'parameter',
                            include: [{ model: KategoriParameter, as: 'kategori' }]
                        },
                        { model: JenisSampel, as: 'jenis_sampel' },
                        { model: RegBm, as: 'reg_bm' }
                    ]
                }
            ]
        });

        if (!row) throw new Error('Permintaan tidak ditemukan');
        return row.toJSON();
    }

    async approveRequest({ requestId, adminNik, createMethodData, existingMethodId }) {
        const transaction = await sequelize.transaction();
        try {
            const req = await PermintaanSubkontrak.findByPk(requestId, {
                include: [
                    {
                        model: FpplParameterMetode,
                        as: 'fppl_parameter_metode',
                        include: [
                            { model: Parameter, as: 'parameter' }
                        ]
                    }
                ],
                transaction
            });

            if (!req) throw new Error('Permintaan tidak ditemukan.');
            if (!req.isPending()) throw new Error('Permintaan sudah tidak berstatus MENUNGGU_ADMIN.');

            let finalMethodId = existingMethodId;

            if (!finalMethodId) {
                if (!createMethodData) throw new Error('Data metode baru harus disertakan jika tidak memilih metode yang sudah ada.');

                // Force it to be subkontrak
                const newMethodData = {
                    ...createMethodData,
                    id_parameter: req.id_parameter,
                    is_subkontrak: true,
                };

                const adminParameterService = new this.adminParameterService();
                const pm = await adminParameterService.createParameterMethodWithinTransaction(newMethodData, transaction);
                finalMethodId = pm.id_metode_parameter;
            } else {
                const pm = await ParameterMetode.findByPk(finalMethodId, { transaction });
                if (!pm) throw new Error('Metode yang dipilih tidak ditemukan.');
                if (pm.id_parameter !== req.id_parameter) {
                    throw new Error('Metode yang dipilih tidak sesuai dengan parameter permintaan.');
                }
                const isSubkontrak = Number(pm.is_subkontrak) === 1 || pm.is_subkontrak === true || pm.is_subkontrak === '1';
                if (!isSubkontrak) {
                    throw new Error('Metode yang dipilih bukan merupakan metode subkontrak.');
                }
            }

            await req.update({
                status_permintaan: SUBCONTRACT_REQUEST_STATUS.SELESAI,
                diproses_pada: new Date()
            }, { transaction });

            const fpm = req.fppl_parameter_metode;

            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: req.id_registrasi,
                action: 'MENYETUJUI_SUBKONTRAK',
                statusBefore: null,
                statusAfter: null,
                source: 'Admin',
                note: `Admin melengkapi data subkontrak untuk parameter ${fpm.parameter?.nama_parameter || req.id_parameter}`,
                actorNik: adminNik,
                transaction,
                isHiddenFromCustomer: true
            });
            await notifySubcontractKasiLocally({
                type: NOTIFICATION_TYPE.SUBCONTRACT_REQUEST_APPROVED_KASI,
                referenceId: req.id_registrasi
            });

            await transaction.commit();
            return req;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async rejectRequest({ requestId, adminNik }) {
        const transaction = await sequelize.transaction();
        try {
            const req = await PermintaanSubkontrak.findByPk(requestId, {
                include: [
                    {
                        model: FpplParameterMetode,
                        as: 'fppl_parameter_metode',
                        include: [
                            { model: Parameter, as: 'parameter' }
                        ]
                    }
                ],
                transaction
            });

            if (!req) throw new Error('Permintaan tidak ditemukan.');
            if (!req.isPending()) throw new Error('Permintaan sudah tidak berstatus MENUNGGU_ADMIN.');

            await req.update({
                status_permintaan: SUBCONTRACT_REQUEST_STATUS.DITOLAK,
                diproses_pada: new Date()
            }, { transaction });

            const fpm = req.fppl_parameter_metode;

            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: req.id_registrasi,
                action: 'MENOLAK_SUBKONTRAK',
                statusBefore: null,
                statusAfter: null,
                source: 'Admin',
                note: `Admin menolak permintaan subkontrak untuk parameter ${fpm.parameter?.nama_parameter || req.id_parameter}`,
                actorNik: adminNik,
                transaction,
                isHiddenFromCustomer: true
            });
            await notifySubcontractKasiLocally({
                type: NOTIFICATION_TYPE.SUBCONTRACT_REQUEST_REJECTED_KASI,
                referenceId: req.id_registrasi
            });

            await transaction.commit();
            return req;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new SubcontractRequestService();
