const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../../config/database');
const { Fppl, FpplSampel, JenisSampel, Lhu, Lka, LkaHasil, Metode, Parameter, ParameterMetode, Pelanggan, Pegawai, Penugasan, PenugasanDetail, PenugasanItem, Sampel, User, Role, } = require('../../models/Associations');
const { NOTIFICATION_TYPE } = require('../../constants/notification.constant');
const RequestStatus = require('../../constants/request-status');
const { LHU_STATUS } = require('../../constants/lhu-status.constant');
const { safeString } = require('./notification-format.util');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');
const { findNotificationTypeById, getPlain, pickArray, pickObject, } = require('./notification-core.service');
class NotificationQueryService {
getSampleNotificationContext = async (noSampel) => {
        const sampleNo = safeString(noSampel).trim();
        if (!sampleNo) {
            const err = new Error('Nomor sampel wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        const instance = await Sampel.findOne({
            where: { no_sampel: sampleNo },
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
                { model: Lhu, as: 'lhu', required: false },
            ],
        });
        if (!instance) {
            const err = new Error('Sampel tidak ditemukan untuk notifikasi.');
            err.statusCode = 404;
            throw err;
        }
        const sample = getPlain(instance) || {};
        const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
        const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
        const fppl = pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
        const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
        const lhu = pickObject(sample, ['lhu', 'Lhu']) || {};
        return toCamelCaseDeep({ sample, fpplSampel, jenis, fppl, pelanggan, lhu });
    };

    getKasiQcRequestNotificationContext = async (noSampel) => {
        const baseContext = await this.getSampleNotificationContext(noSampel);
        const idRegistrasi = safeString(baseContext.fpplSampel?.idRegistrasi || baseContext.fppl?.idRegistrasi || baseContext.sample?.idRegistrasi).trim();
        if (!idRegistrasi) {
            const err = new Error('ID registrasi permohonan tidak ditemukan dari nomor sampel.');
            err.statusCode = 400;
            throw err;
        }

        const requestInstance = await Fppl.findOne({
            where: { id_registrasi: idRegistrasi },
            include: [
                { model: Pelanggan, as: 'pelanggan', required: false },
            ],
        });
        const fppl = getPlain(requestInstance) || baseContext.fppl || {};
        const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || baseContext.pelanggan || {};

        const rows = await sequelize.query(`
            SELECT
              s.no_sampel,
              fs.id_registrasi,
              fs.id_jenis_sampel,
              fs.id_reg_bm,
              js.jenis_sampel,
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
                    AND lh.status_review_hasil = 'Disetujui Kasi Pengujian'
                  LIMIT 1
                ) THEN 1
                ELSE 0
              END AS is_approved_by_kasi
            FROM fppl_sampel fs
            INNER JOIN sampel s
              ON s.id_registrasi = fs.id_registrasi
             AND s.id_jenis_sampel = fs.id_jenis_sampel
             AND s.id_reg_bm = fs.id_reg_bm
            INNER JOIN sampel_parameter sp
              ON sp.no_sampel = s.no_sampel
            INNER JOIN fppl_parameter_metode fpm
              ON fpm.id_fppl_parameter_metode = sp.id_fppl_parameter_metode
            LEFT JOIN jenis_sampel js
              ON js.id_jenis_sampel = fs.id_jenis_sampel
            WHERE fs.id_registrasi = :idRegistrasi
              AND fpm.id_metode_parameter IS NOT NULL
            ORDER BY
              fs.id_jenis_sampel ASC,
              s.no_sampel ASC,
              sp.id_fppl_parameter_metode ASC
        `, {
            replacements: { idRegistrasi },
            type: QueryTypes.SELECT,
        });

        const sampleMap = new Map();
        const incompleteSampleMap = new Map();
        for (const row of rows) {
            const no = safeString(row.no_sampel).trim();
            if (!no) continue;
            if (!sampleMap.has(no)) {
                sampleMap.set(no, {
                    noSampel: no,
                    idRegistrasi: row.id_registrasi || idRegistrasi,
                    idJenisSampel: row.id_jenis_sampel || null,
                    idRegBm: row.id_reg_bm || null,
                    jenisSampel: row.jenis_sampel || null,
                    totalParameter: 0,
                    totalApprovedKasi: 0,
                });
            }
            const sample = sampleMap.get(no);
            sample.totalParameter += 1;
            if (Number(row.is_approved_by_kasi) === 1) {
                sample.totalApprovedKasi += 1;
            } else {
                incompleteSampleMap.set(no, sample);
            }
        }

        const samples = Array.from(sampleMap.values()).sort((a, b) => safeString(a.noSampel).localeCompare(safeString(b.noSampel), 'id', { numeric: true }));
        const incompleteSamples = Array.from(incompleteSampleMap.values()).sort((a, b) => safeString(a.noSampel).localeCompare(safeString(b.noSampel), 'id', { numeric: true }));
        const sampleNos = samples.map((sample) => sample.noSampel).filter(Boolean);
        const totalParameter = rows.length;
        const totalApprovedKasi = rows.filter((row) => Number(row.is_approved_by_kasi) === 1).length;
        const isComplete = totalParameter > 0 && totalApprovedKasi === totalParameter;

        return toCamelCaseDeep({
            ...baseContext,
            idRegistrasi,
            fppl,
            pelanggan,
            sampleNos,
            samples,
            totalSamples: samples.length,
            totalParameter,
            totalApprovedKasi,
            incompleteSamples,
            isComplete,
        });
    };

    getRequestLhuCompletionContext = async (nomorLhu) => {
        const lhuNo = safeString(nomorLhu).trim();
        const lhuInstance = await Lhu.findOne({
            where: { nomor_lhu: lhuNo },
            include: [
                {
                    model: Sampel,
                    as: 'sampels',
                    required: true,
                    include: [
                        {
                            model: FpplSampel,
                            as: 'fppl_sampel',
                            required: true,
                            include: [
                                {
                                    model: Fppl,
                                    as: 'fppl',
                                    required: true,
                                    include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        if (!lhuInstance) {
            const err = new Error('LHU tidak ditemukan untuk cek kelengkapan permohonan.');
            err.statusCode = 404;
            throw err;
        }
        const currentLhu = toCamelCaseDeep(getPlain(lhuInstance) || {});
        const currentSamples = currentLhu.sampels || [];
        const currentSample = Array.isArray(currentSamples) ? currentSamples[0] || {} : {};
        const currentFpplSampel = currentSample.fpplSampel || {};
        const fppl = currentFpplSampel.fppl || {};
        const pelanggan = fppl.pelanggan || {};
        const idRegistrasi = fppl.idRegistrasi || currentFpplSampel.idRegistrasi || null;
        if (!idRegistrasi) {
            const err = new Error('ID registrasi permohonan tidak ditemukan untuk cek kelengkapan LHU.');
            err.statusCode = 400;
            throw err;
        }
        const sampleInstances = await Sampel.findAll({
            include: [
                {
                    model: FpplSampel,
                    as: 'fppl_sampel',
                    required: true,
                    where: { id_registrasi: idRegistrasi },
                },
                {
                    model: Lhu,
                    as: 'lhu',
                    required: false,
                },
            ],
            order: [['no_sampel', 'ASC']],
        });
        const samples = sampleInstances.map((row) => toCamelCaseDeep(getPlain(row) || {}));
        const getSampleLhuRows = (sample = {}) => {
            const list = sample.lhus || [];
            if (Array.isArray(list) && list.length) return list.filter(Boolean);
            const single = sample.lhu || null;
            return single ? [single] : [];
        };
        const incompleteSamples = samples.filter((sample) => {
            const approvedFinalLhu = getSampleLhuRows(sample).find((lhu) => lhu && lhu.statusLhu === LHU_STATUS.APPROVED_FINAL);
            return !approvedFinalLhu;
        });
        const lhuRowsMap = new Map();
        samples.forEach((sample) => {
            getSampleLhuRows(sample).forEach((lhu) => {
                if (!lhu || lhu.statusLhu !== LHU_STATUS.APPROVED_FINAL)
                    return;
                const key = lhu.nomorLhu || lhu.idLhu;
                if (!key)
                    return;
                if (!lhuRowsMap.has(key)) {
                    lhuRowsMap.set(key, {
                        ...lhu,
                        sampels: [],
                    });
                }
                const current = lhuRowsMap.get(key);
                current.sampels.push({
                    noSampel: sample.noSampel,
                    statusSample: sample.statusSample,
                });
            });
        });
        const lhuRows = Array.from(lhuRowsMap.values()).sort((a, b) => safeString(a.nomorLhu).localeCompare(safeString(b.nomorLhu)));
        return toCamelCaseDeep({
            isComplete: samples.length > 0 && incompleteSamples.length === 0,
            idRegistrasi,
            fppl,
            pelanggan,
            totalSamples: samples.length,
            incompleteSamples,
            lhuRows,
        });
    };
    getPenugasanSampleNos = async (idPenugasan) => {
        const details = await PenugasanDetail.findAll({
            where: { id_penugasan: idPenugasan },
            attributes: ['id_penugasan_detail'],
            include: [
                {
                    model: PenugasanItem,
                    required: false,
                    attributes: ['no_sampel'],
                },
            ],
        });
        const rows = details.map(getPlain);
        const sampleNos = rows
            .flatMap((detail) => {
            const items = pickArray(detail, [
                'penugasan_items',
                'PenugasanItems',
                'penugasan_item',
                'PenugasanItem',
            ]);
            return items.map((item) => item.no_sampel).filter(Boolean);
        })
            .map((value) => String(value || '').trim())
            .filter(Boolean);
        return Array.from(new Set(sampleNos)).sort();
    };
    getParameterMetodeInfoFromDetail = (detail = {}) => {
        const parameterMetode = pickObject(detail, ['parameter_metode', 'ParameterMetode']);
        const parameter = pickObject(parameterMetode, ['parameter', 'Parameter']) ||
            pickObject(detail, ['parameter', 'Parameter']);
        const metode = pickObject(parameterMetode, ['metode', 'Metode']) ||
            pickObject(detail, ['metode', 'Metode']);
        const namaParameter = safeString(parameter.nama_parameter ||
            parameter.namaParameter ||
            parameterMetode.nama_parameter ||
            parameterMetode.namaParameter ||
            detail.nama_parameter ||
            detail.namaParameter ||
            '-').trim() || '-';
        const namaMetode = safeString(metode.nama_metode ||
            metode.namaMetode ||
            parameterMetode.nama_metode ||
            parameterMetode.namaMetode ||
            parameterMetode.acuan_metode ||
            parameterMetode.acuanMetode ||
            detail.nama_metode ||
            detail.namaMetode ||
            '-').trim() || '-';
        return {
            label: `${namaParameter} — ${namaMetode}`,
            namaParameter,
            namaMetode,
        };
    };
    getPenugasanParameterMethodGroups = async (idPenugasan) => {
        const details = await PenugasanDetail.findAll({
            where: { id_penugasan: idPenugasan },
            attributes: ['id_penugasan_detail', 'id_metode_parameter'],
            include: [
                {
                    model: ParameterMetode,
                    required: false,
                    include: [
                        { model: Parameter, required: false },
                        { model: Metode, required: false },
                    ],
                },
                {
                    model: PenugasanItem,
                    required: false,
                    attributes: ['no_sampel'],
                },
            ],
            order: [['id_penugasan_detail', 'ASC']],
        });
        const grouped = new Map();
        details.map(getPlain).forEach((detail) => {
            const { label, namaParameter, namaMetode } = this.getParameterMetodeInfoFromDetail(detail);
            const items = pickArray(detail, [
                'penugasan_items',
                'PenugasanItems',
                'penugasan_item',
                'PenugasanItem',
            ]);
            const sampleNos = Array.from(new Set(items
                .map((item) => safeString(item.no_sampel).trim())
                .filter(Boolean))).sort();
            if (!sampleNos.length)
                return;
            if (!grouped.has(label)) {
                grouped.set(label, {
                    parameter: namaParameter,
                    metode: namaMetode,
                    label,
                    samples: [],
                });
            }
            const current = grouped.get(label);
            sampleNos.forEach((noSampel) => {
                if (!current.samples.includes(noSampel))
                    current.samples.push(noSampel);
            });
        });
        return Array.from(grouped.values()).map((group) => ({
            ...group,
            samples: group.samples.sort(),
        }));
    };
    getRoleNameFallbacks = (roleId) => {
        const roleKey = safeString(roleId).trim();
        const map = {
            'RL-002': ['admin'],
            'RL-003': ['kasi'],
            'RL-004': ['penyelia'],
            'RL-005': ['analis'],
            'RL-006': ['qc', 'quality control'],
            'RL-007': ['kalab', 'kepala lab', 'kepala laboratorium'],
        };
        return map[roleKey] || [];
    };

    mapNotificationUser = (row) => {
        const user = toCamelCaseDeep(getPlain(row) || {});
        const pegawai = user.pegawai || {};
        return {
            ...user,
            namaPegawai: pegawai.namaPegawai || user.namaPegawai || null,
            noWa: pegawai.noWa || user.noWa || null,
        };
    };

    getActiveUsersByRole = async (roleId) => {
        const roleKey = safeString(roleId).trim();
        const baseInclude = [
            {
                model: Pegawai,
                required: false,
            },
            {
                model: Role,
                required: false,
            },
        ];
        const rows = await User.findAll({
            where: {
                id_role: roleKey,
                is_active: 1,
            },
            include: baseInclude,
            order: [['username', 'ASC']],
        });
        if (rows.length > 0) {
            return rows.map(this.mapNotificationUser);
        }

        const roleNameFallbacks = this.getRoleNameFallbacks(roleKey);
        if (!roleNameFallbacks.length) {
            return [];
        }
        const fallbackRows = await User.findAll({
            where: { is_active: 1 },
            include: [
                {
                    model: Pegawai,
                    required: false,
                },
                {
                    model: Role,
                    required: true,
                    where: {
                        [Op.or]: roleNameFallbacks.map((keyword) => ({
                            nama_role: { [Op.like]: `%${keyword}%` },
                        })),
                    },
                },
            ],
            order: [['username', 'ASC']],
        });
        return fallbackRows.map(this.mapNotificationUser);
    };
    getRequestWithCustomerAndSamples = async (idRegistrasi) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        const requestInstance = await Fppl.findOne({
            where: { id_registrasi: registrasiId },
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    required: false,
                },
                {
                    model: FpplSampel,
                    as: 'fppl_sampels',
                    required: false,
                    include: [
                        {
                            model: JenisSampel,
                            required: false,
                        },
                        {
                            model: Sampel,
                            as: 'sampels',
                            required: false,
                            attributes: ['no_sampel', 'diterima_pada', 'status_sample'],
                        },
                    ],
                },
            ],
        });
        if (!requestInstance) {
            const err = new Error('Permohonan tidak ditemukan.');
            err.statusCode = 404;
            throw err;
        }
        const request = toCamelCaseDeep(getPlain(requestInstance));
        const pelanggan = request.pelanggan || {};
        const fpplSampels = request.fpplSampels || [];
        const sampleSummary = fpplSampels.map((row) => {
            const jenis = row.jenisSampel || {};
            return {
                idRegistrasi: row.idRegistrasi || request.idRegistrasi || null,
                idJenisSampel: row.idJenisSampel || null,
                idRegBm: row.idRegBm || null,
                jenisSampel: jenis.jenisSampel || row.jenisSampel || row.namaJenisSampel || row.idJenisSampel,
                jumlahSampel: row.jumlahSampel || 1,
            };
        });
        const samples = fpplSampels.flatMap((row) => {
            const rows = row.sampels || [];
            return Array.isArray(rows)
                ? rows.map((sample) => ({
                    ...sample,
                    jenisSampel: (row.jenisSampel || {}).jenisSampel || row.jenisSampel || row.idJenisSampel || null,
                }))
                : [];
        });
        return { request, pelanggan, sampleSummary, samples };
    };
    getRequestAndCustomer = async (idRegistrasi) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        const requestInstance = await Fppl.findOne({
            where: { id_registrasi: registrasiId },
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    required: false,
                },
            ],
        });
        if (!requestInstance) {
            const err = new Error('Permohonan tidak ditemukan.');
            err.statusCode = 404;
            throw err;
        }
        const request = toCamelCaseDeep(getPlain(requestInstance));
        const pelanggan = request.pelanggan || {};
        const pelangganId = request.idPelanggan || pelanggan.idPelanggan;
        if (!pelangganId) {
            const err = new Error('Pelanggan penerima notifikasi tidak valid.');
            err.statusCode = 400;
            throw err;
        }
        return { request, pelanggan, pelangganId };
    };
    findNotificationTypeByIdOrNull = async (idTipeNotifikasi) => {
        try {
            return await findNotificationTypeById(idTipeNotifikasi);
        }
        catch {
            return null;
        }
    };
    resolveRequestStatusNotificationType = async (statusFppl) => {
        const status = safeString(statusFppl).trim();
        if (status === RequestStatus.WAITING_PARAMETER) {
            return findNotificationTypeById(NOTIFICATION_TYPE.PERMOHONAN_DITERIMA);
        }
        if ([RequestStatus.REJECTED, RequestStatus.REJECTED_BY_ADMIN, RequestStatus.REJECTED_BY_KASI, RequestStatus.REJECTED_BY_PENYELIA, RequestStatus.CANCELLED_BY_CUSTOMER].includes(status)) {
            return findNotificationTypeById(NOTIFICATION_TYPE.PERMOHONAN_DITOLAK);
        }
        if (status === RequestStatus.TESTING_PROCESS) {
            return (await this.findNotificationTypeByIdOrNull(NOTIFICATION_TYPE.PERMOHONAN_DIPROSES)) || this.findNotificationTypeByIdOrNull(NOTIFICATION_TYPE.MENUNGGU_SAMPEL);
        }
        return null;
    };
    normalizeIdList = (value) => {
        if (Array.isArray(value)) {
            return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
        }
        if (typeof value === 'string') {
            return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));
        }
        if (value === null || value === undefined)
            return [];
        const single = String(value || '').trim();
        return single ? [single] : [];
    };
    findRevisionTargetsBySample = async (noSampel, idPenugasanDetailList = []) => {
        const sampleNo = safeString(noSampel).trim();
        const selectedIds = this.normalizeIdList(idPenugasanDetailList);
        if (!sampleNo) {
            const err = new Error('Nomor sampel wajib dikirim untuk notifikasi revisi.');
            err.statusCode = 400;
            throw err;
        }
        if (!selectedIds.length) {
            const err = new Error('Pilih minimal satu parameter/metode yang perlu direvisi.');
            err.statusCode = 400;
            throw err;
        }
        const rows = await LkaHasil.findAll({
            where: { no_sampel: sampleNo },
            include: [
                {
                    model: Lka,
                    required: true,
                    include: [
                        {
                            model: PenugasanDetail,
                            required: true,
                            where: { id_penugasan_detail: { [Op.in]: selectedIds } },
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
                            ],
                        },
                    ],
                },
            ],
        });
        const map = new Map();
        rows.map(getPlain).forEach((row) => {
            const lka = row.lka || row.Lka || {};
            const detail = lka.penugasan_detail || lka.PenugasanDetail || {};
            const penugasan = detail.penugasan || detail.Penugasan || {};
            const analis = penugasan.Analis || penugasan.analis || {};
            const parameterMetode = detail.parameter_metode || detail.ParameterMetode || {};
            const parameter = parameterMetode.parameter || parameterMetode.Parameter || {};
            const metode = parameterMetode.metode || parameterMetode.Metode || {};
            const idPenugasan = penugasan.id_penugasan;
            const nikAnalis = penugasan.id_user_analis;
            if (!idPenugasan || !nikAnalis)
                return;
            if (!map.has(idPenugasan)) {
                map.set(idPenugasan, {
                    id_penugasan: idPenugasan,
                    penerima_user_nik: nikAnalis,
                    analis,
                    items: [],
                });
            }
            map.get(idPenugasan).items.push({
                id_penugasan_detail: detail.id_penugasan_detail,
                nama_parameter: parameter.nama_parameter || parameterMetode.nama_parameter || '-',
                acuan_metode: parameterMetode.acuan_metode || metode.nama_metode || '-',
            });
        });
        return Array.from(map.values());
    };
}
module.exports = new NotificationQueryService();
module.exports.NotificationQueryService = NotificationQueryService;
