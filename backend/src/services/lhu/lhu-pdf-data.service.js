const { Lhu, Sampel, FpplSampel, JenisSampel, RegBm, Fppl, Pelanggan, PktBm, PktBmParam, PktBmNilai, Parameter, ParameterMetode, Metode, Pegawai, JadwalSampel, Lka, LkaHasil, PenugasanDetail, } = require('../../models/Associations');
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
        const instances = await Sampel.findAll({
            where: { nomor_lhu: nomorLhu },
            include: [
                {
                    model: FpplSampel,
                    as: 'fppl_sampel',
                    required: false,
                    include: [{ model: JenisSampel, required: false }],
                },
            ],
            order: [['no_sampel', 'ASC']],
            transaction,
        });
        const mappedRows = instances.map((instance, index) => {
            const sample = this.getPlain(instance) || {};
            const fpplSampel = this.pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
            const jenisSampel = this.pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
            return {
                no_sampel: sample.no_sampel || null,
                urutan_sampel: index + 1,
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
    getDetailFallbackKeyForPdf = (row = {}) => {
        const textKey = [
            this.getParameterKey(row),
            row.nama_parameter_snapshot || row.nama_parameter || row.namaParameter,
            row.metode_snapshot || row.nama_metode || row.namaMetode || row.metode,
            row.acuan_metode_snapshot || row.acuan_metode || row.acuanMetode,
        ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean).join('|');
        return String(
            row.detail_key ||
            row.detailKey ||
            row.key ||
            this.getParameterMethodKey(row) ||
            textKey
        ).trim();
    };
    compareText = (a, b) => {
        return String(a || '').localeCompare(String(b || ''), 'id', {
            sensitivity: 'base',
            numeric: true,
        });
    };
    sortPdfDetailGroups = (groups = []) => {
        return (Array.isArray(groups) ? [...groups] : []).sort((a, b) => {
            const parameterCompare = this.compareText(a.nama_parameter_snapshot || a.nama_parameter, b.nama_parameter_snapshot || b.nama_parameter);
            if (parameterCompare)
                return parameterCompare;
            const metodeCompare = this.compareText(a.metode_snapshot || a.nama_metode || a.metode, b.metode_snapshot || b.nama_metode || b.metode);
            if (metodeCompare)
                return metodeCompare;
            return this.compareText(this.getDetailFallbackKeyForPdf(a), this.getDetailFallbackKeyForPdf(b));
        });
    };
    normalizeDetailOrderInput = (value) => {
        if (Array.isArray(value))
            return value;
        if (!value)
            return [];
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed))
                    return parsed;
            }
            catch (error) {
                return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
            }
        }
        return [];
    };
    getPdfDetailOrderCandidateKeys = (row = {}) => {
        const textKey = [row.nama_parameter_snapshot || row.nama_parameter, row.metode_snapshot || row.nama_metode || row.metode, row.acuan_metode_snapshot || row.acuan_metode || row.acuanMetode]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean)
            .join('|');
        return [
            row.detail_key || row.detailKey || row.key,
            this.getDetailFallbackKeyForPdf(row),
            row.id_fppl_parameter_metode || row.idFpplParameterMetode,
            row.id_metode_parameter || row.idMetodeParameter || row.id_parameter_metode || row.idParameterMetode,
            row.id_parameter || row.idParameter,
            textKey,
        ].map((value) => String(value || '').trim()).filter(Boolean);
    };
    getStoredOrderCandidateKeys = (item = {}) => {
        if (!item || typeof item !== 'object') {
            const text = String(item || '').trim();
            return text ? [text] : [];
        }
        const textKey = [item.nama_parameter || item.namaParameter, item.metode || item.nama_metode || item.namaMetode, item.acuan_metode || item.acuanMetode]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean)
            .join('|');
        return [
            item.detail_key || item.detailKey,
            item.key,
            item.id_fppl_parameter_metode || item.idFpplParameterMetode,
            item.id_metode_parameter || item.idMetodeParameter || item.id_parameter_metode || item.idParameterMetode,
            item.id_parameter || item.idParameter,
            textKey,
        ].map((value) => String(value || '').trim()).filter(Boolean);
    };
    applyStoredDetailOrder = (groups = [], detailOrder = []) => {
        const defaultGroups = this.sortPdfDetailGroups(groups);
        const orderIndexByKey = new Map();
        (Array.isArray(detailOrder) ? detailOrder : []).forEach((item, index) => {
            this.getStoredOrderCandidateKeys(item).forEach((key) => {
                const normalized = String(key || '').trim().toLowerCase();
                if (normalized && !orderIndexByKey.has(normalized))
                    orderIndexByKey.set(normalized, index);
            });
        });
        if (!orderIndexByKey.size)
            return defaultGroups;
        const matched = [];
        const unmatched = [];
        defaultGroups.forEach((row, defaultIndex) => {
            const matchedIndex = this.getPdfDetailOrderCandidateKeys(row)
                .map((key) => orderIndexByKey.get(String(key).toLowerCase()))
                .find((index) => Number.isInteger(index));
            const payload = { ...row, __matchedOrderIndex: matchedIndex, __defaultIndex: defaultIndex };
            if (Number.isInteger(matchedIndex))
                matched.push(payload);
            else
                unmatched.push(payload);
        });
        return [...matched.sort((a, b) => a.__matchedOrderIndex - b.__matchedOrderIndex || a.__defaultIndex - b.__defaultIndex), ...unmatched]
            .map(({ __matchedOrderIndex, __defaultIndex, ...row }) => row);
    };
    getLhuDetailRowsForPdf = async (nomorLhu, header = {}, sampleRows = [], transaction = null, options = {}) => {
        const bmParamMap = await this.getBmParamMapForPdf(header.id_pkt_bm, transaction);
        const orderedSampleRows = this.dedupeSampleRowsForPdf(sampleRows);
        const sampleOrderMap = new Map();
        const grouped = new Map();
        for (const [index, sample] of orderedSampleRows.entries()) {
            const sampleNo = String(sample.no_sampel || '').trim();
            if (!sampleNo)
                continue;
            const sampleOrder = getSampleOrderValue(sample, index);
            sampleOrderMap.set(sampleNo, sampleOrder);
            const resultRows = await this.getApprovedResultRowsForPdf(sampleNo, transaction);
            resultRows.forEach((result) => {
                const key = this.getDetailFallbackKeyForPdf(result);
                if (!key)
                    return;
                if (!grouped.has(key)) {
                    const bm = bmParamMap.get(String(result.id_parameter || result.idParameter || '')) || null;
                    const nilaiBm = bm ? this.normalizeNilaiBmForLhu(bm.nilai_bm) : '(-)';
                    const satuanBm = bm ? this.normalizeBmText(bm.satuan_bm) : null;
                    const adaDiBm = bm ? 1 : 0;
                    grouped.set(key, {
                        nomor_lhu: nomorLhu,
                        id_fppl_parameter_metode: result.id_fppl_parameter_metode || result.idFpplParameterMetode || null,
                        id_metode_parameter: result.id_metode_parameter || result.idMetodeParameter || null,
                        id_parameter: result.id_parameter || result.idParameter || null,
                        nama_parameter_snapshot: result.nama_parameter || result.namaParameter || '-',
                        metode_snapshot: result.nama_metode || result.namaMetode || result.metode || '-',
                        acuan_metode_snapshot: result.acuan_metode || result.acuanMetode || '-',
                        is_terakreditasi: this.toTinyIntFlag(result.is_terakreditasi || result.isTerakreditasi),
                        is_insitu_snapshot: this.toTinyIntFlag(result.is_insitu || result.isInsitu),
                        is_subkontrak_snapshot: this.getSubkontrakSnapshot(result),
                        bm_snapshot: nilaiBm,
                        satuan_bm_snapshot: satuanBm,
                        ada_di_bm_snapshot: adaDiBm,
                        resultsBySample: new Map(),
                    });
                }
                grouped.get(key).resultsBySample.set(sampleNo, result);
            });
        }
        const sortedGroups = this.applyStoredDetailOrder(
            Array.from(grouped.values()),
            this.normalizeDetailOrderInput(options.detailOrder || options.detail_order || [])
        );
        const rows = [];
        sortedGroups.forEach((group, detailIndex) => {
            orderedSampleRows.forEach((sample, sampleIndex) => {
                const sampleNo = String(sample.no_sampel || '').trim();
                if (!sampleNo)
                    return;
                const result = group.resultsBySample.get(sampleNo) || {};
                rows.push({
                    nomor_lhu: nomorLhu,
                    no_sampel: sampleNo,
                    urutan_sampel: sampleOrderMap.get(sampleNo) || getSampleOrderValue(sample, sampleIndex),
                    urutan_lhu: detailIndex + 1,
                    id_fppl_parameter_metode: group.id_fppl_parameter_metode,
                    id_metode_parameter: group.id_metode_parameter,
                    id_parameter: group.id_parameter,
                    nama_parameter_snapshot: group.nama_parameter_snapshot,
                    metode_snapshot: group.metode_snapshot,
                    acuan_metode_snapshot: group.acuan_metode_snapshot,
                    hasil_snapshot: result.hasil || null,
                    is_terakreditasi: group.is_terakreditasi,
                    is_insitu_snapshot: group.is_insitu_snapshot,
                    is_subkontrak_snapshot: group.is_subkontrak_snapshot,
                    bm_snapshot: group.bm_snapshot,
                    satuan_bm_snapshot: group.satuan_bm_snapshot,
                    ada_di_bm_snapshot: group.ada_di_bm_snapshot,
                    tanggal_sampling: sample.tanggal_pengambilan_sampel || null,
                });
            });
        });
        return rows.sort((a, b) => Number(a.urutan_lhu || 0) - Number(b.urutan_lhu || 0) ||
            this.compareText(a.nama_parameter_snapshot, b.nama_parameter_snapshot) ||
            Number(a.urutan_sampel || 0) - Number(b.urutan_sampel || 0) ||
            this.compareText(a.no_sampel, b.no_sampel));
    };
    getLhuPdfData = async (nomorLhu, transaction = null, options = {}) => {
        const header = await this.getLhuHeaderForPdf(nomorLhu, transaction);
        if (!header) {
            throw new Error('Data LHU tidak ditemukan untuk generate PDF.');
        }
        const sampleRows = await this.getLhuSampleRowsForPdf(nomorLhu, transaction);
        const [qc, kalab, details] = await Promise.all([
            this.getPegawaiSnapshot(header.qc_by, transaction),
            this.getPegawaiSnapshot(header.kalab_by, transaction),
            this.getLhuDetailRowsForPdf(nomorLhu, header, sampleRows, transaction, options),
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
