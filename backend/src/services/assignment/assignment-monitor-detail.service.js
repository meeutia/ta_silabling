const { User, Pelanggan, Fppl, FpplSampel, RegBm, JenisSampel, Parameter, Metode, ParameterMetode, Penugasan, PenugasanDetail, PenugasanItem, Sampel, Lka, LkaHasil, LkaRevisi, } = require('../../models/Associations');
const { getPlain, pickObject, pickArray, uniqueText, firstDate } = require('./assignment-object.helper');
const { parseWorksheetFiles, getPrimaryWorksheetPath } = require('./assignment-worksheet-files.helper');
const { getDetailParameterInfo } = require('./assignment-monitor.mapper');
const { getStatusOrderValue } = require('./assignment-fpm.helper');
const { resolveLkaHasilStatus, hasActiveRevisionForMonitorDetail, resolveMonitorDisplayStatus, } = require('./assignment-status.helper');
const { collectRevisionNotesForSample, buildWorksheetRevisionResponse, buildLkaHasilRevisionResponse, } = require('./assignment-revision.helper');
class AssignmentMonitorDetailService {
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
        const details = detailInstances.map((instance) => {
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
            const lkaRevisionRows = lka ? pickArray(lka, ['revisi_lka', 'RevisiLka', 'LkaRevisis']) : [];
            const worksheetRevisionPayload = buildWorksheetRevisionResponse(lka || {}, lkaRevisionRows, { audience: 'penyelia' });
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
                const revisionNotePayload = collectRevisionNotesForSample(lkaRevisionRows, noSampel, lka?.kode_lka || hasilRow.kode_lka || null, { audience: 'penyelia' });
                return {
                    kode_lka: lka?.kode_lka || hasilRow.kode_lka || null,
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
                    statusReviewHasil: resolveLkaHasilStatus(hasilRow, lka?.status_lka, lkaHasilRows),
                    ...buildLkaHasilRevisionResponse({ ...hasilRow, ...revisionNotePayload }),
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
                id_penugasan: row.id_penugasan,
                idPenugasanDetail: row.id_penugasan_detail,
                id_penugasan_detail: row.id_penugasan_detail,
                idFpplParameterMetode: row.id_fppl_parameter_metode,
                id_fppl_parameter_metode: row.id_fppl_parameter_metode,
                parameter: info.namaParameter,
                namaParameter: info.namaParameter,
                nama_parameter: info.namaParameter,
                metode: info.acuanMetode || info.namaMetode || info.idMetodeParameter || '-',
                namaMetode: info.namaMetode,
                nama_metode: info.namaMetode,
                acuanMetode: info.acuanMetode,
                acuan_metode: info.acuanMetode,
                idMetodeParameter: info.idMetodeParameter || null,
                id_metode_parameter: info.idMetodeParameter || null,
                idJenisSampel,
                id_jenis_sampel: idJenisSampel,
                jenisSampel: jenisContoh,
                jenis_sampel: jenisContoh,
                jenisContoh,
                jenis_contoh: jenisContoh,
                tanggalSampling,
                tanggal_sampling: tanggalSampling,
                tanggalPengambilanSampel: tanggalSampling,
                tanggal_pengambilan_sampel: tanggalSampling,
                abnormalitasSampel,
                abnormalitas_sampel: abnormalitasSampel,
                abnormalitasContoh: abnormalitasSampel,
                abnormalitas_contoh: abnormalitasSampel,
                acuanPengambilanSampel,
                acuan_pengambilan_sampel: acuanPengambilanSampel,
                deadline: row.tanggal_tenggat,
                tanggalTenggat: row.tanggal_tenggat,
                tanggal_tenggat: row.tanggal_tenggat,
                statusDetail,
                status_detail: statusDetail,
                statusDetailActual: row.status_detail,
                status_detail_actual: row.status_detail,
                hasActiveRevision,
                has_active_revision: hasActiveRevision,
                catatanDetail: row.catatan_detail || null,
                catatan_detail: row.catatan_detail || null,
                totalSampel,
                total_sampel: totalSampel,
                totalHasil,
                total_hasil: totalHasil,
                ...worksheetRevisionPayload,
                catatanRevisi: worksheetRevisionPayload.catatanRevisiLka || worksheetRevisionPayload.catatanRevisi || null,
                catatan_revisi: worksheetRevisionPayload.catatan_revisi_lka || worksheetRevisionPayload.catatan_revisi || null,
                lkaRevisionNote: worksheetRevisionPayload.lkaRevisionNote || null,
                lka_revision_note: worksheetRevisionPayload.lka_revision_note || null,
                worksheet: {
                    kodeLka: lka?.kode_lka || null,
                    kode_lka: lka?.kode_lka || null,
                    tanggalSampling,
                    tanggal_sampling: tanggalSampling,
                    tanggalPengambilanSampel: tanggalSampling,
                    tanggal_pengambilan_sampel: tanggalSampling,
                    abnormalitasSampel,
                    abnormalitas_sampel: abnormalitasSampel,
                    acuanPengambilanSampel,
                    acuan_pengambilan_sampel: acuanPengambilanSampel,
                    tanggalMulaiPengujian: lka?.tanggal_mulai_pengujian || null,
                    tanggal_mulai_pengujian: lka?.tanggal_mulai_pengujian || null,
                    tanggalSelesaiPengujian: lka?.tanggal_selesai_pengujian || null,
                    tanggal_selesai_pengujian: lka?.tanggal_selesai_pengujian || null,
                    dhlAkuades: lka?.dhl_akuades || null,
                    dhl_akuades: lka?.dhl_akuades || null,
                    fileWorksheetPath: getPrimaryWorksheetPath(lka?.file_worksheet_path),
                    file_worksheet_path: getPrimaryWorksheetPath(lka?.file_worksheet_path),
                    worksheetUrl: getPrimaryWorksheetPath(lka?.file_worksheet_path),
                    worksheetFiles,
                    statusLka: lka?.status_lka || 'Draft',
                    status_lka: lka?.status_lka || 'Draft',
                    ...worksheetRevisionPayload,
                    catatanRevisi: worksheetRevisionPayload.catatanRevisiLka || worksheetRevisionPayload.catatanRevisi || null,
                    catatan_revisi: worksheetRevisionPayload.catatan_revisi_lka || worksheetRevisionPayload.catatan_revisi || null,
                    lkaRevisionNote: worksheetRevisionPayload.lkaRevisionNote || null,
                    lka_revision_note: worksheetRevisionPayload.lka_revision_note || null,
                    dilaporkanOleh: lka?.dilaporkan_oleh || header.id_user_analis || null,
                    dilaporkan_oleh: lka?.dilaporkan_oleh || header.id_user_analis || null,
                    dilaporkanOlehNama: lka?.Pelapor?.username || lka?.pelapor?.username || analis.username || header.id_user_analis || '-',
                    dilaporkan_oleh_nama: lka?.Pelapor?.username || lka?.pelapor?.username || analis.username || header.id_user_analis || '-',
                    tanggalPelaporan: lka?.tanggal_pelaporan || null,
                    tanggal_pelaporan: lka?.tanggal_pelaporan || null,
                    diperiksaOleh: lka?.diperiksa_oleh || null,
                    diperiksa_oleh: lka?.diperiksa_oleh || null,
                    diperiksaOlehNama: lka?.Pemeriksa?.username || lka?.pemeriksa?.username || lka?.diperiksa_oleh || '-',
                    diperiksa_oleh_nama: lka?.Pemeriksa?.username || lka?.pemeriksa?.username || lka?.diperiksa_oleh || '-',
                    tanggalPemeriksaan: lka?.tanggal_pemeriksaan || null,
                    tanggal_pemeriksaan: lka?.tanggal_pemeriksaan || null,
                },
                samples: sampleRows.map((sample) => ({
                    kodeLka: sample.kodeLka || sample.kode_lka || lka?.kode_lka || null,
                    kode_lka: sample.kode_lka || sample.kodeLka || lka?.kode_lka || null,
                    noSampel: sample.no_sampel,
                    no_sampel: sample.no_sampel,
                    idRegistrasi: sample.id_registrasi || '-',
                    id_registrasi: sample.id_registrasi || '-',
                    pelanggan: sample.pelanggan || '-',
                    jenisSampel: sample.jenis_sampel || '-',
                    jenis_sampel: sample.jenis_sampel || '-',
                    regBm: sample.reg_bm || '-',
                    reg_bm: sample.reg_bm || '-',
                    tanggalPengambilanSampel: sample.tanggal_pengambilan_sampel || null,
                    tanggal_pengambilan_sampel: sample.tanggal_pengambilan_sampel || null,
                    tanggalSampling: sample.tanggal_pengambilan_sampel || null,
                    tanggal_sampling: sample.tanggal_pengambilan_sampel || null,
                    tanggalPenerimaan: sample.tanggal_penerimaan || null,
                    tanggal_penerimaan: sample.tanggal_penerimaan || null,
                    jamPenerimaan: sample.jam_penerimaan || null,
                    jam_penerimaan: sample.jam_penerimaan || null,
                    kondisiSampel: sample.kondisi_sampel || '-',
                    kondisi_sampel: sample.kondisi_sampel || '-',
                    koordinat: sample.koordinat || '-',
                    abnormalitasSampel: sample.abnormalitas_sampel || '-',
                    abnormalitas_sampel: sample.abnormalitas_sampel || '-',
                    acuanPengambilanSampel: sample.acuan_pengambilan_sampel || '-',
                    acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || '-',
                    hasil: sample.hasil || '',
                    hasHasil: Boolean(String(sample.hasil || '').trim()),
                    has_hasil: Boolean(String(sample.hasil || '').trim()),
                    catatanHasil: sample.catatan_hasil || '-',
                    catatan_hasil: sample.catatan_hasil || '-',
                    statusReviewHasil: sample.statusReviewHasil || null,
                    status_review_hasil: sample.statusReviewHasil || null,
                    ...buildLkaHasilRevisionResponse(sample),
                })),
            };
        });
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
            id_penugasan: header.id_penugasan,
            analis: analis.username || header.id_user_analis || '-',
            analisNama: analis.username || header.id_user_analis || '-',
            analis_nama: analis.username || header.id_user_analis || '-',
            idAnalis: header.id_user_analis || null,
            id_analis: header.id_user_analis || null,
            penyelia: penyelia?.username || header.assigned_by || '-',
            penyeliaNama: penyelia?.username || header.assigned_by || '-',
            penyelia_nama: penyelia?.username || header.assigned_by || '-',
            statusPenugasan: header.status_penugasan,
            status_penugasan: header.status_penugasan,
            assignedAt: header.assigned_at,
            assigned_at: header.assigned_at,
            idPenyelia: header.assigned_by || null,
            id_penyelia: header.assigned_by || null,
            jenisPenugasan: header.jenis_penugasan || 'INTERNAL',
            jenis_penugasan: header.jenis_penugasan || 'INTERNAL',
            catatanPenugasan: header.catatan_penugasan || null,
            catatan_penugasan: header.catatan_penugasan || null,
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
module.exports = new AssignmentMonitorDetailService();
module.exports.AssignmentMonitorDetailService = AssignmentMonitorDetailService;
