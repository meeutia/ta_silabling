const { Lhu, LhuSampel, DetailLhu, Sampel, FpplSampel, JenisSampel, RegBm, Fppl, Pelanggan, PktBm, PktBmParam, PktBmNilai, FpplParameterMetode, Parameter, ParameterMetode, Metode, Pegawai, JadwalSampel, Lka, LkaHasil, PenugasanDetail, } = require('../../models/Associations');
const { formatSampleNoList, formatSampleFieldLines, getSampleOrderValue, sortRowsBySampleOrder, normalizeSampleTypeForLhu, normalizeSampleCollectorForLhu, } = require('./lhu-pdf-format.util');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
class LhuPdfDataService {
getPlain = (instance) => {
        return instance ? instance.get({ plain: true }) : null;
    };
    pickObject = (source, keys = []) => {
        for (const key of keys) {
            if (source?.[key])
                return source[key];
        }
        return null;
    };
    pickArray = (source, keys = []) => {
        for (const key of keys) {
            if (Array.isArray(source?.[key]))
                return source[key];
        }
        return [];
    };
    toTinyIntFlag = (value) => {
        if (value === true || value === 1)
            return 1;
        const text = String(value ?? '').trim().toLowerCase();
        return text === '1' || text === 'true' || text === 'yes' ? 1 : 0;
    };
    normalizeBmText = (value) => {
        if (value === null || value === undefined)
            return null;
        const text = String(value).trim();
        return text || null;
    };
    normalizeNilaiBmForLhu = (value) => {
        const text = this.normalizeBmText(value);
        if (!text || text === '-' || text === '(-)')
            return '(-)';
        return text;
    };
    dedupeSampleRowsForPdf = (rows = []) => {
        const map = new Map();
        sortRowsBySampleOrder(Array.isArray(rows) ? rows : []).forEach((row, index) => {
            const noSampel = String(row?.no_sampel || row?.noSampel || '').trim();
            if (!noSampel || map.has(noSampel))
                return;
            map.set(noSampel, {
                ...row,
                no_sampel: noSampel,
                urutan_sampel: map.size + 1 || getSampleOrderValue(row, index),
            });
        });
        return Array.from(map.values());
    };
    getLkaHasilReviewStatus = (row = {}) => {
        return row.status_review_hasil || row.statusReviewHasil || null;
    };
    isResultApprovedByKasi = (row = {}) => {
        return String(this.getLkaHasilReviewStatus(row) || '').trim() === 'Disetujui Kasi Pengujian';
    };
    getParameterMethodKey = (row = {}) => {
        return String(row.id_metode_parameter ||
            row.idMetodeParameter ||
            row.id_parameter_metode ||
            row.idParameterMetode ||
            '').trim();
    };
    getParameterKey = (row = {}) => {
        return String(row.id_parameter || row.idParameter || '').trim();
    };
    getFpplParameterMetodeKey = (row = {}) => {
        return String(row.id_fppl_parameter_metode ||
            row.idFpplParameterMetode ||
            row.id_fppl_pm ||
            row.idFpplPm ||
            '').trim();
    };
    getSubkontrakSnapshot = (row = {}) => {
        return this.toTinyIntFlag(row.is_subkontrak_snapshot ??
            row.isSubkontrakSnapshot ??
            row.is_subkontrak ??
            row.isSubkontrak);
    };
    getScheduleCreatedTime = (row = {}) => {
        const createdCandidates = [row.dibuat_pada, row.created_at, row.createdAt, row.updated_at, row.updatedAt];
        for (const value of createdCandidates) {
            if (!value)
                continue;
            const time = new Date(value).getTime();
            if (!Number.isNaN(time))
                return time;
        }
        return 0;
    };
    getScheduleDateTime = (row = {}) => {
        const time = new Date(`${row.tanggal_jadwal || '1900-01-01'} ${row.jam_jadwal || '00:00:00'}`).getTime();
        return Number.isNaN(time) ? 0 : time;
    };
    getScheduleIdOrder = (row = {}) => {
        const numeric = String(row.id_jadwal || '').match(/\d+/g)?.join('');
        return Number(numeric || 0);
    };
    getActiveJadwalFromFppl = (fppl = {}) => {
        const rows = this.pickArray(fppl, [
            'jadwal_sampels',
            'JadwalSampels',
            'jadwalSampel',
            'jadwalSampels',
        ]);
        return rows
            .filter((row) => String(row?.status_jadwal || '').trim().toLowerCase() !== 'dibatalkan')
            .sort((a, b) => (this.getScheduleCreatedTime(b) - this.getScheduleCreatedTime(a) ||
            this.getScheduleIdOrder(b) - this.getScheduleIdOrder(a) ||
            this.getScheduleDateTime(b) - this.getScheduleDateTime(a)))[0] || null;
    };
    getPegawaiSnapshot = async (nik, transaction = null) => {
        const userNik = String(nik || '').trim();
        if (!userNik) {
            return {
                nama_pegawai: null,
                nip: null,
            };
        }
        const pegawai = await Pegawai.findOne({
            where: { nik: userNik },
            attributes: ['nik', 'nama_pegawai', 'nip'],
            transaction,
        });
        if (!pegawai) {
            return {
                nama_pegawai: null,
                nip: null,
            };
        }
        const row = this.getPlain(pegawai);
        return {
            nama_pegawai: row.nama_pegawai || null,
            nip: row.nip || null,
        };
    };
    getLhuHeaderForPdf = async (nomorLhu, transaction = null) => {
        const instance = await Lhu.findByPk(nomorLhu, {
            include: [
                {
                    model: Fppl,
                    as: 'fppl',
                    required: false,
                    include: [
                        { model: Pelanggan, as: 'pelanggan', required: false },
                        { model: JadwalSampel, as: 'jadwal_sampels', required: false },
                    ],
                },
                {
                    model: PktBm,
                    required: false,
                    include: [{ model: RegBm, required: false }, { model: JenisSampel, required: false }],
                },
            ],
            transaction,
        });
        const row = this.getPlain(instance);
        if (!row)
            return null;
        const fppl = this.pickObject(row, ['fppl', 'Fppl']) || {};
        const pelanggan = this.pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
        const pktBm = withPaketBmDisplayFields(this.pickObject(row, ['pkt_bm', 'PktBm']) || {});
        const regBm = this.pickObject(pktBm, ['reg_bm', 'RegBm']) || {};
        return {
            ...row,
            nomor_fppl: fppl.nomor_fppl || null,
            tanggal_pendaftaran: fppl.tanggal_pendaftaran || null,
            maksud_pengujian: fppl.maksud_pengujian || null,
            lokasi_pengambilan_sampel: fppl.lokasi_pengambilan_sampel || null,
            jenis_pengambilan_sampel: fppl.jenis_pengambilan_sampel || null,
            nama_pelanggan: pelanggan.nama_instansi || null,
            alamat_pelanggan: pelanggan.alamat || null,
            pic_pelanggan: pelanggan.pic || null,
            telp_pelanggan: pelanggan.no_telp || null,
            email_pelanggan: pelanggan.email_kontak || null,
            nama_pkt: pktBm.nama_pkt || null,
            klasifikasi: pktBm.klasifikasi || null,
            teks_lhu: pktBm.teks_lhu || null,
            reg_bm_instansi: regBm.instansi || null,
            ref_reg: regBm.ref_reg || null,
        };
    };
    getLhuSampleRowsForPdf = async (nomorLhu, transaction = null) => {
        const instances = await LhuSampel.findAll({
            where: { nomor_lhu: nomorLhu },
            include: [
                {
                    model: Sampel,
                    as: 'sampel',
                    required: true,
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
                ['urutan_sampel', 'ASC'],
                ['no_sampel', 'ASC'],
            ],
            transaction,
        });
        const mappedRows = instances.map((instance, index) => {
            const row = this.getPlain(instance) || {};
            const sample = this.pickObject(row, ['sampel', 'Sampel']) || {};
            const fpplSampel = this.pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
            const jenisSampel = this.pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
            return {
                no_sampel: row.no_sampel || sample.no_sampel || null,
                urutan_sampel: getSampleOrderValue(row, index),
                tanggal_pengambilan_sampel: sample.tanggal_pengambilan_sampel || null,
                diterima_pada: sample.diterima_pada || null,
                kondisi_sampel: sample.kondisi_sampel || null,
                abnormalitas_sampel: sample.abnormalitas_sampel || null,
                lokasi_spesifik: sample.lokasi_spesifik || null,
                koordinat: sample.koordinat || null,
                acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || null,
                jenis_sampel: jenisSampel.jenis_sampel || null,
            };
        });
        return this.dedupeSampleRowsForPdf(mappedRows);
    };
    getBmParamMapForPdf = async (idPktBm, transaction = null) => {
        const id = String(idPktBm || '').trim();
        if (!id)
            return new Map();
        const paket = await PktBm.findByPk(id, { transaction });
        if (!paket)
            return new Map();
        const [metaRows, nilaiRows] = await Promise.all([
            PktBmParam.findAll({
                where: { id_reg_bm: paket.id_reg_bm, id_jenis_sampel: paket.id_jenis_sampel },
                transaction,
            }),
            PktBmNilai.findAll({ where: { id_pkt_bm: id }, transaction }),
        ]);
        const nilaiMap = new Map(nilaiRows.map((row) => [String(row.id_parameter), this.getPlain(row)]));
        const map = new Map();
        metaRows.map(this.getPlain).forEach((row) => {
            if (!row?.id_parameter)
                return;
            const nilai = nilaiMap.get(String(row.id_parameter)) || {};
            map.set(String(row.id_parameter), {
                ...row,
                id_pkt_bm: id,
                nilai_bm: nilai.nilai_bm ?? null,
            });
        });
        return map;
    };
    buildResultRowForPdf = (instance) => {
        const row = this.getPlain(instance) || {};
        const lka = this.pickObject(row, ['lka', 'Lka']) || {};
        const penugasanDetail = this.pickObject(lka, ['penugasan_detail', 'PenugasanDetail']) || {};
        const parameterMetode = this.pickObject(penugasanDetail, ['parameter_metode', 'ParameterMetode']) || {};
        const parameter = this.pickObject(parameterMetode, ['parameter', 'Parameter']) || {};
        const metode = this.pickObject(parameterMetode, ['metode', 'Metode']) || {};
        return {
            kode_lka: row.kode_lka || lka.kode_lka || null,
            no_sampel: row.no_sampel || null,
            hasil: row.hasil || null,
            catatan_hasil: row.catatan_hasil || null,
            status_review_hasil: row.status_review_hasil || row.statusReviewHasil || null,
            statusReviewHasil: row.statusReviewHasil || row.status_review_hasil || null,
            id_parameter: parameterMetode.id_parameter || parameter.id_parameter || null,
            idParameter: parameterMetode.id_parameter || parameter.id_parameter || null,
            id_metode_parameter: penugasanDetail.id_metode_parameter || parameterMetode.id_metode_parameter || null,
            idMetodeParameter: penugasanDetail.id_metode_parameter || parameterMetode.id_metode_parameter || null,
            nama_parameter: parameter.nama_parameter || null,
            namaParameter: parameter.nama_parameter || null,
            nama_metode: metode.nama_metode || null,
            namaMetode: metode.nama_metode || null,
            acuan_metode: parameterMetode.acuan_metode || null,
            acuanMetode: parameterMetode.acuan_metode || null,
            is_terakreditasi: parameterMetode.is_terakreditasi ?? 0,
            isTerakreditasi: parameterMetode.is_terakreditasi ?? 0,
            is_subkontrak: parameterMetode.is_subkontrak ?? 0,
            isSubkontrak: parameterMetode.is_subkontrak ?? 0,
        };
    };
    getApprovedResultRowsForPdf = async (sampleNo, transaction = null) => {
        const rows = await LkaHasil.findAll({
            where: {
                no_sampel: sampleNo,
                statusReviewHasil: 'Disetujui Kasi Pengujian',
            },
            include: [
                {
                    model: Lka,
                    required: true,
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
                            ],
                        },
                    ],
                },
            ],
            transaction,
        });
        return rows
            .map(this.buildResultRowForPdf)
            .filter((row) => String(row.hasil || '').trim() && this.isResultApprovedByKasi(row));
    };
    findApprovedResultForPdf = (expected = {}, rows = []) => {
        const expectedMethodKey = this.getParameterMethodKey(expected);
        const expectedParameterKey = this.getParameterKey(expected);
        return (Array.isArray(rows) ? rows : []).find((row) => {
            const rowMethodKey = this.getParameterMethodKey(row);
            if (expectedMethodKey && rowMethodKey && expectedMethodKey === rowMethodKey)
                return true;
            const rowParameterKey = this.getParameterKey(row);
            if (expectedParameterKey && rowParameterKey && expectedParameterKey === rowParameterKey)
                return true;
            return false;
        }) || null;
    };
    getLhuDetailRowsForPdf = async (nomorLhu, header = {}, sampleRows = [], transaction = null) => {
        const [detailInstances, bmParamMap] = await Promise.all([
            DetailLhu.findAll({
                where: { nomor_lhu: nomorLhu },
                include: [
                    {
                        model: FpplParameterMetode,
                        as: 'fppl_parameter_metode',
                        required: false,
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
                order: [
                    ['urutan_lhu', 'ASC'],
                    ['id_fppl_parameter_metode', 'ASC'],
                ],
                transaction,
            }),
            this.getBmParamMapForPdf(header.id_pkt_bm, transaction),
        ]);
        const orderedSampleRows = this.dedupeSampleRowsForPdf(sampleRows);
        const sampleOrderMap = new Map();
        const resultRowsBySample = new Map();
        for (const [index, sample] of orderedSampleRows.entries()) {
            const sampleNo = String(sample.no_sampel || '').trim();
            if (!sampleNo)
                continue;
            sampleOrderMap.set(sampleNo, getSampleOrderValue(sample, index));
            resultRowsBySample.set(sampleNo, await this.getApprovedResultRowsForPdf(sampleNo, transaction));
        }
        const rows = [];
        detailInstances.forEach((instance) => {
            const detail = this.getPlain(instance) || {};
            const fpm = this.pickObject(detail, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};
            const parameter = this.pickObject(fpm, ['parameter', 'Parameter']) || {};
            const parameterMetode = this.pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
            const metode = this.pickObject(parameterMetode, ['metode', 'Metode']) || {};
            const expected = {
                id_fppl_parameter_metode: detail.id_fppl_parameter_metode || fpm.id_fppl_parameter_metode || null,
                idFpplParameterMetode: detail.id_fppl_parameter_metode || fpm.id_fppl_parameter_metode || null,
                id_parameter: fpm.id_parameter || parameter.id_parameter || parameterMetode.id_parameter || null,
                idParameter: fpm.id_parameter || parameter.id_parameter || parameterMetode.id_parameter || null,
                id_metode_parameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
                idMetodeParameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
                nama_parameter: parameter.nama_parameter || '-',
                namaParameter: parameter.nama_parameter || '-',
                metode: metode.nama_metode || '-',
                nama_metode: metode.nama_metode || '-',
                namaMetode: metode.nama_metode || '-',
                acuan_metode: parameterMetode.acuan_metode || '-',
                acuanMetode: parameterMetode.acuan_metode || '-',
                is_terakreditasi: parameterMetode.is_terakreditasi ?? 0,
                isTerakreditasi: parameterMetode.is_terakreditasi ?? 0,
                is_insitu: fpm.is_insitu ?? 0,
                isInsitu: fpm.is_insitu ?? 0,
                is_subkontrak: parameterMetode.is_subkontrak ?? 0,
                isSubkontrak: parameterMetode.is_subkontrak ?? 0,
                urutan_lhu: detail.urutan_lhu || 1,
            };
            const bm = bmParamMap.get(String(expected.id_parameter || '')) || null;
            const nilaiBm = bm ? this.normalizeNilaiBmForLhu(bm.nilai_bm) : '(-)';
            const satuanBm = bm ? this.normalizeBmText(bm.satuan_bm) : null;
            const adaDiBm = bm ? 1 : 0;
            orderedSampleRows.forEach((sample) => {
                const sampleNo = String(sample.no_sampel || '').trim();
                const result = this.findApprovedResultForPdf({ ...expected, no_sampel: sampleNo, noSampel: sampleNo }, resultRowsBySample.get(sampleNo) || []);
                rows.push({
                    nomor_lhu: nomorLhu,
                    no_sampel: sampleNo,
                    urutan_sampel: sampleOrderMap.get(sampleNo) || getSampleOrderValue(sample, 0),
                    urutan_lhu: detail.urutan_lhu || 1,
                    id_fppl_parameter_metode: expected.id_fppl_parameter_metode,
                    id_metode_parameter: expected.id_metode_parameter,
                    id_parameter: expected.id_parameter,
                    nama_parameter_snapshot: expected.nama_parameter,
                    metode_snapshot: expected.metode,
                    acuan_metode_snapshot: expected.acuan_metode,
                    hasil_snapshot: result?.hasil || null,
                    is_terakreditasi: this.toTinyIntFlag(expected.is_terakreditasi),
                    is_insitu_snapshot: this.toTinyIntFlag(expected.is_insitu),
                    is_subkontrak_snapshot: this.getSubkontrakSnapshot(expected),
                    bm_snapshot: nilaiBm,
                    satuan_bm_snapshot: satuanBm,
                    ada_di_bm_snapshot: adaDiBm,
                    tanggal_sampling: sample.tanggal_pengambilan_sampel || null,
                });
            });
        });
        return rows.sort((a, b) => Number(a.urutan_lhu || 0) - Number(b.urutan_lhu || 0) ||
            String(a.nama_parameter_snapshot || '').localeCompare(String(b.nama_parameter_snapshot || '')) ||
            Number(a.urutan_sampel || 0) - Number(b.urutan_sampel || 0) ||
            String(a.no_sampel || '').localeCompare(String(b.no_sampel || '')));
    };
    getLhuPdfData = async (nomorLhu, transaction = null) => {
        const header = await this.getLhuHeaderForPdf(nomorLhu, transaction);
        if (!header) {
            throw new Error('Data LHU tidak ditemukan untuk generate PDF.');
        }
        const sampleRows = await this.getLhuSampleRowsForPdf(nomorLhu, transaction);
        const [qc, kalab, details] = await Promise.all([
            this.getPegawaiSnapshot(header.qc_by, transaction),
            this.getPegawaiSnapshot(header.kalab_by, transaction),
            this.getLhuDetailRowsForPdf(nomorLhu, header, sampleRows, transaction),
        ]);
        const firstSample = sampleRows[0] || {};
        const sampleNoList = formatSampleNoList(sampleRows);
        const coordinateText = formatSampleFieldLines(sampleRows, (row) => row.koordinat, firstSample.koordinat || null, { repeatShared: false });
        const lhu = {
            ...header,
            no_sampel: sampleNoList,
            sampleRows,
            sample_rows: sampleRows,
            jenis_sampel: normalizeSampleTypeForLhu(firstSample.jenis_sampel),
            jenisSampel: normalizeSampleTypeForLhu(firstSample.jenis_sampel),
            jenis_pengambilan_sampel: normalizeSampleCollectorForLhu(header.jenis_pengambilan_sampel),
            tanggal_pengambilan_sampel: firstSample.tanggal_pengambilan_sampel || null,
            tanggal_penerimaan: firstSample.diterima_pada || null,
            jam_penerimaan: firstSample.diterima_pada ? new Date(firstSample.diterima_pada).toTimeString().slice(0, 8) : null,
            tanggal_sampling: firstSample.tanggal_pengambilan_sampel || null,
            kondisi_sampel: firstSample.kondisi_sampel || null,
            abnormalitas_sampel: formatSampleFieldLines(sampleRows, (row) => row.abnormalitas_sampel, firstSample.abnormalitas_sampel || null),
            lokasi_spesifik: formatSampleFieldLines(sampleRows, (row) => row.lokasi_spesifik || header.lokasi_pengambilan_sampel, firstSample.lokasi_spesifik || header.lokasi_pengambilan_sampel || null),
            lokasi_pengambilan_sampel: formatSampleFieldLines(sampleRows, (row) => row.lokasi_spesifik || header.lokasi_pengambilan_sampel, firstSample.lokasi_spesifik || header.lokasi_pengambilan_sampel || null),
            koordinat: coordinateText,
            acuan_pengambilan_sampel: formatSampleFieldLines(sampleRows, (row) => row.acuan_pengambilan_sampel, firstSample.acuan_pengambilan_sampel || null),
            standar_lhu: header.teks_lhu || [header.reg_bm_instansi, header.ref_reg].filter(Boolean).join(' - ') || null,
            qc_nama: qc.nama_pegawai,
            qc_nip: qc.nip,
            kalab_nama: kalab.nama_pegawai,
            kalab_nip: kalab.nip,
        };
        return { lhu, details };
    };
}
module.exports = new LhuPdfDataService();
module.exports.LhuPdfDataService = LhuPdfDataService;
