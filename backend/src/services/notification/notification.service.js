const { Op } = require('sequelize');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');
const { NotifikasiEmail, JadwalPengambilanLhu, JadwalSampel, Fppl, Pelanggan, User, Pegawai, Lhu, Sampel, FpplSampel, JenisSampel, Penugasan, PenugasanDetail, PenugasanItem, ParameterMetode, Parameter, Metode, Lka, LkaHasil, Invoice, PengajuanPerubahanJadwal, } = require('../../models/Associations');
const { NOTIFICATION_TYPE, STATUS_PENGIRIMAN_EMAIL, } = require('../../constants/notification.constant');
const Roles = require('../../constants/roles');
const RequestStatus = require('../../constants/request-status');
const { LHU_STATUS } = require('../../constants/lhu-status.constant');
const { buildAdminRequestLink, buildAnalisTestingLink, buildKasiMethodsLink, buildKasiReviewLink, buildKalabApprovalLink, buildKasiReviewApprovedToQcEmail, buildLhuNeedsKalabApprovalEmail, buildPenyeliaAssignmentLink, buildPenyeliaReviewLink, buildRequestDetailLink, buildRequestLhusCompleteAdminEmail, safeString, } = require('./notification-format.util');
const { addDays, buildEmailLogWhere, createEmailLog, findNotificationTypeById, findOrCreateNotificationTypeById, getPlain, markEmailFailed, markEmailSent, pickArray, pickObject, resolveRecipientEmail, sendNotificationEmail, startOfToday, startOfTomorrow, toDateOnly, } = require('./notification-core.service');
const { buildJadwalPengambilanLhuEmail, } = require('../../templates/email/jadwal-pengambilan-lhu.template');
const { buildDeadlineAnalisDekatEmail, } = require('../../templates/email/deadline-analis-dekat.template');
const { buildAnalystAssignmentCreatedEmail, } = require('../../templates/email/analyst-assignment-created.template');
const { buildAnalystSubmitToSupervisorEmail, } = require('../../templates/email/analyst-submit-to-supervisor.template');
const { buildTestResultRevisionByKasiEmail, } = require('../../templates/email/test-result-revision-by-kasi.template');
const { buildTestResultRevisionByPenyeliaEmail, } = require('../../templates/email/test-result-revision-by-penyelia.template');
const { buildSubcontractResultEntryEmail, } = require('../../templates/email/subcontract-result-entry.template');
const { buildRequestStatusUpdatedEmail, } = require('../../templates/email/request-status-updated.template');
const { buildInvoiceReadyEmail, } = require('../../templates/email/invoice-ready.template');
const { buildDeferredPaymentMarkedEmail, } = require('../../templates/email/deferred-payment-marked.template');
const { buildSampleReceivedEmail, } = require('../../templates/email/sample-received.template');
const { buildLhuReadyEmail, } = require('../../templates/email/lhu-ready.template');
const { buildJadwalSampelEmail, } = require('../../templates/email/jadwal-sampel.template');
const { buildKasiMethodNeededEmail, } = require('../../templates/email/kasi-method-needed.template');
const { buildPenyeliaAssignmentNeededEmail, } = require('../../templates/email/penyelia-assignment-needed.template');
const { buildScheduleChangeSubmittedAdminEmail, buildScheduleChangeDecisionCustomerEmail, } = require('../../templates/email/schedule-change.template');
const { buildKasiRevisionApprovalNeededEmail, } = require('../../templates/email/kasi-revision-approval-needed.template');
const { buildKasiRevisionRejectedEmail, } = require('../../templates/email/kasi-revision-rejected-to-kasi.template');
const { notifyJadwalPengambilanLhu, notifyJadwalSampel, notifyScheduleChangeApprovedToCustomer, notifyScheduleChangeRejectedToCustomer, notifyScheduleChangeSubmittedToAdmin, } = require('./notification-schedule.service');
const { notifyAdminPermohonanBaru, notifyCustomerRequestCancelledToAdmin, notifyCustomerRequestCancelledToCustomer, notifyDeferredPaymentMarked, notifyInvoiceReady, notifyKasiMetodePerluDitentukan, notifyLhuReady, notifyPaymentCompletedToAdmin, notifyPaymentCompletedToCustomer, notifyPenyeliaPenugasanSampelMasuk, notifyRequestStatusChanged, notifySamplesReceived, } = require('./notification-request.service');
const { notifyAnalisSubmitKePenyelia, notifyDeadlineAnalisDekat, notifyPenugasanAnalisBaru, notifyPenyeliaApproveKeKasi, } = require('./notification-assignment-event.service');
const { findRevisionTargetsBySample, getActiveUsersByRole, getPenugasanParameterMethodGroups, getPenugasanSampleNos, getKasiQcRequestNotificationContext, getRequestAndCustomer, getRequestLhuCompletionContext, getRequestWithCustomerAndSamples, getSampleNotificationContext, resolveRequestStatusNotificationType, } = require('./notification-query.service');
class NotificationService {
    notifyKasiReviewApprovedToQc = async ({ noSampel } = {}) => {
        const context = await getKasiQcRequestNotificationContext(noSampel);
        if (!context.isComplete) {
            return {
                skipped: true,
                reason: 'Belum seluruh sampel dan parameter dalam permohonan disetujui Kasi Pengujian.',
                idRegistrasi: context.idRegistrasi,
                noSampelTrigger: noSampel,
                totalSamples: context.totalSamples,
                totalParameter: context.totalParameter,
                totalApprovedKasi: context.totalApprovedKasi,
                sampelBelumLengkap: (context.incompleteSamples || []).map((sample) => sample.noSampel || sample.no_sampel).filter(Boolean),
            };
        }
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.HASIL_KASI_MENUNGGU_QC, {
            deskripsi: 'Seluruh hasil satu permohonan disetujui Kasi Pengujian dan menunggu verifikasi QC',
            konteks: 'LHU',
        });
        const recipients = await getActiveUsersByRole(Roles.QC);
        const results = [];
        for (const penerima of recipients) {
            const nik = penerima.nik;
            if (!nik)
                continue;
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: context.idRegistrasi,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: null,
            });
            try {
                const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
                const { subject, body, html } = buildKasiReviewApprovedToQcEmail({ penerima, context });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim notifikasi hasil disetujui Kasi ke QC:', error);
            }
        }
        return results;
    };
    getLhuKalabNotificationContext = async (lhuNo) => {
        const lhuInstance = await Lhu.findOne({
            where: { nomor_lhu: lhuNo },
            include: [
                {
                    model: Fppl,
                    as: 'fppl',
                    required: false,
                    include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
                },
                {
                    model: Sampel,
                    as: 'sampels',
                    required: false,
                    include: [
                        {
                            model: FpplSampel,
                            as: 'fppl_sampel',
                            required: false,
                            include: [
                                { model: JenisSampel, required: false },
                                {
                                    model: Fppl,
                                    as: 'fppl',
                                    required: false,
                                    include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
                                },
                            ],
                        },
                    ],
                },
            ],
            order: [[{ model: Sampel, as: 'sampels' }, 'no_sampel', 'ASC']],
        });
        if (!lhuInstance) {
            const err = new Error('LHU tidak ditemukan untuk notifikasi Kepala Lab.');
            err.statusCode = 404;
            throw err;
        }
        const lhu = getPlain(lhuInstance) || {};
        const lhuSamples = pickArray(lhu, ['sampels', 'Sampels']);
        const firstSample = lhuSamples[0] || {};
        const firstFpplSampel = pickObject(firstSample, ['fpplSampel', 'fppl_sampel', 'FpplSampel']) || {};
        const fpplFromSample = pickObject(firstFpplSampel, ['fppl', 'Fppl']) || {};
        const fppl = pickObject(lhu, ['fppl', 'Fppl']) || fpplFromSample || {};
        const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || pickObject(fpplFromSample, ['pelanggan', 'Pelanggan']) || {};
        const sampleNos = lhuSamples
            .map((sample) => sample.noSampel || sample.no_sampel || null)
            .filter(Boolean);
        const samples = lhuSamples.map((sample) => {
            const fpplSampel = pickObject(sample, ['fpplSampel', 'fppl_sampel', 'FpplSampel']) || {};
            const jenis = pickObject(fpplSampel, ['jenisSampel', 'jenis_sampel', 'JenisSampel']) || {};
            return {
                noSampel: sample.noSampel || sample.no_sampel || null,
                jenisSampel: jenis.jenisSampel || jenis.jenis_sampel || jenis.namaJenis || jenis.nama_jenis || null,
            };
        }).filter((item) => item.noSampel);
        const jenisList = Array.from(new Set(samples
            .map((item) => item.jenisSampel)
            .filter(Boolean)));
        return toCamelCaseDeep({
            lhu,
            sample: firstSample,
            samples,
            sampleNos,
            totalSamples: sampleNos.length,
            fpplSampel: firstFpplSampel,
            jenis: {
                jenisSampel: jenisList.join(', ') || null,
            },
            fppl,
            pelanggan,
        });
    };
    getRecentQcFinalizedLhus = async ({ since, fallbackLhuNo }) => {
        const rows = await Lhu.findAll({
            where: {
                status_lhu: LHU_STATUS.WAIT_KALAB,
                qc_at: {
                    [Op.gte]: since,
                },
            },
            include: [
                {
                    model: Sampel,
                    as: 'sampels',
                    required: false,
                    include: [
                        {
                            model: FpplSampel,
                            as: 'fppl_sampel',
                            required: false,
                            include: [{ model: JenisSampel, required: false }],
                        },
                    ],
                },
            ],
            order: [
                ['qc_at', 'ASC'],
                ['nomor_lhu', 'ASC'],
            ],
        });
        const mapped = rows.map((row) => {
            const lhu = getPlain(row) || {};
            const lhuSamples = pickArray(lhu, ['sampels', 'Sampels']);
            const samples = lhuSamples
                .map((sample) => {
                const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
                const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
                const noSampel = sample.no_sampel || sample.noSampel || null;
                return {
                    noSampel,
                    jenisSampel: jenis.jenisSampel || jenis.jenis_sampel || jenis.namaJenis || jenis.nama_jenis || null,
                };
            })
                .filter((sample) => sample.noSampel);
            const sampleNos = samples.map((sample) => sample.noSampel).filter(Boolean);
            const jenisList = Array.from(new Set(samples.map((sample) => sample.jenisSampel).filter(Boolean)));
            return {
                nomorLhu: lhu.nomorLhu || lhu.nomor_lhu,
                idRegistrasi: lhu.idRegistrasi || lhu.id_registrasi,
                qcAt: lhu.qcAt || lhu.qc_at,
                sampleNos,
                samples,
                totalSamples: sampleNos.length,
                noSampel: sampleNos.join(', ') || null,
                jenisSampel: jenisList.join(', ') || null,
            };
        });
        if (!mapped.some((row) => row.nomorLhu === fallbackLhuNo)) {
            const fallbackContext = await this.getLhuKalabNotificationContext(fallbackLhuNo);
            mapped.push({
                nomorLhu: fallbackLhuNo,
                idRegistrasi: fallbackContext.lhu.idRegistrasi || fallbackContext.lhu.id_registrasi || fallbackContext.fpplSampel.idRegistrasi || fallbackContext.fpplSampel.id_registrasi || null,
                sampleNos: fallbackContext.sampleNos || [],
                samples: fallbackContext.samples || [],
                totalSamples: fallbackContext.totalSamples || 0,
                jenisSampel: fallbackContext.jenis?.jenisSampel || null,
            });
        }
        return mapped;
    };
    notifyLhuNeedsKalabApproval = async ({ nomorLhu } = {}) => {
        const lhuNo = safeString(nomorLhu).trim();
        if (!lhuNo) {
            const err = new Error('Nomor LHU wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        const context = await this.getLhuKalabNotificationContext(lhuNo);
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.LHU_MENUNGGU_KALAB, {
            deskripsi: 'LHU menunggu persetujuan Kepala Lab',
            konteks: 'LHU',
        });
        const recipients = await getActiveUsersByRole(Roles.KALAB);
        const results = [];
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
        const bundledLhus = await this.getRecentQcFinalizedLhus({
            since: twentyMinutesAgo,
            fallbackLhuNo: lhuNo,
        });
        for (const penerima of recipients) {
            const nik = penerima.nik;
            if (!nik)
                continue;
            const existingInWindow = await NotifikasiEmail.findOne({
                where: {
                    ...buildEmailLogWhere({
                        idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                        penerimaUserNik: nik,
                    }),
                    dibuat_pada: {
                        [Op.gte]: twentyMinutesAgo,
                    },
                },
                order: [['dibuat_pada', 'DESC']],
            });
            if (existingInWindow) {
                results.push({
                    skipped: true,
                    reason: 'Notifikasi Kalab sudah dikirim dalam rentang 20 menit terakhir.',
                    nomorLhu: lhuNo,
                    penerimaUserNik: nik,
                });
                continue;
            }
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: context.lhu.id_registrasi || context.fpplSampel.id_registrasi || null,
                idJadwalLhu: null,
                nomorLhu: lhuNo,
                idPenugasan: null,
            });
            try {
                const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
                const { subject, body, html } = buildLhuNeedsKalabApprovalEmail({
                    penerima,
                    context,
                    nomorLhu: lhuNo,
                    lhus: bundledLhus,
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim notifikasi LHU ke Kalab:', error);
            }
        }
        return results;
    };
    notifyAdminWhenRequestLhusComplete = async ({ nomorLhu } = {}) => {
        const lhuNo = safeString(nomorLhu).trim();
        if (!lhuNo) {
            const err = new Error('Nomor LHU wajib dikirim untuk cek kelengkapan permohonan.');
            err.statusCode = 400;
            throw err;
        }
        const context = await getRequestLhuCompletionContext(lhuNo);
        if (!context.isComplete) {
            return {
                skipped: true,
                reason: 'Belum semua sampel dalam permohonan memiliki LHU berstatus Disahkan.',
                idRegistrasi: context.idRegistrasi,
                totalSamples: context.totalSamples,
                belumLengkap: context.incompleteSamples.map((sample) => sample.noSampel || sample.no_sampel),
            };
        }
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.LHU_PERMOHONAN_LENGKAP_ADMIN, {
            deskripsi: 'LHU sudah selesai dan siap diambil',
            konteks: 'LHU',
        });
        const admins = await getActiveUsersByRole(Roles.ADMIN);
        const results = [];
        for (const admin of admins) {
            const nik = admin.nik;
            if (!nik)
                continue;
            const existing = await NotifikasiEmail.findOne({
                where: buildEmailLogWhere({
                    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                    penerimaUserNik: nik,
                    idRegistrasi: context.idRegistrasi,
                }),
            });
            if (existing) {
                results.push({
                    penerimaUserNik: nik,
                    skipped: true,
                    reason: 'Notifikasi kelengkapan LHU permohonan sudah pernah dibuat untuk admin ini.',
                });
                continue;
            }
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: context.idRegistrasi,
                idJadwalLhu: null,
                nomorLhu: lhuNo,
                idPenugasan: null,
            });
            try {
                const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
                const { subject, body, html } = buildRequestLhusCompleteAdminEmail({
                    penerima: admin,
                    context,
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim notifikasi kelengkapan LHU permohonan ke Admin:', error);
            }
        }
        return results;
    };
    notifyRevisiPenyeliaKeAnalis = async ({ idPenugasanDetail, catatanRevisi, noSampel = [] } = {}) => {
        const detailId = safeString(idPenugasanDetail).trim();
        const note = safeString(catatanRevisi).trim();
        if (!detailId)
            throw new Error('ID detail penugasan wajib dikirim.');
        if (!note)
            throw new Error('Catatan revisi wajib diisi.');
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.REVISI_PENYELIA);
        const detailInstance = await PenugasanDetail.findOne({
            where: { id_penugasan_detail: detailId },
            include: [
                {
                    model: Penugasan,
                    required: true,
                    include: [
                        {
                            model: User,
                            as: 'Analis',
                            required: false,
                            attributes: ['nik', 'username', 'email'],
                        },
                    ],
                },
                {
                    model: ParameterMetode,
                    required: false,
                    include: [
                        { model: Parameter, required: false },
                        { model: Metode, required: false },
                    ],
                },
                { model: PenugasanItem, required: false },
            ],
        });
        if (!detailInstance) {
            const err = new Error('Detail penugasan untuk notifikasi revisi penyelia tidak ditemukan.');
            err.statusCode = 404;
            throw err;
        }
        const detail = getPlain(detailInstance);
        const penugasan = detail.penugasan || detail.Penugasan || {};
        const analis = penugasan.Analis || penugasan.analis || {};
        const parameterMetode = detail.parameter_metode || detail.ParameterMetode || {};
        const parameter = parameterMetode.parameter || parameterMetode.Parameter || {};
        const metode = parameterMetode.metode || parameterMetode.Metode || {};
        const items = pickArray(detail, ['penugasan_items', 'PenugasanItems', 'penugasan_item']);
        const sampleList = Array.isArray(noSampel) && noSampel.length
            ? noSampel
            : items.map((item) => item.no_sampel).filter(Boolean);
        if (!penugasan.id_user_analis) {
            const err = new Error('Analis penerima notifikasi revisi penyelia belum tersedia.');
            err.statusCode = 400;
            throw err;
        }
        const log = await createEmailLog({
            idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
            penerimaUserNik: penugasan.id_user_analis,
            penerimaPelangganId: null,
            idRegistrasi: null,
            idJadwalLhu: null,
            nomorLhu: null,
            idPenugasan: penugasan.id_penugasan || null,
        });
        try {
            const to = await resolveRecipientEmail({
                penerimaUserNik: penugasan.id_user_analis,
                penerimaPelangganId: null,
            });
            const { subject, body, html } = buildTestResultRevisionByPenyeliaEmail({
                analis,
                noSampel: sampleList,
                catatanRevisi: note,
                items: [
                    {
                        id_penugasan_detail: detail.id_penugasan_detail,
                        nama_parameter: parameter.nama_parameter || parameterMetode.nama_parameter || '-',
                        acuan_metode: parameterMetode.acuan_metode || metode.nama_metode || '-',
                    },
                ],
                testingLink: buildAnalisTestingLink(detail.id_penugasan_detail, penugasan.id_penugasan),
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    normalizeNotificationIdList = (value) => {
        if (Array.isArray(value)) {
            return Array.from(new Set(value.map((item) => safeString(item).trim()).filter(Boolean)));
        }
        if (value === null || value === undefined)
            return [];
        const text = safeString(value).trim();
        return text ? Array.from(new Set(text.split(',').map((item) => item.trim()).filter(Boolean))) : [];
    };
    mapRevisionItemsForEmail = (revisions = [], details = []) => {
        const detailRows = Array.isArray(details) ? details : [];
        const detailById = new Map(detailRows
            .map((detail) => [safeString(detail.id_penugasan_detail || detail.idPenugasanDetail), detail])
            .filter(([id]) => id));
        const rows = Array.isArray(revisions) && revisions.length
            ? revisions
            : detailRows;
        return (rows || []).map((row = {}, index) => {
            const rawDetailId = safeString(row.id_penugasan_detail || row.idPenugasanDetail || '').trim();
            const detail = detailById.get(rawDetailId) || detailRows[index] || row || {};
            const resolvedDetailId = safeString(rawDetailId || detail.id_penugasan_detail || detail.idPenugasanDetail || '').trim();
            const parameterMetode = pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};
            const parameter = pickObject(parameterMetode, ['parameter', 'Parameter']) || {};
            const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};
            return {
                idPenugasanDetail: resolvedDetailId || null,
                namaParameter: row.namaParameter || row.nama_parameter ||
                    detail.namaParameter || detail.nama_parameter ||
                    parameter.namaParameter || parameter.nama_parameter || parameterMetode.namaParameter || parameterMetode.nama_parameter ||
                    `Parameter ${index + 1}`,
                acuanMetode: row.acuanMetode || row.acuan_metode || row.namaMetode || row.nama_metode ||
                    detail.acuanMetode || detail.acuan_metode ||
                    parameterMetode.acuanMetode || parameterMetode.acuan_metode || metode.namaMetode || metode.nama_metode || '-',
                catatanRevisi: row.catatanRevisi || row.catatan_revisi || row.catatan || null,
            };
        });
    };
    getPenugasanDetailsForNotification = async (idPenugasanDetailList = []) => {
        const detailIds = this.normalizeNotificationIdList(idPenugasanDetailList);
        if (!detailIds.length)
            return [];
        const rows = await PenugasanDetail.findAll({
            where: { id_penugasan_detail: { [Op.in]: detailIds } },
            include: [
                {
                    model: Penugasan,
                    required: false,
                    include: [
                        {
                            model: User,
                            as: 'Analis',
                            required: false,
                            attributes: ['nik', 'username', 'email'],
                        },
                    ],
                },
                {
                    model: ParameterMetode,
                    required: false,
                    include: [
                        { model: Parameter, required: false },
                        { model: Metode, required: false },
                    ],
                },
            ],
        });
        return rows.map(getPlain).filter(Boolean);
    };
    notifyRevisiKasiKePenyelia = async ({ noSampel, catatanRevisi, idPenugasanDetailList = [], revisions = [] } = {}) => {
        const sampleNo = safeString(noSampel).trim();
        const note = safeString(catatanRevisi).trim();
        const detailIds = this.normalizeNotificationIdList(idPenugasanDetailList);
        if (!sampleNo)
            throw new Error('Nomor sampel wajib dikirim.');
        if (!note)
            throw new Error('Catatan revisi wajib diisi.');
        if (!detailIds.length)
            throw new Error('ID detail penugasan revisi wajib dikirim.');
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.REVISI_KASI_KE_PENYELIA, {
            deskripsi: 'Revisi Kasi Pengujian menunggu persetujuan Penyelia',
            konteks: 'PENUGASAN',
        });
        const details = await this.getPenugasanDetailsForNotification(detailIds);
        const penyeliaNikList = Array.from(new Set(details
            .map((detail) => {
            const penugasan = pickObject(detail, ['penugasan', 'Penugasan']) || {};
            return penugasan.assigned_by || penugasan.assignedBy || null;
        })
            .filter(Boolean)));
        let recipients = [];
        if (penyeliaNikList.length) {
            const rows = await User.findAll({
                where: { nik: { [Op.in]: penyeliaNikList }, is_active: 1 },
                include: [{ model: Pegawai, required: false }],
            });
            recipients = rows.map((row) => {
                const user = getPlain(row) || {};
                const pegawai = user.pegawai || user.Pegawai || {};
                return {
                    ...user,
                    namaPegawai: pegawai.namaPegawai || pegawai.nama_pegawai || user.namaPegawai || user.nama_pegawai || null,
                };
            });
        }
        if (!recipients.length) {
            recipients = await getActiveUsersByRole(Roles.PENYELIA);
        }
        const items = this.mapRevisionItemsForEmail(revisions, details);
        const reviewLink = buildPenyeliaAssignmentLink();
        const results = [];
        for (const penyelia of recipients) {
            const nik = penyelia.nik;
            if (!nik)
                continue;
            const firstPenugasan = details
                .map((detail) => pickObject(detail, ['penugasan', 'Penugasan']) || {})
                .find((penugasan) => penugasan.id_penugasan);
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: null,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: firstPenugasan?.id_penugasan || null,
            });
            try {
                const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
                const { subject, body, html } = buildKasiRevisionApprovalNeededEmail({
                    penyelia,
                    noSampel: sampleNo,
                    catatanRevisi: note,
                    items,
                    reviewLink,
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim email revisi Kasi Pengujian ke Penyelia:', error);
            }
        }
        return results;
    };
    notifyRevisiKasiDitolakKeKasi = async ({ noSampel, catatanTinjauan, kasiNik, idPenugasanDetailList = [], items = [] } = {}) => {
        const sampleNo = safeString(noSampel).trim();
        const targetNik = safeString(kasiNik).trim();
        if (!sampleNo)
            throw new Error('Nomor sampel wajib dikirim.');
        if (!targetNik)
            throw new Error('NIK Kasi Pengujian penerima wajib dikirim.');
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.REVISI_KASI_DITOLAK_KE_KASI, {
            deskripsi: 'Revisi Kasi Pengujian ditolak oleh Penyelia',
            konteks: 'PENUGASAN',
        });
        const details = await this.getPenugasanDetailsForNotification(idPenugasanDetailList);
        const emailItems = this.mapRevisionItemsForEmail(items, details);
        const reviewLink = buildKasiReviewLink(sampleNo);
        const kasiInstance = await User.findOne({
            where: { nik: targetNik, is_active: 1 },
            include: [{ model: Pegawai, required: false }],
        });
        if (!kasiInstance) {
            const err = new Error('User Kasi Pengujian penerima tidak ditemukan atau tidak aktif.');
            err.statusCode = 404;
            throw err;
        }
        const kasi = getPlain(kasiInstance) || {};
        const pegawai = kasi.pegawai || kasi.Pegawai || {};
        const penerima = {
            ...kasi,
            nama_pegawai: pegawai.nama_pegawai || kasi.nama_pegawai || null,
        };
        const log = await createEmailLog({
            idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
            penerimaUserNik: targetNik,
            penerimaPelangganId: null,
            idRegistrasi: null,
            idJadwalLhu: null,
            nomorLhu: null,
            idPenugasan: null,
        });
        try {
            const to = await resolveRecipientEmail({ penerimaUserNik: targetNik, penerimaPelangganId: null });
            const { subject, body, html } = buildKasiRevisionRejectedEmail({
                kasi: penerima,
                noSampel: sampleNo,
                catatanTinjauan: catatanTinjauan || '-',
                items: emailItems,
                reviewLink,
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    notifyRevisiKasiPengujian = async ({ noSampel, catatanRevisi, idPenugasanDetailList = [] }) => {
        const sampleNo = safeString(noSampel).trim();
        const note = safeString(catatanRevisi).trim();
        if (!sampleNo)
            throw new Error('Nomor sampel wajib dikirim.');
        if (!note)
            throw new Error('Catatan revisi wajib diisi.');
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.REVISI_KASI_PENGUJIAN);
        const targets = await findRevisionTargetsBySample(sampleNo, idPenugasanDetailList);
        if (!targets.length) {
            const err = new Error('Target analis untuk notifikasi revisi Kasi Pengujian tidak ditemukan.');
            err.statusCode = 404;
            throw err;
        }
        const results = [];
        for (const target of targets) {
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: target.penerima_user_nik,
                penerimaPelangganId: null,
                idRegistrasi: null,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: target.id_penugasan,
            });
            try {
                const to = await resolveRecipientEmail({
                    penerimaUserNik: target.penerima_user_nik,
                    penerimaPelangganId: null,
                });
                const { subject, body, html } = buildTestResultRevisionByKasiEmail({
                    analis: target.analis,
                    noSampel: sampleNo,
                    catatanRevisi: note,
                    items: target.items,
                    testingLink: buildAnalisTestingLink(target.items?.[0]?.id_penugasan_detail, target.id_penugasan),
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim email revisi Kasi Pengujian:', error);
            }
        }
        return results;
    };
    notifySubkontrakPerluDiisi = async (items = []) => {
        // Filter items that still need manual entry (statusHasil is 'Belum Diisi')
        const itemsToFill = Array.isArray(items)
            ? items.filter((item) => item.status_hasil === 'Belum Diisi' ||
                item.statusHasil === 'Belum Diisi')
            : [];
        if (itemsToFill.length === 0) {
            return [];
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.SUBKONTRAK_PERLU_DIISI);
        const penyeliaRows = await User.findAll({
            where: {
                id_role: Roles.PENYELIA,
                is_active: 1,
            },
            include: [
                {
                    model: Pegawai,
                    required: false,
                },
            ],
        });
        const results = [];
        for (const instance of penyeliaRows) {
            const penerima = getPlain(instance) || {};
            const pegawai = penerima.pegawai || penerima.Pegawai || {};
            const penerimaNik = penerima.nik;
            if (!penerimaNik)
                continue;
            const existingToday = await NotifikasiEmail.findOne({
                where: {
                    ...buildEmailLogWhere({
                        idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                        penerimaUserNik: penerimaNik,
                    }),
                    dibuat_pada: {
                        [Op.gte]: startOfToday(),
                        [Op.lt]: startOfTomorrow(),
                    },
                },
            });
            if (existingToday) {
                results.push({
                    penerimaUserNik: penerimaNik,
                    skipped: true,
                    reason: 'Notifikasi subkontrak sudah dikirim hari ini.',
                });
                continue;
            }
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: penerimaNik,
                penerimaPelangganId: null,
                idRegistrasi: null,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: null,
            });
            try {
                const to = await resolveRecipientEmail({
                    penerimaUserNik: penerimaNik,
                    penerimaPelangganId: null,
                });
                const { subject, body, html } = buildSubcontractResultEntryEmail({
                    penerima: {
                        ...penerima,
                        namaPegawai: pegawai.namaPegawai || pegawai.nama_pegawai || null,
                    },
                    items: itemsToFill,
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim email pengingat hasil subkontrak:', error);
            }
        }
        return results;
    };
}
const notificationService = new NotificationService();
Object.assign(notificationService, { notifyAdminPermohonanBaru, notifyRequestStatusChanged, notifyInvoiceReady, notifyDeferredPaymentMarked, notifySamplesReceived, notifyLhuReady, notifyPaymentCompletedToAdmin, notifyPaymentCompletedToCustomer, notifyCustomerRequestCancelledToAdmin, notifyCustomerRequestCancelledToCustomer, notifyJadwalPengambilanLhu, notifyJadwalSampel, notifyScheduleChangeRejectedToCustomer, notifyScheduleChangeApprovedToCustomer, notifyScheduleChangeSubmittedToAdmin, notifyKasiMetodePerluDitentukan, notifyPenyeliaPenugasanSampelMasuk, notifyDeadlineAnalisDekat, notifyPenugasanAnalisBaru, notifyAnalisSubmitKePenyelia, notifyPenyeliaApproveKeKasi, findNotificationTypeById });
module.exports = notificationService;
module.exports.NotificationService = NotificationService;