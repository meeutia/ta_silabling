const { Op } = require('sequelize');
const { sequelize, Fppl, Pelanggan, JadwalSampel, JadwalPengambilanLhu, PengajuanPerubahanJadwal, Pegawai, } = require('../../models/Associations');
const { generateId } = require('../../utils/id-generator');
const Roles = require('../../constants/roles');
const RequestStatus = require('../../constants/request-status');
const { SCHEDULE_CHANGE_STATUS, SCHEDULE_STATUS } = require('../../constants/workflow-status.constant');
const WorkflowGuard = require('../workflow/workflow-guard.service');
const notificationService = require('../notification/notification.service');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { getHariLibur } = require('../../utils/holiday-calendar.util');
const { assertBusinessDateOrThrow: assertScheduleBusinessDateOrThrow, normalizeDateOnly, normalizeTimeForDb: normalizeScheduleTimeForDb, } = require('../../utils/schedule-policy.util');
const STATUS_PENDING = SCHEDULE_CHANGE_STATUS.PENDING;
const STATUS_APPROVED = SCHEDULE_CHANGE_STATUS.APPROVED;
const STATUS_REJECTED = SCHEDULE_CHANGE_STATUS.REJECTED;
const STATUS_CANCELLED = SCHEDULE_CHANGE_STATUS.CANCELLED_BY_CUSTOMER;
const SAMPLE_STATUS_SCHEDULED = 'Terjadwal';
const SAMPLE_STATUS_APPROVED_CUSTOMER = 'Disetujui Pelanggan';
const SAMPLE_STATUS_APPROVED_ADMIN = 'Disetujui Admin';
const SAMPLE_STATUS_DONE = 'Selesai';
const SAMPLE_STATUS_CANCELLED = 'Dibatalkan';
const LHU_STATUS_SCHEDULED = 'Dijadwalkan';
const LHU_STATUS_APPROVED_CUSTOMER = 'Disetujui Pelanggan';
const LHU_STATUS_APPROVED_ADMIN = 'Disetujui Admin';
const LHU_STATUS_DONE = SCHEDULE_STATUS.PICKED_UP;
const LHU_STATUS_CANCELLED = 'Dibatalkan';
const SAMPLE_APPROVED_STATUSES = [SAMPLE_STATUS_APPROVED_CUSTOMER];
const LHU_APPROVED_STATUSES = [LHU_STATUS_APPROVED_CUSTOMER];
class ScheduleChangeService {
    constructor({ notificationService: injectedNotificationService = notificationService } = {}) {
        this.notificationService = injectedNotificationService;
        this.STATUS_PENDING = STATUS_PENDING;
        this.STATUS_APPROVED = STATUS_APPROVED;
        this.STATUS_REJECTED = STATUS_REJECTED;
        this.STATUS_CANCELLED = STATUS_CANCELLED;
        this.SAMPLE_STATUS_SCHEDULED = SAMPLE_STATUS_SCHEDULED;
        this.SAMPLE_STATUS_APPROVED_CUSTOMER = SAMPLE_STATUS_APPROVED_CUSTOMER;
        this.SAMPLE_STATUS_APPROVED_ADMIN = SAMPLE_STATUS_APPROVED_ADMIN;
        this.LHU_STATUS_SCHEDULED = LHU_STATUS_SCHEDULED;
        this.LHU_STATUS_APPROVED_CUSTOMER = LHU_STATUS_APPROVED_CUSTOMER;
        this.LHU_STATUS_APPROVED_ADMIN = LHU_STATUS_APPROVED_ADMIN;
    }
    sendScheduleChangeNotification = async (label, callback) => {
        try {
            await callback();
        }
        catch (error) {
            console.error(`Gagal mengirim notifikasi ${label}:`, error);
        }
    };
    getPlain = (instance) => {
        if (!instance)
            return null;
        if (typeof instance.get === 'function')
            return instance.get({ plain: true });
        return instance;
    };
    mapFpplSummary = (fppl = {}) => {
        const row = this.getPlain(fppl) || {};
        const pelanggan = this.getPlain(row.pelanggan || row.Pelanggan) || {};
        return {
            idRegistrasi: row.id_registrasi || null,
            nomorFppl: row.nomor_fppl || null,
            statusFppl: row.status_fppl || null,
            pelanggan: {
                namaInstansi: pelanggan.nama_instansi || null,
                pic: pelanggan.pic || null,
                noTelp: pelanggan.no_telp || null,
            },
        };
    };

