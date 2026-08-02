const { Op } = require('sequelize');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
const { sequelize, Fppl, FpplSampel, FpplParameterMetode, Pelanggan, JenisSampel, RegBm, ParameterMetode, Parameter, Metode, TarifPengambilan, JadwalSampel, PktBm, Klasifikasi, Pegawai, Sampel, SampelParameter, Penugasan, PenugasanDetail, PenugasanItem, Lka, LkaHasil, Lhu, JadwalPengambilanLhu, PengajuanPerubahanJadwal, User } = require('../../models/Associations');
const { generateId } = require('../../utils/id-generator');
const { buildInvoiceSummary } = require('../payment/payment-billing.service');
const { getAvailablePaymentMethods } = require('../payment/payment-policy.util');
const RequestStatus = require('../../constants/request-status');
const Roles = require('../../constants/roles');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { buildPenyeliaRequestSummary, deriveCustomerDecisionStatus, deriveCustomerHistoryStatus, getKasiDecisionStatus, resolveSampleQuantity, resolveSamplingLocation, resolveSamplingSchedule, resolveSamplingType } = require('./request-transform.util');
const { decorateSampleReceiptFields, decorateScheduleFields, stripCustomerSensitiveLhuData, } = require('./request-schedule-fields.util');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');
const { ACTIVE_REQUEST_STATUSES, buildDuplicateFingerprint, isDuplicateRequest } = require('./request-duplicate.util');

