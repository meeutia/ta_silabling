const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const lhuPdfService = require('./lhu-pdf.service');
const { calculateAccreditationStats, getPlain, getSampleInfosForLhu, getPktBmHeaderById, getDetailLhuRows, getPegawaiDisplayName, getLhuSignerSnapshot, mapLhuHeaderRequestData, mapSampleRequestData, mapPelangganRequestData, buildLhuListRow, } = require('./lhu-data.service');
const lhuDetailRowMapper = require('./lhu-detail-row.mapper');
const notificationService = require('../notification/notification.service');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { User, Pegawai, Role, Pelanggan, Fppl, JadwalSampel, FpplSampel, JenisSampel, RegBm, PktBm, PktBmParam, Parameter, Metode, ParameterMetode, FpplParameterMetode, Sampel, SampelParameter, PenugasanItem, PenugasanDetail, Lka, LkaHasil, Lhu, JadwalPengambilanLhu, } = require('../../models/Associations');
const { LHU_STATUS, LHU_EDITABLE_BY_QC_STATUSES, LHU_NEXT_STATUS, isLhuEditableByQc, normalizeLhuStatus, } = require('../../constants/lhu-status.constant');
const { buildLkaHasilRevisionResponse } = require('../assignment/assignment-revision.helper');
const RequestStatus = require('../../constants/request-status');
const PUBLIC_LHU_DIR = path.join(__dirname, '../../../public', 'lhu');

const normalizeSampleNoKey = (value) => String(value || '').trim().replace(/\s*\/\s*/g, '/').toLowerCase();
const dedupeSampleInfos = (sampleInfos = []) => {
    const map = new Map();
    (Array.isArray(sampleInfos) ? sampleInfos : []).forEach((sample) => {
        const noSampel = String(sample?.no_sampel || sample?.noSampel || '').trim();
        const key = normalizeSampleNoKey(noSampel);
        if (!key || map.has(key))
            return;
        map.set(key, sample);
    });
    return Array.from(map.values()).sort((a, b) => String(a?.no_sampel || a?.noSampel || '').localeCompare(String(b?.no_sampel || b?.noSampel || ''), 'id', { numeric: true, sensitivity: 'base' }));
};
const dedupeSampleNos = (values = []) => dedupeSampleInfos((Array.isArray(values) ? values : []).map((noSampel) => ({ no_sampel: noSampel }))).map((sample) => sample.no_sampel);
class LhuService {
    normalizeStoredLhuPath = (rawPath = '') => {
        const value = String(rawPath || '').trim();
        if (!value)
            return '';
        try {
            if (/^https?:\/\//i.test(value)) {
                return new URL(value).pathname;
            }
        }
        catch {
            return value;
        }
        return value;
    };

