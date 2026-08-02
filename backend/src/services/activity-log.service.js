const { Op } = require('sequelize');
const { AktivitasSistemLog, Fppl, Pelanggan, Invoice, Payment, JadwalSampel, JadwalPengambilanLhu, PengajuanPerubahanJadwal, Sampel, FpplSampel, Penugasan, PenugasanDetail, PenugasanItem, Lka, LkaRevisi, Lhu, } = require('../models/Associations');
const { generateId } = require('../utils/id-generator');
const { WORKFLOW_SOURCE } = require('../constants/workflow-status.constant');
const ALLOWED_LOG_SOURCES = new Set(Object.values(WORKFLOW_SOURCE));
class ActivityLogService {
    normalizeNullable = (value) => {
        if (value === undefined || value === '')
            return null;
        return value;
    };
    safeString = (value, maxLength = 50) => {
        if (value === null || value === undefined)
            return null;
        return String(value).slice(0, maxLength);
    };
    normalizeLogSource = (value) => {
        const source = this.normalizeNullable(value) || WORKFLOW_SOURCE.SYSTEM;
        return ALLOWED_LOG_SOURCES.has(source) ? source : WORKFLOW_SOURCE.SYSTEM;
    };
    normalizeActorNik = (value, source = WORKFLOW_SOURCE.SYSTEM) => {
        if (source === WORKFLOW_SOURCE.SYSTEM)
            return null;
        const actorNik = this.safeString(this.normalizeNullable(value), 16);
        if (!actorNik)
            return null;
        return ['SYSTEM', 'SISTEM'].includes(actorNik.toUpperCase()) ? null : actorNik;
    };
    isValidDateValue = (value) => {
        if (!value)
            return false;
        const date = new Date(value);
        return Number.isFinite(date.getTime());
    };
    toDateOrNull = (value) => {
        return (this.isValidDateValue(value) ? new Date(value) : null);
    };
    mapSourceByStatus = (status) => {
        if (status === 'Dibatalkan Pelanggan')
            return 'Pelanggan';
        if (status === 'Ditolak Admin')
            return 'Admin';
        if (status === 'Ditolak Kasi')
            return 'Kasi';
        if (status === 'Ditolak Penyelia')
            return 'Penyelia';
        return 'Sistem';
    };
    mapActionByFpplStatus = (status) => {
        if (status === 'Dibatalkan Pelanggan')
            return 'MEMBATALKAN_PERMOHONAN_PELANGGAN';
        if (status === 'Ditolak Admin')
            return 'MENOLAK_PERMOHONAN_ADMIN';
        if (status === 'Ditolak Kasi')
            return 'MENOLAK_PERMOHONAN_KASI';
        if (status === 'Ditolak Penyelia')
            return 'MENOLAK_PERMOHONAN_PENYELIA';
        return 'MEMPERBARUI_STATUS_PERMOHONAN';
    };
    plain = (row) => {
        return row ? row.get({ plain: true }) : null;
    };
    plainRows = (rows = []) => {
        return rows.map(this.plain).filter(Boolean);
    };
    tx = (options = {}) => {
        return options.transaction || undefined;
    };
    safeFindAll = async (label, finder) => {
        try {
            return await finder();
        }
        catch (error) {
            console.warn(`[activity-log] Gagal membaca ${label}:`, error.message);
            return [];
        }
    };
    createActivityLog = async (requestData = {}, options = {}) => {
        const transaction = options.transaction || null;
        try {
            if (!requestData.entityType || !requestData.entityId || !requestData.action)
                return null;
            const idLog = await generateId(AktivitasSistemLog, 'id_aktivitas_log', 'LOG-', transaction, 9);
            const source = this.normalizeLogSource(requestData.source);
            const actorNik = this.normalizeActorNik(requestData.actorNik, source);
            const row = await AktivitasSistemLog.create({
                id_aktivitas_log: idLog,
                entity_type: this.safeString(requestData.entityType, 30),
                entity_id: this.safeString(requestData.entityId, 30),
                aksi: this.safeString(requestData.action, 50),
                status_sebelumnya: this.safeString(this.normalizeNullable(requestData.statusBefore), 50),
                status_baru: this.safeString(this.normalizeNullable(requestData.statusAfter), 50),
                sumber_aksi: source,
                catatan: this.normalizeNullable(requestData.note),
                dibuat_oleh: actorNik,
                dibuat_pada: requestData.createdAt || new Date(),
            }, { transaction });
            return row;
        }
        catch (error) {
            console.warn('[activity-log] Gagal menulis log aktivitas:', error.message);
            return null;
        }
    };
    createActivityLogIfMissing = async (requestData = {}, options = {}) => {
        const transaction = options.transaction || null;
        try {
            if (!requestData.entityType || !requestData.entityId || !requestData.action)
                return null;
            const where = {
                entity_type: this.safeString(requestData.entityType, 30),
                entity_id: this.safeString(requestData.entityId, 30),
                aksi: this.safeString(requestData.action, 50),
            };
            const existing = await AktivitasSistemLog.findOne({ where, transaction });
            if (existing)
                return existing;
            return this.createActivityLog(requestData, { transaction });
        }
        catch (error) {
            console.warn('[activity-log] Gagal memastikan log aktivitas:', error.message);
            return null;
        }
    };
    logStatusChange = async ({ entityType = 'FPPL', entityId, action, statusBefore = null, statusAfter = null, source = 'Sistem', note = null, actorNik = null, createdAt = null, transaction = null, }) => {
        return this.createActivityLog({
            entityType,
            entityId,
            action,
            statusBefore,
            statusAfter,
            source,
            note,
            actorNik,
            createdAt,
        }, { transaction });
    };
    getLogsForEntity = async (entityType, entityId, options = {}) => {
        try {
            const rows = await AktivitasSistemLog.findAll({
                where: {
                    entity_type: entityType,
                    entity_id: String(entityId),
                },
                order: [
                    ['dibuat_pada', 'ASC'],
                    ['id_aktivitas_log', 'ASC'],
                ],
                transaction: this.tx(options),
            });
            return this.plainRows(rows);
        }
        catch (error) {
            console.warn('[activity-log] Gagal membaca log aktivitas:', error.message);
            return [];
        }
    };
    getFpplLogs = async (idRegistrasi, options = {}) => {
        return this.getLogsForEntity('FPPL', idRegistrasi, options);
    };
    addPair = (pairs, entityType, entityId) => {
        if (!entityId)
            return;
        const value = String(entityId);
        if (!pairs.some((row) => row.entity_type === entityType && row.entity_id === value)) {
            pairs.push({ entity_type: entityType, entity_id: value });
        }
    };
    sampleRegistrationInclude = (required = true) => {
        return {
            model: Sampel,
            required,
            include: [
                {
                    model: FpplSampel,
                    as: 'fppl_sampel',
                    required: true,
                },
            ],
        };
    };
    penugasanDetailInclude = (idRegistrasi) => {
        return {
            model: PenugasanDetail,
            required: true,
            include: [
                {
                    model: PenugasanItem,
                    required: true,
                    include: [
                        {
                            ...this.sampleRegistrationInclude(true),
                            where: undefined,
                            include: [
                                {
                                    model: FpplSampel,
                                    as: 'fppl_sampel',
                                    required: true,
                                    where: { id_registrasi: idRegistrasi },
                                },
                            ],
                        },
                    ],
                },
            ],
        };
    };
    lkaIncludeForRegistration = (idRegistrasi) => {
        return {
            model: Lka,
            as: 'lka',
            required: true,
            include: [this.penugasanDetailInclude(idRegistrasi)],
        };
    };
    getRequestTimelineEntityPairs = async (idRegistrasi, options = {}) => {
        const pairs = [{ entity_type: 'FPPL', entity_id: String(idRegistrasi) }];
        const invoices = this.plainRows(await this.safeFindAll('invoice', () => Invoice.findAll({
            where: { id_registrasi: idRegistrasi },
            transaction: this.tx(options),
        })));
        invoices.forEach((row) => this.addPair(pairs, 'INVOICE', row.id_invoice));
        const payments = this.plainRows(await this.safeFindAll('payment', () => Payment.findAll({
            include: [{ model: Invoice, required: true, where: { id_registrasi: idRegistrasi } }],
            transaction: this.tx(options),
        })));
        payments.forEach((row) => this.addPair(pairs, 'PAYMENT', row.id_payment));
        const jadwalSampel = this.plainRows(await this.safeFindAll('jadwal sampel', () => JadwalSampel.findAll({
            where: { id_registrasi: idRegistrasi },
            transaction: this.tx(options),
        })));
        jadwalSampel.forEach((row) => this.addPair(pairs, 'JADWAL_SAMPEL', row.id_jadwal));
        const jadwalLhu = this.plainRows(await this.safeFindAll('jadwal LHU', () => JadwalPengambilanLhu.findAll({
            where: { id_registrasi: idRegistrasi },
            transaction: this.tx(options),
        })));
        jadwalLhu.forEach((row) => this.addPair(pairs, 'JADWAL_LHU', row.id_jadwal_lhu));
        const scheduleChanges = this.plainRows(await this.safeFindAll('pengajuan jadwal', () => PengajuanPerubahanJadwal.findAll({
            where: { id_registrasi: idRegistrasi },
            transaction: this.tx(options),
        })));
        scheduleChanges.forEach((row) => this.addPair(pairs, 'PENGAJUAN_JADWAL', row.id_pengajuan_jadwal));
        const samples = this.plainRows(await this.safeFindAll('sampel', () => Sampel.findAll({
            include: [{ model: FpplSampel, as: 'fppl_sampel', required: true, where: { id_registrasi: idRegistrasi } }],
            transaction: this.tx(options),
        })));
        samples.forEach((row) => this.addPair(pairs, 'SAMPEL', row.no_sampel));
        const assignments = this.plainRows(await this.safeFindAll('penugasan', () => Penugasan.findAll({
            include: [this.penugasanDetailInclude(idRegistrasi)],
            transaction: this.tx(options),
        })));
        assignments.forEach((row) => this.addPair(pairs, 'PENUGASAN', row.id_penugasan));
        const assignmentDetails = this.plainRows(await this.safeFindAll('detail penugasan', () => PenugasanDetail.findAll({
            include: [
                {
                    model: PenugasanItem,
                    required: true,
                    include: [
                        {
                            model: Sampel,
                            required: true,
                            include: [{ model: FpplSampel, as: 'fppl_sampel', required: true, where: { id_registrasi: idRegistrasi } }],
                        },
                    ],
                },
            ],
            transaction: this.tx(options),
        })));
        assignmentDetails.forEach((row) => this.addPair(pairs, 'PENUGASAN_DETAIL', row.id_penugasan_detail));
        const lkas = this.plainRows(await this.safeFindAll('LKA', () => Lka.findAll({
            include: [this.penugasanDetailInclude(idRegistrasi)],
            transaction: this.tx(options),
        })));
        lkas.forEach((row) => this.addPair(pairs, 'LKA', row.kode_lka));
        const lkaRevisions = this.plainRows(await this.safeFindAll('revisi LKA', () => LkaRevisi.findAll({
            include: [this.lkaIncludeForRegistration(idRegistrasi)],
            transaction: this.tx(options),
        })));
        lkaRevisions.forEach((row) => this.addPair(pairs, 'LKA_REVISI', row.id_revisi_lka));
        const lhus = this.plainRows(await this.safeFindAll('LHU', () => Lhu.findAll({
            where: { id_registrasi: idRegistrasi },
            transaction: this.tx(options),
        })));
        lhus.forEach((row) => this.addPair(pairs, 'LHU', row.nomor_lhu));
        return pairs;
    };
    ensureRequestActivityLogs = async (idRegistrasi, options = {}) => {
        const fppl = this.plain(await Fppl.findOne({
            where: { id_registrasi: idRegistrasi },
            include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
            transaction: this.tx(options),
        }));
        if (!fppl)
            return;
        const pelanggan = fppl.pelanggan || fppl.Pelanggan || {};
        const customerNik = pelanggan.nik || null;
        await this.createActivityLogIfMissing({
            entityType: 'FPPL',
            entityId: idRegistrasi,
            action: 'MEMBUAT_PERMOHONAN',
            statusBefore: null,
            statusAfter: 'Menunggu Verifikasi',
            source: 'Pelanggan',
            note: 'Permohonan dibuat oleh pelanggan.',
            actorNik: customerNik,
            createdAt: this.toDateOrNull(fppl.tanggal_pendaftaran) || new Date(),
        }, options);
        if (fppl.status_fppl && fppl.status_fppl !== 'Menunggu Verifikasi') {
            await this.createActivityLogIfMissing({
                entityType: 'FPPL',
                entityId: idRegistrasi,
                action: this.mapActionByFpplStatus(fppl.status_fppl),
                statusBefore: 'Menunggu Verifikasi',
                statusAfter: fppl.status_fppl,
                source: this.mapSourceByStatus(fppl.status_fppl),
                note: fppl.catatan_penolakan || null,
                actorNik: fppl.diverifikasi_oleh || customerNik,
                createdAt: this.toDateOrNull(fppl.tanggal_verifikasi || fppl.tanggal_pendaftaran) || new Date(),
            }, options);
        }
        const invoiceRows = this.plainRows(await this.safeFindAll('invoice', () => Invoice.findAll({
            where: { id_registrasi: idRegistrasi },
            order: [['tanggal_invoice', 'ASC']],
            transaction: this.tx(options),
        })));
        for (const invoice of invoiceRows) {
            await this.createActivityLogIfMissing({
                entityType: 'INVOICE',
                entityId: invoice.id_invoice,
                action: 'MEMBUAT_INVOICE',
                statusBefore: null,
                statusAfter: invoice.status_invoice,
                source: 'Admin',
                note: 'Invoice diterbitkan.',
                actorNik: null,
                createdAt: this.toDateOrNull(invoice.tanggal_invoice) || new Date(),
            }, options);
        }
        const paymentRows = this.plainRows(await this.safeFindAll('payment', () => Payment.findAll({
            include: [{ model: Invoice, required: true, where: { id_registrasi: idRegistrasi } }],
            transaction: this.tx(options),
        })));
        for (const payment of paymentRows) {
            await this.createActivityLogIfMissing({
                entityType: 'PAYMENT',
                entityId: payment.id_payment,
                action: 'MEMBAYAR_INVOICE',
                statusBefore: null,
                statusAfter: payment.status_payment,
                source: 'Pelanggan',
                note: 'Pelanggan melakukan pembayaran.',
                actorNik: customerNik,
                createdAt: this.toDateOrNull(payment.tanggal_payment || payment.created_at) || new Date(),
            }, options);
        }
        const scheduleRows = this.plainRows(await this.safeFindAll('jadwal sampel', () => JadwalSampel.findAll({
            where: { id_registrasi: idRegistrasi },
            order: [['dibuat_pada', 'ASC']],
            transaction: this.tx(options),
        })));
        for (const schedule of scheduleRows) {
            await this.createActivityLogIfMissing({
                entityType: 'JADWAL_SAMPEL',
                entityId: schedule.id_jadwal,
                action: 'MEMBUAT_JADWAL_SAMPEL',
                statusBefore: null,
                statusAfter: schedule.status_jadwal,
                source: 'Admin',
                note: schedule.catatan_jadwal || 'Jadwal pengambilan sampel dibuat.',
                actorNik: schedule.dibuat_oleh,
                createdAt: this.toDateOrNull(schedule.dibuat_pada || schedule.tanggal_jadwal) || new Date(),
            }, options);
        }
        const scheduleChangeRows = this.plainRows(await this.safeFindAll('pengajuan perubahan jadwal', () => PengajuanPerubahanJadwal.findAll({
            where: { id_registrasi: idRegistrasi },
            order: [['diajukan_pada', 'ASC']],
            transaction: this.tx(options),
        })));
        for (const row of scheduleChangeRows) {
            await this.createActivityLogIfMissing({
                entityType: 'PENGAJUAN_JADWAL',
                entityId: row.id_pengajuan_jadwal,
                action: 'MENGAJUKAN_PERUBAHAN_JADWAL',
                statusBefore: null,
                statusAfter: row.status_pengajuan,
                source: 'Pelanggan',
                note: row.alasan_pengajuan,
                actorNik: customerNik,
                createdAt: this.toDateOrNull(row.diajukan_pada) || new Date(),
            }, options);
            if (row.status_pengajuan && row.status_pengajuan !== 'Menunggu Persetujuan Admin') {
                await this.createActivityLogIfMissing({
                    entityType: 'PENGAJUAN_JADWAL',
                    entityId: row.id_pengajuan_jadwal,
                    action: 'MENINJAU_PERUBAHAN_JADWAL',
                    statusBefore: 'Menunggu Persetujuan Admin',
                    statusAfter: row.status_pengajuan,
                    source: 'Admin',
                    note: row.catatan_admin,
                    actorNik: null,
                    createdAt: this.toDateOrNull(row.updated_at || row.diajukan_pada) || new Date(),
                }, options);
            }
        }
        const sampleRows = this.plainRows(await this.safeFindAll('sampel', () => Sampel.findAll({
            include: [{ model: FpplSampel, as: 'fppl_sampel', required: true, where: { id_registrasi: idRegistrasi } }],
            transaction: this.tx(options),
        })));
        for (const sample of sampleRows) {
            await this.createActivityLogIfMissing({
                entityType: 'SAMPEL',
                entityId: sample.no_sampel,
                action: 'MENERIMA_SAMPEL',
                statusBefore: null,
                statusAfter: sample.status_sample,
                source: 'Admin',
                note: 'Sampel diterima oleh laboratorium.',
                actorNik: sample.diterima_oleh,
                createdAt: this.toDateOrNull(sample.diterima_pada) || new Date(),
            }, options);
        }
        const assignmentRows = this.plainRows(await this.safeFindAll('penugasan', () => Penugasan.findAll({
            include: [this.penugasanDetailInclude(idRegistrasi)],
            transaction: this.tx(options),
        })));
        for (const assignment of assignmentRows) {
            await this.createActivityLogIfMissing({
                entityType: 'PENUGASAN',
                entityId: assignment.id_penugasan,
                action: 'MEMBUAT_PENUGASAN',
                statusBefore: null,
                statusAfter: assignment.status_penugasan,
                source: 'Penyelia',
                note: assignment.catatan_penugasan || 'Penugasan pengujian dibuat.',
                actorNik: assignment.assigned_by,
                createdAt: this.toDateOrNull(assignment.assigned_at) || new Date(),
            }, options);
        }
        const lkaRows = this.plainRows(await this.safeFindAll('LKA', () => Lka.findAll({
            include: [this.penugasanDetailInclude(idRegistrasi)],
            transaction: this.tx(options),
        })));
        for (const lka of lkaRows) {
            await this.createActivityLogIfMissing({
                entityType: 'LKA',
                entityId: lka.kode_lka,
                action: 'MELAPORKAN_LKA',
                statusBefore: null,
                statusAfter: lka.status_lka,
                source: 'Analis',
                note: 'Analis mengirim LKA.',
                actorNik: lka.dilaporkan_oleh,
                createdAt: this.toDateOrNull(lka.tanggal_pelaporan || lka.tanggal_selesai_pengujian) || new Date(),
            }, options);
            if (lka.diperiksa_oleh || lka.tanggal_pemeriksaan) {
                await this.createActivityLogIfMissing({
                    entityType: 'LKA',
                    entityId: lka.kode_lka,
                    action: 'MEMERIKSA_LKA',
                    statusBefore: null,
                    statusAfter: lka.status_lka,
                    source: 'Penyelia',
                    note: 'Penyelia memeriksa LKA.',
                    actorNik: lka.diperiksa_oleh,
                    createdAt: this.toDateOrNull(lka.tanggal_pemeriksaan || lka.tanggal_pelaporan) || new Date(),
                }, options);
            }
        }
        const revisionRows = this.plainRows(await this.safeFindAll('revisi LKA', () => LkaRevisi.findAll({
            include: [this.lkaIncludeForRegistration(idRegistrasi)],
            transaction: this.tx(options),
        })));
        for (const revision of revisionRows) {
            await this.createActivityLogIfMissing({
                entityType: 'LKA_REVISI',
                entityId: revision.id_revisi_lka,
                action: revision.sumber_revisi === 'KASI_PENGUJIAN' ? 'REVISI_LKA_DIAJUKAN_KASI' : 'REVISI_LKA_DIAJUKAN_PENYELIA',
                statusBefore: null,
                statusAfter: revision.status_revisi,
                source: revision.sumber_revisi === 'KASI_PENGUJIAN' ? 'Kasi' : 'Penyelia',
                note: revision.catatan_revisi,
                actorNik: revision.diajukan_oleh,
                createdAt: this.toDateOrNull(revision.diajukan_pada || revision.created_at) || new Date(),
            }, options);
            if (revision.ditinjau_pada || revision.ditinjau_oleh) {
                await this.createActivityLogIfMissing({
                    entityType: 'LKA_REVISI',
                    entityId: revision.id_revisi_lka,
                    action: 'REVISI_LKA_DITINJAU_PENYELIA',
                    statusBefore: 'Menunggu Persetujuan Penyelia',
                    statusAfter: revision.status_revisi,
                    source: 'Penyelia',
                    note: revision.catatan_tinjauan,
                    actorNik: revision.ditinjau_oleh,
                    createdAt: this.toDateOrNull(revision.ditinjau_pada || revision.updated_at) || new Date(),
                }, options);
            }
        }
        const lhuRows = this.plainRows(await this.safeFindAll('LHU', () => Lhu.findAll({
            where: { id_registrasi: idRegistrasi },
            transaction: this.tx(options),
        })));
        for (const lhu of lhuRows) {
            await this.createActivityLogIfMissing({
                entityType: 'LHU',
                entityId: lhu.nomor_lhu,
                action: 'MEMBUAT_LHU',
                statusBefore: null,
                statusAfter: lhu.status_lhu,
                source: 'Sistem',
                note: 'Draft/finalisasi LHU dibuat.',
                actorNik: null,
                createdAt: this.toDateOrNull(lhu.created_at || lhu.tanggal_penerbitan) || new Date(),
            }, options);
            if (lhu.qc_at) {
                await this.createActivityLogIfMissing({
                    entityType: 'LHU',
                    entityId: lhu.nomor_lhu,
                    action: 'QC_MENYETUJUI_LHU',
                    statusBefore: null,
                    statusAfter: lhu.status_lhu,
                    source: 'QC',
                    note: 'LHU disetujui oleh Pengendalian Mutu.',
                    actorNik: lhu.qc_by,
                    createdAt: this.toDateOrNull(lhu.qc_at) || new Date(),
                }, options);
            }
            if (lhu.kalab_at) {
                await this.createActivityLogIfMissing({
                    entityType: 'LHU',
                    entityId: lhu.nomor_lhu,
                    action: 'QC_MENGESAHKAN_LHU',
                    statusBefore: null,
                    statusAfter: 'Disahkan',
                    source: 'QC',
                    note: 'LHU disahkan melalui alur finalisasi QC. Identitas Kepala Laboratorium tetap digunakan sebagai penandatangan dokumen.',
                    actorNik: lhu.qc_by || lhu.kalab_by,
                    createdAt: this.toDateOrNull(lhu.qc_at || lhu.kalab_at) || new Date(),
                }, options);
            }
        }
        const lhuScheduleRows = this.plainRows(await this.safeFindAll('jadwal pengambilan LHU', () => JadwalPengambilanLhu.findAll({
            where: { id_registrasi: idRegistrasi },
            order: [['dijadwalkan_pada', 'ASC']],
            transaction: this.tx(options),
        })));
        for (const schedule of lhuScheduleRows) {
            await this.createActivityLogIfMissing({
                entityType: 'JADWAL_LHU',
                entityId: schedule.id_jadwal_lhu,
                action: 'MENJADWALKAN_PENGAMBILAN_LHU',
                statusBefore: null,
                statusAfter: schedule.status_pengambilan,
                source: 'Admin',
                note: 'Jadwal pengambilan LHU dibuat.',
                actorNik: schedule.dijadwalkan_oleh,
                createdAt: this.toDateOrNull(schedule.dijadwalkan_pada) || new Date(),
            }, options);
            if (schedule.diambil_pada) {
                await this.createActivityLogIfMissing({
                    entityType: 'JADWAL_LHU',
                    entityId: schedule.id_jadwal_lhu,
                    action: 'LHU_DIAMBIL_PELANGGAN',
                    statusBefore: schedule.status_pengambilan,
                    statusAfter: 'Sudah Diambil',
                    source: 'Admin',
                    note: schedule.nama_pengambil ? `LHU diambil oleh ${schedule.nama_pengambil}.` : 'LHU diambil pelanggan.',
                    actorNik: schedule.dijadwalkan_oleh,
                    createdAt: this.toDateOrNull(schedule.diambil_pada) || new Date(),
                }, options);
            }
        }
    };
    getRequestTimelineLogs = async (idRegistrasi, options = {}) => {
        try {
            if (options.ensure !== false) {
                await this.ensureRequestActivityLogs(idRegistrasi, options);
            }
            const pairs = await this.getRequestTimelineEntityPairs(idRegistrasi, options);
            if (!pairs.length)
                return [];
            const rows = await AktivitasSistemLog.findAll({
                where: {
                    [Op.or]: pairs.map((pair) => ({
                        entity_type: pair.entity_type,
                        entity_id: pair.entity_id,
                    })),
                },
                order: [
                    ['dibuat_pada', 'ASC'],
                    ['id_aktivitas_log', 'ASC'],
                ],
                transaction: this.tx(options),
            });
            return this.plainRows(rows);
        }
        catch (error) {
            console.warn('[activity-log] Gagal membaca timeline permohonan:', error.message);
            return this.getFpplLogs(idRegistrasi, options);
        }
    };
    getManyFpplLogs = async (idRegistrasiList = [], options = {}) => {
        const ids = Array.from(new Set(idRegistrasiList.filter(Boolean).map(String)));
        if (!ids.length)
            return {};
        try {
            const result = {};
            for (const idRegistrasi of ids) {
                result[idRegistrasi] = await this.getRequestTimelineLogs(idRegistrasi, options);
            }
            return result;
        }
        catch (error) {
            console.warn('[activity-log] Gagal membaca log aktivitas banyak FPPL:', error.message);
            return {};
        }
    };
    backfillAllRequestActivityLogs = async (options = {}) => {
        const rows = this.plainRows(await Fppl.findAll({
            attributes: ['id_registrasi'],
            order: [
                ['tanggal_pendaftaran', 'ASC'],
                ['id_registrasi', 'ASC'],
            ],
            transaction: this.tx(options),
        }));
        let total = 0;
        for (const row of rows) {
            await this.ensureRequestActivityLogs(row.id_registrasi, options);
            total += 1;
        }
        return { total_requests_processed: total };
    };
}
module.exports = new ActivityLogService();
module.exports.ActivityLogService = ActivityLogService;
