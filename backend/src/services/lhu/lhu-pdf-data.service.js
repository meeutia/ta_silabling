const { Lhu, Sampel, FpplSampel, JenisSampel, RegBm, Fppl, Pelanggan, PktBm, Klasifikasi, PktBmParam, Satuan, PktBmNilai, Parameter, ParameterMetode, Metode, Pegawai, JadwalSampel, Lka, LkaHasil, PenugasanDetail, AktivitasSistemLog, } = require('../../models/Associations');
const { formatSampleNoList, formatSampleFieldLines, getSampleOrderValue, sortRowsBySampleOrder, normalizeSampleTypeForLhu, normalizeSampleCollectorForLhu, } = require('./lhu-pdf-format.util');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');
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
    pickValue = (source = {}, keys = []) => {
        for (const key of keys) {
            const value = source?.[key];
            if (value !== undefined && value !== null && String(value).trim() !== '')
                return value;
        }
        return null;
    };
    normalizeDetailOrderInput = (detailOrder = []) => {
        if (Array.isArray(detailOrder))
            return detailOrder;
        if (!detailOrder)
            return [];
        if (typeof detailOrder === 'string') {
            try {
                const parsed = JSON.parse(detailOrder);
                return Array.isArray(parsed) ? parsed : [];
            }
            catch {
                return detailOrder.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
            }
        }
        return [];
    };
    getStoredDetailOrderForLhu = async (nomorLhu, transaction = null) => {
        const lhuNo = String(nomorLhu || '').trim();
        if (!lhuNo)
            return [];
        const row = await AktivitasSistemLog.findOne({
            where: {
                entity_type: 'LHU',
                entity_id: lhuNo,
                aksi: 'MENYIMPAN_URUTAN_DETAIL_LHU',
            },
            order: [['dibuat_pada', 'DESC'], ['id_aktivitas_log', 'DESC']],
            transaction,
        });
        if (!row?.catatan)
            return [];
        try {
            const parsed = JSON.parse(row.catatan);
            return this.normalizeDetailOrderInput(parsed?.detailOrder || parsed?.detail_order || parsed);
        }
        catch {
            return [];
        }
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
    getLhuSignerSnapshot = async (fallbackNik = null, transaction = null) => {
        const envName = String(process.env.LHU_SIGNER_NAME || '').trim();
        const envNip = String(process.env.LHU_SIGNER_NIP || '').trim();
        const title = String(process.env.LHU_SIGNER_TITLE || '').trim() || 'Kepala UPTD Laboratorium Lingkungan';

        if (envName) {
            return {
                nama_pegawai: envName,
                nip: envNip || null,
                jabatan: title,
            };
        }

        const candidates = [];
        const pushCandidate = (where) => {
            const key = JSON.stringify(where || {});
            if (where && Object.keys(where).length && !candidates.some((item) => JSON.stringify(item) === key)) {
                candidates.push(where);
            }
        };

        pushCandidate(process.env.LHU_SIGNER_PEGAWAI_ID ? { id_pegawai: String(process.env.LHU_SIGNER_PEGAWAI_ID).trim() } : null);
        pushCandidate(process.env.LHU_SIGNER_NIK ? { nik: String(process.env.LHU_SIGNER_NIK).trim() } : null);
        pushCandidate(fallbackNik ? { nik: String(fallbackNik).trim() } : null);
        pushCandidate(envNip ? { nip: envNip } : null);
        pushCandidate({ id_pegawai: 'PGW-001' });

        for (const where of candidates) {
            const pegawai = await Pegawai.findOne({
                where,
                attributes: ['id_pegawai', 'nik', 'nama_pegawai', 'nip'],
                transaction,
            });
            if (!pegawai) continue;
            const row = this.getPlain(pegawai);
            return {
                nama_pegawai: row.nama_pegawai || null,
                nip: row.nip || null,
                jabatan: title,
            };
        }

        return {
            nama_pegawai: null,
            nip: envNip || null,
            jabatan: title,
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
                    include: [{ model: RegBm, required: false }, { model: JenisSampel, required: false }, { model: Klasifikasi, required: false }],
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
        const header = {
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
        return {
            ...header,
            nomorLhu: header.nomor_lhu || null,
            idRegistrasi: header.id_registrasi || null,
            idPktBm: header.id_pkt_bm || null,
            statusLhu: header.status_lhu || null,
            fileLhuPath: header.file_lhu_path || null,
            qcBy: header.qc_by || null,
            kalabBy: header.kalab_by || null,
            nomorFppl: header.nomor_fppl || null,
            tanggalPendaftaran: header.tanggal_pendaftaran || null,
            maksudPengujian: header.maksud_pengujian || null,
            lokasiPengambilanSampel: header.lokasi_pengambilan_sampel || null,
            jenisPengambilanSampel: header.jenis_pengambilan_sampel || null,
            namaPelanggan: header.nama_pelanggan || null,
            alamatPelanggan: header.alamat_pelanggan || null,
            picPelanggan: header.pic_pelanggan || null,
            telpPelanggan: header.telp_pelanggan || null,
            emailPelanggan: header.email_pelanggan || null,
            namaPkt: header.nama_pkt || null,
            regBmInstansi: header.reg_bm_instansi || null,
            refReg: header.ref_reg || null,
            teksLhu: header.teks_lhu || null,
        };
    };
    getLhuSampleRowsForPdf = async (nomorLhu, transaction = null) => {
        const instances = await Sampel.findAll({
            where: { nomor_lhu: nomorLhu },
            include: [
                { model: JenisSampel, as: 'jenis_sampel', required: false },
                { model: RegBm, as: 'reg_bm', required: false },
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
            const jenisSampel = this.pickObject(sample, ['jenis_sampel', 'JenisSampel']) || this.pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
            const noSampel = sample.no_sampel || null;
            const jenisSampelLabel = jenisSampel.jenis_sampel || null;
            return {
                no_sampel: noSampel,
                noSampel,
                urutan_sampel: index + 1,
                urutanSampel: index + 1,
                tanggal_pengambilan_sampel: sample.tanggal_pengambilan_sampel || null,
                tanggalPengambilanSampel: sample.tanggal_pengambilan_sampel || null,
                diterima_pada: sample.diterima_pada || null,
                diterimaPada: sample.diterima_pada || null,
                kondisi_sampel: sample.kondisi_sampel || null,
                kondisiSampel: sample.kondisi_sampel || null,
                abnormalitas_sampel: sample.abnormalitas_sampel || null,
                abnormalitasSampel: sample.abnormalitas_sampel || null,
                lokasi_spesifik: sample.lokasi_spesifik || null,
                lokasiSpesifik: sample.lokasi_spesifik || null,
                koordinat: sample.koordinat || null,
                acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || null,
                acuanPengambilanSampel: sample.acuan_pengambilan_sampel || null,
                jenis_sampel: jenisSampelLabel,
                jenisSampel: jenisSampelLabel,
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
                include: [{ model: Satuan, attributes: ['id_satuan', 'satuan'], required: false }],
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
            const satuanRow = row.satuan || row.Satuan || {};
            const satuanLabel = satuanRow.satuan || row.satuan || row.satuan_bm || null;
            map.set(String(row.id_parameter), {
                ...row,
                id_pkt_bm: id,
                nilai_bm: nilai.nilai_bm ?? null,
                id_satuan: row.id_satuan || satuanRow.id_satuan || null,
                satuan: satuanLabel,
                satuan_bm: satuanLabel,
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
            const requestData = { ...row, __matchedOrderIndex: matchedIndex, __defaultIndex: defaultIndex };
            if (Number.isInteger(matchedIndex))
                matched.push(requestData);
            else
                unmatched.push(requestData);
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
                        // Gunakan plain object, bukan Map, agar toCamelCaseDeep tidak corrupt
                        resultsBySample: {},
                    });
                }
                // Simpan ke plain object, bukan Map.set()
                grouped.get(key).resultsBySample[sampleNo] = result;
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
                // resultsBySample sekarang plain object, bukan Map
                const result = group.resultsBySample[sampleNo] || {};
                const urutanSampel = sampleOrderMap.get(sampleNo) || getSampleOrderValue(sample, sampleIndex);
                const urutanLhu = detailIndex + 1;
                const hasilSnapshot = result.hasil || null;
                rows.push({
                    nomor_lhu: nomorLhu,
                    nomorLhu,
                    no_sampel: sampleNo,
                    noSampel: sampleNo,
                    urutan_sampel: urutanSampel,
                    urutanSampel,
                    urutan_lhu: urutanLhu,
                    urutanLhu,
                    id_fppl_parameter_metode: group.id_fppl_parameter_metode,
                    idFpplParameterMetode: group.id_fppl_parameter_metode,
                    id_metode_parameter: group.id_metode_parameter,
                    idMetodeParameter: group.id_metode_parameter,
                    id_parameter: group.id_parameter,
                    idParameter: group.id_parameter,
                    nama_parameter_snapshot: group.nama_parameter_snapshot,
                    namaParameterSnapshot: group.nama_parameter_snapshot,
                    metode_snapshot: group.metode_snapshot,
                    metodeSnapshot: group.metode_snapshot,
                    acuan_metode_snapshot: group.acuan_metode_snapshot,
                    acuanMetodeSnapshot: group.acuan_metode_snapshot,
                    hasil_snapshot: hasilSnapshot,
                    hasilSnapshot,
                    is_terakreditasi: group.is_terakreditasi,
                    isTerakreditasi: group.is_terakreditasi,
                    is_insitu_snapshot: group.is_insitu_snapshot,
                    isInsituSnapshot: group.is_insitu_snapshot,
                    is_subkontrak_snapshot: group.is_subkontrak_snapshot,
                    isSubkontrakSnapshot: group.is_subkontrak_snapshot,
                    bm_snapshot: group.bm_snapshot,
                    bmSnapshot: group.bm_snapshot,
                    satuan_bm_snapshot: group.satuan_bm_snapshot,
                    satuanBmSnapshot: group.satuan_bm_snapshot,
                    ada_di_bm_snapshot: group.ada_di_bm_snapshot,
                    adaDiBmSnapshot: group.ada_di_bm_snapshot,
                    tanggal_sampling: sample.tanggal_pengambilan_sampel || sample.tanggalPengambilanSampel || null,
                    tanggalSampling: sample.tanggal_pengambilan_sampel || sample.tanggalPengambilanSampel || null,
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
        const explicitDetailOrder = this.normalizeDetailOrderInput(options.detailOrder || options.detail_order || []);
        const storedDetailOrder = explicitDetailOrder.length ? explicitDetailOrder : await this.getStoredDetailOrderForLhu(nomorLhu, transaction);
        const [qc, kalab, details] = await Promise.all([
            this.getPegawaiSnapshot(header.qc_by || header.qcBy, transaction),
            this.getLhuSignerSnapshot(header.kalab_by || header.kalabBy, transaction),
            this.getLhuDetailRowsForPdf(nomorLhu, header, sampleRows, transaction, { ...options, detailOrder: storedDetailOrder }),
        ]);
        const firstSample = sampleRows[0] || {};
        const sampleNoList = formatSampleNoList(sampleRows);
        const coordinateText = formatSampleFieldLines(sampleRows, (row) => row.koordinat, firstSample.koordinat || null, { repeatShared: false });
        const jenisSampel = normalizeSampleTypeForLhu(firstSample.jenis_sampel || firstSample.jenisSampel);
        const jenisPengambilanSampel = normalizeSampleCollectorForLhu(header.jenis_pengambilan_sampel || header.jenisPengambilanSampel);
        const tanggalPengambilanSampel = firstSample.tanggal_pengambilan_sampel || firstSample.tanggalPengambilanSampel || null;
        const tanggalPenerimaan = firstSample.diterima_pada || firstSample.diterimaPada || null;
        const abnormalitasSampel = formatSampleFieldLines(sampleRows, (row) => row.abnormalitas_sampel || row.abnormalitasSampel, firstSample.abnormalitas_sampel || firstSample.abnormalitasSampel || null);
        const lokasiPengambilanSampel = formatSampleFieldLines(sampleRows, (row) => row.lokasi_spesifik || row.lokasiSpesifik || header.lokasi_pengambilan_sampel || header.lokasiPengambilanSampel, firstSample.lokasi_spesifik || firstSample.lokasiSpesifik || header.lokasi_pengambilan_sampel || header.lokasiPengambilanSampel || null);
        const acuanPengambilanSampel = formatSampleFieldLines(sampleRows, (row) => row.acuan_pengambilan_sampel || row.acuanPengambilanSampel, firstSample.acuan_pengambilan_sampel || firstSample.acuanPengambilanSampel || null);
        const standarLhu = header.teks_lhu || header.teksLhu || [header.reg_bm_instansi || header.regBmInstansi, header.ref_reg || header.refReg].filter(Boolean).join(' - ') || null;
        const lhu = {
            ...header,
            nomor_lhu: header.nomor_lhu || header.nomorLhu || null,
            nomorLhu: header.nomorLhu || header.nomor_lhu || null,
            nomor_fppl: header.nomor_fppl || header.nomorFppl || null,
            nomorFppl: header.nomorFppl || header.nomor_fppl || null,
            nama_pelanggan: header.nama_pelanggan || header.namaPelanggan || null,
            namaPelanggan: header.namaPelanggan || header.nama_pelanggan || null,
            alamat_pelanggan: header.alamat_pelanggan || header.alamatPelanggan || null,
            alamatPelanggan: header.alamatPelanggan || header.alamat_pelanggan || null,
            telp_pelanggan: header.telp_pelanggan || header.telpPelanggan || null,
            telpPelanggan: header.telpPelanggan || header.telp_pelanggan || null,
            pic_pelanggan: header.pic_pelanggan || header.picPelanggan || null,
            picPelanggan: header.picPelanggan || header.pic_pelanggan || null,
            no_sampel: sampleNoList,
            noSampel: sampleNoList,
            sampleRows,
            sample_rows: sampleRows,
            jenis_sampel: jenisSampel,
            jenisSampel,
            jenis_pengambilan_sampel: jenisPengambilanSampel,
            jenisPengambilanSampel,
            tanggal_pengambilan_sampel: tanggalPengambilanSampel,
            tanggalPengambilanSampel,
            tanggal_penerimaan: tanggalPenerimaan,
            tanggalPenerimaan,
            jam_penerimaan: tanggalPenerimaan ? new Date(tanggalPenerimaan).toTimeString().slice(0, 8) : null,
            jamPenerimaan: tanggalPenerimaan ? new Date(tanggalPenerimaan).toTimeString().slice(0, 8) : null,
            tanggal_sampling: tanggalPengambilanSampel,
            tanggalSampling: tanggalPengambilanSampel,
            kondisi_sampel: firstSample.kondisi_sampel || firstSample.kondisiSampel || null,
            kondisiSampel: firstSample.kondisi_sampel || firstSample.kondisiSampel || null,
            abnormalitas_sampel: abnormalitasSampel,
            abnormalitasSampel,
            lokasi_spesifik: lokasiPengambilanSampel,
            lokasiSpesifik: lokasiPengambilanSampel,
            lokasi_pengambilan_sampel: lokasiPengambilanSampel,
            lokasiPengambilanSampel,
            koordinat: coordinateText,
            acuan_pengambilan_sampel: acuanPengambilanSampel,
            acuanPengambilanSampel,
            standar_lhu: standarLhu,
            standarLhu,
            qc_nama: qc.nama_pegawai,
            qcNama: qc.nama_pegawai,
            qc_nip: qc.nip,
            qcNip: qc.nip,
            kalab_nama: kalab.nama_pegawai,
            kalabNama: kalab.nama_pegawai,
            kalab_nip: kalab.nip,
            kalabNip: kalab.nip,
            kalab_jabatan: kalab.jabatan,
            kalabJabatan: kalab.jabatan,
        };
        return toCamelCaseDeep({ lhu, details });
    };
}
module.exports = new LhuPdfDataService();
module.exports.LhuPdfDataService = LhuPdfDataService;