    resolveStoredLhuAbsolutePath = (rawPath = '') => {
        let relativePath = this.normalizeStoredLhuPath(rawPath)
            .replace(/\\/g, '/')
            .replace(/^\/+/, '');
        if (!relativePath)
            return null;
        if (relativePath.startsWith('lhu/')) {
            relativePath = relativePath.slice('lhu/'.length);
        }
        const parts = relativePath.split('/').filter(Boolean);
        if (!parts.length || parts.some((part) => part === '..' || part === '.')) {
            return null;
        }
        const root = path.resolve(PUBLIC_LHU_DIR);
        const candidate = path.resolve(root, parts.join('/'));
        const rel = path.relative(root, candidate);
        if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
            return null;
        }
        return candidate;
    };

    isStoredLhuFileAvailable = (rawPath = '') => {
        const absolutePath = this.resolveStoredLhuAbsolutePath(rawPath);
        return Boolean(absolutePath && fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile());
    };

    ensureLhuPdfFile = async (lhuRow = {}, transaction = null) => {
        const lhu = { ...(lhuRow || {}) };
        const nomorLhu = lhu.nomor_lhu || lhu.nomorLhu;
        if (!nomorLhu)
            return lhu;
        if (lhu.file_lhu_path && this.isStoredLhuFileAvailable(lhu.file_lhu_path)) {
            return lhu;
        }
        const status = String(normalizeLhuStatus(lhu.status_lhu || lhu.statusLhu || '')).toLowerCase();
        const generator = status.includes('disahkan')
            ? lhuPdfService.generateFinalLhuPdf
            : lhuPdfService.generateDraftLhuPdf;
        const pdfResult = await generator(nomorLhu, transaction);
        if (pdfResult?.filePath && pdfResult.filePath !== lhu.file_lhu_path) {
            await Lhu.update({ file_lhu_path: pdfResult.filePath }, { where: { nomor_lhu: nomorLhu }, transaction });
            lhu.file_lhu_path = pdfResult.filePath;
            lhu.fileLhuPath = pdfResult.filePath;
        }
        return lhu;
    };

    getLhuDetail = async (nomorLhu) => {
        const lhuNo = String(nomorLhu || '').trim();
        if (!lhuNo || ['undefined', 'null', '-'].includes(lhuNo.toLowerCase())) {
            throw new Error('Nomor LHU wajib dikirim.');
        }
        const lhuInstance = await Lhu.findOne({
            where: { nomor_lhu: lhuNo },
        });
        if (!lhuInstance) {
            throw new Error('LHU tidak ditemukan.');
        }
        let lhuPlain = getPlain(lhuInstance);
        lhuPlain = await this.ensureLhuPdfFile(lhuPlain);

        const nomorLhuValue = lhuPlain.nomorLhu || lhuPlain.nomor_lhu || lhuNo;
        const idPktBmValue = lhuPlain.idPktBm || lhuPlain.id_pkt_bm;
        const qcByValue = lhuPlain.qcBy || lhuPlain.qc_by;
        const kalabByValue = null;

        const sampleInfos = dedupeSampleInfos(await getSampleInfosForLhu(nomorLhuValue));
        const sampleInfo = sampleInfos[0] || {};
        const pktBm = await getPktBmHeaderById(idPktBmValue);
        const details = await getDetailLhuRows(nomorLhuValue);
        const [qcNama, signer] = await Promise.all([
            getPegawaiDisplayName(qcByValue),
            getLhuSignerSnapshot(kalabByValue),
        ]);
        const kalabNama = signer?.namaPegawai || null;
        const sampleRequestDatas = sampleInfos.map(mapSampleRequestData);
        const sampleNos = dedupeSampleNos(sampleInfos.map((info) => info.noSampel || info.no_sampel).filter(Boolean));
        const noSampelText = sampleNos.join('\n') || null;
        const lhu = {
            ...mapLhuHeaderRequestData(lhuPlain, sampleInfo, pktBm, {
                qcNama,
                kalabNama,
            }),
            nomorLhu: nomorLhuValue,
            nomor_lhu: nomorLhuValue,
            noSampel: noSampelText,
            no_sampel: noSampelText,
            sampleNos,
            sample_nos: sampleNos,
            daftarSampelFinalisasiQc: noSampelText,
            daftar_sampel_finalisasi_qc: noSampelText,
        };
        const groupedDetails = lhuDetailRowMapper.groupLhuDetailRowsByParameter(details);
        return {
            lhu,
            sample: mapSampleRequestData(sampleInfo),
            samples: sampleRequestDatas,
            sampleNos,
            sample_nos: sampleNos,
            daftarSampelFinalisasiQc: noSampelText,
            daftar_sampel_finalisasi_qc: noSampelText,
            pelanggan: mapPelangganRequestData(sampleInfo),
            details: groupedDetails,
            akreditasi: calculateAccreditationStats(groupedDetails),
        };
    };
    getKasiPengujianQueue = async () => {
        throw new Error('Queue Kasi Pengujian sekarang menggunakan assignment.service.js, bukan lhu.service.js.');
    };
    approveKasiPengujian = async () => {
        throw new Error('Approval Kasi Pengujian sekarang menggunakan review hasil sampel, bukan tabel LHU.');
    };
    reviseKasiPengujian = async () => {
        throw new Error('Revisi Kasi Pengujian sekarang menggunakan review hasil sampel, bukan tabel LHU.');
    };
    getFinalizationHistory = async () => {
        const rows = await Lhu.findAll({
            where: {
                [Op.or]: [
                    { qc_by: { [Op.ne]: null } },
                    {
                        status_lhu: {
                            [Op.in]: [
                                LHU_STATUS.APPROVED_FINAL,
                            ],
                        },
                    },
                ],
            },
            order: [
                ['qc_at', 'DESC'],
                ['updated_at', 'DESC'],
                ['created_at', 'DESC'],
                ['nomor_lhu', 'DESC'],
            ],
        });
        const mappedRows = [];
        for (const instance of rows) {
            mappedRows.push(await buildLhuListRow(getPlain(instance)));
        }
        return mappedRows;
    };
    isTerminalRequestStatus = (status) => {
        return [
            RequestStatus.COMPLETED,
            RequestStatus.REJECTED,
            RequestStatus.CANCELLED_BY_CUSTOMER,
            RequestStatus.REJECTED_BY_ADMIN,
            RequestStatus.REJECTED_BY_KASI,
            RequestStatus.REJECTED_BY_PENYELIA,
        ].includes(String(status || '').trim());
    };
    updateRequestStatusAfterLhuApproval = async ({ idRegistrasi, actorNik, transaction }) => {
        const requestId = String(idRegistrasi || '').trim();
        if (!requestId)
            return;
        const fpplInstance = await Fppl.findByPk(requestId, {
            transaction,
            lock: transaction?.LOCK?.UPDATE,
        });
        if (!fpplInstance || this.isTerminalRequestStatus(fpplInstance.status_fppl))
            return;
        const notFinalCount = await Lhu.count({
            where: {
                id_registrasi: requestId,
                status_lhu: { [Op.ne]: LHU_STATUS.APPROVED_FINAL },
            },
            transaction,
        });
        if (notFinalCount > 0)
            return;
        const activePickupSchedule = await JadwalPengambilanLhu.findOne({
            where: {
                id_registrasi: requestId,
                status_pengambilan: { [Op.ne]: 'Dibatalkan' },
            },
            transaction,
        });
        const nextStatus = activePickupSchedule
            ? RequestStatus.WAITING_LHU_PICKUP
            : RequestStatus.WAITING_LHU_SCHEDULING;
        if (fpplInstance.status_fppl === nextStatus)
            return;
        const previousStatus = fpplInstance.status_fppl;
        await fpplInstance.update({ status_fppl: nextStatus }, { transaction });
        await WorkflowLogService.logStatusTransition({
            entityType: 'FPPL',
            entityId: fpplInstance.id_registrasi,
            action: nextStatus === RequestStatus.WAITING_LHU_PICKUP
                ? 'MENUNGGU_PENGAMBILAN_LHU'
                : 'MENUNGGU_PENJADWALAN_LHU',
            statusBefore: previousStatus,
            statusAfter: nextStatus,
            source: 'Sistem',
            note: nextStatus === RequestStatus.WAITING_LHU_PICKUP
                ? 'LHU sudah disahkan dan jadwal pengambilan LHU sudah tersedia.'
                : 'Semua LHU pada permohonan sudah disahkan. Menunggu admin menjadwalkan pengambilan LHU.',
            actorNik,
            transaction,
        });
    };
}
module.exports = new LhuService();
module.exports.LhuService = LhuService;
