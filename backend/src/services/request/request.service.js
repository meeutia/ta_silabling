const { Op } = require('sequelize');
const {
    sequelize,
    Fppl,
    FpplSampel,
    FpplParameterMetode,
    Pelanggan,
    JenisSampel,
    RegBm,
    ParameterMetode,
    Parameter,
    Metode,
    TarifPengambilan,
    JadwalSampel,
    PktBm,
    Pegawai,
    Sampel,
    SampelParameter,
    Penugasan,
    PenugasanDetail,
    PenugasanItem,
    Lka,
    LkaHasil,
    Lhu,
    DetailLhu,
    JadwalPengambilanLhu,
    PengajuanPerubahanJadwal,
    User
} = require('../../models/Associations');
const { generateId } = require('../../utils/id-generator');
const { buildInvoiceSummary, getAvailablePaymentMethods } = require('../payment/payment.service');
const RequestStatus = require('../../constants/request-status');
const Roles = require('../../constants/roles');
const WorkflowLogService = require('../workflow/workflow-log.service');
const {
    buildPenyeliaRequestSummary,
    deriveCustomerDecisionStatus,
    deriveCustomerHistoryStatus,
    getKasiDecisionStatus,
    resolveSampleQuantity,
    resolveSamplingLocation,
    resolveSamplingSchedule,
    resolveSamplingType
} = require('./request-transform.util');
const {
    decorateSampleReceiptFields,
    decorateScheduleFields,
    getActiveScheduleFromPayload,
    stripCustomerSensitiveLhuData,
} = require('./request-schedule-fields.util');

const { listRequests } = require('./request-list.service');
const { getAnalystOptions, getMyPelanggans } = require('./request-account.service');

const validateCompositionPersisted = async ({ id_registrasi, expectedSampelCount, expectedParameterCount, transaction }) => {
    const fpplCount = await Fppl.count({ where: { id_registrasi }, transaction });
    const fpplSampelCount = await FpplSampel.count({ where: { id_registrasi }, transaction });
    const fpplSampelRows = await FpplSampel.findAll({
        where: { id_registrasi },
        attributes: ['id_fppl_sampel'],
        transaction
    });
    const sampelIds = fpplSampelRows.map((row) => row.id_fppl_sampel);
    const fpplParamCount = sampelIds.length
        ? await FpplParameterMetode.count({ where: { id_fppl_sampel: { [Op.in]: sampelIds } }, transaction })
        : 0;

    if (fpplCount !== 1 || fpplSampelCount !== expectedSampelCount || fpplParamCount !== expectedParameterCount) {
        throw new Error('Data FPPL tersimpan tidak lengkap. Silakan ulangi submit.');
    }
};


