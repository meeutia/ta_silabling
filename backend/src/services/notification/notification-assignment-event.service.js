const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../../config/database');
const { NotifikasiEmail, Penugasan, PenugasanDetail, PenugasanItem, Fppl, FpplSampel, Sampel, SampelParameter, FpplParameterMetode, ParameterMetode, Parameter, Metode, Lka, LkaHasil, User, Pegawai, } = require('../../models/Associations');
const { NOTIFICATION_TYPE, STATUS_PENGIRIMAN_EMAIL, NOTIFICATION_REFERENCE_TYPE, } = require('../../constants/notification.constant');
const { buildKasiReviewLink, buildPenyeliaReviewLink, safeString, } = require('./notification-format.util');
const { addDays, buildEmailLogWhere, createEmailLog, findNotificationTypeById, findOrCreateNotificationTypeById, getPlain, markEmailFailed, markEmailSent, resolveRecipientEmail, sendNotificationEmail, startOfToday, startOfTomorrow, toDateOnly, } = require('./notification-core.service');
const { buildDeadlineAnalisDekatEmail, } = require('../../templates/email/deadline-analis-dekat.template');
const { buildAnalystAssignmentCreatedEmail, } = require('../../templates/email/analyst-assignment-created.template');
const { buildAnalystSubmitToSupervisorEmail, } = require('../../templates/email/analyst-submit-to-supervisor.template');
const { buildSupervisorApprovedToKasiEmail, buildSupervisorApprovedKasiRevisionToKasiEmail, } = require('../../templates/email/supervisor-approved-to-kasi.template');
const { getPenugasanParameterMethodGroups, getPenugasanSampleNos, } = require('./notification-query.service');
class NotificationAssignmentEventService {
notifyDeadlineAnalisDekat = async ({ daysAhead = 2 } = {}) => {
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.DEADLINE_ANALIS_DEKAT);
        const today = toDateOnly(new Date());
        const maxDate = toDateOnly(addDays(new Date(), daysAhead));
        const detailInstances = await PenugasanDetail.findAll({
            where: {
                tanggal_tenggat: {
                    [Op.between]: [today, maxDate],
                },
                status_detail: {
                    [Op.in]: ['Ditugaskan', 'Sedang Dikerjakan', 'Perlu Revisi'],
                },
            },
            include: [
                {
                    model: Penugasan,
                    required: true,
                    where: {
                        status_penugasan: 'Aktif',
                    },
                    include: [
                        {
                            model: User,
                            as: 'Analis',
                            required: true,
                            attributes: ['nik', 'username', 'email'],
                        },
                    ],
                },
                {
                    model: ParameterMetode,
                    required: false,
                    include: [
                        {
                            model: Parameter,
                            required: false,
                            attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter']
                        },
                        {
                            model: Metode,
                            required: false,
                        },
                    ],
                },
            ],
            order: [
                ['tanggal_tenggat', 'ASC'],
                ['id_penugasan', 'ASC'],
                ['id_penugasan_detail', 'ASC'],
            ],
        });
        const rows = detailInstances.map(getPlain);
        const groupedByPenugasan = new Map();
        for (const detail of rows) {
            const penugasan = detail.penugasan || detail.Penugasan || {};
            const analis = penugasan.Analis || penugasan.analis || {};
            if (!penugasan.id_penugasan || !penugasan.id_user_analis)
                continue;
            const key = penugasan.id_penugasan;
            if (!groupedByPenugasan.has(key)) {
                groupedByPenugasan.set(key, {
                    penugasan,
                    analis,
                    details: [],
                });
            }
            const parameterMetode = detail.parameter_metode ||
                detail.ParameterMetode ||
                {};
            const parameter = parameterMetode.parameter ||
                parameterMetode.Parameter ||
                {};
            const metode = parameterMetode.metode ||
                parameterMetode.Metode ||
                {};
            groupedByPenugasan.get(key).details.push({
                id_penugasan_detail: detail.id_penugasan_detail,
                tanggal_tenggat: detail.tanggal_tenggat,
                status_detail: detail.status_detail,
                nama_parameter: parameter.nama_parameter ||
                    parameter.nama ||
                    parameterMetode.nama_parameter ||
                    '-',
                metode: metode.acuan_metode ||
                    metode.nama_metode ||
                    metode.nama ||
                    parameterMetode.acuan_metode ||
                    '-',
            });
        }
        const results = [];
        for (const group of groupedByPenugasan.values()) {
            const { penugasan, analis, details } = group;
            const existingToday = await NotifikasiEmail.findOne({
                where: {
                    ...buildEmailLogWhere({
                        idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                        penerimaUserNik: penugasan.id_user_analis,
                        idPenugasan: penugasan.id_penugasan,
                    }),
                    dibuat_pada: {
                        [Op.gte]: startOfToday(),
                        [Op.lt]: startOfTomorrow(),
                    },
                },
            });
            if (existingToday) {
                results.push({
                    id_penugasan: penugasan.id_penugasan,
                    skipped: true,
                    reason: 'Notifikasi deadline analis dekat sudah dikirim hari ini.',
                });
                continue;
            }
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: penugasan.id_user_analis,
                penerimaPelangganId: null,
                idRegistrasi: null,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: penugasan.id_penugasan,
            });
            try {
                const to = await resolveRecipientEmail({
                    penerimaUserNik: penugasan.id_user_analis,
                    penerimaPelangganId: null,
                });
                const { subject, body, html } = buildDeadlineAnalisDekatEmail({
                    analis,
                    penugasan,
                    details,
                });
                await sendNotificationEmail({ to, subject, body, html });
                await markEmailSent(log);
                results.push({
                    id_penugasan: penugasan.id_penugasan,
                    status: STATUS_PENGIRIMAN_EMAIL.TERKIRIM,
                });
            }
            catch (error) {
                await markEmailFailed(log, error);
                results.push({
                    id_penugasan: penugasan.id_penugasan,
                    status: STATUS_PENGIRIMAN_EMAIL.GAGAL,
                    error: error.message,
                });
            }
        }
        return results;
    };
    notifyAnalisSubmitKePenyelia = async (idPenugasanDetail) => {
        const detailId = safeString(idPenugasanDetail).trim();
        if (!detailId) {
            const err = new Error('ID detail penugasan wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.ANALIS_SUBMIT_KE_PENYELIA);
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
                    model: PenugasanItem,
                    required: false,
                    attributes: ['no_sampel'],
                },
            ],
        });
        if (!detailInstance) {
            const err = new Error('Detail penugasan tidak ditemukan.');
            err.statusCode = 404;
            throw err;
        }
        const detail = getPlain(detailInstance);
        const penugasan = detail.penugasan || detail.Penugasan || {};
        const analis = penugasan.Analis || penugasan.analis || {};
        const penyeliaNik = penugasan.assigned_by;
        if (!penyeliaNik) {
            const err = new Error('Penyelia pada penugasan tidak ditemukan.');
            err.statusCode = 400;
            throw err;
        }
        const items = detail.penugasan_items ||
            detail.PenugasanItems ||
            detail.penugasan_item ||
            detail.PenugasanItem ||
            [];
        const sampleNos = Array.from(new Set((Array.isArray(items) ? items : [])
            .map((item) => safeString(item?.no_sampel).trim())
            .filter(Boolean))).sort();
        const totalSelesai = await PenugasanDetail.count({
            where: {
                id_penugasan: penugasan.id_penugasan,
                status_detail: {
                    [Op.in]: ['Worksheet Terkirim', 'Disetujui', 'Selesai'],
                },
            },
        });
        const penyeliaInstance = await User.findOne({
            where: { nik: penyeliaNik },
            include: [
                {
                    model: Pegawai,
                    required: false,
                },
            ],
        });
        const penyelia = getPlain(penyeliaInstance) || {};
        const pegawaiPenyelia = penyelia.pegawai || penyelia.Pegawai || {};
        const log = await createEmailLog({
            idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
            penerimaUserNik: penyeliaNik,
            penerimaPelangganId: null,
            idRegistrasi: null,
            idJadwalLhu: null,
            nomorLhu: null,
            idPenugasan: penugasan.id_penugasan || null,
        });
        try {
            const to = await resolveRecipientEmail({
                penerimaUserNik: penyeliaNik,
                penerimaPelangganId: null,
            });
            const { subject, body, html } = buildAnalystSubmitToSupervisorEmail({
                penyelia: {
                    ...penyelia,
                    nama_pegawai: pegawaiPenyelia.nama_pegawai || null,
                },
                analis,
                sampleNos,
                totalSelesai,
                reviewLink: buildPenyeliaReviewLink(penugasan.id_penugasan, detailId),
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    getRegistrasiIdsForPenugasanDetail = async (idPenugasanDetail) => {
        const rows = await sequelize.query(`
        SELECT DISTINCT fs.id_registrasi
        FROM penugasan_item pi
        INNER JOIN sampel s ON s.no_sampel = pi.no_sampel
        INNER JOIN fppl_sampel fs
          ON fs.id_registrasi = s.id_registrasi
         AND fs.id_jenis_sampel = s.id_jenis_sampel
         AND fs.id_reg_bm = s.id_reg_bm
        WHERE pi.id_penugasan_detail = :idPenugasanDetail
          AND fs.id_registrasi IS NOT NULL
      `, {
            replacements: { idPenugasanDetail },
            type: QueryTypes.SELECT,
        });
        return rows
            .map((row) => safeString(row.id_registrasi).trim())
            .filter(Boolean);
    };
    getKasiReadinessByRegistrasi = async (idRegistrasi) => {
        const rows = await sequelize.query(`
        SELECT
          s.no_sampel,
          sp.id_fppl_parameter_metode,
          fpm.id_metode_parameter,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM lka_hasil lh
              INNER JOIN lka l ON l.kode_lka = lh.kode_lka
              INNER JOIN penugasan_detail pd ON pd.id_penugasan_detail = l.id_penugasan_detail
              INNER JOIN penugasan_item pi ON pi.id_penugasan_detail = pd.id_penugasan_detail
              INNER JOIN penugasan p ON p.id_penugasan = pd.id_penugasan
              WHERE lh.no_sampel = s.no_sampel
                AND pi.no_sampel = s.no_sampel
                AND pd.id_metode_parameter = fpm.id_metode_parameter
                AND p.status_penugasan <> 'Dibatalkan'
                AND TRIM(COALESCE(lh.hasil, '')) <> ''
                AND (
                  lh.status_review_hasil IN (
                    'Disetujui Penyelia',
                    'Menunggu Verifikasi Kasi Pengujian',
                    'Disetujui Kasi Pengujian'
                  )
                  OR l.status_lka IN (
                    'Disetujui Penyelia',
                    'Menunggu Verifikasi Kasi Pengujian',
                    'Disetujui Kasi Pengujian'
                  )
                )
              LIMIT 1
            ) THEN 1
            ELSE 0
          END AS is_ready_for_kasi
        FROM sampel s
        INNER JOIN fppl_sampel fs
          ON fs.id_registrasi = s.id_registrasi
         AND fs.id_jenis_sampel = s.id_jenis_sampel
         AND fs.id_reg_bm = s.id_reg_bm
        INNER JOIN sampel_parameter sp ON sp.no_sampel = s.no_sampel
        INNER JOIN fppl_parameter_metode fpm
          ON fpm.id_fppl_parameter_metode = sp.id_fppl_parameter_metode
        WHERE fs.id_registrasi = :idRegistrasi
          AND fpm.id_metode_parameter IS NOT NULL
        ORDER BY s.no_sampel ASC, sp.id_fppl_parameter_metode ASC
      `, {
            replacements: { idRegistrasi },
            type: QueryTypes.SELECT,
        });
        const sampleNos = Array.from(new Set(rows.map((row) => safeString(row.no_sampel).trim()).filter(Boolean))).sort();
        const totalParameter = rows.length;
        const totalReady = rows.filter((row) => Number(row.is_ready_for_kasi) === 1).length;
        return {
            idRegistrasi,
            sampleNos,
            totalSample: sampleNos.length,
            totalParameter,
            totalReady,
            isReady: totalParameter > 0 && totalReady === totalParameter,
        };
    };

    getSamplesForPenugasanDetail = async (idPenugasanDetail) => {
        const detailId = safeString(idPenugasanDetail).trim();
        if (!detailId)
            return [];
        const rows = await sequelize.query(`
        SELECT DISTINCT
          s.no_sampel,
          s.id_registrasi
        FROM penugasan_item pi
        INNER JOIN sampel s
          ON s.no_sampel = pi.no_sampel
        WHERE pi.id_penugasan_detail = :idPenugasanDetail
          AND s.no_sampel IS NOT NULL
        ORDER BY s.no_sampel ASC
      `, {
            replacements: { idPenugasanDetail: detailId },
            type: QueryTypes.SELECT,
        });
        return rows
            .map((row) => ({
            noSampel: safeString(row.no_sampel).trim(),
            no_sampel: safeString(row.no_sampel).trim(),
            idRegistrasi: safeString(row.id_registrasi).trim(),
            id_registrasi: safeString(row.id_registrasi).trim(),
        }))
            .filter((row) => row.no_sampel);
    };
    getKasiReadinessBySampleNos = async (sampleNos = []) => {
        const nos = Array.from(new Set((Array.isArray(sampleNos) ? sampleNos : [sampleNos])
            .map((value) => safeString(value).trim())
            .filter(Boolean)));
        if (!nos.length)
            return [];
        const rows = await sequelize.query(`
        SELECT
          s.no_sampel,
          s.id_registrasi,
          sp.id_fppl_parameter_metode,
          fpm.id_metode_parameter,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM lka_hasil lh
              INNER JOIN lka l
                ON l.kode_lka = lh.kode_lka
              INNER JOIN penugasan_detail pd
                ON pd.id_penugasan_detail = l.id_penugasan_detail
              INNER JOIN penugasan_item pi
                ON pi.id_penugasan_detail = pd.id_penugasan_detail
              INNER JOIN penugasan p
                ON p.id_penugasan = pd.id_penugasan
              WHERE lh.no_sampel = s.no_sampel
                AND pi.no_sampel = s.no_sampel
                AND pd.id_metode_parameter = fpm.id_metode_parameter
                AND p.status_penugasan <> 'Dibatalkan'
                AND TRIM(COALESCE(lh.hasil, '')) <> ''
                AND lh.status_review_hasil IN (
                  'Disetujui Penyelia',
                  'Menunggu Verifikasi Kasi Pengujian',
                  'Disetujui Kasi Pengujian'
                )
              LIMIT 1
            ) THEN 1
            ELSE 0
          END AS is_ready_for_kasi
        FROM sampel s
        INNER JOIN sampel_parameter sp
          ON sp.no_sampel = s.no_sampel
        INNER JOIN fppl_parameter_metode fpm
          ON fpm.id_fppl_parameter_metode = sp.id_fppl_parameter_metode
        WHERE s.no_sampel IN (:sampleNos)
          AND fpm.id_metode_parameter IS NOT NULL
        ORDER BY s.no_sampel ASC, sp.id_fppl_parameter_metode ASC
      `, {
            replacements: { sampleNos: nos },
            type: QueryTypes.SELECT,
        });
        const grouped = new Map();
        for (const noSampel of nos) {
            grouped.set(noSampel, {
                noSampel,
                no_sampel: noSampel,
                idRegistrasi: null,
                id_registrasi: null,
                sampleNos: [noSampel],
                sample_nos: [noSampel],
                totalSample: 1,
                total_sample: 1,
                totalParameter: 0,
                total_parameter: 0,
                totalReady: 0,
                total_ready: 0,
                isReady: false,
                is_ready: false,
            });
        }
        for (const row of rows) {
            const noSampel = safeString(row.no_sampel).trim();
            if (!noSampel)
                continue;
            if (!grouped.has(noSampel)) {
                grouped.set(noSampel, {
                    noSampel,
                    no_sampel: noSampel,
                    idRegistrasi: null,
                    id_registrasi: null,
                    sampleNos: [noSampel],
                    sample_nos: [noSampel],
                    totalSample: 1,
                    total_sample: 1,
                    totalParameter: 0,
                    total_parameter: 0,
                    totalReady: 0,
                    total_ready: 0,
                    isReady: false,
                    is_ready: false,
                });
            }
            const item = grouped.get(noSampel);
            item.idRegistrasi = item.idRegistrasi || safeString(row.id_registrasi).trim() || null;
            item.id_registrasi = item.id_registrasi || safeString(row.id_registrasi).trim() || null;
            item.totalParameter += 1;
            item.total_parameter = item.totalParameter;
            if (Number(row.is_ready_for_kasi) === 1) {
                item.totalReady += 1;
                item.total_ready = item.totalReady;
            }
        }
        for (const item of grouped.values()) {
            item.isReady = item.totalParameter > 0 && item.totalReady === item.totalParameter;
            item.is_ready = item.isReady;
        }
        return Array.from(grouped.values());
    };
    getKasiRevisionReadyForKasiContextBySample = async (noSampel) => {
        const sampleNo = safeString(noSampel).trim();
        if (!sampleNo) {
            return {
                isRevisionReturn: false,
                sampleNos: [],
                items: [],
                idPenugasan: null,
                id_penugasan: null,
            };
        }
        const rows = await sequelize.query(`
        SELECT DISTINCT
          lr.id_revisi_lka,
          lr.kode_lka,
          lr.no_sampel,
          lr.catatan_revisi,
          pd.id_penugasan,
          pd.id_penugasan_detail,
          par.nama_parameter,
          m.nama_metode,
          COALESCE(pm.acuan_metode, m.nama_metode) AS acuan_metode
        FROM lka_revisi lr
        INNER JOIN lka l
          ON l.kode_lka = lr.kode_lka
        INNER JOIN penugasan_detail pd
          ON pd.id_penugasan_detail = l.id_penugasan_detail
        LEFT JOIN parameter_metode pm
          ON pm.id_metode_parameter = pd.id_metode_parameter
        LEFT JOIN parameter par
          ON par.id_parameter = pm.id_parameter
        LEFT JOIN metode m
          ON m.id_metode = pm.id_metode
        WHERE lr.no_sampel = :noSampel
          AND lr.sumber_revisi = 'KASI_PENGUJIAN'
          AND lr.status_revisi = 'Disetujui Penyelia'
        ORDER BY lr.ditinjau_pada DESC, lr.id_revisi_lka DESC, par.nama_parameter ASC
      `, {
            replacements: { noSampel: sampleNo },
            type: QueryTypes.SELECT,
        });
        const items = rows.map((row) => ({
            idRevisiLka: row.id_revisi_lka || null,
            id_revisi_lka: row.id_revisi_lka || null,
            kodeLka: row.kode_lka || null,
            kode_lka: row.kode_lka || null,
            noSampel: row.no_sampel || null,
            no_sampel: row.no_sampel || null,
            idPenugasan: row.id_penugasan || null,
            id_penugasan: row.id_penugasan || null,
            idPenugasanDetail: row.id_penugasan_detail || null,
            id_penugasan_detail: row.id_penugasan_detail || null,
            namaParameter: row.nama_parameter || '-',
            nama_parameter: row.nama_parameter || '-',
            namaMetode: row.nama_metode || '-',
            nama_metode: row.nama_metode || '-',
            acuanMetode: row.acuan_metode || row.nama_metode || '-',
            acuan_metode: row.acuan_metode || row.nama_metode || '-',
            catatanRevisi: row.catatan_revisi || null,
            catatan_revisi: row.catatan_revisi || null,
        }));
        return {
            isRevisionReturn: items.length > 0,
            sampleNos: items.length ? [sampleNo] : [],
            items,
            idPenugasan: items[0]?.id_penugasan || null,
            id_penugasan: items[0]?.id_penugasan || null,
        };
    };
    getFpplNotificationInfo = async (idRegistrasi) => {
        const fppl = await Fppl.findOne({
            where: { id_registrasi: idRegistrasi },
            attributes: ['id_registrasi', 'nomor_fppl'],
        });
        return getPlain(fppl) || { id_registrasi: idRegistrasi, nomor_fppl: null };
    };
    getKasiRevisionReadyForKasiContext = async (idRegistrasi) => {
        const registrationId = safeString(idRegistrasi).trim();
        if (!registrationId) {
            return {
                isRevisionReturn: false,
                sampleNos: [],
                items: [],
                idPenugasan: null,
            };
        }
        const rows = await sequelize.query(`
        SELECT DISTINCT
          lr.id_revisi_lka,
          lr.kode_lka,
          lr.no_sampel,
          lr.catatan_revisi,
          pd.id_penugasan,
          pd.id_penugasan_detail,
          par.nama_parameter,
          m.nama_metode,
          COALESCE(pm.acuan_metode, m.nama_metode) AS acuan_metode
        FROM lka_revisi lr
        INNER JOIN lka l
          ON l.kode_lka = lr.kode_lka
        INNER JOIN penugasan_detail pd
          ON pd.id_penugasan_detail = l.id_penugasan_detail
        LEFT JOIN parameter_metode pm
          ON pm.id_metode_parameter = pd.id_metode_parameter
        LEFT JOIN parameter par
          ON par.id_parameter = pm.id_parameter
        LEFT JOIN metode m
          ON m.id_metode = pm.id_metode
        INNER JOIN sampel s
          ON s.no_sampel = lr.no_sampel
        INNER JOIN fppl_sampel fs
          ON fs.id_registrasi = s.id_registrasi
         AND fs.id_jenis_sampel = s.id_jenis_sampel
         AND fs.id_reg_bm = s.id_reg_bm
        WHERE fs.id_registrasi = :idRegistrasi
          AND lr.sumber_revisi = 'KASI_PENGUJIAN'
          AND lr.status_revisi = 'Disetujui Penyelia'
        ORDER BY lr.no_sampel ASC, par.nama_parameter ASC
      `, {
            replacements: { idRegistrasi: registrationId },
            type: QueryTypes.SELECT,
        });
        const items = rows.map((row) => ({
            idRevisiLka: row.id_revisi_lka || null,
            id_revisi_lka: row.id_revisi_lka || null,
            kodeLka: row.kode_lka || null,
            kode_lka: row.kode_lka || null,
            noSampel: row.no_sampel || null,
            no_sampel: row.no_sampel || null,
            idPenugasan: row.id_penugasan || null,
            id_penugasan: row.id_penugasan || null,
            idPenugasanDetail: row.id_penugasan_detail || null,
            id_penugasan_detail: row.id_penugasan_detail || null,
            namaParameter: row.nama_parameter || '-',
            nama_parameter: row.nama_parameter || '-',
            namaMetode: row.nama_metode || '-',
            nama_metode: row.nama_metode || '-',
            acuanMetode: row.acuan_metode || row.nama_metode || '-',
            acuan_metode: row.acuan_metode || row.nama_metode || '-',
            catatanRevisi: row.catatan_revisi || null,
            catatan_revisi: row.catatan_revisi || null,
        }));
        const sampleNos = Array.from(new Set(items.map((item) => safeString(item.no_sampel).trim()).filter(Boolean))).sort();
        return {
            isRevisionReturn: items.length > 0,
            sampleNos,
            items,
            idPenugasan: items[0]?.id_penugasan || null,
            id_penugasan: items[0]?.id_penugasan || null,
        };
    };
    notifyPenyeliaApproveKeKasi = async (idPenugasanDetail) => {
        const detailId = safeString(idPenugasanDetail).trim();
        if (!detailId) {
            const err = new Error('ID detail penugasan wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        const impactedSamples = await this.getSamplesForPenugasanDetail(detailId);
        if (!impactedSamples.length) {
            return [{
                    id_penugasan_detail: detailId,
                    skipped: true,
                    reason: 'Sampel pada detail penugasan tidak ditemukan.',
                }];
        }
        const recipients = await User.findAll({
            where: {
                id_role: require('../../constants/roles').KASI,
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
        const readinessRows = await this.getKasiReadinessBySampleNos(impactedSamples.map((sample) => sample.no_sampel));
        const fpplCache = new Map();
        for (const readiness of readinessRows) {
            const noSampel = safeString(readiness.no_sampel || readiness.noSampel).trim();
            const idRegistrasi = safeString(readiness.id_registrasi || readiness.idRegistrasi).trim();
            if (!noSampel) {
                results.push({
                    id_penugasan_detail: detailId,
                    skipped: true,
                    reason: 'Nomor sampel tidak valid untuk pengecekan kesiapan review Kasi.',
                });
                continue;
            }
            if (!readiness.isReady) {
                results.push({
                    no_sampel: noSampel,
                    id_registrasi: idRegistrasi || null,
                    skipped: true,
                    reason: `Belum semua parameter pada sampel ${noSampel} siap direview Kasi (${readiness.totalReady}/${readiness.totalParameter}).`,
                    total_ready: readiness.totalReady,
                    total_parameter: readiness.totalParameter,
                });
                continue;
            }
            if (!fpplCache.has(idRegistrasi)) {
                fpplCache.set(idRegistrasi, await this.getFpplNotificationInfo(idRegistrasi));
            }
            const fppl = fpplCache.get(idRegistrasi) || { id_registrasi: idRegistrasi, nomor_fppl: null };
            const revisionContext = await this.getKasiRevisionReadyForKasiContextBySample(noSampel);
            const isRevisionReturn = revisionContext.isRevisionReturn;
            const tipe = await findOrCreateNotificationTypeById(isRevisionReturn
                ? NOTIFICATION_TYPE.REVISI_KASI_SELESAI_KE_KASI
                : NOTIFICATION_TYPE.PENYELIA_APPROVE_KE_KASI, isRevisionReturn
                ? {
                    deskripsi: 'Perbaikan revisi Kasi disetujui Penyelia dan siap direview ulang Kasi Pengujian',
                    konteks: 'PENUGASAN',
                }
                : {
                    deskripsi: 'Penyelia menyetujui seluruh hasil satu sampel dan mengirim ke Kasi Pengujian',
                    konteks: 'PENUGASAN',
                });
            for (const instance of recipients) {
                const penerima = getPlain(instance) || {};
                const pegawai = penerima.pegawai || penerima.Pegawai || {};
                const penerimaNik = penerima.nik;
                if (!penerimaNik)
                    continue;
                const existingWhere = buildEmailLogWhere({
                    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                    penerimaUserNik: penerimaNik,
                    referensiTipe: NOTIFICATION_REFERENCE_TYPE.PENUGASAN,
                    referensiId: noSampel,
                });
                const existing = await NotifikasiEmail.findOne({
                    where: existingWhere,
                });
                if (existing) {
                    results.push({
                        penerima_user_nik: penerimaNik,
                        no_sampel: noSampel,
                        id_registrasi: idRegistrasi || null,
                        skipped: true,
                        reason: isRevisionReturn
                            ? 'Notifikasi revisi sampel siap review ulang Kasi sudah pernah dikirim.'
                            : 'Notifikasi sampel siap review Kasi sudah pernah dikirim.',
                    });
                    continue;
                }
                const log = await createEmailLog({
                    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                    penerimaUserNik: penerimaNik,
                    penerimaPelangganId: null,
                    referensiTipe: NOTIFICATION_REFERENCE_TYPE.PENUGASAN,
                    referensiId: noSampel,
                });
                try {
                    const to = await resolveRecipientEmail({
                        penerimaUserNik: penerimaNik,
                        penerimaPelangganId: null,
                    });
                    const penerimaEmail = {
                        ...penerima,
                        nama_pegawai: pegawai.nama_pegawai || null,
                    };
                    const emailPayload = isRevisionReturn
                        ? buildSupervisorApprovedKasiRevisionToKasiEmail({
                            penerima: penerimaEmail,
                            fppl,
                            idRegistrasi,
                            nomorFppl: fppl.nomor_fppl || null,
                            sampleNos: [noSampel],
                            items: revisionContext.items,
                            reviewLink: buildKasiReviewLink(noSampel),
                        })
                        : buildSupervisorApprovedToKasiEmail({
                            penerima: penerimaEmail,
                            fppl,
                            idRegistrasi,
                            nomorFppl: fppl.nomor_fppl || null,
                            sampleNos: [noSampel],
                            totalSample: 1,
                            totalParameter: readiness.totalParameter,
                            reviewLink: buildKasiReviewLink(noSampel),
                        });
                    await sendNotificationEmail({
                        to,
                        subject: emailPayload.subject,
                        body: emailPayload.body,
                        html: emailPayload.html,
                    });
                    results.push(await markEmailSent(log));
                }
                catch (error) {
                    results.push(await markEmailFailed(log, error));
                    console.error(isRevisionReturn
                        ? 'Gagal kirim notifikasi revisi sampel siap review ulang ke Kasi Pengujian:'
                        : 'Gagal kirim notifikasi sampel siap review ke Kasi Pengujian:', error);
                }
            }
        }
        return results;
    };
    notifyPenugasanAnalisBaru = async (idPenugasan) => {
        const penugasanId = safeString(idPenugasan).trim();
        if (!penugasanId) {
            const err = new Error('ID penugasan wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.PENUGASAN_ANALIS_BARU);
        const penugasanInstance = await Penugasan.findOne({
            where: { id_penugasan: penugasanId },
            include: [
                {
                    model: User,
                    as: 'Analis',
                    required: true,
                    attributes: ['nik', 'username', 'email'],
                },
            ],
        });
        if (!penugasanInstance) {
            const err = new Error('Penugasan tidak ditemukan.');
            err.statusCode = 404;
            throw err;
        }
        const penugasan = getPlain(penugasanInstance);
        const analis = penugasan.Analis || penugasan.analis || {};
        const analisNik = penugasan.id_user_analis;
        if (!analisNik) {
            const err = new Error('Analis pada penugasan tidak ditemukan.');
            err.statusCode = 400;
            throw err;
        }
        const samples = await getPenugasanSampleNos(penugasanId);
        const parameterMethodGroups = await getPenugasanParameterMethodGroups(penugasanId);
        const log = await createEmailLog({
            idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
            penerimaUserNik: analisNik,
            penerimaPelangganId: null,
            idRegistrasi: null,
            idJadwalLhu: null,
            nomorLhu: null,
            idPenugasan: penugasanId,
        });
        try {
            const to = await resolveRecipientEmail({
                penerimaUserNik: analisNik,
                penerimaPelangganId: null,
            });
            const { subject, body, html } = buildAnalystAssignmentCreatedEmail({
                analis,
                penugasan,
                samples,
                parameterMethodGroups,
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
}
module.exports = new NotificationAssignmentEventService();
module.exports.NotificationAssignmentEventService = NotificationAssignmentEventService;