const sameFpplSampelComposite = (a = {}, b = {}) => {
    const pick = (row, snake, camel) => String(row?.[snake] ?? row?.[camel] ?? '').trim();
    return pick(a, 'id_registrasi', 'idRegistrasi') === pick(b, 'id_registrasi', 'idRegistrasi') &&
        pick(a, 'id_jenis_sampel', 'idJenisSampel') === pick(b, 'id_jenis_sampel', 'idJenisSampel') &&
        pick(a, 'id_reg_bm', 'idRegBm') === pick(b, 'id_reg_bm', 'idRegBm');
};
const filterFpplSampelCompositeChildren = (row = {}) => {
    if (!row || typeof row !== 'object') {
        return row;
    }
    ['fppl_parameter_metodes', 'FpplParameterMetodes', 'fpplParameterMetodes', 'sampels', 'Sampels'].forEach((key) => {
        if (Array.isArray(row[key])) {
            row[key] = row[key].filter((child) => sameFpplSampelComposite(child, row));
        }
    });
    return row;
};
const normalizeRequestFpplSampelGraph = (requestJson = {}) => {
    ['fppl_sampels', 'FpplSampels', 'fpplSampels'].forEach((key) => {
        if (Array.isArray(requestJson[key])) {
            requestJson[key] = requestJson[key].map(filterFpplSampelCompositeChildren);
        }
    });
    return requestJson;
};
class RequestService {
    /**
     * Memeriksa apakah permohonan baru merupakan duplikat dari permohonan aktif.
     * Jika duplikat ditemukan, melempar Error dengan code 'DUPLICATE_REQUEST'.
     *
     * @param {string} idPelanggan  - ID pelanggan yang membuat permohonan baru
     * @param {Object} newFppl      - Data FPPL baru (plain object, sebelum insert)
     * @param {Array}  newSampels   - Array entry sampel baru
     * @param {Array}  newParams    - Array entry parameter baru (flat: {id_jenis_sampel, id_reg_bm, id_parameter}[])
     */
    checkDuplicateRequest = async (idPelanggan, newFppl, newSampels, newParams) => {
        // Ambil semua permohonan aktif milik pelanggan ini
        const activeFppls = await Fppl.findAll({
            where: {
                id_pelanggan: idPelanggan,
                status_fppl: { [Op.in]: ACTIVE_REQUEST_STATUSES },
            },
            attributes: [
                'id_registrasi',
                'nomor_fppl',
                'id_pelanggan',
                'maksud_pengujian',
                'lokasi_pengambilan_sampel',
                'jenis_pengambilan_sampel',
                'tanggal_rencana_pengambilan_sampel',
                'tanggal_rencana_pengantaran_sampel',
                'status_fppl',
                'tanggal_pendaftaran',
            ],
        });

        if (!activeFppls || activeFppls.length === 0) return;

        // Bangun fingerprint permohonan baru
        const newFingerprint = buildDuplicateFingerprint(newFppl, newSampels, newParams);

        for (const existingFppl of activeFppls) {
            const existingFpplJson = existingFppl.toJSON();

            // Ambil sampel dan parameter dari permohonan yang sudah ada
            const [existingSampels, existingParams] = await Promise.all([
                FpplSampel.findAll({
                    where: { id_registrasi: existingFpplJson.id_registrasi },
                    attributes: ['id_jenis_sampel', 'id_reg_bm'],
                }),
                FpplParameterMetode.findAll({
                    where: { id_registrasi: existingFpplJson.id_registrasi },
                    attributes: ['id_jenis_sampel', 'id_reg_bm', 'id_parameter'],
                }),
            ]);

            const existingSampelsJson = existingSampels.map((s) => s.toJSON());
            const existingParamsJson = existingParams.map((p) => p.toJSON());

            const existingFingerprint = buildDuplicateFingerprint(
                existingFpplJson,
                existingSampelsJson,
                existingParamsJson,
            );

            if (isDuplicateRequest(newFingerprint, existingFingerprint)) {
                const err = new Error(
                    `Permohonan dengan data yang sama sudah pernah dibuat dan masih dalam proses. ` +
                    `Silakan cek permohonan dengan nomor FPPL: ${existingFpplJson.nomor_fppl || '-'} ` +
                    `atau ID Registrasi: ${existingFpplJson.id_registrasi}.`
                );
                err.code = 'DUPLICATE_REQUEST';
                err.existingRequest = {
                    id_registrasi: existingFpplJson.id_registrasi,
                    nomor_fppl: existingFpplJson.nomor_fppl || null,
                    status_fppl: existingFpplJson.status_fppl,
                    tanggal_pendaftaran: existingFpplJson.tanggal_pendaftaran,
                };
                throw err;
            }
        }
    };

validateCompositionPersisted = async ({ id_registrasi, expectedSampelCount, expectedParameterCount, transaction }) => {
        const fpplCount = await Fppl.count({ where: { id_registrasi }, transaction });
        const fpplSampelCount = await FpplSampel.count({ where: { id_registrasi }, transaction });
        const fpplParamCount = await FpplParameterMetode.count({ where: { id_registrasi }, transaction });
        if (fpplCount !== 1 || fpplSampelCount !== expectedSampelCount || fpplParamCount !== expectedParameterCount) {
            throw new Error('Data FPPL tersimpan tidak lengkap. Silakan ulangi submit.');
        }
    };
    createRequest = async (userNik, data) => {
        const t = await sequelize.transaction();
        try {
            const { namaInstansi, pic, emailPic, noTelp, alamat, maksudPengujian, maksudLainnya, metodePengambilan, tanggalPengambilan, jamPengambilan, lokasiPengambilan, alamatPengambilan, estimasiDiterima, sampleEntries } = data;
            const idPelanggan = data.idPelanggan || data.id_pelanggan || null;
            let pelanggan;
            if (idPelanggan) {
                pelanggan = await Pelanggan.findOne({ where: { id_pelanggan: idPelanggan, nik: userNik } });
                if (!pelanggan)
                    throw new Error('Data pelanggan yang dipilih tidak ditemukan atau tidak valid.');
                await pelanggan.update({
                    nama_instansi: namaInstansi,
                    pic,
                    email_kontak: emailPic,
                    no_telp: noTelp,
                    alamat
                }, { transaction: t });
            }
            else {
                const newIdPelanggan = await generateId(Pelanggan, 'id_pelanggan', 'PL-');
                pelanggan = await Pelanggan.create({
                    id_pelanggan: newIdPelanggan,
                    nik: userNik,
                    nama_instansi: namaInstansi,
                    pic,
                    email_kontak: emailPic,
                    no_telp: noTelp,
                    alamat
                }, { transaction: t });
            }
            const idRegistrasi = await generateId(Fppl, 'id_registrasi', 'REG-');
            const maksudPengujianText = String(maksudPengujian || '').trim();
            const isOtherPurpose = maksudPengujianText.toLowerCase() === 'lainnya';
            const finalTestPurpose = String(isOtherPurpose
                ? (maksudLainnya || maksudPengujianText || '')
                : maksudPengujianText).trim();
            if (!finalTestPurpose) {
                throw new Error('Maksud pengujian wajib diisi.');
            }
            const samplingType = resolveSamplingType(metodePengambilan);
            const samplingSchedule = resolveSamplingSchedule({
                metodePengambilan,
                tanggalPengambilan,
                jamPengambilan,
                estimasiDiterima,
            });
            const samplingSiteLocation = resolveSamplingLocation({
                metodePengambilan,
                lokasiPengambilan,
                alamatPengambilan,
            });
            if (!Array.isArray(sampleEntries) || sampleEntries.length === 0) {
                throw new Error('Data sampel dan parameter uji wajib diisi.');
            }

            // --- Validasi anti-duplikasi ---
            // Susun struktur flat dari sampleEntries untuk fingerprinting
            const candidateSampels = sampleEntries.map((entry) => ({
                id_jenis_sampel: entry.idJenisSampel || entry.id_jenis_sampel || entry.jenisSampel,
                id_reg_bm: entry.idRegBm || entry.id_reg_bm,
            }));
            const candidateParams = [];
            for (const entry of sampleEntries) {
                const idJs = entry.idJenisSampel || entry.id_jenis_sampel || entry.jenisSampel;
                const idBm = entry.idRegBm || entry.id_reg_bm;
                const paramIds = Array.isArray(entry.parameters)
                    ? entry.parameters.map((p) => (typeof p === 'string' ? p : p?.id_parameter)).filter(Boolean)
                    : [];
                for (const idParam of paramIds) {
                    candidateParams.push({ id_jenis_sampel: idJs, id_reg_bm: idBm, id_parameter: idParam });
                }
            }
            const candidateFppl = {
                id_pelanggan: pelanggan.id_pelanggan,
                maksud_pengujian: finalTestPurpose,
                lokasi_pengambilan_sampel: samplingSiteLocation,
                jenis_pengambilan_sampel: samplingType,
                tanggal_rencana_pengambilan_sampel: samplingSchedule.tanggalRencanaPengambilanSampel || null,
                tanggal_rencana_pengantaran_sampel: samplingSchedule.tanggalRencanaPengantaranSampel || null,
            };
            // Jalankan pengecekan duplikasi (di luar transaksi agar tidak deadlock)
            await this.checkDuplicateRequest(
                pelanggan.id_pelanggan,
                candidateFppl,
                candidateSampels,
                candidateParams,
            );
            // --- Akhir validasi anti-duplikasi ---

            await Fppl.create({
                id_registrasi: idRegistrasi,
                id_pelanggan: pelanggan.id_pelanggan,
                tanggal_pendaftaran: new Date(),
                maksud_pengujian: finalTestPurpose,
                lokasi_pengambilan_sampel: samplingSiteLocation,
                jenis_pengambilan_sampel: samplingType,
                tanggal_rencana_pengambilan_sampel: samplingSchedule.tanggalRencanaPengambilanSampel,
                jam_rencana_pengambilan_sampel: samplingSchedule.jamRencanaPengambilanSampel,
                tanggal_rencana_pengantaran_sampel: samplingSchedule.tanggalRencanaPengantaranSampel,
                status_fppl: RequestStatus.WAITING_VERIFICATION
            }, { transaction: t });
            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: idRegistrasi,
                action: 'MEMBUAT_PERMOHONAN',
                statusBefore: null,
                statusAfter: RequestStatus.WAITING_VERIFICATION,
                source: 'Pelanggan',
                note: 'Permohonan dibuat oleh pelanggan.',
                actorNik: userNik,
                transaction: t,
            });
            let sampelCounter = 1;
            let paramCounter = 1;
            let createdParamCount = 0;
            for (const entry of sampleEntries) {
                const idRegBm = entry.idRegBm || entry.id_reg_bm;
                const jenisSampel = entry.idJenisSampel || entry.id_jenis_sampel || entry.jenisSampel;
                const parameterIds = Array.isArray(entry.parameters)
                    ? entry.parameters.map(p => (typeof p === 'string' ? p : p?.id_parameter)).filter(Boolean)
                    : [];
                if (!jenisSampel || !idRegBm || parameterIds.length === 0) {
                    throw new Error('Setiap sampel wajib memiliki jenis sampel, standar, dan parameter.');
                }
                await FpplSampel.create({
                    id_registrasi: idRegistrasi,
                    id_jenis_sampel: jenisSampel,
                    id_reg_bm: idRegBm,
                    jumlah_sampel: resolveSampleQuantity(entry)
                }, { transaction: t });
                for (const idParam of parameterIds) {
                    const idFpm = `FPM-${idRegistrasi.replace('REG-', '')}-${String(sampelCounter).padStart(2, '0')}-${String(paramCounter).padStart(2, '0')}`;
                    await FpplParameterMetode.create({
                        id_fppl_parameter_metode: idFpm,
                        id_registrasi: idRegistrasi,
                        id_jenis_sampel: jenisSampel,
                        id_reg_bm: idRegBm,
                        id_parameter: idParam,
                        id_metode_parameter: null,
                        status_kemampuan_lab: 'MAMPU',
                        catatan_kemampuan: null,
                        is_insitu: 0,
                    }, { transaction: t });
                    paramCounter++;
                    createdParamCount++;
                }
                sampelCounter++;
            }
            await this.validateCompositionPersisted({
                id_registrasi: idRegistrasi,
                expectedSampelCount: sampleEntries.length,
                expectedParameterCount: createdParamCount,
                transaction: t
            });
            await t.commit();
            return { idRegistrasi, status: RequestStatus.WAITING_VERIFICATION };
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    };
    updateRequestByCustomer = async () => {
        throw new Error('Edit revisi permohonan dari Kasi Pengujian sudah tidak digunakan. Jika permohonan ditolak, pelanggan perlu membuat permohonan baru.');
    };
    detailRequest = async (requestId, userNik, role) => {
        const requestRecord = await Fppl.findByPk(requestId, {
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    attributes: ['id_pelanggan', 'nik', 'nama_instansi', 'pic', 'email_kontak', 'no_telp', 'alamat']
                },
                {
                    model: TarifPengambilan
                },
                {
                    model: JadwalSampel,
                    as: 'jadwal_sampels',
                    attributes: [
                        'id_jadwal',
                        'tanggal_jadwal',
                        'jam_jadwal',
                        'id_pegawai_pcc',
                        'dibuat_pada',
                        'status_jadwal',
                    ],
                    required: false,
                    include: [
                        {
                            model: Pegawai,
                            as: 'pegawai_pcc',
                            attributes: ['id_pegawai', 'nama_pegawai', 'no_wa'],
                            required: false
                        }
                    ]
                },
                {
                    model: JadwalPengambilanLhu,
                    as: 'jadwal_pengambilan_lhu',
                    attributes: [
                        'id_jadwal_lhu',
                        'id_registrasi',
                        'tanggal_pengambilan',
                        'jam_pengambilan',
                        'status_pengambilan',
                        'catatan',
                        'dijadwalkan_oleh',
                        'dijadwalkan_pada',
                        'nama_pengambil',
                        'diambil_pada',
                    ],
                    required: false
                },
                {
                    model: PengajuanPerubahanJadwal,
                    as: 'pengajuan_perubahan_jadwal',
                    required: false,
                    attributes: [
                        'id_pengajuan_jadwal',
                        'jenis_jadwal',
                        'id_jadwal_sampel',
                        'id_jadwal_lhu',
                        'tanggal_sebelumnya',
                        'jam_sebelumnya',
                        'tanggal_usulan',
                        'jam_usulan',
                        'alasan_pengajuan',
                        'status_pengajuan',
                        'catatan_admin',
                        'diajukan_pada',
                        'created_at',
                        'updated_at'
                    ]
                },
                {
                    model: FpplSampel,
                    as: 'fppl_sampels',
                    attributes: [
                        'id_registrasi',
                        'id_jenis_sampel',
                        'id_reg_bm',
                        'jumlah_sampel'
                    ],
                    include: [
                        {
                            model: JenisSampel,
                            attributes: ['id_jenis_sampel', 'jenis_sampel']
                        },
                        {
                            model: RegBm,
                            attributes: ['id_reg_bm', 'instansi', 'ref_reg']
                        },
                        {
                            model: FpplParameterMetode,
                            attributes: [
                                'id_fppl_parameter_metode',
                                'id_registrasi',
                                'id_jenis_sampel',
                                'id_reg_bm',
                                'id_parameter',
                                'id_metode_parameter',
                                'status_kemampuan_lab',
                                'catatan_kemampuan',
                                'dipilih_pada',
                                'is_insitu'
                            ],
                            include: [
                                {
                                    model: Parameter,
                                    attributes: [
                                        'id_parameter', 'id_kategori_parameter', 'nama_parameter'
                                    ]
                                },
                                {
                                    model: ParameterMetode,
                                    required: false,
                                    attributes: [
                                        'id_metode_parameter',
                                        'id_parameter',
                                        'id_metode',
                                        'tarif',
                                        'acuan_metode',
                                        'is_terakreditasi',
                                        'is_subkontrak'
                                    ],
                                    include: [
                                        {
                                            model: Metode,
                                            attributes: ['id_metode', 'nama_metode'],
                                            required: false
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: Sampel,
                            as: 'sampels',
                            attributes: [
                                'no_sampel',
                                'id_registrasi',
                                'id_jenis_sampel',
                                'id_reg_bm',
                                'tanggal_pengambilan_sampel',
                                'diterima_pada',
                                'kondisi_sampel',
                                'abnormalitas_sampel',
                                'acuan_pengambilan_sampel',
                                'lokasi_spesifik',
                                'koordinat',
                                'status_sample'
                            ],
                            required: false,
                            include: [
                                {
                                    model: PenugasanItem,
                                    as: 'penugasan_items',
                                    attributes: ['id_penugasan_detail', 'no_sampel'],
                                    required: false,
                                    include: [
                                        {
                                            model: PenugasanDetail,
                                            attributes: [
                                                'id_penugasan_detail',
                                                'id_penugasan',
                                                'id_metode_parameter',
                                                'status_detail',
                                                'tanggal_tenggat',
                                                'catatan_detail'
                                            ],
                                            required: false,
                                            include: [
                                                {
                                                    model: Penugasan,
                                                    attributes: [
                                                        'id_penugasan',
                                                        'id_user_analis',
                                                        'assigned_by',
                                                        'assigned_at',
                                                        'status_penugasan'
                                                    ],
                                                    required: false
                                                },
                                                {
                                                    model: Lka,
                                                    required: false,
                                                    attributes: [
                                                        'kode_lka',
                                                        'id_penugasan_detail',
                                                        'tanggal_mulai_pengujian',
                                                        'tanggal_selesai_pengujian',
                                                        'tanggal_pelaporan',
                                                        'tanggal_pemeriksaan',
                                                        'status_lka'
                                                    ],
                                                    include: [
                                                        {
                                                            model: LkaHasil,
                                                            required: false,
                                                            attributes: [
                                                                'kode_lka',
                                                                'no_sampel',
                                                                'statusReviewHasil'
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    model: Lhu,
                                    as: 'lhu',
                                    attributes: [
                                        'nomor_lhu',
                                        'id_registrasi',
                                        'id_pkt_bm',
                                        'tanggal_penerbitan',
                                        'file_lhu_path',
                                        'qc_by',
                                        'qc_at',
                                        'kalab_by',
                                        'kalab_at',
                                        'status_lhu',
                                        'created_at',
                                        'updated_at'
                                    ],
                                    required: false,
                                    include: [
                                        {
                                            model: PktBm,
                                            attributes: ['id_pkt_bm', 'id_reg_bm', 'id_jenis_sampel', 'id_klasifikasi'],
                                            required: false,
                                            include: [{ model: RegBm, required: false }, { model: JenisSampel, required: false }, { model: Klasifikasi, required: false }]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
        if (!requestRecord)
            throw new Error('Permohonan tidak ditemukan.');
        const pelangganEntity = requestRecord.Pelanggan || requestRecord.pelanggan;
        if (role === Roles.CUSTOMER && pelangganEntity?.nik !== userNik) {
            throw new Error('FORBIDDEN');
        }
        const responseData = decorateSampleReceiptFields(decorateScheduleFields(normalizeRequestFpplSampelGraph(requestRecord.toJSON())));
        // Hapus nik dari response pelanggan
        if (responseData.Pelanggan)
            delete responseData.Pelanggan.nik;
        if (responseData.pelanggan)
            delete responseData.pelanggan.nik;
        if (role === Roles.CUSTOMER) {
            stripCustomerSensitiveLhuData(responseData);
        }
        responseData.status = responseData.status_fppl;
        responseData.invoice = await buildInvoiceSummary(requestId);
        responseData.billing = responseData.invoice;
        responseData.rincianBiaya = responseData.invoice?.rincian || null;
        responseData.rincian_biaya = responseData.invoice?.rincian || null;
        responseData.metodeSampling = responseData.invoice?.metodeSampling || responseData.invoice?.rincian?.metodeSampling || null;
        responseData.metode_sampling = responseData.metodeSampling;
        responseData.biayaSampling = responseData.invoice?.biayaSampling ?? responseData.invoice?.rincian?.biayaSampling ?? null;
        responseData.biaya_sampling = responseData.biayaSampling;
        responseData.paymentMethods = getAvailablePaymentMethods();
        const activityLogs = await WorkflowLogService.getRequestTimeline(requestId);
        responseData.aktivitas_sistem_logs = activityLogs;
        responseData.activity_logs = activityLogs;
        responseData.timeline_logs = activityLogs;
        return responseData;
    };
    getRequestActivityLogs = async (requestId, userNik, role) => {
        const requestRecord = await Fppl.findByPk(requestId, {
            include: [{ model: Pelanggan, as: 'pelanggan', attributes: ['nik'] }]
        });
        if (!requestRecord)
            throw new Error('Permohonan tidak ditemukan.');
        const pelangganEntity = requestRecord.Pelanggan || requestRecord.pelanggan;
        if (role === Roles.CUSTOMER && pelangganEntity?.nik !== userNik) {
            throw new Error('FORBIDDEN');
        }
        return WorkflowLogService.getRequestTimeline(requestId);
    };
    getKasiRequestDetail = async (requestId) => {
        const request = await Fppl.findByPk(requestId, {
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    attributes: ['nama_instansi', 'pic', 'no_telp', 'alamat']
                },
                {
                    model: FpplSampel,
                    as: 'fppl_sampels',
                    attributes: ['id_registrasi', 'id_jenis_sampel', 'id_reg_bm', 'jumlah_sampel'],
                    include: [
                        {
                            model: JenisSampel,
                            attributes: ['id_jenis_sampel', 'jenis_sampel']
                        },
                        {
                            model: RegBm,
                            attributes: ['id_reg_bm', 'instansi', 'ref_reg']
                        },
                        {
                            model: FpplParameterMetode,
                            attributes: [
                                'id_fppl_parameter_metode',
                                'id_registrasi',
                                'id_jenis_sampel',
                                'id_reg_bm',
                                'id_parameter',
                                'id_metode_parameter',
                                'status_kemampuan_lab',
                                'catatan_kemampuan',
                                'dipilih_pada',
                                'is_insitu',
                            ],
                            include: [
                                {
                                    model: Parameter,
                                    attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter']
                                },
                                {
                                    model: ParameterMetode,
                                    required: false,
                                    attributes: [
                                        'id_metode_parameter',
                                        'id_parameter',
                                        'id_metode',
                                        'tarif',
                                        'acuan_metode',
                                        'is_terakreditasi',
                                        'is_subkontrak'
                                    ],
                                    include: [
                                        {
                                            model: Metode,
                                            attributes: ['id_metode', 'nama_metode']
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
        if (!request) {
            throw new Error('Permohonan tidak ditemukan.');
        }
        const json = toCamelCaseDeep(normalizeRequestFpplSampelGraph(request.toJSON()));
        const fpplSamples = Array.isArray(json.fpplSampels) ? json.fpplSampels : [];
        const parameterIds = new Set();
        fpplSamples.forEach((sampel) => {
            const pmList = sampel?.fpplParameterMetodes || sampel?.FpplParameterMetodes || [];
            pmList.forEach((fpm) => {
                const paramId = fpm?.parameter?.idParameter ||
                    fpm?.Parameter?.idParameter ||
                    fpm?.idParameter;
                if (paramId) {
                    parameterIds.add(paramId);
                }
            });
        });
        const methodRows = parameterIds.size
            ? await ParameterMetode.findAll({
                where: {
                    id_parameter: {
                        [Op.in]: Array.from(parameterIds)
                    },
                    is_active: 1
                },
                attributes: [
                    'id_metode_parameter',
                    'id_parameter',
                    'id_metode',
                    'tarif',
                    'acuan_metode',
                    'is_terakreditasi',
                    'is_subkontrak',
                    'is_active'
                ],
                include: [
                    {
                        model: Metode,
                        attributes: ['id_metode', 'nama_metode'],
                        required: false
                    }
                ],
                order: [['id_parameter', 'ASC'], ['id_metode_parameter', 'ASC']]
            })
            : [];
        const methodOptionsByParameter = {};
        methodRows.forEach((row) => {
            const item = toCamelCaseDeep(row);
            const idParameter = item.idParameter;
            if (!methodOptionsByParameter[idParameter]) {
                methodOptionsByParameter[idParameter] = [];
            }
            const namaMetode = item.metode?.namaMetode ||
                item.Metode?.namaMetode ||
                '-';
            const acuanMetode = item.acuanMetode || '';
            const normalizeTinyIntFlag = (value) => {
                return value === true || value === 1 || value === '1' || value === 'true';
            };
            const isSubkontrak = normalizeTinyIntFlag(item.isSubkontrak);
            methodOptionsByParameter[idParameter].push({
                id: item.idMetodeParameter,
                idMetodeParameter: item.idMetodeParameter,
                idMetodeParameter: item.idMetodeParameter,
                idMetode: item.idMetode,
                idMetode: item.idMetode,
                name: namaMetode,
                label: acuanMetode ? `${namaMetode} - ${acuanMetode}` : namaMetode,
                nama: namaMetode,
                namaMetode: namaMetode,
                namaMetode,
                acuan: acuanMetode,
                acuanMetode: acuanMetode,
                acuanMetode,
                tarif: item.tarif,
                isTerakreditasi: item.isTerakreditasi,
                isSubkontrak,
                isActive: item.isActive
            });
        });
        const requestDecisionStatus = deriveCustomerDecisionStatus(json.statusFppl);
        const kelompokSampel = fpplSamples.map((sampel) => {
            const jenisSampelNama = sampel?.jenisSampel?.jenisSampel ||
                sampel?.JenisSampel?.jenisSampel ||
                '-';
            const regBmInstansi = sampel?.regBm?.instansi ||
                sampel?.RegBm?.instansi ||
                '';
            const regBmRef = sampel?.regBm?.refReg ||
                sampel?.regBm?.ref_reg ||
                sampel?.RegBm?.refReg ||
                sampel?.RegBm?.ref_reg ||
                '-';
            const regBmLabel = [regBmInstansi, regBmRef]
                .filter((item) => item && item !== '-')
                .join(' - ') || '-';
            const pmList = sampel?.fpplParameterMetodes || sampel?.FpplParameterMetodes || [];
            const parameters = pmList.map((fpm) => {
                const paramId = fpm?.parameter?.idParameter ||
                    fpm?.Parameter?.idParameter ||
                    fpm?.idParameter;
                const paramName = fpm?.parameter?.namaParameter ||
                    fpm?.Parameter?.namaParameter ||
                    '-';
                const currentMethodId = fpm?.idMetodeParameter || null;
                const currentMethod = fpm?.parameterMetode ||
                    fpm?.ParameterMetode ||
                    null;
                const currentMetodeName = currentMethod?.metode?.namaMetode ||
                    currentMethod?.Metode?.namaMetode ||
                    '-';
                const availableMethods = methodOptionsByParameter[paramId] || [];
                const currentMethodIsSubkontrak = currentMethod?.isSubkontrak === true ||
                    currentMethod?.isSubkontrak === 1 ||
                    currentMethod?.isSubkontrak === '1'
                    ? 1
                    : 0;
                const isSubkontrakSnapshot = undefined !== null &&
                    undefined !== undefined
                    ? Number(undefined)
                    : currentMethod
                        ? currentMethodIsSubkontrak
                        : null;
                return {
                    fpmId: fpm.idFpplParameterMetode,
                    paramId,
                    paramName,
                    currentMethodId,
                    currentMethodName: currentMetodeName,
                    capabilityStatus: fpm.statusKemampuanLab || '',
                    capabilityNote: fpm.catatanKemampuan || '',
                    tarifSnapshot: null,
                    isSubkontrakSnapshot,
                    statusPersetujuanPelanggan: requestDecisionStatus,
                    availableMethods,
                    tarif: fpm.parameterMetode?.tarif ?? fpm.ParameterMetode?.tarif ?? null,
                    methods: availableMethods
                };
            });
            return {
                idRegistrasi: sampel.idRegistrasi || json.idRegistrasi || null,
                jenisSampel: jenisSampelNama,
                idJenisSampel: sampel.idJenisSampel,
                idRegBm: sampel.idRegBm,
                standar: regBmRef,
                regBm: regBmLabel,
                jumlahSampel: sampel.jumlahSampel,
                parameters,
            };
        });
        const pelanggan = json.Pelanggan ||
            json.pelanggan ||
            {};
        return {
            noReg: json.idRegistrasi,
            idRegistrasi: json.idRegistrasi,
            tanggal: json.tanggalPendaftaran,
            tanggalPendaftaran: json.tanggalPendaftaran,
            tanggalDaftar: json.tanggalPendaftaran,
            tanggalVerifikasi: json.tanggalVerifikasi || null,
            pelanggan: pelanggan.namaInstansi || pelanggan.pic || '-',
            pic: pelanggan.pic || '-',
            noTelp: pelanggan.noTelp || '-',
            alamat: pelanggan.alamat || '-',
            status: json.statusFppl,
            statusFppl: json.statusFppl,
            kelompokSampel
        };
    };
    getMyPelanggans = async (userNik) => {
        const rows = await Pelanggan.findAll({
            where: { nik: userNik },
            order: [['id_pelanggan', 'DESC']],
        });
        return rows.map((row) => toCamelCaseDeep(row));
    };
}
module.exports = new RequestService();
module.exports.RequestService = RequestService;