    mapSampleSchedule = (schedule = {}) => {
        const row = this.getPlain(schedule) || {};
        const pegawai = this.getPlain(row.pegawai_pcc || row.Pegawai) || {};
        return {
            idJadwal: row.id_jadwal || null,
            idRegistrasi: row.id_registrasi || null,
            tanggalJadwal: row.tanggal_jadwal || null,
            jamJadwal: row.jam_jadwal || null,
            idPegawaiPcc: row.id_pegawai_pcc || null,
            dibuatOleh: row.dibuat_oleh || null,
            dibuatPada: row.dibuat_pada || null,
            statusJadwal: row.status_jadwal || null,
            pegawaiPcc: pegawai.id_pegawai ? {
                idPegawai: pegawai.id_pegawai,
                namaPegawai: pegawai.nama_pegawai || null,
            } : null,
        };
    };

    mapLhuSchedule = (schedule = {}) => {
        const row = this.getPlain(schedule) || {};
        return {
            idJadwalLhu: row.id_jadwal_lhu || null,
            idRegistrasi: row.id_registrasi || null,
            tanggalPengambilan: row.tanggal_pengambilan || null,
            jamPengambilan: row.jam_pengambilan || null,
            statusPengambilan: row.status_pengambilan || null,
            catatan: row.catatan || null,
            dijadwalkanOleh: row.dijadwalkan_oleh || null,
            dijadwalkanPada: row.dijadwalkan_pada || null,
            namaPengambil: row.nama_pengambil || null,
            diambilPada: row.diambil_pada || null,
            createdAt: row.created_at || null,
            updatedAt: row.updated_at || null,
        };
    };