const createRequest = async (userNik, data) => {
    const t = await sequelize.transaction();

    try {
        const {
            id_pelanggan,
            namaInstansi,
            pic,
            emailPic,
            noTelp,
            alamat,
            maksudPengujian,
            maksudLainnya,
            metodePengambilan,
            tanggalPengambilan,
            jamPengambilan,
            lokasiPengambilan,
            alamatPengambilan,
            estimasiDiterima,
            sampleEntries
        } = data;

        let pelanggan;

        if (id_pelanggan) {
            pelanggan = await Pelanggan.findOne({ where: { id_pelanggan, nik: userNik } });
            if (!pelanggan) throw new Error('Data pelanggan yang dipilih tidak ditemukan atau tidak valid.');

            await pelanggan.update({
                nama_instansi: namaInstansi,
                pic,
                email_kontak: emailPic,
                no_telp: noTelp,
                alamat
            }, { transaction: t });
        } else {
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
        const finalTestPurpose = String(
            isOtherPurpose
                ? (maksudLainnya || maksudPengujianText || '')
                : maksudPengujianText
        ).trim();

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
            const jenisSampel = entry.jenisSampel || entry.id_jenis_sampel;
            const parameterIds = Array.isArray(entry.parameters)
                ? entry.parameters.map(p => (typeof p === 'string' ? p : p?.id_parameter)).filter(Boolean)
                : [];

            if (!jenisSampel || !idRegBm || parameterIds.length === 0) {
                throw new Error('Setiap sampel wajib memiliki jenis sampel, standar, dan parameter.');
            }

            const idFpplSampel = `FPS-${idRegistrasi.replace('REG-', '')}-${String(sampelCounter).padStart(2, '0')}`;

            await FpplSampel.create({
                id_fppl_sampel: idFpplSampel,
                id_registrasi: idRegistrasi,
                id_jenis_sampel: jenisSampel,
                id_reg_bm: idRegBm,
                jumlah_sampel: resolveSampleQuantity(entry)
            }, { transaction: t });

            for (const idParam of parameterIds) {
                const idFpm = `FPM-${idRegistrasi.replace('REG-', '')}-${String(sampelCounter).padStart(2, '0')}-${String(paramCounter).padStart(2, '0')}`;

                await FpplParameterMetode.create({
                    id_fppl_parameter_metode: idFpm,
                    id_fppl_sampel: idFpplSampel,
                    id_parameter: idParam,
                    id_metode_parameter: null,   // diisi Kasi
                    status_kemampuan_lab: 'MAMPU',
                    catatan_kemampuan: null,
                    is_insitu: 0,
                }, { transaction: t });

                paramCounter++;
                createdParamCount++;
            }

            sampelCounter++;
        }

        await validateCompositionPersisted({
            id_registrasi: idRegistrasi,
            expectedSampelCount: sampleEntries.length,
            expectedParameterCount: createdParamCount,
            transaction: t
        });

        await t.commit();
        return { id_registrasi: idRegistrasi, status: RequestStatus.WAITING_VERIFICATION };
    } catch (error) {
        await t.rollback();
        throw error;
    }
};



const updateRequestByCustomer = async () => {
    throw new Error('Edit revisi permohonan dari Kasi Pengujian sudah tidak digunakan. Jika permohonan ditolak, pelanggan perlu membuat permohonan baru.');
};

