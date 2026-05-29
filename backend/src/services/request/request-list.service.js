const { Op } = require('sequelize');
const {
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
    User,
    Sampel,
    SampelParameter,
    Penugasan,
    PenugasanDetail,
    PenugasanItem,
    Lka,
    LkaHasil,
    Lhu,
    JadwalPengambilanLhu,
    PengajuanPerubahanJadwal,
} = require('../../models/Associations');
const RequestStatus = require('../../constants/request-status');
const Roles = require('../../constants/roles');
const {
    buildPenyeliaRequestSummary,
    deriveCustomerHistoryStatus,
    getKasiDecisionStatus,
} = require('./request-transform.util');
const {
    decorateSampleReceiptFields,
    decorateScheduleFields,
} = require('./request-schedule-fields.util');

const listRequests = async (userNik, role, queryStatus) => {
    let whereClause = {};

    if (role === Roles.CUSTOMER) {
        const customerRecords = await Pelanggan.findAll({
            where: { nik: userNik },
            attributes: ['id_pelanggan']
        });
        const customerIds = customerRecords.map(c => c.id_pelanggan);
        if (customerIds.length === 0) return [];
        whereClause.id_pelanggan = { [Op.in]: customerIds };
    } else if (role === Roles.KASI) {
        if (queryStatus === 'Riwayat') {
            whereClause[Op.and] = [
                { status_fppl: { [Op.notIn]: [RequestStatus.WAITING_PARAMETER, RequestStatus.WAITING_VERIFICATION] } },
                {
                    [Op.or]: [
                        { status_fppl: { [Op.notIn]: [RequestStatus.REJECTED, RequestStatus.CANCELLED_BY_CUSTOMER, RequestStatus.REJECTED_BY_ADMIN, RequestStatus.REJECTED_BY_KASI, RequestStatus.REJECTED_BY_PENYELIA] } },
                        { catatan_penolakan: { [Op.like]: '[Kasi]%' } }
                    ]
                }
            ];
        } else {
            whereClause.status_fppl = queryStatus ? queryStatus : RequestStatus.WAITING_PARAMETER;
        }
    } else if (role === Roles.ADMIN && queryStatus && queryStatus !== 'Riwayat') {
        whereClause.status_fppl = queryStatus;
    } else if (role === Roles.PENYELIA) {
        whereClause.status_fppl = queryStatus && queryStatus !== 'Riwayat'
            ? queryStatus
            : RequestStatus.TESTING_PROCESS;
    }

    const requestRecords = await Fppl.findAll({
        where: whereClause,
        include: [
            {
                model: Pelanggan,
                as: 'pelanggan',
                attributes: ['nama_instansi', 'pic', 'no_telp', 'alamat']
            },
            {
                model: TarifPengambilan,
                attributes: ['id_tarif_pengambilan', 'keterangan_jarak', 'tarif']
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
                        attributes: ['id_pegawai', 'nama_pegawai', 'no_wa', 'is_pcc'],
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
                    'dijadwalkan_pada',
                    'diambil_pada',
                ],
                required: false
            },
            {
                model: Lhu,
                as: 'lhus',
                attributes: [
                    'nomor_lhu',
                    'id_registrasi',
                    'tanggal_penerbitan',
                    'file_lhu_path',
                    'qc_at',
                    'kalab_at',
                    'status_lhu',
                    'created_at',
                    'updated_at'
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
                            'id_parameter',
                            'id_metode_parameter',
                            
                            
                            'status_kemampuan_lab',
                            'catatan_kemampuan',
                            
                            'dipilih_pada'
                        ],
                        include: [
                            {
                                model: Parameter,
                                attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter']
                            },
                            {
                                model: ParameterMetode,
                                required: false,
                                attributes: ['id_metode_parameter', 'tarif', 'acuan_metode', 'is_terakreditasi', 'is_subkontrak'],
                                include: [
                                    { model: Metode, attributes: ['id_metode', 'nama_metode'] }
                                ]
                            }
                        ]
                    },
                    {
                        // Sampel via SampelParameter — langsung tanpa lewat PktBmPm
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
                                            'tanggal_tenggat'
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
                                                required: false,
                                                include: [
                                                    {
                                                        model: User,
                                                        as: 'Analis',
                                                        attributes: ['nik', 'username', 'email'],
                                                        required: false,
                                                        include: [
                                                            {
                                                                model: Pegawai,
                                                                attributes: ['id_pegawai', 'nama_pegawai', 'no_wa'],
                                                                required: false
                                                            }
                                                        ]
                                                    }
                                                ]
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
                            }
                        ]
                    }
                ]
            }
        ],
        order: [['tanggal_pendaftaran', 'DESC']]
    });

    return requestRecords.map((req) => {
        const json = decorateSampleReceiptFields(decorateScheduleFields(req.toJSON()));

        if (role === Roles.KASI) {
            const fpplSamples = json.fppl_sampels || json.FpplSampels || [];
            const types = new Set();

            fpplSamples.forEach((sampel) => {
                const jenis =
                    sampel?.jenis_sampel?.jenis_sampel ||
                    sampel?.JenisSampel?.jenis_sampel ||
                    '-';
                if (jenis && jenis !== '-') types.add(jenis);
            });


            return {
                ...json,
                noReg: json.id_registrasi,
                tanggal: json.tanggal_pendaftaran,
                tanggalVerifikasi: json.tanggal_verifikasi,
                pelanggan:
                    json.Pelanggan?.nama_instansi ||
                    json.pelanggan?.nama_instansi ||
                    json.Pelanggan?.pic ||
                    json.pelanggan?.pic ||
                    '-',
                jenisSampel: Array.from(types).join(', ') || '-',
                status: queryStatus === 'Riwayat'
                    ? getKasiDecisionStatus(json.status_fppl, json.catatan_penolakan)
                    : json.status_fppl
            };
        }

        if (role === Roles.PENYELIA) {
            return buildPenyeliaRequestSummary(json);
        }

        const customerHistoryStatus = role === Roles.CUSTOMER
            ? deriveCustomerHistoryStatus(json)
            : json.status_fppl;

        return {
            ...json,
            status: customerHistoryStatus,
            statusDisplay: customerHistoryStatus,
            status_display: customerHistoryStatus,
            statusPelanggan: customerHistoryStatus,
            status_pelanggan: customerHistoryStatus,
            status_fppl_asli: json.status_fppl
        };
    });
};

module.exports = { listRequests };
