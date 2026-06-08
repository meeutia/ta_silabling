const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { Fppl, Pelanggan, FpplSampel, Sampel, Lhu, JadwalPengambilanLhu, PengajuanPerubahanJadwal, } = require('../../models/Associations');
const { generateId } = require('../../utils/id-generator');
const { LHU_STATUS } = require('../../constants/lhu-status.constant');
const RequestStatus = require('../../constants/request-status');
const notificationService = require('../notification/notification.service');
const WorkflowLogService = require('../workflow/workflow-log.service');
const ReferenceService = require('../reference.service');
const { assertBusinessDateOrThrow: assertScheduleBusinessDateOrThrow, normalizeDateOnly, normalizeTimeForDb: normalizeScheduleTimeForDb, } = require('../../utils/schedule-policy.util');
class LhuPickupService {
    constructor({ notificationService: injectedNotificationService = notificationService, referenceService = ReferenceService } = {}) {
        this.notificationService = injectedNotificationService;
        this.referenceService = referenceService;
    }
    getPlain = (instance) => {
        if (!instance)
            return null;
        if (typeof instance.get === 'function')
            return instance.get({ plain: true });
        return instance;
    };
    pickObject = (obj, keys = []) => {
        if (!obj || typeof obj !== 'object')
            return null;
        for (const key of keys) {
            if (obj[key] && typeof obj[key] === 'object')
                return obj[key];
        }
        return null;
    };
    pickArray = (obj, keys = []) => {
        if (!obj || typeof obj !== 'object')
            return [];
        for (const key of keys) {
            const value = obj[key];
            if (Array.isArray(value))
                return value;
        }
        return [];
    };
    normalizePickupTimeForDb = (value) => {
        return normalizeScheduleTimeForDb(value, 'Jam pengambilan LHU');
    };
    getJakartaYmd = (date = new Date()) => {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    };
    isActivePickupScheduleStatus = (status) => {
        return ['Dijadwalkan', 'Disetujui Pelanggan', 'Disetujui Admin'].includes(String(status || '').trim());
    };
    closePendingLhuScheduleChanges = async ({ idRegistrasi, idJadwalLhu, actorNik = null, transaction }) => {
        const requestId = String(idRegistrasi || '').trim();
        const scheduleId = String(idJadwalLhu || '').trim();
        if (!requestId)
            return 0;
        const where = {
            id_registrasi: requestId,
            jenis_jadwal: 'LHU',
            status_pengajuan: 'Menunggu Persetujuan Admin',
        };
        if (scheduleId) {
            where[Op.or] = [
                { id_jadwal_lhu: scheduleId },
                { id_jadwal_lhu: null },
            ];
        }
        const pendingRows = await PengajuanPerubahanJadwal.findAll({
            where,
            transaction,
            lock: transaction?.LOCK?.UPDATE,
        });
        let affectedCount = 0;
        for (const row of pendingRows) {
            const previousStatus = row.status_pengajuan;
            await row.update({
                status_pengajuan: 'Ditolak',
                catatan_admin: 'Pengajuan otomatis ditutup karena LHU sudah diambil.',
            }, { transaction });
            await WorkflowLogService.logStatusTransition({
                entityType: 'PENGAJUAN_JADWAL',
                entityId: row.id_pengajuan_jadwal,
                action: 'MENUTUP_PERUBAHAN_JADWAL_OTOMATIS',
                statusBefore: previousStatus,
                statusAfter: 'Ditolak',
                source: 'Sistem',
                note: 'Pengajuan otomatis ditutup karena LHU sudah diambil.',
                actorNik,
                transaction,
            });
            affectedCount += 1;
        }
        return affectedCount;
    };
    isFinalLhu = (row = {}) => {
        return String(row?.status_lhu || '').trim() === LHU_STATUS.APPROVED_FINAL;
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
    moveRequestToWaitingLhuPickup = async ({ idRegistrasi, actorNik, transaction }) => {
        const fpplInstance = await Fppl.findByPk(idRegistrasi, {
            transaction,
            lock: transaction?.LOCK?.UPDATE,
        });
        if (!fpplInstance || this.isTerminalRequestStatus(fpplInstance.status_fppl))
            return;
        if (fpplInstance.status_fppl === RequestStatus.WAITING_LHU_PICKUP)
            return;
        const previousStatus = fpplInstance.status_fppl;
        await fpplInstance.update({ status_fppl: RequestStatus.WAITING_LHU_PICKUP }, { transaction });
        await WorkflowLogService.logStatusTransition({
            entityType: 'FPPL',
            entityId: fpplInstance.id_registrasi,
            action: 'MENUNGGU_PENGAMBILAN_LHU',
            statusBefore: previousStatus,
            statusAfter: RequestStatus.WAITING_LHU_PICKUP,
            source: 'Admin',
            note: 'Jadwal pengambilan LHU sudah dibuat admin.',
            actorNik,
            transaction,
        });
    };
    getSampleLhuRows = (sample = {}) => {
        const rows = this.pickArray(sample, ['lhus', 'Lhus', 'LHUList']);
        if (rows.length > 0) {
            return rows;
        }
        const single = this.pickObject(sample, ['lhu', 'Lhu', 'LHU']);
        return single ? [single] : [];
    };
    buildLhuCoverage = (sampleRows = []) => {
        const missingSamples = [];
        const notFinalSamples = [];
        const finalLhuMap = new Map();
        const allLhuMap = new Map();
        sampleRows.forEach((sample) => {
            const noSampel = sample?.no_sampel || sample?.noSampel || '-';
            const lhuRows = this.getSampleLhuRows(sample);
            const finalRows = lhuRows.filter(this.isFinalLhu);
            lhuRows.forEach((lhu) => {
                if (lhu?.nomor_lhu && !allLhuMap.has(lhu.nomor_lhu)) {
                    allLhuMap.set(lhu.nomor_lhu, lhu);
                }
            });
            finalRows.forEach((lhu) => {
                if (lhu?.nomor_lhu && !finalLhuMap.has(lhu.nomor_lhu)) {
                    finalLhuMap.set(lhu.nomor_lhu, lhu);
                }
            });
            if (lhuRows.length === 0) {
                missingSamples.push(noSampel);
                return;
            }
            if (finalRows.length === 0) {
                notFinalSamples.push(noSampel);
            }
        });
        return {
            missingSamples,
            notFinalSamples,
            finalLhuRows: Array.from(finalLhuMap.values()),
            allLhuRows: Array.from(allLhuMap.values()),
        };
    };
    loadHolidaysForScheduleValidation = async () => {
        try {
            return await this.referenceService.getHariLibur();
        }
        catch (error) {
            const err = new Error(`Gagal memvalidasi tanggal merah: ${error.message || 'referensi hari libur tidak tersedia'}.`);
            err.statusCode = 503;
            throw err;
        }
    };
    validateScheduleDateOrThrow = async (value, label = 'Tanggal pengambilan') => {
        const holidays = await this.loadHolidaysForScheduleValidation();
        return assertScheduleBusinessDateOrThrow(value, label, holidays);
    };
    assertAllLhuFinalForRegistrasi = async (idRegistrasi, transaction) => {
        const requestId = String(idRegistrasi || '').trim();
        const fpplInstance = await Fppl.findOne({
            where: { id_registrasi: requestId },
            include: [
                {
                    model: FpplSampel,
                    as: 'fppl_sampels',
                    required: false,
                    include: [
                        {
                            model: Sampel,
                            as: 'sampels',
                            required: false,
                            include: [
                                {
                                    model: Lhu,
                                    as: 'lhus',
                                    required: false,
                                    through: { attributes: [] },
                                    attributes: ['nomor_lhu', 'id_registrasi', 'status_lhu'],
                                },
                            ],
                        },
                    ],
                },
            ],
            transaction,
            lock: transaction?.LOCK?.UPDATE,
        });
        if (!fpplInstance) {
            const err = new Error('Permohonan tidak ditemukan.');
            err.statusCode = 404;
            throw err;
        }
        const fppl = this.getPlain(fpplInstance);
        const fpplSampelRows = this.pickArray(fppl, ['fppl_sampels', 'FpplSampels', 'fppl_sampel', 'FpplSampel']);
        const sampleRows = fpplSampelRows.flatMap((row) => {
            const samples = this.pickArray(row, ['sampels', 'Sampels', 'sampel', 'Sampel']);
            return samples;
        });
        const totalSampel = sampleRows.length;
        if (totalSampel === 0) {
            const err = new Error('Permohonan belum memiliki sampel.');
            err.statusCode = 400;
            throw err;
        }
        const coverage = this.buildLhuCoverage(sampleRows);
        if (coverage.missingSamples.length > 0) {
            const err = new Error(`Masih ada sampel yang belum memiliki LHU: ${coverage.missingSamples.join(', ')}.`);
            err.statusCode = 400;
            throw err;
        }
        if (coverage.notFinalSamples.length > 0) {
            const err = new Error(`Masih ada sampel yang LHU-nya belum disahkan Kalab: ${coverage.notFinalSamples.join(', ')}.`);
            err.statusCode = 400;
            throw err;
        }
        return {
            fppl,
            totalSampel,
            totalLhu: coverage.finalLhuRows.length,
        };
    };
    getPickupQueue = async () => {
        const fpplInstances = await Fppl.findAll({
            include: [
                { model: Pelanggan, as: 'pelanggan', required: false },
                {
                    model: FpplSampel,
                    as: 'fppl_sampels',
                    required: false,
                    include: [
                        {
                            model: Sampel,
                            as: 'sampels',
                            required: false,
                            include: [
                                {
                                    model: Lhu,
                                    as: 'lhus',
                                    required: false,
                                    through: { attributes: [] },
                                    attributes: ['nomor_lhu', 'id_registrasi', 'status_lhu'],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: JadwalPengambilanLhu,
                    as: 'jadwal_pengambilan_lhu',
                    required: false,
                },
            ],
            order: [['tanggal_pendaftaran', 'DESC']],
        });
        const rows = [];
        for (const fpplInstance of fpplInstances) {
            const fppl = this.getPlain(fpplInstance);
            const pelanggan = this.pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
            const fpplSampelRows = this.pickArray(fppl, ['fppl_sampels', 'FpplSampels', 'fppl_sampel', 'FpplSampel']);
            const sampleRows = fpplSampelRows.flatMap((row) => {
                const samples = this.pickArray(row, ['sampels', 'Sampels', 'sampel', 'Sampel']);
                return samples;
            });
            if (String(fppl.status_fppl || '').trim() === RequestStatus.COMPLETED) {
                continue;
            }
            const totalSampel = sampleRows.length;
            if (totalSampel === 0)
                continue;
            const coverage = this.buildLhuCoverage(sampleRows);
            if (coverage.missingSamples.length > 0 || coverage.notFinalSamples.length > 0) {
                continue;
            }
            const schedule = this.pickObject(fppl, ['jadwal_pengambilan_lhu', 'JadwalPengambilanLhu']) || null;
            if (schedule && schedule.status_pengambilan === 'Sudah Diambil') {
                continue;
            }
            rows.push({
                id_registrasi: fppl.id_registrasi,
                nomor_fppl: fppl.nomor_fppl,
                pelanggan: pelanggan.nama_instansi || pelanggan.pic || '-',
                total_sampel: totalSampel,
                total_lhu: coverage.finalLhuRows.length,
                status_pengambilan: schedule?.status_pengambilan || 'Belum Dijadwalkan',
                tanggal_pengambilan: schedule?.tanggal_pengambilan || null,
                jam_pengambilan: schedule?.jam_pengambilan || null,
            });
        }
        return rows;
    };
    schedulePickup = async ({ idRegistrasi, tanggalPengambilan, jamPengambilan, catatan }, currentNik) => {
        const requestId = String(idRegistrasi || '').trim();
        const tanggal = normalizeDateOnly(tanggalPengambilan, 'Tanggal pengambilan LHU');
        const userNik = String(currentNik || '').trim();
        if (!requestId) {
            const err = new Error('ID registrasi wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        if (!jamPengambilan || !String(jamPengambilan).trim()) {
            const err = new Error('Jam pengambilan wajib diisi.');
            err.statusCode = 400;
            throw err;
        }
        if (!userNik) {
            const err = new Error('User admin tidak valid.');
            err.statusCode = 401;
            throw err;
        }
        await this.validateScheduleDateOrThrow(tanggal, 'Tanggal pengambilan LHU');
        const jam = this.normalizePickupTimeForDb(jamPengambilan);
        const result = await sequelize.transaction(async (transaction) => {
            await this.assertAllLhuFinalForRegistrasi(requestId, transaction);
            const existing = await JadwalPengambilanLhu.findOne({
                where: { id_registrasi: requestId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            const payload = {
                tanggal_pengambilan: tanggal,
                jam_pengambilan: jam,
                catatan: catatan ? String(catatan).trim() : null,
                status_pengambilan: 'Dijadwalkan',
                dijadwalkan_oleh: userNik,
                dijadwalkan_pada: new Date(),
                nama_pengambil: null,
                diambil_pada: null,
            };
            let saved;
            if (existing) {
                if (existing.status_pengambilan === 'Sudah Diambil') {
                    const err = new Error('Permohonan ini sudah ditandai sebagai sudah diambil.');
                    err.statusCode = 400;
                    throw err;
                }
                saved = await existing.update(payload, { transaction });
            }
            else {
                // Kolom jadwal_pengambilan_lhu.id_jadwal_lhu = varchar(10).
                // Prefix 'JPL-' memakai 4 karakter, jadi digit maksimal yang aman adalah 6.
                // Contoh hasil: JPL-000001, total 10 karakter.
                const newId = await generateId(JadwalPengambilanLhu, 'id_jadwal_lhu', 'JPL-', transaction, 6);
                saved = await JadwalPengambilanLhu.create({
                    id_jadwal_lhu: newId,
                    id_registrasi: requestId,
                    ...payload,
                }, { transaction });
            }
            await this.moveRequestToWaitingLhuPickup({
                idRegistrasi: requestId,
                actorNik: userNik,
                transaction,
            });
            const plain = this.getPlain(saved);
            return {
                id_jadwal_lhu: plain.id_jadwal_lhu,
                id_registrasi: plain.id_registrasi,
                tanggal_pengambilan: plain.tanggal_pengambilan,
                jam_pengambilan: plain.jam_pengambilan,
                status_pengambilan: plain.status_pengambilan,
                catatan: plain.catatan,
                dijadwalkan_oleh: plain.dijadwalkan_oleh,
                dijadwalkan_pada: plain.dijadwalkan_pada,
            };
        });
        // Kirim email di background agar respons simpan jadwal tidak tertahan proses SMTP.
        // Jika email gagal, jadwal tetap tersimpan dan error cukup dicatat di log server.
        setImmediate(() => {
            notificationService
                .notifyJadwalPengambilanLhu(result.id_jadwal_lhu)
                .catch((error) => {
                console.error('Gagal kirim email jadwal pengambilan LHU:', error);
            });
        });
        return result;
    };
    completePickup = async ({ idRegistrasi, namaPengambil }, currentNik) => {
        const requestId = String(idRegistrasi || '').trim();
        const name = String(namaPengambil || '').trim();
        const userNik = String(currentNik || '').trim();
        if (!requestId) {
            const err = new Error('ID registrasi wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        if (!name) {
            const err = new Error('Nama pengambil wajib diisi.');
            err.statusCode = 400;
            throw err;
        }
        if (!userNik) {
            const err = new Error('User admin tidak valid.');
            err.statusCode = 401;
            throw err;
        }
        return sequelize.transaction(async (transaction) => {
            await this.assertAllLhuFinalForRegistrasi(requestId, transaction);
            const fpplInstance = await Fppl.findByPk(requestId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!fpplInstance) {
                const err = new Error('Permohonan tidak ditemukan.');
                err.statusCode = 404;
                throw err;
            }
            const existing = await JadwalPengambilanLhu.findOne({
                where: { id_registrasi: requestId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!existing) {
                const err = new Error('Jadwal pengambilan belum dibuat.');
                err.statusCode = 400;
                throw err;
            }
            if (existing.status_pengambilan === 'Sudah Diambil') {
                const err = new Error('Permohonan ini sudah ditandai sebagai sudah diambil.');
                err.statusCode = 400;
                throw err;
            }
            if (!this.isActivePickupScheduleStatus(existing.status_pengambilan)) {
                const err = new Error('Pengambilan LHU harus dijadwalkan terlebih dahulu sebelum ditandai sudah diambil.');
                err.statusCode = 400;
                throw err;
            }
            const scheduledYmd = normalizeDateOnly(existing.tanggal_pengambilan, 'Tanggal pengambilan LHU');
            const todayYmd = this.getJakartaYmd();
            if (scheduledYmd > todayYmd) {
                const err = new Error('Pengambilan LHU belum dapat ditandai karena tanggal jadwal belum tercapai.');
                err.statusCode = 400;
                throw err;
            }
            const now = new Date();
            const saved = await existing.update({
                status_pengambilan: 'Sudah Diambil',
                nama_pengambil: name,
                diambil_pada: now,
            }, { transaction });
            const previousFpplStatus = fpplInstance.status_fppl;
            await fpplInstance.update({
                status_fppl: RequestStatus.COMPLETED,
            }, { transaction });
            await this.closePendingLhuScheduleChanges({
                idRegistrasi: requestId,
                idJadwalLhu: saved.id_jadwal_lhu,
                actorNik: userNik,
                transaction,
            });
            await WorkflowLogService.logStatusTransition({
                entityType: 'JADWAL_LHU',
                entityId: saved.id_jadwal_lhu,
                action: 'LHU_DIAMBIL_PELANGGAN',
                statusBefore: existing.status_pengambilan,
                statusAfter: 'Sudah Diambil',
                source: 'Admin',
                note: name ? `LHU diambil oleh ${name}.` : 'LHU diambil pelanggan.',
                actorNik: userNik,
                transaction,
            });
            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: fpplInstance.id_registrasi,
                action: 'MENYELESAIKAN_PERMOHONAN',
                statusBefore: previousFpplStatus,
                statusAfter: RequestStatus.COMPLETED,
                source: 'Admin',
                note: 'Permohonan selesai setelah LHU diambil.',
                actorNik: userNik,
                transaction,
            });
            const plain = this.getPlain(saved);
            return {
                id_registrasi: plain.id_registrasi,
                status_fppl: fpplInstance.status_fppl,
                status_pengambilan: plain.status_pengambilan,
                nama_pengambil: plain.nama_pengambil,
                diambil_pada: plain.diambil_pada,
            };
        });
    };
}
module.exports = new LhuPickupService();
module.exports.LhuPickupService = LhuPickupService;