    mapScheduleChangeResponse = (data = {}) => {
        const row = this.getPlain(data) || {};
        return {
            idPengajuanJadwal: row.id_pengajuan_jadwal || null,
            jenisJadwal: row.jenis_jadwal || null,
            idRegistrasi: row.id_registrasi || null,
            idJadwalSampel: row.id_jadwal_sampel || null,
            idJadwalLhu: row.id_jadwal_lhu || null,
            tanggalSebelumnya: row.tanggal_sebelumnya || null,
            jamSebelumnya: row.jam_sebelumnya || null,
            tanggalUsulan: row.tanggal_usulan || null,
            jamUsulan: row.jam_usulan || null,
            alasanPengajuan: row.alasan_pengajuan || null,
            statusPengajuan: row.status_pengajuan || null,
            catatanAdmin: row.catatan_admin || null,
            diajukanPada: row.diajukan_pada || null,
            createdAt: row.created_at || null,
            updatedAt: row.updated_at || null,
            fppl: row.fppl || row.Fppl ? this.mapFpplSummary(row.fppl || row.Fppl) : null,
            jadwalSampel: row.jadwal_sampel || row.JadwalSampel ? this.mapSampleSchedule(row.jadwal_sampel || row.JadwalSampel) : null,
            jadwalPengambilanLhu: row.jadwal_pengambilan_lhu || row.JadwalPengambilanLhu ? this.mapLhuSchedule(row.jadwal_pengambilan_lhu || row.JadwalPengambilanLhu) : null,
        };
    };
    normalizeText = (value) => {
        return String(value || '').trim();
    };
    isCompletedRequestStatus = (status) => {
        return this.normalizeText(status) === RequestStatus.COMPLETED;
    };
    isSampleScheduleClosed = (schedule = {}) => {
        return this.normalizeText(schedule?.status_jadwal) === SAMPLE_STATUS_DONE;
    };
    isLhuScheduleClosed = (schedule = {}) => {
        return WorkflowGuard.isLhuPickedUp(schedule);
    };
    autoRejectClosedScheduleChange = async (row, transaction, actorNik = null) => {
        const previousStatus = row.status_pengajuan;
        const note = row.jenis_jadwal === 'LHU'
            ? 'Pengajuan otomatis ditolak karena LHU sudah diambil/permohonan sudah selesai.'
            : 'Pengajuan otomatis ditolak karena jadwal sampel sudah selesai.';
        const updated = await row.update({
            status_pengajuan: STATUS_REJECTED,
            catatan_admin: note,
        }, { transaction });
        await WorkflowLogService.logStatusTransition({
            entityType: 'PENGAJUAN_JADWAL',
            entityId: row.id_pengajuan_jadwal,
            action: 'MENUTUP_PERUBAHAN_JADWAL_OTOMATIS',
            statusBefore: previousStatus,
            statusAfter: STATUS_REJECTED,
            source: 'Sistem',
            note,
            actorNik,
            transaction,
        });
        return {
            ...this.mapScheduleChangeResponse(updated),
            autoRejected: true,
            message: note,
        };
    };
    normalizeScheduleKind = (value) => {
        const text = String(value || '').trim().toUpperCase();
        if (['SAMPEL', 'SAMPLE', 'SAMPLING'].includes(text))
            return 'SAMPEL';
        if (['LHU', 'PENGAMBILAN_LHU', 'LHU_PICKUP'].includes(text))
            return 'LHU';
        return '';
    };
    loadHolidaysForScheduleValidation = async () => {
        try {
            return await getHariLibur();
        }
        catch (error) {
            const err = new Error(`Gagal memvalidasi tanggal merah: ${error.message || 'referensi hari libur tidak tersedia'}.`);
            err.statusCode = 503;
            throw err;
        }
    };
    validateScheduleDateOrThrow = async (value, label = 'Tanggal usulan') => {
        const holidays = await this.loadHolidaysForScheduleValidation();
        return assertScheduleBusinessDateOrThrow(value, label, holidays);
    };
    assertCustomerOwnsRequest = async (idRegistrasi, currentNik, transaction) => {
        const request = await Fppl.findByPk(idRegistrasi, {
            include: [{ model: Pelanggan, as: 'pelanggan', attributes: ['id_pelanggan', 'nik'] }],
            transaction,
            lock: transaction?.LOCK?.UPDATE,
        });
        if (!request) {
            const err = new Error('Permohonan tidak ditemukan.');
            err.statusCode = 404;
            throw err;
        }
        const pelanggan = request.pelanggan || request.Pelanggan;
        if (!pelanggan || pelanggan.nik !== currentNik) {
            const err = new Error('Anda tidak memiliki akses ke permohonan ini.');
            err.statusCode = 403;
            throw err;
        }
        return request;
    };
    findActiveSchedule = async ({ idRegistrasi, jenisJadwal, transaction, lock = false }) => {
        if (jenisJadwal === 'SAMPEL') {
            return JadwalSampel.findOne({
                where: {
                    id_registrasi: idRegistrasi,
                    status_jadwal: { [Op.ne]: SAMPLE_STATUS_CANCELLED },
                },
                order: [['dibuat_pada', 'DESC'], ['id_jadwal', 'DESC']],
                transaction,
                lock: lock ? transaction?.LOCK?.UPDATE : undefined,
            });
        }
        return JadwalPengambilanLhu.findOne({
            where: {
                id_registrasi: idRegistrasi,
                status_pengambilan: { [Op.ne]: LHU_STATUS_CANCELLED },
            },
            order: [['dijadwalkan_pada', 'DESC'], ['id_jadwal_lhu', 'DESC']],
            transaction,
            lock: lock ? transaction?.LOCK?.UPDATE : undefined,
        });
    };
    confirmScheduleApproval = async (requestData = {}, currentNik) => {
        const requestId = String(requestData.idRegistrasi || '').trim();
        const jenisJadwal = this.normalizeScheduleKind(requestData.jenisJadwal || requestData.type);
        const userNik = String(currentNik || '').trim();
        if (!requestId) {
            const err = new Error('ID registrasi wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        if (!jenisJadwal) {
            const err = new Error('Jenis jadwal harus SAMPEL atau LHU.');
            err.statusCode = 400;
            throw err;
        }
        if (!userNik) {
            const err = new Error('User pelanggan tidak valid. Silakan login ulang.');
            err.statusCode = 401;
            throw err;
        }
        return sequelize.transaction(async (transaction) => {
            await this.assertCustomerOwnsRequest(requestId, userNik, transaction);
            const schedule = await this.findActiveSchedule({
                idRegistrasi: requestId,
                jenisJadwal,
                transaction,
                lock: true,
            });
            if (!schedule) {
                const err = new Error(jenisJadwal === 'SAMPEL'
                    ? 'Jadwal pengambilan/pengantaran sampel belum dibuat admin.'
                    : 'Jadwal pengambilan LHU belum dibuat admin.');
                err.statusCode = 404;
                throw err;
            }
            if (jenisJadwal === 'SAMPEL' && schedule.status_jadwal === SAMPLE_STATUS_DONE) {
                const err = new Error('Jadwal sampel sudah selesai.');
                err.statusCode = 400;
                throw err;
            }
            if (jenisJadwal === 'LHU' && schedule.status_pengambilan === LHU_STATUS_DONE) {
                const err = new Error('LHU sudah diambil.');
                err.statusCode = 400;
                throw err;
            }
            if (jenisJadwal === 'SAMPEL') {
                if (SAMPLE_APPROVED_STATUSES.includes(schedule.status_jadwal)) {
                    return this.mapSampleSchedule(schedule);
                }
                const previousStatus = schedule.status_jadwal;
                const updated = await schedule.update({ status_jadwal: SAMPLE_STATUS_APPROVED_CUSTOMER }, { transaction });
                await WorkflowLogService.logStatusTransition({
                    entityType: 'JADWAL_SAMPEL',
                    entityId: schedule.id_jadwal,
                    action: 'MENYETUJUI_JADWAL_SAMPEL_PELANGGAN',
                    statusBefore: previousStatus,
                    statusAfter: SAMPLE_STATUS_APPROVED_CUSTOMER,
                    source: 'Pelanggan',
                    note: 'Pelanggan menyetujui jadwal sampel.',
                    actorNik: userNik,
                    transaction,
                });
                return this.mapSampleSchedule(updated);
            }
            if (LHU_APPROVED_STATUSES.includes(schedule.status_pengambilan)) {
                return this.mapLhuSchedule(schedule);
            }
            const previousStatus = schedule.status_pengambilan;
            const updated = await schedule.update({ status_pengambilan: LHU_STATUS_APPROVED_CUSTOMER }, { transaction });
            await WorkflowLogService.logStatusTransition({
                entityType: 'JADWAL_LHU',
                entityId: schedule.id_jadwal_lhu,
                action: 'MENYETUJUI_JADWAL_LHU_PELANGGAN',
                statusBefore: previousStatus,
                statusAfter: LHU_STATUS_APPROVED_CUSTOMER,
                source: 'Pelanggan',
                note: 'Pelanggan menyetujui jadwal pengambilan LHU.',
                actorNik: userNik,
                transaction,
            });
            return this.mapLhuSchedule(updated);
        });
    };
    createScheduleChangeRequest = async (requestData = {}, currentNik) => {
        const requestId = String(requestData.idRegistrasi || '').trim();
        const jenisJadwal = this.normalizeScheduleKind(requestData.jenisJadwal || requestData.type);
        let tanggalUsulan = normalizeDateOnly(requestData.tanggalUsulan, 'Tanggal usulan');
        const jamUsulan = normalizeScheduleTimeForDb(requestData.jamUsulan, 'Jam usulan');
        const alasanPengajuan = String(requestData.alasanPengajuan || requestData.alasan || '').trim();
        const userNik = String(currentNik || '').trim();
        if (!requestId) {
            const err = new Error('ID registrasi wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        if (!jenisJadwal) {
            const err = new Error('Jenis jadwal harus SAMPEL atau LHU.');
            err.statusCode = 400;
            throw err;
        }
        if (!alasanPengajuan) {
            const err = new Error('Alasan perubahan jadwal wajib diisi.');
            err.statusCode = 400;
            throw err;
        }
        if (!userNik) {
            const err = new Error('User pelanggan tidak valid. Silakan login ulang.');
            err.statusCode = 401;
            throw err;
        }
        tanggalUsulan = await this.validateScheduleDateOrThrow(tanggalUsulan, 'Tanggal usulan');
        const created = await sequelize.transaction(async (transaction) => {
            await this.assertCustomerOwnsRequest(requestId, userNik, transaction);
            const schedule = await this.findActiveSchedule({
                idRegistrasi: requestId,
                jenisJadwal,
                transaction,
                lock: true,
            });
            if (!schedule) {
                const err = new Error(jenisJadwal === 'SAMPEL'
                    ? 'Jadwal pengambilan/pengantaran sampel belum dibuat admin.'
                    : 'Jadwal pengambilan LHU belum dibuat admin.');
                err.statusCode = 400;
                throw err;
            }
            if (jenisJadwal === 'SAMPEL' && schedule.status_jadwal === SAMPLE_STATUS_DONE) {
                const err = new Error('Jadwal sampel sudah selesai dan tidak dapat diajukan ulang.');
                err.statusCode = 400;
                throw err;
            }
            if (jenisJadwal === 'LHU' && schedule.status_pengambilan === LHU_STATUS_DONE) {
                const err = new Error('LHU sudah diambil dan jadwal tidak dapat diajukan ulang.');
                err.statusCode = 400;
                throw err;
            }
            const scheduleAlreadyApproved = jenisJadwal === 'SAMPEL'
                ? SAMPLE_APPROVED_STATUSES.includes(schedule.status_jadwal)
                : LHU_APPROVED_STATUSES.includes(schedule.status_pengambilan);
            if (scheduleAlreadyApproved) {
                const err = new Error('Jadwal sudah disetujui dan tidak dapat diajukan ulang. Hubungi admin jika perlu perubahan lanjutan.');
                err.statusCode = 400;
                throw err;
            }
            const scheduleWhere = jenisJadwal === 'SAMPEL'
                ? { id_jadwal_sampel: schedule.id_jadwal }
                : { id_jadwal_lhu: schedule.id_jadwal_lhu };
            const pending = await PengajuanPerubahanJadwal.findOne({
                where: {
                    jenis_jadwal: jenisJadwal,
                    id_registrasi: requestId,
                    status_pengajuan: STATUS_PENDING,
                    ...scheduleWhere,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (pending) {
                const err = new Error('Masih ada pengajuan perubahan jadwal yang menunggu persetujuan admin.');
                err.statusCode = 400;
                throw err;
            }
            const idPengajuan = await generateId(PengajuanPerubahanJadwal, 'id_pengajuan_jadwal', 'PJG-', transaction, 8);
            const created = await PengajuanPerubahanJadwal.create({
                id_pengajuan_jadwal: idPengajuan,
                jenis_jadwal: jenisJadwal,
                id_registrasi: requestId,
                id_jadwal_sampel: jenisJadwal === 'SAMPEL' ? schedule.id_jadwal : null,
                id_jadwal_lhu: jenisJadwal === 'LHU' ? schedule.id_jadwal_lhu : null,
                tanggal_sebelumnya: jenisJadwal === 'SAMPEL' ? schedule.tanggal_jadwal : schedule.tanggal_pengambilan,
                jam_sebelumnya: jenisJadwal === 'SAMPEL' ? schedule.jam_jadwal : schedule.jam_pengambilan,
                tanggal_usulan: tanggalUsulan,
                jam_usulan: jamUsulan,
                alasan_pengajuan: alasanPengajuan,
                status_pengajuan: STATUS_PENDING,
                diajukan_pada: new Date(),
            }, { transaction });
            await WorkflowLogService.logStatusTransition({
                entityType: 'PENGAJUAN_JADWAL',
                entityId: created.id_pengajuan_jadwal,
                action: 'MENGAJUKAN_PERUBAHAN_JADWAL',
                statusBefore: null,
                statusAfter: STATUS_PENDING,
                source: 'Pelanggan',
                note: alasanPengajuan,
                actorNik: userNik,
                transaction,
            });
            return this.mapScheduleChangeResponse(created);
        });
        await this.sendScheduleChangeNotification('pengajuan perubahan jadwal ke admin', () => this.notificationService.notifyScheduleChangeSubmittedToAdmin({
            idPengajuanJadwal: created.idPengajuanJadwal,
        }));
        return created;
    };
    listScheduleChangeRequests = async ({ status, jenisJadwal } = {}) => {
        const where = {};
        const normalizedKind = this.normalizeScheduleKind(jenisJadwal);
        if (normalizedKind)
            where.jenis_jadwal = normalizedKind;
        if (status)
            where.status_pengajuan = String(status).trim();
        const rows = await PengajuanPerubahanJadwal.findAll({
            where,
            include: [
                { model: Fppl, as: 'fppl', attributes: ['id_registrasi', 'nomor_fppl', 'status_fppl'], include: [{ model: Pelanggan, as: 'pelanggan', attributes: ['nama_instansi', 'pic', 'no_telp'] }] },
                { model: JadwalSampel, as: 'jadwal_sampel', required: false, include: [{ model: Pegawai, as: 'pegawai_pcc', attributes: ['id_pegawai', 'nama_pegawai'], required: false }] },
                { model: JadwalPengambilanLhu, as: 'jadwal_pengambilan_lhu', required: false },
            ],
            order: [['diajukan_pada', 'DESC']],
        });
        return rows
            .map(this.getPlain)
            .filter((row) => {
            if (row.status_pengajuan !== STATUS_PENDING)
                return true;
            if (this.isCompletedRequestStatus(row.fppl?.status_fppl || row.Fppl?.status_fppl))
                return false;
            if (row.jenis_jadwal === 'SAMPEL') {
                return !this.isSampleScheduleClosed(row.jadwal_sampel || row.JadwalSampel);
            }
            if (row.jenis_jadwal === 'LHU') {
                return !this.isLhuScheduleClosed(row.jadwal_pengambilan_lhu || row.JadwalPengambilanLhu);
            }
            return true;
        })
            .map(this.mapScheduleChangeResponse);
    };
    decideScheduleChangeRequest = async (idPengajuan, requestData = {}, currentNik) => {
        const pengajuanId = String(idPengajuan || requestData.idPengajuanJadwal || '').trim();
        const action = String(requestData.action || '').trim().toLowerCase();
        const catatanAdmin = String(requestData.catatanAdmin || requestData.catatan || '').trim() || null;
        const userNik = String(currentNik || '').trim();
        if (!pengajuanId) {
            const err = new Error('ID pengajuan jadwal wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        if (!['approve', 'reject'].includes(action)) {
            const err = new Error('Action harus approve atau reject.');
            err.statusCode = 400;
            throw err;
        }
        if (action === 'reject' && !catatanAdmin) {
            const err = new Error('Catatan penolakan wajib diisi.');
            err.statusCode = 400;
            throw err;
        }
        const decided = await sequelize.transaction(async (transaction) => {
            const row = await PengajuanPerubahanJadwal.findByPk(pengajuanId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!row) {
                const err = new Error('Pengajuan perubahan jadwal tidak ditemukan.');
                err.statusCode = 404;
                throw err;
            }
            if (row.status_pengajuan !== STATUS_PENDING) {
                const err = new Error('Pengajuan perubahan jadwal ini sudah diproses.');
                err.statusCode = 400;
                throw err;
            }
            const request = await Fppl.findByPk(row.id_registrasi, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!request) {
                const err = new Error('Permohonan tidak ditemukan.');
                err.statusCode = 404;
                throw err;
            }
            if (this.isCompletedRequestStatus(request.status_fppl)) {
                return this.autoRejectClosedScheduleChange(row, transaction, userNik);
            }
            const now = new Date();
            if (action === 'approve') {
                await this.validateScheduleDateOrThrow(row.tanggal_usulan, 'Tanggal usulan');
                normalizeScheduleTimeForDb(row.jam_usulan, 'Jam usulan');
            }
            if (action === 'reject') {
                const previousStatus = row.status_pengajuan;
                const updated = await row.update({
                    status_pengajuan: STATUS_REJECTED,
                    catatan_admin: catatanAdmin,
                }, { transaction });
                await WorkflowLogService.logStatusTransition({
                    entityType: 'PENGAJUAN_JADWAL',
                    entityId: row.id_pengajuan_jadwal,
                    action: 'MENOLAK_PERUBAHAN_JADWAL',
                    statusBefore: previousStatus,
                    statusAfter: STATUS_REJECTED,
                    source: 'Admin',
                    note: catatanAdmin,
                    actorNik: userNik,
                    transaction,
                });
                return this.mapScheduleChangeResponse(updated);
            }
            if (row.jenis_jadwal === 'SAMPEL') {
                const schedule = await JadwalSampel.findByPk(row.id_jadwal_sampel, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!schedule) {
                    const err = new Error('Jadwal sampel tidak ditemukan.');
                    err.statusCode = 404;
                    throw err;
                }
                if (this.isSampleScheduleClosed(schedule)) {
                    return this.autoRejectClosedScheduleChange(row, transaction, userNik);
                }
                const previousScheduleStatus = schedule.status_jadwal;
                await schedule.update({
                    tanggal_jadwal: row.tanggal_usulan,
                    jam_jadwal: row.jam_usulan,
                    status_jadwal: SAMPLE_STATUS_APPROVED_ADMIN,
                    dibuat_pada: now,
                }, { transaction });
                await WorkflowLogService.logStatusTransition({
                    entityType: 'JADWAL_SAMPEL',
                    entityId: schedule.id_jadwal,
                    action: 'MENYETUJUI_PERUBAHAN_JADWAL_SAMPEL',
                    statusBefore: previousScheduleStatus,
                    statusAfter: SAMPLE_STATUS_APPROVED_ADMIN,
                    source: 'Admin',
                    note: catatanAdmin || 'Perubahan jadwal sampel disetujui admin.',
                    actorNik: userNik,
                    transaction,
                });
            }
            else {
                const schedule = await JadwalPengambilanLhu.findByPk(row.id_jadwal_lhu, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!schedule) {
                    const err = new Error('Jadwal pengambilan LHU tidak ditemukan.');
                    err.statusCode = 404;
                    throw err;
                }
                if (this.isLhuScheduleClosed(schedule)) {
                    return this.autoRejectClosedScheduleChange(row, transaction, userNik);
                }
                const previousScheduleStatus = schedule.status_pengambilan;
                await schedule.update({
                    tanggal_pengambilan: row.tanggal_usulan,
                    jam_pengambilan: row.jam_usulan,
                    status_pengambilan: LHU_STATUS_APPROVED_ADMIN,
                    dijadwalkan_oleh: userNik,
                    dijadwalkan_pada: now,
                    nama_pengambil: null,
                    diambil_pada: null,
                }, { transaction });
                await WorkflowLogService.logStatusTransition({
                    entityType: 'JADWAL_LHU',
                    entityId: schedule.id_jadwal_lhu,
                    action: 'MENYETUJUI_PERUBAHAN_JADWAL_LHU',
                    statusBefore: previousScheduleStatus,
                    statusAfter: LHU_STATUS_APPROVED_ADMIN,
                    source: 'Admin',
                    note: catatanAdmin || 'Perubahan jadwal pengambilan LHU disetujui admin.',
                    actorNik: userNik,
                    transaction,
                });
            }
            const previousPengajuanStatus = row.status_pengajuan;
            const updated = await row.update({
                status_pengajuan: STATUS_APPROVED,
                catatan_admin: catatanAdmin,
            }, { transaction });
            await WorkflowLogService.logStatusTransition({
                entityType: 'PENGAJUAN_JADWAL',
                entityId: row.id_pengajuan_jadwal,
                action: 'MENYETUJUI_PERUBAHAN_JADWAL',
                statusBefore: previousPengajuanStatus,
                statusAfter: STATUS_APPROVED,
                source: 'Admin',
                note: catatanAdmin,
                actorNik: userNik,
                transaction,
            });
            return this.mapScheduleChangeResponse(updated);
        });
        if (action === 'approve') {
            await this.sendScheduleChangeNotification('persetujuan perubahan jadwal ke pelanggan', () => this.notificationService.notifyScheduleChangeApprovedToCustomer({
                idPengajuanJadwal: decided.idPengajuanJadwal,
            }));
        }
        else {
            await this.sendScheduleChangeNotification('penolakan perubahan jadwal ke pelanggan', () => this.notificationService.notifyScheduleChangeRejectedToCustomer({
                idPengajuanJadwal: decided.idPengajuanJadwal,
            }));
        }
        return decided;
    };
    cancelScheduleChangeRequest = async (idPengajuan, currentNik, role) => {
        const pengajuanId = String(idPengajuan || '').trim();
        const userNik = String(currentNik || '').trim();
        return sequelize.transaction(async (transaction) => {
            const row = await PengajuanPerubahanJadwal.findByPk(pengajuanId, {
                include: [{ model: Fppl, as: 'fppl', include: [{ model: Pelanggan, as: 'pelanggan', attributes: ['nik'] }] }],
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!row) {
                const err = new Error('Pengajuan perubahan jadwal tidak ditemukan.');
                err.statusCode = 404;
                throw err;
            }
            if (row.status_pengajuan !== STATUS_PENDING) {
                const err = new Error('Pengajuan yang sudah diproses tidak dapat dibatalkan.');
                err.statusCode = 400;
                throw err;
            }
            const ownerNik = row.fppl?.pelanggan?.nik || row.fppl?.Pelanggan?.nik;
            if (role === Roles.CUSTOMER && ownerNik !== userNik) {
                const err = new Error('Anda tidak memiliki akses ke pengajuan ini.');
                err.statusCode = 403;
                throw err;
            }
            const previousStatus = row.status_pengajuan;
            const updated = await row.update({ status_pengajuan: STATUS_CANCELLED }, { transaction });
            await WorkflowLogService.logStatusTransition({
                entityType: 'PENGAJUAN_JADWAL',
                entityId: row.id_pengajuan_jadwal,
                action: 'MEMBATALKAN_PERUBAHAN_JADWAL',
                statusBefore: previousStatus,
                statusAfter: STATUS_CANCELLED,
                source: role === Roles.CUSTOMER ? 'Pelanggan' : 'Admin',
                note: 'Pengajuan perubahan jadwal dibatalkan.',
                actorNik: userNik,
                transaction,
            });
            return this.mapScheduleChangeResponse(updated);
        });
    };
}
module.exports = new ScheduleChangeService();
module.exports.ScheduleChangeService = ScheduleChangeService;