const detailRequest = async (requestId, userNik, role) => {
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
                    'id_fppl_sampel',
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
                            'id_fppl_sampel',
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
                            'tanggal_pengambilan_sampel',
                            'diterima_pada',
                            
                            
                            'kondisi_sampel',
                            'abnormalitas_sampel',
                            'acuan_pengambilan_sampel',
                            'koordinat',
                            'status_sample'
                        ],
                        required: false,
                        include: [
                            {
                                model: PenugasanItem,
                                as: 'penugasan_items',
                                attributes: ['id_penugasan_detail', 'no_sampel', 'tanggal_penugasan'],
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
                                as: 'lhus',
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
                                through: { attributes: [] },
                                required: false,
                                include: [
                                    {
                                        model: PktBm,
                                        attributes: ['id_pkt_bm', 'nama_pkt', 'teks_lhu'],
                                        required: false
                                    },
                                    {
                                        model: DetailLhu,
                                        as: 'details',
                                        // detail_lhu pada skema terbaru hanya menyimpan parameter/metode per LHU.
                                        // Hasil per sampel dibaca dari lka_hasil, bukan dari detail_lhu.
                                        attributes: ['nomor_lhu', 'id_fppl_parameter_metode', 'urutan_lhu'],
                                        required: false
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    });

    if (!requestRecord) throw new Error('Permohonan tidak ditemukan.');

    const pelangganEntity = requestRecord.Pelanggan || requestRecord.pelanggan;
    if (role === Roles.CUSTOMER && pelangganEntity?.nik !== userNik) {
        throw new Error('FORBIDDEN');
    }

    const responseData = decorateSampleReceiptFields(decorateScheduleFields(requestRecord.toJSON()));

    // Hapus nik dari response pelanggan
    if (responseData.Pelanggan) delete responseData.Pelanggan.nik;
    if (responseData.pelanggan) delete responseData.pelanggan.nik;

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


const getRequestActivityLogs = async (requestId, userNik, role) => {
    const requestRecord = await Fppl.findByPk(requestId, {
        include: [{ model: Pelanggan, as: 'pelanggan', attributes: ['nik'] }]
    });

    if (!requestRecord) throw new Error('Permohonan tidak ditemukan.');

    const pelangganEntity = requestRecord.Pelanggan || requestRecord.pelanggan;
    if (role === Roles.CUSTOMER && pelangganEntity?.nik !== userNik) {
        throw new Error('FORBIDDEN');
    }

    return WorkflowLogService.getRequestTimeline(requestId);
};

    
// Specifically for KASI to get methods mapping
const getKasiRequestDetail = async (requestId) => {
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
                attributes: ['id_fppl_sampel', 'id_jenis_sampel', 'id_reg_bm', 'jumlah_sampel'],
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

    const json = request.toJSON();
    const fpplSamples = json.fppl_sampels || json.FpplSampels || [];

    const parameterIds = new Set();

    fpplSamples.forEach((sampel) => {
        const pmList = sampel?.fppl_parameter_metodes || sampel?.FpplParameterMetodes || [];

        pmList.forEach((fpm) => {
            const paramId =
                fpm?.parameter?.id_parameter ||
                fpm?.Parameter?.id_parameter ||
                fpm?.id_parameter;

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
                }
            },
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
            ],
            order: [['id_parameter', 'ASC'], ['id_metode_parameter', 'ASC']]
        })
        : [];

    const methodOptionsByParameter = {};

    methodRows.forEach((row) => {
        const item = row.toJSON();
        const idParameter = item.id_parameter;

        if (!methodOptionsByParameter[idParameter]) {
            methodOptionsByParameter[idParameter] = [];
        }

        const namaMetode =
            item.metode?.nama_metode ||
            item.Metode?.nama_metode ||
            '-';

        const acuanMetode = item.acuan_metode || '';

        const normalizeTinyIntFlag = (value) => {
            return value === true || value === 1 || value === '1' || value === 'true';
        };

        const isSubkontrak = normalizeTinyIntFlag(item.is_subkontrak);

        methodOptionsByParameter[idParameter].push({
            id: item.id_metode_parameter,
            id_metode_parameter: item.id_metode_parameter,
            idMetodeParameter: item.id_metode_parameter,

            id_metode: item.id_metode,
            idMetode: item.id_metode,

            name: namaMetode,
            label: acuanMetode ? `${namaMetode} - ${acuanMetode}` : namaMetode,

            nama: namaMetode,
            nama_metode: namaMetode,
            namaMetode,

            acuan: acuanMetode,
            acuan_metode: acuanMetode,
            acuanMetode,

            tarif: item.tarif,

            is_terakreditasi: item.is_terakreditasi,
            isTerakreditasi: item.is_terakreditasi,

            is_subkontrak: isSubkontrak ? 1 : 0,
            isSubkontrak: isSubkontrak
        });
    });

    const requestDecisionStatus = deriveCustomerDecisionStatus(json.status_fppl);

    const kelompokSampel = fpplSamples.map((sampel) => {
        const jenisSampelNama =
            sampel?.jenis_sampel?.jenis_sampel ||
            sampel?.JenisSampel?.jenis_sampel ||
            '-';

        const regBmInstansi =
            sampel?.reg_bm?.instansi ||
            sampel?.RegBm?.instansi ||
            '';

        const regBmRef =
            sampel?.reg_bm?.ref_reg ||
            sampel?.RegBm?.ref_reg ||
            '-';

        const pmList = sampel?.fppl_parameter_metodes || sampel?.FpplParameterMetodes || [];

        const parameters = pmList.map((fpm) => {
            const paramId =
                fpm?.parameter?.id_parameter ||
                fpm?.Parameter?.id_parameter ||
                fpm?.id_parameter;

            const paramName =
                fpm?.parameter?.nama_parameter ||
                fpm?.Parameter?.nama_parameter ||
                '-';

            const currentMethodId = fpm?.id_metode_parameter || null;

            const currentMethod =
                fpm?.parameter_metode ||
                fpm?.ParameterMetode ||
                null;

            const currentMetodeName =
                currentMethod?.metode?.nama_metode ||
                currentMethod?.Metode?.nama_metode ||
                '-';

            const availableMethods = methodOptionsByParameter[paramId] || [];

            const currentMethodIsSubkontrak =
            currentMethod?.is_subkontrak === true ||
            currentMethod?.is_subkontrak === 1 ||
            currentMethod?.is_subkontrak === '1'
                ? 1
                : 0;

            const isSubkontrakSnapshot =
            undefined !== null &&
            undefined !== undefined
                ? Number(undefined)
                : currentMethod
                ? currentMethodIsSubkontrak
                : null;

            return {
            fpmId: fpm.id_fppl_parameter_metode,
            paramId,
            paramName,
            currentMethodId,
            currentMethodName: currentMetodeName,
            capabilityStatus: fpm.status_kemampuan_lab || '',
            isInsitu: fpm.is_insitu,
            capabilityNote: fpm.catatan_kemampuan || '',
            tarifSnapshot: null,
            isSubkontrakSnapshot,
            statusPersetujuanPelanggan: requestDecisionStatus,
            legacyStatusPersetujuanPelanggan: null,
            availableMethods,

                id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,
                id_parameter: paramId,
                nama_parameter: paramName,
                id_metode_parameter: currentMethodId,
                nama_metode: currentMetodeName,
                status_kemampuan_lab: fpm.status_kemampuan_lab || '',
                is_insitu: fpm.is_insitu,
                catatan_kemampuan: fpm.catatan_kemampuan || '',
                tarif: fpm.parameter_metode?.tarif ?? fpm.ParameterMetode?.tarif ?? null,
                is_subkontrak: isSubkontrakSnapshot,
                status_keputusan_permohonan: requestDecisionStatus,
                legacy_status_keputusan_permohonan: null,
                methods: availableMethods
            };
        });

        return {
            // format camelCase
            idFpplSampel: sampel.id_fppl_sampel,
            jenisSampel: jenisSampelNama,
            idJenisSampel: sampel.id_jenis_sampel,
            idRegBm: sampel.id_reg_bm,
            standar: regBmRef,
            jumlahSampel: sampel.jumlah_sampel,
            parameters,

            // format snake_case
            id_fppl_sampel: sampel.id_fppl_sampel,
            jenis_sampel: jenisSampelNama,
            id_jenis_sampel: sampel.id_jenis_sampel,
            id_reg_bm: sampel.id_reg_bm,
            reg_bm: `${regBmInstansi} - ${regBmRef}`.trim(),
            jumlah_sampel: sampel.jumlah_sampel
        };
    });

    const pelanggan =
        json.Pelanggan ||
        json.pelanggan ||
        {};

    return {
        noReg: json.id_registrasi,
        id_registrasi: json.id_registrasi,
        tanggal: json.tanggal_pendaftaran,
        tanggal_pendaftaran: json.tanggal_pendaftaran,
        tanggalPendaftaran: json.tanggal_pendaftaran,
        tanggalDaftar: json.tanggal_pendaftaran,
        tanggal_verifikasi: json.tanggal_verifikasi || null,
        tanggalVerifikasi: json.tanggal_verifikasi || null,
        pelanggan: pelanggan.nama_instansi || pelanggan.pic || '-',
        pic: pelanggan.pic || '-',

        noTelp: pelanggan.no_telp || '-',
        no_telp: pelanggan.no_telp || '-',

        alamat: pelanggan.alamat || '-',
        status: json.status_fppl,
        status_fppl: json.status_fppl,
        kelompokSampel
    };
};


module.exports = {
    createRequest,
    updateRequestByCustomer,
    listRequests,
    detailRequest,
    getRequestActivityLogs,
    getKasiRequestDetail,
    getMyPelanggans,
    getActiveScheduleFromPayload,
    decorateScheduleFields,
    getAnalystOptions
};

