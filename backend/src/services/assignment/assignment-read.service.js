const { Op } = require('sequelize');
const { User, Pegawai, Pelanggan, Fppl, FpplSampel, RegBm, JenisSampel, Parameter, Metode, ParameterMetode, FpplParameterMetode, Penugasan, PenugasanDetail, PenugasanItem, Sampel, Lka, LkaHasil, LkaRevisi, } = require('../../models/Associations');
const { ROLE_ANALIS } = require('./assignment.constants');
const { getPlain, pickObject, pickArray, uniqueText, firstDate } = require('./assignment-object.helper');
const { parseWorksheetFiles, getPrimaryWorksheetPath } = require('./assignment-worksheet-files.helper');
const { internalAssignmentWhere, isSubkontrakAssignment } = require('./assignment-scope.helper');
const { assignmentGroupKey, assignmentPendingKey, getAssociatedFpmsFromSample, getStatusOrderValue, isInternalCapableFpm, sortSamplesForAssignment, } = require('./assignment-fpm.helper');
const { hasActiveRevisionForMonitorDetail, resolveMonitorDisplayStatus, resolveLkaHasilStatus, } = require('./assignment-status.helper');
const { deriveSampleStatus, getDetailParameterInfo, getDetailSampleRows, isInternalDetail, } = require('./assignment-monitor.mapper');
const { buildRevisionNoteBuckets, buildRevisionNoteResponseFromBuckets, getRevisionItemsFromRow, isGlobalRevisionLevel, isRevisionVisibleForAudience, collectRevisionNotesForSample, buildWorksheetRevisionResponse, buildLkaHasilRevisionResponse, } = require('./assignment-revision.helper');
const { enrichRevisionRowsWithResultSnapshots } = require('./assignment-revision-snapshot.helper');
class AssignmentReadService {
getAnalystOptions = async () => {
        const analystInstances = await User.findAll({
            where: {
                id_role: ROLE_ANALIS,
                is_active: 1,
            },
            attributes: ['nik', 'username'],
            include: [{ model: Pegawai, required: false, attributes: ['nama_pegawai'] }],
            order: [['username', 'ASC']],
        });
        return analystInstances.map((instance) => {
            const user = getPlain(instance);
            const pegawai = pickObject(user, ['pegawai', 'Pegawai']) || {};
            const label = pegawai.nama_pegawai || user.username || user.nik;
            return {
                nik: user.nik,
                id: user.nik,
                username: user.username,
                nama: pegawai.nama_pegawai || null,
                label,
                value: user.nik,
            };
        });
    };
    getPendingItems = async () => {
        const fpmInstances = await FpplParameterMetode.findAll({
            include: [
                {
                    model: FpplSampel,
                    required: true,
                    include: [
                        {
                            model: Fppl,
                            as: 'fppl',
                            required: true,
                            where: { status_fppl: 'Proses Pengujian' },
                            include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
                        },
                        { model: JenisSampel, required: false },
                        { model: RegBm, required: false },
                    ],
                },
                { model: Parameter, required: false },
                {
                    model: ParameterMetode,
                    required: false,
                    include: [{ model: Metode, required: false }],
                },
                {
                    model: Sampel,
                    as: 'sampels',
                    required: false,
                    through: { attributes: [] },
                },
            ],
            order: [['id_fppl_parameter_metode', 'ASC']],
        });
        const rows = fpmInstances
            .map((instance) => getPlain(instance))
            .filter(Boolean)
            .filter((fpm) => {
            const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
            return isInternalCapableFpm(fpm, parameterMetode);
        });
        const methodIds = Array.from(new Set(rows
            .map((fpm) => {
            const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
            return (fpm.id_metode_parameter ||
                fpm.idMetodeParameter ||
                parameterMetode.id_metode_parameter ||
                parameterMetode.idMetodeParameter ||
                null);
        })
            .filter(Boolean)));
        const assignedDetailInstances = methodIds.length
            ? await PenugasanDetail.findAll({
                where: {
                    id_metode_parameter: { [Op.in]: methodIds },
                },
                include: [
                    {
                        model: Penugasan,
                        required: true,
                        where: internalAssignmentWhere({
                            status_penugasan: { [Op.ne]: 'Dibatalkan' },
                        }),
                    },
                    {
                        model: PenugasanItem,
                        required: true,
                    },
                ],
            })
            : [];
        const assignedMethodSampleSet = new Set();
        assignedDetailInstances.forEach((instance) => {
            const detail = getPlain(instance);
            const items = pickArray(detail, [
                'penugasan_items',
                'PenugasanItems',
                'penugasan_item',
                'PenugasanItem',
            ]);
            items.forEach((item) => {
                if (!item?.no_sampel)
                    return;
                assignedMethodSampleSet.add(assignmentPendingKey(detail.id_metode_parameter, item.no_sampel));
            });
        });
        const grouped = new Map();
        rows.forEach((fpm) => {
            const fpplSampel = pickObject(fpm, ['fppl_sampel', 'FpplSampel']) || {};
            const fppl = pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
            const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
            const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
            const regBm = pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
            const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
            const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
            const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};
            const groupKey = assignmentGroupKey(fpm);
            if (!grouped.has(groupKey)) {
                grouped.set(groupKey, {
                    idRegistrasi: fppl.id_registrasi || fpplSampel.id_registrasi || '-',
                    pelanggan: pelanggan.nama_instansi || '-',
                    // pakai salah satu FPM sebagai representative untuk penugasan_detail
                    idFpplParameterMetode: fpm.id_fppl_parameter_metode,
                    id_metode_parameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
                    namaParameter: parameter.nama_parameter || '-',
                    namaMetode: metode.nama_metode || '-',
                    acuanMetode: parameterMetode.acuan_metode || '-',
                    is_insitu: Number(fpm.is_insitu || 0),
                    status_kemampuan_lab: fpm.status_kemampuan_lab || null,
                    isSubkontrak: false,
                    fpmIds: [],
                    availableSamples: [],
                    availableSampleRows: [],
                    assignedSamples: [],
                    jenis_sampel: new Set(),
                    reg_bm: new Set(),
                    assignedNoSet: new Set(),
                    assignedByNo: new Map(),
                });
            }
            const group = grouped.get(groupKey);
            group.fpmIds.push(fpm.id_fppl_parameter_metode);
            group.jenis_sampel.add(jenis.jenis_sampel || '-');
            group.reg_bm.add([regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ') || '-');
            const sampelRowsRaw = pickArray(fpm, ['sampels', 'Sampels', 'Sampel']);
            const sampleMap = new Map();
            sampelRowsRaw.forEach((sampel) => {
                if (!sampel?.no_sampel)
                    return;
                sampleMap.set(sampel.no_sampel, {
                    no_sampel: sampel.no_sampel,
                    id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,
                    pelanggan: pelanggan.nama_instansi || '-',
                    namaPelanggan: pelanggan.nama_instansi || '-',
                    idRegistrasi: fppl.id_registrasi || fpplSampel.id_registrasi || '-',
                    id_jenis_sampel: fpplSampel.id_jenis_sampel || fpm.id_jenis_sampel || null,
                    id_reg_bm: fpplSampel.id_reg_bm || fpm.id_reg_bm || null,
                    jenisSampel: jenis.jenis_sampel || '-',
                    regBm: [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ') || '-',
                    tanggalPengambilanSampel: sampel.tanggal_pengambilan_sampel || null,
                    tanggalSampling: sampel.tanggal_pengambilan_sampel || null,
                    tanggal_penerimaan: sampel.diterima_pada || null,
                    tanggal_terima: sampel.diterima_pada || null,
                    jam_penerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,
                    kondisi_sampel: sampel.kondisi_sampel || '-',
                    abnormalitas_sampel: sampel.abnormalitas_sampel || '-',
                    acuan_pengambilan_sampel: sampel.acuan_pengambilan_sampel || '-',
                    koordinat: sampel.koordinat || '-',
                });
            });
            const idMetodeParameter = fpm.id_metode_parameter ||
                fpm.idMetodeParameter ||
                parameterMetode.id_metode_parameter ||
                parameterMetode.idMetodeParameter ||
                null;
            const allSamples = Array.from(sampleMap.values()).sort(sortSamplesForAssignment);
            allSamples.forEach((sample) => {
                const methodSampleKey = assignmentPendingKey(idMetodeParameter, sample.no_sampel);
                const alreadyAssigned = assignedMethodSampleSet.has(methodSampleKey) ||
                    group.assignedNoSet.has(sample.no_sampel);
                if (alreadyAssigned) {
                    const assignedInfo = group.assignedByNo.get(sample.no_sampel) || {
                        no_sampel: sample.no_sampel,
                        id_user_analis: null,
                        analis_nama: '-',
                    };
                    group.assignedNoSet.add(sample.no_sampel);
                    group.assignedByNo.set(sample.no_sampel, assignedInfo);
                    if (!group.assignedSamples.some((item) => item.no_sampel === sample.no_sampel)) {
                        group.assignedSamples.push(assignedInfo);
                    }
                }
                else {
                    group.availableSampleRows.push(sample);
                    group.availableSamples.push(sample.no_sampel);
                }
            });
        });
        return Array.from(grouped.values())
            .map((group) => {
            const availableRows = group.availableSampleRows.filter((sample) => !group.assignedNoSet.has(sample.no_sampel));
            const uniqueAvailableSamples = Array.from(new Set(availableRows
                .map((sample) => sample.no_sampel)
                .filter(Boolean)));
            const uniqueAssignedSamples = Array.from(new Map([
                ...group.assignedSamples,
                ...Array.from(group.assignedByNo.values()),
            ].map((item) => [item.no_sampel, item])).values());
            let status_item = 'Sudah Habis Ditugaskan';
            if (uniqueAssignedSamples.length === 0)
                status_item = 'Belum Ditugaskan';
            else if (uniqueAvailableSamples.length > 0)
                status_item = 'Sebagian Ditugaskan';
            return {
                ...group,
                jenis_sampel: Array.from(group.jenis_sampel).join(', '),
                reg_bm: Array.from(group.reg_bm).join(', '),
                availableSamples: uniqueAvailableSamples,
                availableSampleRows: availableRows,
                assignedSamples: uniqueAssignedSamples,
                status_item,
            };
        })
            .filter((group) => group.availableSamples.length > 0);
    };
    getAssignmentMonitor = async () => {
        const penugasanInstances = await Penugasan.findAll({
            where: internalAssignmentWhere({ status_penugasan: { [Op.ne]: 'Dibatalkan' } }),
            include: [
                { model: User, as: 'Analis', required: false, attributes: ['nik', 'username'] },
                {
                    model: PenugasanDetail,
                    required: true,
                    include: [
                        {
                            model: ParameterMetode,
                            required: false,
                            include: [
                                { model: Parameter, required: false },
                                { model: Metode, required: false },
                            ],
                        },
                        { model: PenugasanItem, required: false, include: [{ model: Sampel, required: false }] },
                        {
                            model: Lka,
                            required: false,
                            include: [
                                { model: LkaHasil, required: false },
                                {
                                    model: LkaRevisi,
                                    as: 'revisi_lka',
                                    required: false,
                                    include: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        const rows = penugasanInstances.flatMap((instance) => {
            const penugasan = getPlain(instance);
            const analis = pickObject(penugasan, ['Analis']) || {};
            const details = pickArray(penugasan, ['penugasan_details', 'PenugasanDetails', 'penugasan_detail']);
            return details.filter(isInternalDetail).map((detail) => {
                const info = getDetailParameterInfo(detail);
                const sampleRows = getDetailSampleRows(detail);
                const lka = pickObject(detail, ['lka', 'Lka']) || {};
                const totalSampel = sampleRows.length;
                const totalHasil = sampleRows.filter((row) => String(row.hasil || '').trim()).length;
                const tanggalPenugasan = penugasan.assigned_at || null;
                const hasActiveRevision = hasActiveRevisionForMonitorDetail(detail, lka);
                const statusDetail = resolveMonitorDisplayStatus(detail, lka, hasActiveRevision);
                const latestActivityAt = lka.tanggal_pelaporan ||
                    penugasan.assigned_at ||
                    detail.tanggal_tenggat ||
                    null;
                return {
                    idPenugasan: penugasan.id_penugasan,
                    idPenugasanDetail: detail.id_penugasan_detail,
                    analis: analis.username || penugasan.id_user_analis || '-',
                    parameter: info.namaParameter,
                    metode: info.namaMetode,
                    deadline: detail.tanggal_tenggat,
                    tanggalTenggat: detail.tanggal_tenggat,
                    assignedAt: penugasan.assigned_at || null,
                    tanggalPenugasan,
                    tanggal_penugasan: tanggalPenugasan,
                    tanggalPelaporan: lka.tanggal_pelaporan || null,
                    tanggalPemeriksaan: lka.tanggal_pemeriksaan || null,
                    latestActivityAt,
                    latest_activity_at: latestActivityAt,
                    statusDetail,
                    status_detail: statusDetail,
                    statusDetailActual: detail.status_detail,
                    hasActiveRevision,
                    has_active_revision: hasActiveRevision,
                    totalSampel,
                    total_sampel: totalSampel,
                    totalHasil,
                    total_hasil: totalHasil,
                };
            });
        });
        return rows.sort((a, b) => {
            const statusDiff = getStatusOrderValue(a.statusDetail) - getStatusOrderValue(b.statusDetail);
            if (statusDiff !== 0)
                return statusDiff;
            return String(b.latestActivityAt || '').localeCompare(String(a.latestActivityAt || '')) ||
                String(b.idPenugasan || '').localeCompare(String(a.idPenugasan || ''));
        });
    };
    getTestingOverview = async () => {
        const sampleInstances = await Sampel.findAll({
            include: [
                {
                    model: FpplSampel,
                    as: 'fppl_sampel',
                    required: true,
                    include: [
                        { model: JenisSampel, required: false },
                        { model: RegBm, required: false },
                    ],
                },
                {
                    model: FpplParameterMetode,
                    as: 'parameter_metodes',
                    required: false,
                    through: { attributes: [] },
                    include: [
                        { model: Parameter, required: false },
                        {
                            model: ParameterMetode,
                            required: false,
                            include: [{ model: Metode, required: false }],
                        },
                    ],
                },
            ],
            order: [['no_sampel', 'ASC']],
        });
        const samples = sampleInstances.map((instance) => getPlain(instance)).filter(Boolean);
        const methodIds = Array.from(new Set(samples
            .flatMap((sample) => getAssociatedFpmsFromSample(sample))
            .map((fpm) => {
            const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
            return (fpm.id_metode_parameter ||
                fpm.idMetodeParameter ||
                parameterMetode.id_metode_parameter ||
                parameterMetode.idMetodeParameter ||
                null);
        })
            .filter(Boolean)));
        const sampleNos = samples.map((sample) => sample.no_sampel).filter(Boolean);
        const detailInstances = methodIds.length && sampleNos.length
            ? await PenugasanDetail.findAll({
                where: {
                    id_metode_parameter: { [Op.in]: methodIds },
                },
                include: [
                    {
                        model: Penugasan,
                        required: true,
                        where: {
                            status_penugasan: { [Op.ne]: 'Dibatalkan' },
                        },
                        include: [
                            {
                                model: User,
                                as: 'Analis',
                                required: false,
                                attributes: ['nik', 'username'],
                            },
                        ],
                    },
                    {
                        model: PenugasanItem,
                        required: true,
                        where: {
                            no_sampel: { [Op.in]: sampleNos },
                        },
                    },
                ],
            })
            : [];
        const detailsByMethodSample = new Map();
        detailInstances.forEach((instance) => {
            const detail = getPlain(instance);
            const idMetodeParameter = String(detail.id_metode_parameter || '').trim();
            const penugasan = pickObject(detail, ['penugasan', 'Penugasan']) || {};
            const analis = pickObject(penugasan, ['Analis']) || {};
            const items = pickArray(detail, [
                'penugasan_items',
                'PenugasanItems',
                'penugasan_item',
                'PenugasanItem',
            ]);
            items.forEach((item) => {
                if (!idMetodeParameter || !item?.no_sampel)
                    return;
                const key = assignmentPendingKey(idMetodeParameter, item.no_sampel);
                if (!detailsByMethodSample.has(key)) {
                    detailsByMethodSample.set(key, []);
                }
                detailsByMethodSample.get(key).push({
                    detail,
                    penugasan,
                    analis,
                });
            });
        });
        return samples.map((sample) => {
            const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
            const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
            const regBm = pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
            const fpms = getAssociatedFpmsFromSample(sample);
            const totalParameter = fpms.length;
            let totalDitugaskan = 0;
            let totalWorksheetTerkirim = 0;
            let totalPerluRevisi = 0;
            let totalSelesai = 0;
            const analisNames = new Set();
            fpms.forEach((fpm) => {
                const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
                const idMetodeParameter = fpm.id_metode_parameter ||
                    fpm.idMetodeParameter ||
                    parameterMetode.id_metode_parameter ||
                    parameterMetode.idMetodeParameter ||
                    null;
                if (!idMetodeParameter)
                    return;
                const matchingDetails = detailsByMethodSample.get(assignmentPendingKey(idMetodeParameter, sample.no_sampel)) || [];
                if (matchingDetails.length > 0) {
                    totalDitugaskan += 1;
                }
                if (matchingDetails.some(({ detail }) => detail.status_detail === 'Worksheet Terkirim')) {
                    totalWorksheetTerkirim += 1;
                }
                if (matchingDetails.some(({ detail }) => detail.status_detail === 'Perlu Revisi')) {
                    totalPerluRevisi += 1;
                }
                if (matchingDetails.some(({ detail }) => ['Disetujui', 'Selesai'].includes(detail.status_detail))) {
                    totalSelesai += 1;
                }
                matchingDetails.forEach(({ penugasan, analis }) => {
                    const name = isSubkontrakAssignment(penugasan)
                        ? 'Subkontrak'
                        : (analis.username || penugasan.id_user_analis || '');
                    if (name)
                        analisNames.add(name);
                });
            });
            const status = deriveSampleStatus({
                total_parameter: totalParameter,
                total_ditugaskan: totalDitugaskan,
                total_worksheet_terkirim: totalWorksheetTerkirim,
                total_perlu_revisi: totalPerluRevisi,
                total_selesai: totalSelesai,
            });
            return {
                noSampel: sample.no_sampel,
                jenisSampel: jenis.jenis_sampel || '-',
                standar: [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ') || '-',
                tanggalPengambilanSampel: sample.tanggal_pengambilan_sampel || null,
                tanggalSampling: sample.tanggal_pengambilan_sampel || null,
                tanggalPenerimaan: sample.diterima_pada || null,
                acuanPengambilanSampel: sample.acuan_pengambilan_sampel || '-',
                abnormalitasSampel: sample.abnormalitas_sampel || '-',
                totalParameter,
                totalDitugaskan,
                totalWorksheetTerkirim,
                totalPerluRevisi,
                totalSelesai,
                analisList: Array.from(analisNames).sort().join(', ') || '-',
                statusAgregat: status,
            };
        });
    };
    getMyAssignments = async (userNik) => {
        const penugasanInstances = await Penugasan.findAll({
            where: internalAssignmentWhere({
                id_user_analis: userNik,
                status_penugasan: { [Op.ne]: 'Dibatalkan' },
            }),
            include: [
                {
                    model: PenugasanDetail,
                    required: true,
                    include: [
                        {
                            model: ParameterMetode,
                            required: false,
                            include: [
                                { model: Parameter, required: false },
                                { model: Metode, required: false },
                            ],
                        },
                        { model: PenugasanItem, required: false },
                        {
                            model: Lka,
                            required: false,
                            include: [
                                { model: LkaHasil, required: false },
                                {
                                    model: LkaRevisi,
                                    as: 'revisi_lka',
                                    required: false,
                                    include: [],
                                },
                            ],
                        },
                    ],
                },
            ],
            order: [['assigned_at', 'DESC']],
        });
        const rows = penugasanInstances.flatMap((instance) => {
            const penugasan = getPlain(instance);
            const details = pickArray(penugasan, ['penugasan_details', 'PenugasanDetails', 'penugasan_detail']);
            return details.filter(isInternalDetail).map((detail) => {
                const info = getDetailParameterInfo(detail);
                const sampleRows = getDetailSampleRows(detail);
                const lka = pickObject(detail, ['lka', 'Lka']) || null;
                const lkaHasilRows = lka ? pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']) : [];
                const sampleNos = new Set(sampleRows.map((row) => row.no_sampel).filter(Boolean));
                const relatedResults = lkaHasilRows.filter((row) => sampleNos.has(row.no_sampel));
                const revisionRows = lka
                    ? pickArray(lka, ['revisi_lka', 'lka_revisis', 'LkaRevisis', 'revisiLka'])
                    : [];
                const revisionBuckets = buildRevisionNoteBuckets();
                revisionRows.forEach((revision) => {
                    const source = revision.sumber_revisi || revision.sumberRevisi;
                    const globalNote = String(revision.catatan_revisi ||
                        revision.catatanRevisi ||
                        revision.catatan_revisi_global ||
                        revision.catatanRevisiGlobal ||
                        '').trim();
                    if (globalNote &&
                        isGlobalRevisionLevel(revision.level_revisi || revision.levelRevisi) &&
                        isRevisionVisibleForAudience(revision, {}, 'analis')) {
                        revisionBuckets.addBySource(source, globalNote);
                    }
                    getRevisionItemsFromRow(revision).forEach((item) => {
                        const itemSample = String(item.no_sampel || item.noSampel || '').trim();
                        if (!sampleNos.has(itemSample))
                            return;
                        if (!isRevisionVisibleForAudience(revision, item, 'analis'))
                            return;
                        const itemNote = String(item.catatan_revisi ||
                            item.catatanRevisi ||
                            item.catatan_revisi_item ||
                            item.catatanRevisiItem ||
                            '').trim();
                        revisionBuckets.addBySource(source, itemNote);
                    });
                });
                const revisionNoteRequestData = buildRevisionNoteResponseFromBuckets(revisionBuckets);
                const catatanRevisiHasil = revisionNoteRequestData.catatanRevisiHasil || null;
                const catatanRevisiHasilPenyelia = revisionNoteRequestData.catatanRevisiHasilPenyelia || null;
                const catatanRevisiHasilKasiPengujian = revisionNoteRequestData.catatanRevisiHasilKasiPengujian || null;
                const catatanResponPenyelia = revisionNoteRequestData.catatanResponPenyelia || null;
                const totalHasil = relatedResults.filter((row) => String(row.hasil || '').trim()).length;
                const sampleNoList = Array.from(sampleNos);
                const catatanHasilAnalis = Array.from(new Set(relatedResults
                    .map((row) => String(row.catatan_hasil || '').trim())
                    .filter(Boolean))).join('\n\n') || null;
                return {
                    idPenugasan: penugasan.id_penugasan,
                    idPenugasanDetail: detail.id_penugasan_detail,
                    catatanPenugasan: penugasan.catatan_penugasan || null,
                    parameter: info.namaParameter,
                    metode: info.namaMetode,
                    deadline: detail.tanggal_tenggat,
                    statusDetail: detail.status_detail,
                    totalSampel: sampleRows.length,
                    sampleNos: sampleNoList,
                    noSampelList: sampleNoList,
                    noSampel: sampleNoList.join(', '),
                    totalHasil,
                    total_hasil: totalHasil,
                    catatanHasilAnalis,
                    catatan_hasil_analis: catatanHasilAnalis,
                    catatanRevisiHasilPenyelia,
                    catatan_revisi_hasil_penyelia: catatanRevisiHasilPenyelia,
                    catatanRevisiHasilKasiPengujian,
                    catatan_revisi_hasil_kasi_pengujian: catatanRevisiHasilKasiPengujian,
                    catatanResponPenyelia,
                    catatan_respon_penyelia: catatanResponPenyelia,
                    catatanRevisiHasil,
                    catatan_revisi_hasil: catatanRevisiHasil,
                };
            });
        });
        return rows.sort((a, b) => {
            const deadlineA = a.deadline || '9999-12-31';
            const deadlineB = b.deadline || '9999-12-31';
            return String(deadlineA).localeCompare(String(deadlineB)) || String(b.idPenugasanDetail).localeCompare(String(a.idPenugasanDetail));
        });
    };
    resolvePenugasanId = async (idPenugasan, options = {}) => {
            const fallbackDetailId = String(options.idPenugasanDetail ||
                options.id_penugasan_detail ||
                options.detailId ||
                '').trim();
            if (!fallbackDetailId) {
                return String(idPenugasan || '').trim();
            }
            const detail = await PenugasanDetail.findOne({
                where: { id_penugasan_detail: fallbackDetailId },
                attributes: ['id_penugasan'],
            });
            return String(detail?.id_penugasan || idPenugasan || '').trim();
        };
        getAssignmentDetailsByPenugasan = async (idPenugasan, options = {}) => {
            const resolvedIdPenugasan = await this.resolvePenugasanId(idPenugasan, options);
            const headerInstance = await Penugasan.findByPk(resolvedIdPenugasan, {
                include: [{ model: User, as: 'Analis', required: false, attributes: ['nik', 'username'] }],
            });
            if (!headerInstance) {
                const error = new Error('Penugasan tidak ditemukan atau detail penugasan tidak sesuai.');
                error.statusCode = 404;
                throw error;
            }
            idPenugasan = resolvedIdPenugasan;
            const header = getPlain(headerInstance);
            const analis = pickObject(header, ['Analis']) || {};
            const penyeliaNik = header.assigned_by || null;
            const penyelia = penyeliaNik
                ? getPlain(await User.findOne({ where: { nik: penyeliaNik }, attributes: ['nik', 'username'] }))
                : null;
            const detailInstances = await PenugasanDetail.findAll({
                where: {
                    id_penugasan: idPenugasan,
                },
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
                        include: [
                            {
                                model: Sampel,
                                required: false,
                                include: [
                                    {
                                        model: FpplSampel,
                                        as: 'fppl_sampel',
                                        required: false,
                                        include: [
                                            { model: JenisSampel, required: false },
                                            { model: RegBm, required: false },
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
                    },
                    {
                        model: Lka,
                        required: false,
                        include: [
                            { model: LkaHasil, required: false },
                            {
                                model: LkaRevisi,
                                as: 'revisi_lka',
                                required: false,
                                include: [],
                            },
                            { model: User, as: 'Pelapor', required: false, attributes: ['nik', 'username'] },
                            { model: User, as: 'Pemeriksa', required: false, attributes: ['nik', 'username'] },
                        ],
                    },
                ],
            });
            const details = await Promise.all(detailInstances.map(async (instance) => {
                const row = getPlain(instance);
                const info = getDetailParameterInfo(row);
                const fpm = info.fpm || {};
                const fpplSampel = pickObject(fpm, ['fppl_sampel', 'FpplSampel']) || {};
                const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
                const regBm = pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
                const fppl = pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
                const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
                const penugasanItems = pickArray(row, ['penugasan_items', 'PenugasanItems', 'penugasan_item']);
                const lka = pickObject(row, ['lka', 'Lka']) || null;
                const lkaHasilRows = lka ? pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']) : [];
                const rawLkaRevisionRows = lka ? pickArray(lka, ['revisi_lka', 'RevisiLka', 'LkaRevisis']) : [];
                const lkaRevisionRows = await enrichRevisionRowsWithResultSnapshots(rawLkaRevisionRows);
                const worksheetRevisionRequestData = buildWorksheetRevisionResponse(lka || {}, lkaRevisionRows, { audience: 'penyelia' });
                const worksheetFiles = parseWorksheetFiles(lka?.file_worksheet_path);
                const sampleRows = penugasanItems
                    .map((item) => {
                    const sampel = pickObject(item, ['sampel', 'Sampel']) || {};
                    const sampelFppl = pickObject(sampel, ['fppl_sampel', 'FpplSampel']) || {};
                    const sampelJenis = pickObject(sampelFppl, ['jenis_sampel', 'JenisSampel']) || {};
                    const sampelRegBm = pickObject(sampelFppl, ['reg_bm', 'RegBm']) || {};
                    const sampelFpplHeader = pickObject(sampelFppl, ['fppl', 'Fppl']) || {};
                    const sampelPelanggan = pickObject(sampelFpplHeader, ['pelanggan', 'Pelanggan']) || {};
                    const noSampel = item.no_sampel || sampel.no_sampel;
                    const hasilRow = lkaHasilRows.find((hasil) => hasil.no_sampel === noSampel) || {};
                    const revisionNoteRequestData = collectRevisionNotesForSample(lkaRevisionRows, noSampel, lka?.kode_lka || hasilRow.kode_lka || null, { audience: 'penyelia' });
                    const revisionResponse = buildLkaHasilRevisionResponse({ ...hasilRow, ...revisionNoteRequestData });
                    const hasilSebelumnya = revisionResponse.hasilSebelumRevisi || revisionResponse.hasil_sebelum_revisi || null;
                    return {
                        kodeLka: lka?.kode_lka || hasilRow.kode_lka || null,
                        no_sampel: noSampel,
                        noSampel,
                        id_registrasi: sampelFpplHeader.id_registrasi || sampelFppl.id_registrasi || '-',
                        pelanggan: sampelPelanggan.nama_instansi || '-',
                        id_jenis_sampel: sampelFppl.id_jenis_sampel || null,
                        jenis_sampel: sampelJenis.jenis_sampel || '-',
                        reg_bm: [sampelRegBm.instansi, sampelRegBm.ref_reg].filter(Boolean).join(' - ') || '-',
                        tanggal_pengambilan_sampel: sampel.tanggal_pengambilan_sampel || null,
                        tanggal_penerimaan: sampel.diterima_pada || null,
                        jam_penerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,
                        kondisi_sampel: sampel.kondisi_sampel || '-',
                        abnormalitas_sampel: sampel.abnormalitas_sampel || '-',
                        acuan_pengambilan_sampel: sampel.acuan_pengambilan_sampel || '-',
                        koordinat: sampel.koordinat || '-',
                        hasil: hasilRow.hasil || '',
                        catatan_hasil: hasilRow.catatan_hasil || '-',
                        hasilSebelumnya,
                        hasil_sebelumnya: hasilSebelumnya,
                        hasilSebelumRevisi: revisionResponse.hasilSebelumRevisi || null,
                        hasil_sebelum_revisi: revisionResponse.hasil_sebelum_revisi || null,
                        statusReviewHasil: resolveLkaHasilStatus(hasilRow, lka?.status_lka, lkaHasilRows),
                        ...revisionResponse,
                    };
                })
                    .filter((sample) => sample.no_sampel);
                const tanggalSampling = firstDate(sampleRows.map((sample) => sample.tanggal_pengambilan_sampel)) || lka?.tanggal_sampling || null;
                const abnormalitasSampel = uniqueText(sampleRows.map((sample) => sample.abnormalitas_sampel));
                const acuanPengambilanSampel = uniqueText(sampleRows.map((sample) => sample.acuan_pengambilan_sampel));
                const jenisContoh = uniqueText(sampleRows.map((sample) => sample.jenis_sampel));
                const idJenisSampel = sampleRows.find((sample) => sample.id_jenis_sampel)?.id_jenis_sampel ||
                    null;
                const totalSampel = sampleRows.length;
                const totalHasil = sampleRows.filter((sample) => String(sample.hasil || '').trim()).length;
                const hasActiveRevision = hasActiveRevisionForMonitorDetail(row, lka || {});
                const statusDetail = resolveMonitorDisplayStatus(row, lka || {}, hasActiveRevision);
                return {
                    idPenugasan: row.id_penugasan,
                    idPenugasanDetail: row.id_penugasan_detail,
                    idFpplParameterMetode: row.id_fppl_parameter_metode,
                    parameter: info.namaParameter,
                    namaParameter: info.namaParameter,
                    metode: info.acuanMetode || info.namaMetode || info.idMetodeParameter || '-',
                    namaMetode: info.namaMetode,
                    acuanMetode: info.acuanMetode,
                    idMetodeParameter: info.idMetodeParameter || null,
                    idJenisSampel,
                    id_jenis_sampel: idJenisSampel,
                    jenisSampel: jenisContoh,
                    jenisContoh,
                    jenis_contoh: jenisContoh,
                    tanggalSampling,
                    tanggal_sampling: tanggalSampling,
                    tanggalPengambilanSampel: tanggalSampling,
                    abnormalitasSampel,
                    abnormalitas_sampel: abnormalitasSampel,
                    abnormalitasContoh: abnormalitasSampel,
                    acuanPengambilanSampel,
                    acuan_pengambilan_sampel: acuanPengambilanSampel,
                    deadline: row.tanggal_tenggat,
                    tanggalTenggat: row.tanggal_tenggat,
                    statusDetail,
                    status_detail: statusDetail,
                    statusDetailActual: row.status_detail,
                    hasActiveRevision,
                    has_active_revision: hasActiveRevision,
                    catatanDetail: row.catatan_detail || null,
                    totalSampel,
                    total_sampel: totalSampel,
                    totalHasil,
                    total_hasil: totalHasil,
                    ...worksheetRevisionRequestData,
                    catatanRevisi: worksheetRevisionRequestData.catatanRevisiLka || worksheetRevisionRequestData.catatanRevisi || null,
                    lkaRevisionNote: worksheetRevisionRequestData.lkaRevisionNote || null,
                    worksheet: {
                        kodeLka: lka?.kode_lka || null,
                        tanggalSampling,
                        tanggal_sampling: tanggalSampling,
                        tanggalPengambilanSampel: tanggalSampling,
                        abnormalitasSampel,
                        abnormalitas_sampel: abnormalitasSampel,
                        acuanPengambilanSampel,
                        acuan_pengambilan_sampel: acuanPengambilanSampel,
                        tanggalMulaiPengujian: lka?.tanggal_mulai_pengujian || null,
                        tanggalSelesaiPengujian: lka?.tanggal_selesai_pengujian || null,
                        dhlAkuades: lka?.dhl_akuades || null,
                        fileWorksheetPath: getPrimaryWorksheetPath(lka?.file_worksheet_path),
                        worksheetUrl: getPrimaryWorksheetPath(lka?.file_worksheet_path),
                        worksheetFiles,
                        statusLka: lka?.status_lka || 'Draft',
                        ...worksheetRevisionRequestData,
                        catatanRevisi: worksheetRevisionRequestData.catatanRevisiLka || worksheetRevisionRequestData.catatanRevisi || null,
                        lkaRevisionNote: worksheetRevisionRequestData.lkaRevisionNote || null,
                        dilaporkanOleh: lka?.dilaporkan_oleh || header.id_user_analis || null,
                        dilaporkanOlehNama: lka?.Pelapor?.username || lka?.pelapor?.username || analis.username || header.id_user_analis || '-',
                        tanggalPelaporan: lka?.tanggal_pelaporan || null,
                        diperiksaOleh: lka?.diperiksa_oleh || null,
                        diperiksaOlehNama: lka?.Pemeriksa?.username || lka?.pemeriksa?.username || lka?.diperiksa_oleh || '-',
                        tanggalPemeriksaan: lka?.tanggal_pemeriksaan || null,
                    },
                    samples: sampleRows.map((sample) => ({
                        kodeLka: sample.kodeLka || sample.kode_lka || lka?.kode_lka || null,
                        noSampel: sample.no_sampel,
                        idRegistrasi: sample.id_registrasi || '-',
                        pelanggan: sample.pelanggan || '-',
                        jenisSampel: sample.jenis_sampel || '-',
                        regBm: sample.reg_bm || '-',
                        tanggalPengambilanSampel: sample.tanggal_pengambilan_sampel || null,
                        tanggalSampling: sample.tanggal_pengambilan_sampel || null,
                        tanggalPenerimaan: sample.tanggal_penerimaan || null,
                        jamPenerimaan: sample.jam_penerimaan || null,
                        kondisiSampel: sample.kondisi_sampel || '-',
                        koordinat: sample.koordinat || '-',
                        abnormalitasSampel: sample.abnormalitas_sampel || '-',
                        acuanPengambilanSampel: sample.acuan_pengambilan_sampel || '-',
                        hasil: sample.hasil || '',
                        hasHasil: Boolean(String(sample.hasil || '').trim()),
                        catatanHasil: sample.catatan_hasil || '-',
                        hasilSebelumnya: sample.hasilSebelumnya || sample.hasil_sebelumnya || sample.hasilSebelumRevisi || sample.hasil_sebelum_revisi || null,
                        hasil_sebelumnya: sample.hasilSebelumnya || sample.hasil_sebelumnya || sample.hasilSebelumRevisi || sample.hasil_sebelum_revisi || null,
                        statusReviewHasil: sample.statusReviewHasil || null,
                        ...buildLkaHasilRevisionResponse(sample),
                    })),
                };
            }));
            details.sort((a, b) => {
                const statusDiff = getStatusOrderValue(a.statusDetail) - getStatusOrderValue(b.statusDetail);
                if (statusDiff !== 0)
                    return statusDiff;
                const dateA = a.worksheet?.tanggalPelaporan || a.worksheet?.tanggalPemeriksaan || a.tanggalTenggat || '';
                const dateB = b.worksheet?.tanggalPelaporan || b.worksheet?.tanggalPemeriksaan || b.tanggalTenggat || '';
                return String(dateB).localeCompare(String(dateA)) || String(b.idPenugasanDetail).localeCompare(String(a.idPenugasanDetail));
            });
            const totalDetail = details.length;
            const totalSampel = details.reduce((sum, detail) => sum + Number(detail.totalSampel || 0), 0);
            const totalWorksheetSubmitted = details.filter((detail) => detail.statusDetail === 'Worksheet Terkirim').length;
            const totalMenungguReview = details.filter((detail) => detail.statusDetail === 'Worksheet Terkirim' && detail.worksheet?.statusLka === 'Menunggu Verifikasi Penyelia').length;
            const totalPerluRevisi = details.filter((detail) => detail.statusDetail === 'Perlu Revisi').length;
            const totalDisetujui = details.filter((detail) => ['Disetujui', 'Selesai'].includes(detail.statusDetail)).length;
            return {
                idPenugasan: header.id_penugasan,
                analis: analis.username || header.id_user_analis || '-',
                analisNama: analis.username || header.id_user_analis || '-',
                idAnalis: header.id_user_analis || null,
                penyelia: penyelia?.username || header.assigned_by || '-',
                penyeliaNama: penyelia?.username || header.assigned_by || '-',
                statusPenugasan: header.status_penugasan,
                assignedAt: header.assigned_at,
                idPenyelia: header.assigned_by || null,
                jenisPenugasan: header.jenis_penugasan || 'INTERNAL',
                catatanPenugasan: header.catatan_penugasan || null,
                totalDetail,
                totalSampel,
                totalWorksheetSubmitted,
                totalMenungguReview,
                totalPerluRevisi,
                totalDisetujui,
                details,
            };
        };
}
module.exports = new AssignmentReadService();
module.exports.AssignmentReadService = AssignmentReadService;
