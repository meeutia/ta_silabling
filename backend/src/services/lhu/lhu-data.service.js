const { Lhu, Sampel, FpplSampel, JenisSampel, RegBm, Fppl, Pelanggan, PktBm, Klasifikasi, PktBmParam, Satuan, PktBmNilai, Parameter, ParameterMetode, Metode, Pegawai, JadwalSampel, Lka, LkaHasil, PenugasanDetail, User, FpplParameterMetode, SampelParameter, AktivitasSistemLog } = require('../../models/Associations');
const { Op } = require('sequelize');
const { formatSampleNoList, formatSampleFieldLines, getSampleOrderValue, sortRowsBySampleOrder, normalizeSampleTypeForLhu, normalizeSampleCollectorForLhu, } = require('./lhu-pdf-format.util');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
const { isLhuEditableByQc } = require('../../constants/lhu-status.constant');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');
class LhuPdfDataService {
getPlain = (instance) => {
        return instance ? toCamelCaseDeep(instance.get({ plain: true })) : null;
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
            const noSampel = String(row?.noSampel || '').trim();
            if (!noSampel || map.has(noSampel))
                return;
            map.set(noSampel, {
                ...row,
                noSampel,
                urutanSampel: map.size + 1 || getSampleOrderValue(row, index),
            });
        });
        return Array.from(map.values());
    };
    getLkaHasilReviewStatus = (row = {}) => {
        return row.statusReviewHasil || null;
    };
    isResultApprovedByKasi = (row = {}) => {
        return String(this.getLkaHasilReviewStatus(row) || '').trim() === 'Disetujui Kasi Pengujian';
    };
    getParameterMethodKey = (row = {}) => {
        return String(row.idMetodeParameter || row.idParameterMetode ||
            '').trim();
    };
    getParameterKey = (row = {}) => {
        return String(row.idParameter || '').trim();
    };
    getFpplParameterMetodeKey = (row = {}) => {
        return String(row.idFpplParameterMetode || row.idFpplPm ||
            '').trim();
    };
    getSubkontrakSnapshot = (row = {}) => {
        return this.toTinyIntFlag(row.isSubkontrakSnapshot ?? row.isSubkontrak);
    };
    getScheduleCreatedTime = (row = {}) => {
        const createdCandidates = [row.dibuatPada, row.createdAt, row.updatedAt];
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
        const time = new Date(`${row.tanggalJadwal || '1900-01-01'} ${row.jamJadwal || '00:00:00'}`).getTime();
        return Number.isNaN(time) ? 0 : time;
    };
    getScheduleIdOrder = (row = {}) => {
        const numeric = String(row.idJadwal || '').match(/\d+/g)?.join('');
        return Number(numeric || 0);
    };
    getActiveJadwalFromFppl = (fppl = {}) => {
        const rows = this.pickArray(fppl, [
            'jadwalSampels',
        ]);
        return rows
            .filter((row) => String(row?.statusJadwal || '').trim().toLowerCase() !== 'dibatalkan')
            .sort((a, b) => (this.getScheduleCreatedTime(b) - this.getScheduleCreatedTime(a) ||
            this.getScheduleIdOrder(b) - this.getScheduleIdOrder(a) ||
            this.getScheduleDateTime(b) - this.getScheduleDateTime(a)))[0] || null;
    };
    getPegawaiSnapshot = async (nik, transaction = null) => {
        const userNik = String(nik || '').trim();
        if (!userNik) {
            return {
                namaPegawai: null,
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
                namaPegawai: null,
                nip: null,
            };
        }
        const row = this.getPlain(pegawai);
        return {
            namaPegawai: row.namaPegawai || null,
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
                    include: [{ model: RegBm, required: false }, { model: JenisSampel, required: false }, { model: Klasifikasi, required: false }],
                },
            ],
            transaction,
        });
        const rawRow = instance ? instance.get({ plain: true }) : null;
        const row = toCamelCaseDeep(rawRow);
        if (!row)
            return null;
        const rawFppl = this.pickObject(rawRow, ['fppl', 'Fppl']) || {};
        const rawPelanggan = this.pickObject(rawFppl, ['pelanggan', 'Pelanggan']) || {};
        const rawPktBm = this.pickObject(rawRow, ['pkt_bm', 'PktBm']) || {};
        const fppl = toCamelCaseDeep(rawFppl);
        const pelanggan = toCamelCaseDeep(rawPelanggan);
        const pktBm = toCamelCaseDeep(withPaketBmDisplayFields(rawPktBm));
        const regBm = toCamelCaseDeep(this.pickObject(rawPktBm, ['reg_bm', 'RegBm']) || {});
        return {
            ...row,
            nomorFppl: fppl.nomorFppl || null,
            tanggalPendaftaran: fppl.tanggalPendaftaran || null,
            maksudPengujian: fppl.maksudPengujian || null,
            lokasiPengambilanSampel: fppl.lokasiPengambilanSampel || null,
            jenisPengambilanSampel: fppl.jenisPengambilanSampel || null,
            namaPelanggan: pelanggan.namaInstansi || null,
            alamatPelanggan: pelanggan.alamat || null,
            picPelanggan: pelanggan.pic || null,
            telpPelanggan: pelanggan.noTelp || null,
            emailPelanggan: pelanggan.emailKontak || null,
            namaPkt: pktBm.namaPkt || null,
            klasifikasi: pktBm.klasifikasi || null,
            teksLhu: pktBm.teksLhu || null,
            regBmInstansi: regBm.instansi || null,
            refReg: regBm.refReg || null,
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
            const fpplSampel = this.pickObject(sample, ['fpplSampel', 'FpplSampel']) || {};
            const jenisSampel = this.pickObject(fpplSampel, ['jenisSampel', 'JenisSampel']) || {};
            return {
                noSampel: sample.noSampel || null,
                urutanSampel: index + 1,
                tanggalPengambilanSampel: sample.tanggalPengambilanSampel || null,
                diterimaPada: sample.diterimaPada || null,
                kondisiSampel: sample.kondisiSampel || null,
                abnormalitasSampel: sample.abnormalitasSampel || null,
                lokasiSpesifik: sample.lokasiSpesifik || null,
                koordinat: sample.koordinat || null,
                acuanPengambilanSampel: sample.acuanPengambilanSampel || null,
                jenisSampel: jenisSampel.jenisSampel || null,
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
        const nilaiMap = new Map(nilaiRows.map((row) => {
            const plain = this.getPlain(row);
            return [String(plain.idParameter), plain];
        }));
        const map = new Map();
        metaRows.map(this.getPlain).forEach((row) => {
            if (!row?.idParameter)
                return;
            const nilai = nilaiMap.get(String(row.idParameter)) || {};
            const satuanRow = row.satuan || row.Satuan || {};
            const satuanLabel = satuanRow.satuan || row.satuan || row.satuanBm || null;
            map.set(String(row.idParameter), {
                ...row,
                idPktBm: id,
                nilaiBm: nilai.nilaiBm ?? null,
                idSatuan: row.idSatuan || satuanRow.idSatuan || null,
                satuan: satuanLabel,
                satuanBm: satuanLabel,
            });
        });
        return map;
    };
    buildResultRowForPdf = (instance) => {
        const row = this.getPlain(instance) || {};
        const lka = this.pickObject(row, ['lka', 'Lka']) || {};
        const penugasanDetail = this.pickObject(lka, ['penugasanDetail', 'PenugasanDetail']) || {};
        const parameterMetode = this.pickObject(penugasanDetail, ['parameterMetode', 'ParameterMetode']) || {};
        const parameter = this.pickObject(parameterMetode, ['parameter', 'Parameter']) || {};
        const metode = this.pickObject(parameterMetode, ['metode', 'Metode']) || {};
        return {
            kodeLka: row.kodeLka || lka.kodeLka || null,
            noSampel: row.noSampel || null,
            hasil: row.hasil || null,
            catatanHasil: row.catatanHasil || null,
            statusReviewHasil: row.statusReviewHasil || null,
            idParameter: parameterMetode.idParameter || parameter.idParameter || null,
            idMetodeParameter: penugasanDetail.idMetodeParameter || parameterMetode.idMetodeParameter || null,
            namaParameter: parameter.namaParameter || null,
            namaMetode: metode.namaMetode || null,
            acuanMetode: parameterMetode.acuanMetode || null,
            isTerakreditasi: parameterMetode.isTerakreditasi ?? 0,
            isSubkontrak: parameterMetode.isSubkontrak ?? 0,
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
            row.namaParameterSnapshot || row.namaParameter,
            row.metodeSnapshot || row.namaMetode || row.metode,
            row.acuanMetodeSnapshot || row.acuanMetode,
        ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean).join('|');
        return String(
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
            const parameterCompare = this.compareText(a.namaParameterSnapshot || a.namaParameter, b.namaParameterSnapshot || b.namaParameter);
            if (parameterCompare)
                return parameterCompare;
            const metodeCompare = this.compareText(a.metodeSnapshot || a.namaMetode || a.metode, b.metodeSnapshot || b.namaMetode || b.metode);
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
        const textKey = [row.namaParameterSnapshot || row.namaParameter, row.metodeSnapshot || row.namaMetode || row.metode, row.acuanMetodeSnapshot || row.acuanMetode]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean)
            .join('|');
        return [
            row.detailKey || row.key,
            this.getDetailFallbackKeyForPdf(row),
            row.idFpplParameterMetode,
            row.idMetodeParameter || row.idParameterMetode,
            row.idParameter,
            textKey,
        ].map((value) => String(value || '').trim()).filter(Boolean);
    };
    getStoredOrderCandidateKeys = (item = {}) => {
        if (!item || typeof item !== 'object') {
            const text = String(item || '').trim();
            return text ? [text] : [];
        }
        const textKey = [item.namaParameter, item.metode || item.namaMetode, item.acuanMetode]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean)
            .join('|');
        return [
            item.detailKey,
            item.key,
            item.idFpplParameterMetode,
            item.idMetodeParameter || item.idParameterMetode,
            item.idParameter,
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
        const bmParamMap = await this.getBmParamMapForPdf(header.idPktBm, transaction);
        const orderedSampleRows = this.dedupeSampleRowsForPdf(sampleRows);
        const sampleOrderMap = new Map();
        const grouped = new Map();
        for (const [index, sample] of orderedSampleRows.entries()) {
            const sampleNo = String(sample.noSampel || '').trim();
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
                    const bm = bmParamMap.get(String(result.idParameter || '')) || null;
                    const nilaiBm = bm ? this.normalizeNilaiBmForLhu(bm.nilaiBm) : '(-)';
                    const satuanBm = bm ? this.normalizeBmText(bm.satuanBm) : null;
                    const adaDiBm = bm ? 1 : 0;
                    grouped.set(key, {
                        nomorLhu: nomorLhu,
                        idFpplParameterMetode: result.idFpplParameterMetode || null,
                        idMetodeParameter: result.idMetodeParameter || null,
                        idParameter: result.idParameter || null,
                        namaParameterSnapshot: result.namaParameter || '-',
                        metodeSnapshot: result.namaMetode || result.metode || '-',
                        acuanMetodeSnapshot: result.acuanMetode || '-',
                        isTerakreditasi: this.toTinyIntFlag(result.isTerakreditasi),
                        isInsituSnapshot: this.toTinyIntFlag(result.isInsitu),
                        isSubkontrakSnapshot: this.getSubkontrakSnapshot(result),
                        bmSnapshot: nilaiBm,
                        satuanBmSnapshot: satuanBm,
                        adaDiBmSnapshot: adaDiBm,
                        resultsBySample: new Map(),
                    });
                }
                grouped.get(key).resultsBySample.set(sampleNo, result);
            });
        }
        const sortedGroups = this.applyStoredDetailOrder(
            Array.from(grouped.values()),
            this.normalizeDetailOrderInput(options.detailOrder || [])
        );
        const rows = [];
        sortedGroups.forEach((group, detailIndex) => {
            orderedSampleRows.forEach((sample, sampleIndex) => {
                const sampleNo = String(sample.noSampel || '').trim();
                if (!sampleNo)
                    return;
                const result = group.resultsBySample.get(sampleNo) || {};
                rows.push({
                    nomorLhu: nomorLhu,
                    noSampel: sampleNo,
                    urutanSampel: sampleOrderMap.get(sampleNo) || getSampleOrderValue(sample, sampleIndex),
                    urutanLhu: detailIndex + 1,
                    idFpplParameterMetode: group.idFpplParameterMetode,
                    idMetodeParameter: group.idMetodeParameter,
                    idParameter: group.idParameter,
                    namaParameterSnapshot: group.namaParameterSnapshot,
                    metodeSnapshot: group.metodeSnapshot,
                    acuanMetodeSnapshot: group.acuanMetodeSnapshot,
                    hasilSnapshot: result.hasil || null,
                    isTerakreditasi: group.isTerakreditasi,
                    isInsituSnapshot: group.isInsituSnapshot,
                    isSubkontrakSnapshot: group.isSubkontrakSnapshot,
                    bmSnapshot: group.bmSnapshot,
                    satuanBmSnapshot: group.satuanBmSnapshot,
                    adaDiBmSnapshot: group.adaDiBmSnapshot,
                    tanggalSampling: sample.tanggalPengambilanSampel || null,
                });
            });
        });
        return rows.sort((a, b) => Number(a.urutanLhu || 0) - Number(b.urutanLhu || 0) ||
            this.compareText(a.namaParameterSnapshot, b.namaParameterSnapshot) ||
            Number(a.urutanSampel || 0) - Number(b.urutanSampel || 0) ||
            this.compareText(a.noSampel, b.noSampel));
    };
    getLhuPdfData = async (nomorLhu, transaction = null, options = {}) => {
        const header = await this.getLhuHeaderForPdf(nomorLhu, transaction);
        if (!header) {
            throw new Error('Data LHU tidak ditemukan untuk generate PDF.');
        }
        const sampleRows = await this.getLhuSampleRowsForPdf(nomorLhu, transaction);
        const [qc, kalab, details] = await Promise.all([
            this.getPegawaiSnapshot(header.qcBy, transaction),
            this.getPegawaiSnapshot(header.kalabBy, transaction),
            this.getLhuDetailRowsForPdf(nomorLhu, header, sampleRows, transaction, options),
        ]);
        const firstSample = sampleRows[0] || {};
        const sampleNoList = formatSampleNoList(sampleRows);
        const coordinateText = formatSampleFieldLines(sampleRows, (row) => row.koordinat, firstSample.koordinat || null, { repeatShared: false });
        const lhu = {
            ...toCamelCaseDeep(header),
            noSampel: sampleNoList,
            sampleRows: toCamelCaseDeep(sampleRows),
            jenisSampel: normalizeSampleTypeForLhu(firstSample.jenisSampel),
            jenisPengambilanSampel: normalizeSampleCollectorForLhu(header.jenisPengambilanSampel),
            tanggalPengambilanSampel: firstSample.tanggalPengambilanSampel || null,
            tanggalPenerimaan: firstSample.diterimaPada || null,
            jamPenerimaan: firstSample.diterimaPada ? new Date(firstSample.diterimaPada).toTimeString().slice(0, 8) : null,
            tanggalSampling: firstSample.tanggalPengambilanSampel || null,
            kondisiSampel: firstSample.kondisiSampel || null,
            abnormalitasSampel: formatSampleFieldLines(sampleRows, (row) => row.abnormalitasSampel, firstSample.abnormalitasSampel || null),
            lokasiSpesifik: formatSampleFieldLines(sampleRows, (row) => row.lokasiSpesifik || header.lokasiPengambilanSampel, firstSample.lokasiSpesifik || header.lokasiPengambilanSampel || null),
            lokasiPengambilanSampel: formatSampleFieldLines(sampleRows, (row) => row.lokasiSpesifik || header.lokasiPengambilanSampel, firstSample.lokasiSpesifik || header.lokasiPengambilanSampel || null),
            koordinat: coordinateText,
            acuanPengambilanSampel: formatSampleFieldLines(sampleRows, (row) => row.acuanPengambilanSampel, firstSample.acuanPengambilanSampel || null),
            standarLhu: header.teksLhu || [header.regBmInstansi, header.refReg].filter(Boolean).join(' - ') || null,
            qcNama: qc.namaPegawai,
            qcNip: qc.nip,
            kalabNama: kalab.namaPegawai,
            kalabNip: kalab.nip,
        };
        return { lhu, details: toCamelCaseDeep(details) };
    };
    isEditableByQcStatus = (status) => isLhuEditableByQc(status);

    calculateAccreditationStats = (details = []) => {
        const uniqueMap = new Map();
        (Array.isArray(details) ? details : []).forEach((row, index) => {
            const key = this.getFallbackParameterKey(row) || `row-${index}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, row);
        });
        const uniqueRows = Array.from(uniqueMap.values());
        const totalParameter = uniqueRows.length;
        const totalTerakreditasi = uniqueRows.filter((row) => Number(row.is_terakreditasi || row.isTerakreditasi || row.isTerakreditasiSnapshot || 0) === 1).length;
        const persentase = totalParameter > 0 ? Number(((totalTerakreditasi / totalParameter) * 100).toFixed(2)) : 0;
        return {
            totalParameter,
            totalTerakreditasi,
            persentase,
            showLogoKan: persentase >= 60,
        };
    };

    getLkaHasilTargetKey = (row = {}) => {
        const kode = String(row.kode_lka || row.kodeLka || '').trim();
        const noSampel = String(row.no_sampel || row.noSampel || '').trim();
        return kode && noSampel ? `${kode}|${noSampel}` : '';
    };

    getFpplParameterMetodeKey = (row = {}) => String(row.id_fppl_parameter_metode || row.idFpplParameterMetode || row.id_fppl_pm || row.idFpplPm || '').trim();

    getParameterMethodKey = (row = {}) => String(row.id_metode_parameter || row.idMetodeParameter || row.id_parameter_metode || row.idParameterMetode || '').trim();

    getFallbackParameterKey = (row = {}) => {
        const explicitKey = String(row.detail_key || row.detailKey || row.key || '').trim();
        if (explicitKey) return explicitKey;
        const fpplParameterMetodeKey = this.getFpplParameterMetodeKey(row);
        if (fpplParameterMetodeKey) return fpplParameterMetodeKey;
        const methodKey = this.getParameterMethodKey(row);
        if (methodKey) return methodKey;
        return [
            row.id_parameter || row.idParameter,
            row.nama_parameter_snapshot || row.namaParameterSnapshot || row.nama_parameter || row.namaParameter,
            row.metode_snapshot || row.metodeSnapshot || row.nama_metode || row.namaMetode || row.metode,
            row.acuan_metode_snapshot || row.acuanMetodeSnapshot || row.acuan_metode || row.acuanMetode,
        ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean).join('|');
    };

    getDetailSortText = (row = {}, keys = []) => {
        for (const key of keys) {
            const value = row?.[key];
            if (value !== null && value !== undefined && String(value).trim() !== '') return String(value).trim();
        }
        return '';
    };

    compareDetailRowsForLhu = (a = {}, b = {}) => {
        const kategoriCompare = this.compareText(
            this.getDetailSortText(a, ['kategori_parameter', 'kategoriParameter', 'kategori_parameter_snapshot', 'kategoriParameterSnapshot']),
            this.getDetailSortText(b, ['kategori_parameter', 'kategoriParameter', 'kategori_parameter_snapshot', 'kategoriParameterSnapshot'])
        );
        if (kategoriCompare) return kategoriCompare;
        const parameterCompare = this.compareText(
            this.getDetailSortText(a, ['nama_parameter_snapshot', 'namaParameterSnapshot', 'nama_parameter', 'namaParameter']),
            this.getDetailSortText(b, ['nama_parameter_snapshot', 'namaParameterSnapshot', 'nama_parameter', 'namaParameter'])
        );
        if (parameterCompare) return parameterCompare;
        const metodeCompare = this.compareText(
            this.getDetailSortText(a, ['metode_snapshot', 'metodeSnapshot', 'nama_metode', 'namaMetode', 'metode']),
            this.getDetailSortText(b, ['metode_snapshot', 'metodeSnapshot', 'nama_metode', 'namaMetode', 'metode'])
        );
        if (metodeCompare) return metodeCompare;
        return this.compareText(this.getFallbackParameterKey(a), this.getFallbackParameterKey(b));
    };

    getDetailOrderDescriptor = (row = {}) => ({
        key: this.getFallbackParameterKey(row),
        detailKey: row.detailKey || row.detail_key || row.key || null,
        idFpplParameterMetode: row.idFpplParameterMetode || row.id_fppl_parameter_metode || null,
        idMetodeParameter: row.idMetodeParameter || row.id_metode_parameter || row.idParameterMetode || row.id_parameter_metode || null,
        idParameter: row.idParameter || row.id_parameter || null,
        namaParameter: row.namaParameterSnapshot || row.nama_parameter_snapshot || row.namaParameter || row.nama_parameter || null,
        metode: row.metodeSnapshot || row.metode_snapshot || row.namaMetode || row.nama_metode || row.metode || null,
        acuanMetode: row.acuanMetodeSnapshot || row.acuan_metode_snapshot || row.acuanMetode || row.acuan_metode || null,
    });

    getDetailOrderCandidateKeys = (row = {}) => {
        const descriptor = this.getDetailOrderDescriptor(row);
        const textKey = [descriptor.namaParameter, descriptor.metode, descriptor.acuanMetode]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean)
            .join('|');
        return [
            descriptor.detailKey,
            descriptor.key,
            descriptor.idFpplParameterMetode,
            descriptor.idMetodeParameter,
            descriptor.idParameter,
            textKey,
        ].map((value) => String(value || '').trim()).filter(Boolean);
    };

    normalizeDetailOrderInput = (detailOrder = []) => {
        const items = Array.isArray(detailOrder) ? detailOrder : String(detailOrder || '').split(/[,\n]+/);
        const keys = [];
        items.forEach((item) => {
            if (item && typeof item === 'object') {
                keys.push(...this.getDetailOrderCandidateKeys(item));
                return;
            }
            const text = String(item || '').trim();
            if (text) keys.push(text);
        });
        const seen = new Set();
        return keys.filter((key) => {
            const normalized = key.toLowerCase();
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    };

    sortDetailRowsForLhu = (rows = []) => {
        return (Array.isArray(rows) ? [...rows] : [])
            .sort(this.compareDetailRowsForLhu)
            .map((row, index) => ({ ...row, urutanLhu: index + 1 }));
    };

    applyDetailOrder = (rows = [], detailOrder = []) => {
        const defaultRows = this.sortDetailRowsForLhu(rows);
        const orderKeys = this.normalizeDetailOrderInput(detailOrder);
        if (!orderKeys.length) return defaultRows;
        const orderIndexByKey = new Map(orderKeys.map((key, index) => [key.toLowerCase(), index]));
        const matched = [];
        const unmatched = [];
        defaultRows.forEach((row, defaultIndex) => {
            const matchedKey = this.getDetailOrderCandidateKeys(row).find((key) => orderIndexByKey.has(key.toLowerCase()));
            if (matchedKey) matched.push({ row, orderIndex: orderIndexByKey.get(matchedKey.toLowerCase()), defaultIndex });
            else unmatched.push({ row, defaultIndex });
        });
        return [...matched.sort((a, b) => a.orderIndex - b.orderIndex || a.defaultIndex - b.defaultIndex), ...unmatched.sort((a, b) => a.defaultIndex - b.defaultIndex)]
            .map(({ row }, index) => ({ ...row, urutanLhu: index + 1 }));
    };

    getSampleInfo = async (noSampel, transaction = null) => {
        const sampleNo = String(noSampel || '').trim();
        if (!sampleNo) throw new Error('Nomor sampel wajib dipilih.');
        const instance = await Sampel.findOne({
            where: { no_sampel: sampleNo },
            include: [
                { model: JenisSampel, as: 'jenis_sampel', required: false },
                { model: RegBm, as: 'reg_bm', required: false },
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
                            include: [
                                { model: Pelanggan, as: 'pelanggan', required: false },
                                { model: JadwalSampel, as: 'jadwal_sampels', required: false },
                            ],
                        },
                    ],
                },
            ],
            transaction,
        });
        if (!instance) throw new Error('Sampel tidak ditemukan.');
        const sample = instance.get({ plain: true });
        const fpplSampel = this.pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
        const fppl = this.pickObject(sample, ['fppl', 'Fppl']) || this.pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
        const pelanggan = this.pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
        const jenis = this.pickObject(sample, ['jenis_sampel', 'JenisSampel']) || this.pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
        const regBm = this.pickObject(sample, ['reg_bm', 'RegBm']) || this.pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
        const activeSchedule = this.getActiveJadwalFromFppl(fppl) || {};
        return {
            ...sample,
            noSampel: sample.no_sampel,
            idRegistrasi: sample.id_registrasi || fpplSampel.id_registrasi || fppl.id_registrasi || null,
            nomorFppl: fppl.nomor_fppl || null,
            tanggalPendaftaran: fppl.tanggal_pendaftaran || null,
            maksudPengujian: fppl.maksud_pengujian || null,
            lokasiPengambilanSampel: fppl.lokasi_pengambilan_sampel || sample.lokasi_pengambilan_sampel || null,
            jenisPengambilanSampel: fppl.jenis_pengambilan_sampel || null,
            tanggalRencanaPengambilanSampel: fppl.tanggal_rencana_pengambilan_sampel || null,
            jamRencanaPengambilanSampel: fppl.jam_rencana_pengambilan_sampel || null,
            tanggalRencanaPengantaranSampel: fppl.tanggal_rencana_pengantaran_sampel || null,
            statusFppl: fppl.status_fppl || null,
            idPelanggan: pelanggan.id_pelanggan || null,
            namaInstansi: pelanggan.nama_instansi || null,
            namaPelanggan: pelanggan.nama_instansi || null,
            pic: pelanggan.pic || null,
            emailKontak: pelanggan.email_kontak || null,
            email: pelanggan.email_kontak || null,
            noTelp: pelanggan.no_telp || null,
            alamat: pelanggan.alamat || null,
            idJenisSampel: sample.id_jenis_sampel || fpplSampel.id_jenis_sampel || null,
            jenisSampel: jenis.jenis_sampel || null,
            idRegBm: sample.id_reg_bm || fpplSampel.id_reg_bm || null,
            regBmInstansi: regBm.instansi || null,
            refReg: regBm.ref_reg || null,
            jumlahSampel: fpplSampel.jumlah_sampel || null,
            tanggalPengambilanSampel: sample.tanggal_pengambilan || sample.tanggal_pengambilan_sampel || null,
            tanggalJadwal: activeSchedule.tanggal_jadwal || null,
            jamJadwal: activeSchedule.jam_jadwal || null,
            diterimaPada: sample.diterima_pada || null,
            tanggalPenerimaan: sample.diterima_pada || null,
            abnormalitasSampel: sample.abnormalitas_sampel || null,
            acuanPengambilanSampel: sample.acuan_pengambilan_sampel || null,
            lokasiSpesifik: sample.lokasi_spesifik || sample.lokasi_pengambilan_sampel || null,
            koordinat: sample.koordinat || null,
            kondisiSampel: sample.kondisi_sampel || null,
            statusSample: sample.status_sample || null,
            nomorLhu: sample.nomor_lhu || null,
            statusLhu: null,
        };
    };

    getSampleInfosForLhu = async (nomorLhu, transaction = null) => {
        const lhuNo = String(nomorLhu || '').trim();
        if (!lhuNo) return [];
        const rows = await Sampel.findAll({
            where: { nomor_lhu: lhuNo },
            attributes: ['no_sampel'],
            order: [['no_sampel', 'ASC']],
            transaction,
        });
        const infos = [];
        for (const row of rows) {
            const plain = this.getPlain(row) || {};
            const noSampel = plain.noSampel || plain.no_sampel || row.no_sampel || row.get?.('no_sampel');
            if (noSampel) infos.push(await this.getSampleInfo(noSampel, transaction));
        }
        return infos;
    };

    getExistingLhuBySample = async (noSampel, transaction = null) => {
        const sampleNo = String(noSampel || '').trim();
        if (!sampleNo) return null;
        const sample = await Sampel.findOne({
            where: { no_sampel: sampleNo },
            attributes: ['no_sampel', 'nomor_lhu'],
            transaction,
        });
        const nomorLhu = sample?.nomor_lhu || null;
        if (!nomorLhu) return null;
        const lhu = await Lhu.findOne({ where: { nomor_lhu: nomorLhu }, transaction });
        return lhu ? lhu.get({ plain: true }) : null;
    };

    getExpectedParameterRows = async (noSampel, transaction = null) => {
        const sampleNo = String(noSampel || '').trim();
        if (!sampleNo) return [];
        const expectedInstances = await SampelParameter.findAll({
            where: { no_sampel: sampleNo },
            include: [
                {
                    model: FpplParameterMetode,
                    as: 'fppl_parameter_metode',
                    required: true,
                    include: [
                        { model: Parameter, required: false },
                        { model: ParameterMetode, required: false, include: [{ model: Metode, required: false }] },
                    ],
                },
            ],
            transaction,
        });
        return expectedInstances.map((instance) => {
            const row = instance.get({ plain: true });
            const fpm = this.pickObject(row, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};
            const parameter = this.pickObject(fpm, ['parameter', 'Parameter']) || {};
            const parameterMetode = this.pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
            const metode = this.pickObject(parameterMetode, ['metode', 'Metode']) || {};
            return {
                noSampel: sampleNo,
                no_sampel: sampleNo,
                idFpplParameterMetode: fpm.id_fppl_parameter_metode || row.id_fppl_parameter_metode || null,
                id_fppl_parameter_metode: fpm.id_fppl_parameter_metode || row.id_fppl_parameter_metode || null,
                idParameter: fpm.id_parameter || parameter.id_parameter || parameterMetode.id_parameter || null,
                id_parameter: fpm.id_parameter || parameter.id_parameter || parameterMetode.id_parameter || null,
                idMetodeParameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
                id_metode_parameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
                isInsitu: fpm.is_insitu ?? 0,
                is_insitu: fpm.is_insitu ?? 0,
                statusKemampuanLab: fpm.status_kemampuan_lab || null,
                status_kemampuan_lab: fpm.status_kemampuan_lab || null,
                isSubkontrak: parameterMetode.is_subkontrak ?? 0,
                isSubkontrakSnapshot: parameterMetode.is_subkontrak ?? 0,
                namaParameter: parameter.nama_parameter || '-',
                nama_parameter: parameter.nama_parameter || '-',
                kategoriParameter: parameter.kategori_parameter || parameter.id_kategori_parameter || null,
                kategori_parameter: parameter.kategori_parameter || parameter.id_kategori_parameter || null,
                acuanMetode: parameterMetode.acuan_metode || '-',
                acuan_metode: parameterMetode.acuan_metode || '-',
                isTerakreditasi: parameterMetode.is_terakreditasi ?? 0,
                is_terakreditasi: parameterMetode.is_terakreditasi ?? 0,
                namaMetode: metode.nama_metode || '-',
                nama_metode: metode.nama_metode || '-',
            };
        }).filter((row) => row.idFpplParameterMetode || row.idMetodeParameter || row.idParameter);
    };

    getLkaResultRows = async (noSampel, transaction = null) => {
        const sampleNo = String(noSampel || '').trim();
        if (!sampleNo) return [];
        const resultInstances = await LkaHasil.findAll({
            where: {
                no_sampel: sampleNo,
                statusReviewHasil: 'Disetujui Kasi Pengujian',
                hasil: { [Op.ne]: null },
            },
            include: [
                {
                    model: Lka,
                    required: true,
                    include: [
                        {
                            model: PenugasanDetail,
                            required: false,
                            include: [
                                { model: ParameterMetode, required: false, include: [{ model: Parameter, required: false }, { model: Metode, required: false }] },
                            ],
                        },
                    ],
                },
            ],
            transaction,
        });
        return resultInstances.map((instance) => {
            const row = instance.get({ plain: true });
            const lka = this.pickObject(row, ['lka', 'Lka']) || {};
            const detail = this.pickObject(lka, ['penugasan_detail', 'PenugasanDetail']) || {};
            const parameterMetode = this.pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};
            const parameter = this.pickObject(parameterMetode, ['parameter', 'Parameter']) || {};
            const metode = this.pickObject(parameterMetode, ['metode', 'Metode']) || {};
            return {
                kodeLka: row.kode_lka,
                noSampel: sampleNo,
                hasil: row.hasil,
                catatanHasil: row.catatan_hasil,
                statusReviewHasil: row.statusReviewHasil || row.status_review_hasil,
                statusLka: lka.status_lka,
                tanggalMulaiPengujian: lka.tanggal_mulai_pengujian,
                tanggalSelesaiPengujian: lka.tanggal_selesai_pengujian,
                idPenugasanDetail: detail.id_penugasan_detail || lka.id_penugasan_detail || null,
                idMetodeParameter: detail.id_metode_parameter || parameterMetode.id_metode_parameter || null,
                idParameter: parameterMetode.id_parameter || parameter.id_parameter || null,
                isSubkontrak: parameterMetode.is_subkontrak ?? 0,
                isSubkontrakSnapshot: parameterMetode.is_subkontrak ?? 0,
                namaParameter: parameter.nama_parameter || '-',
                kategoriParameter: parameter.kategori_parameter || parameter.id_kategori_parameter || null,
                acuanMetode: parameterMetode.acuan_metode || '-',
                isTerakreditasi: parameterMetode.is_terakreditasi ?? 0,
                namaMetode: metode.nama_metode || '-',
            };
        }).filter((row) => String(row.hasil || '').trim() && this.isResultApprovedByKasi(row));
    };

    isResultApprovedByKasi = (row = {}) => {
        const status = row.statusReviewHasil || row.status_review_hasil || null;
        return status === 'Disetujui Kasi Pengujian';
    };

    getBmInfo = async (idPktBm, transaction = null) => {
        if (!idPktBm) throw new Error('Paket baku mutu wajib dipilih.');
        const paket = await PktBm.findOne({
            where: { id_pkt_bm: idPktBm },
            include: [
                { model: RegBm, required: false },
                { model: JenisSampel, required: false },
                { model: Klasifikasi, required: false },
            ],
            transaction,
        });
        if (!paket) throw new Error('Paket baku mutu tidak ditemukan.');
        const headerRaw = withPaketBmDisplayFields(paket.get({ plain: true }));
        const nilaiRows = await PktBmNilai.findAll({
            where: { id_pkt_bm: idPktBm },
            include: [{ model: Parameter, required: false }],
            transaction,
        });
        const metaRows = await PktBmParam.findAll({
            where: {
                id_reg_bm: paket.id_reg_bm,
                id_jenis_sampel: paket.id_jenis_sampel,
            },
            include: [{ model: Satuan, required: false }],
            transaction,
        });
        const metaMap = new Map(metaRows.map((row) => [String(row.id_parameter), row.get({ plain: true })]));
        const map = new Map();
        nilaiRows.forEach((row) => {
            const nilai = row.get({ plain: true });
            const meta = metaMap.get(String(nilai.id_parameter)) || {};
            const satuan = meta.satuan || meta.Satuan || {};
            map.set(nilai.id_parameter, {
                idParameter: nilai.id_parameter,
                id_parameter: nilai.id_parameter,
                nilaiBm: nilai.nilai_bm,
                nilai_bm: nilai.nilai_bm,
                satuanBm: satuan.satuan || null,
                satuan_bm: satuan.satuan || null,
                ketBm: meta.ket_bm || null,
                ket_bm: meta.ket_bm || null,
            });
        });
        return {
            header: headerRaw,
            map,
        };
    };

    buildStandarLabel = (sampleInfo = {}) => {
        const sampleData = toCamelCaseDeep(sampleInfo);
        return [sampleData.regBmInstansi, sampleData.refReg].filter(Boolean).join(' - ');
    };

    mapSampleRequestData = (sampleInfo = {}) => {
        const sampleData = toCamelCaseDeep(sampleInfo);
        const standarLabel = this.buildStandarLabel(sampleData);
        const receivedAt = sampleData.diterimaPada;
        const sampleLocation = sampleData.lokasiSpesifik || sampleData.lokasiPengambilanSampel || null;
        return {
            noSampel: sampleData.noSampel,
            idRegistrasi: sampleData.idRegistrasi,
            idJenisSampel: sampleData.idJenisSampel,
            jenisSampel: sampleData.jenisSampel,
            idRegBm: sampleData.idRegBm,
            regBm: standarLabel,
            standar: standarLabel,
            jumlahSampel: sampleData.jumlahSampel,
            tanggalPengambilanSampel: sampleData.tanggalPengambilanSampel,
            tanggalJadwal: sampleData.tanggalJadwal,
            jamJadwal: sampleData.jamJadwal,
            tanggalPenerimaan: receivedAt,
            jamPenerimaan: receivedAt ? new Date(receivedAt).toTimeString().slice(0, 8) : null,
            abnormalitasSampel: sampleData.abnormalitasSampel,
            acuanPengambilanSampel: sampleData.acuanPengambilanSampel,
            lokasiSpesifik: sampleLocation,
            lokasiPengambilanSampel: sampleLocation,
            koordinat: sampleData.koordinat,
            kondisiSampel: sampleData.kondisiSampel,
            statusSample: sampleData.statusSample,
            nomorLhu: sampleData.nomorLhu || null,
            statusLhu: sampleData.statusLhu || null,
        };
    };

    mapPelangganRequestData = (sampleInfo = {}) => {
        const sampleData = toCamelCaseDeep(sampleInfo);
        return {
            idPelanggan: sampleData.idPelanggan,
            namaInstansi: sampleData.namaInstansi,
            namaPelanggan: sampleData.namaPelanggan || sampleData.namaInstansi,
            pic: sampleData.pic,
            emailKontak: sampleData.emailKontak,
            email: sampleData.email || sampleData.emailKontak,
            noTelp: sampleData.noTelp,
            alamat: sampleData.alamat,
        };
    };

    mapRequestRequestData = (sampleInfo = {}) => {
        const sampleData = toCamelCaseDeep(sampleInfo);
        return {
            idRegistrasi: sampleData.idRegistrasi,
            nomorFppl: sampleData.nomorFppl,
            tanggalPendaftaran: sampleData.tanggalPendaftaran,
            maksudPengujian: sampleData.maksudPengujian,
            lokasiPengambilanSampel: sampleData.lokasiPengambilanSampel,
            jenisPengambilanSampel: sampleData.jenisPengambilanSampel,
            tanggalRencanaPengambilanSampel: sampleData.tanggalRencanaPengambilanSampel,
            jamRencanaPengambilanSampel: sampleData.jamRencanaPengambilanSampel,
            tanggalRencanaPengantaranSampel: sampleData.tanggalRencanaPengantaranSampel,
            statusFppl: sampleData.statusFppl,
        };
    };

    buildDefaultDetailRows = (resultRows = [], sampleInfo = {}) => {
        const sampleData = toCamelCaseDeep(sampleInfo);
        const samplingDate = sampleData.tanggalPengambilanSampel;
        return (Array.isArray(resultRows) ? resultRows : []).map((row, index) => {
            const resultData = toCamelCaseDeep(row);
            return {
                noSampel: resultData.noSampel,
                idFpplParameterMetode: resultData.idFpplParameterMetode || null,
                idParameter: resultData.idParameter || null,
                idMetodeParameter: resultData.idMetodeParameter || null,
                namaParameter: resultData.namaParameter,
                metode: resultData.namaMetode || resultData.metode,
                acuanMetode: resultData.acuanMetode,
                hasil: resultData.hasil,
                isTerakreditasi: Number(resultData.isTerakreditasi ?? 0),
                bm: null,
                satuanBm: null,
                adaDiBm: 0,
                urutanLhu: index + 1,
                isInsitu: this.toTinyIntFlag(resultData.isInsitu),
                isInsituSnapshot: this.toTinyIntFlag(resultData.isInsitu),
                isSubkontrak: this.getSubkontrakSnapshot(resultData),
                isSubkontrakSnapshot: this.getSubkontrakSnapshot(resultData),
                tanggalSampling: this.toDateOnly(samplingDate),
                catatanHasil: resultData.catatanHasil || null,
            };
        });
    };

    getPegawaiDisplayName = async (nik, transaction = null) => {
        const userNik = String(nik || '').trim();
        if (!userNik) return null;
        const pegawai = await Pegawai.findOne({ where: { nik: userNik }, attributes: ['nik', 'nama_pegawai'], transaction });
        if (pegawai?.nama_pegawai) return pegawai.nama_pegawai;
        const user = await User.findOne({ where: { nik: userNik }, attributes: ['nik', 'username'], transaction });
        return user?.username || userNik;
    };

    getPktBmHeaderById = async (idPktBm, transaction = null) => {
        if (!idPktBm) return {};
        const instance = await PktBm.findOne({
            where: { id_pkt_bm: idPktBm },
            include: [
                { model: RegBm, required: false },
                { model: JenisSampel, required: false },
                { model: Klasifikasi, required: false },
            ],
            transaction,
        });
        if (!instance) return {};
        const row = toCamelCaseDeep(withPaketBmDisplayFields(instance.get({ plain: true })));
        const regBm = this.pickObject(row, ['regBm', 'RegBm']) || {};
        return {
            idPktBm: row.idPktBm,
            idRegBm: row.idRegBm,
            idJenisSampel: row.idJenisSampel,
            namaPkt: row.namaPkt,
            klasifikasi: row.klasifikasi,
            teksLhu: row.teksLhu,
            instansi: regBm.instansi || null,
            refReg: regBm.refReg || null,
        };
    };

    mapLhuHeaderRequestData = (lhu = {}, sample = {}, pktBm = {}, names = {}) => {
        const lhuData = toCamelCaseDeep(lhu);
        const sampleData = toCamelCaseDeep(sample);
        const bmData = toCamelCaseDeep(pktBm);
        const standarLabel = buildPaketBmTeksLhu(bmData) || this.buildStandarLabel(sampleData);
        const receivedAt = sampleData.diterimaPada;
        return {
            ...lhuData,
            tanggalPengambilanSampel: sampleData.tanggalPengambilanSampel || null,
            tanggalJadwal: sampleData.tanggalJadwal || null,
            jamJadwal: sampleData.jamJadwal || null,
            tanggalPenerimaan: receivedAt || null,
            jamPenerimaan: receivedAt ? new Date(receivedAt).toTimeString().slice(0, 8) : null,
            kondisiSampel: sampleData.kondisiSampel || null,
            abnormalitasSampel: sampleData.abnormalitasSampel || null,
            koordinat: sampleData.koordinat || null,
            acuanPengambilanSampel: sampleData.acuanPengambilanSampel || null,
            idRegistrasi: sampleData.idRegistrasi || null,
            idJenisSampel: sampleData.idJenisSampel || null,
            idRegBm: sampleData.idRegBm || null,
            regBmInstansi: sampleData.regBmInstansi || bmData.instansi || null,
            refReg: sampleData.refReg || bmData.refReg || null,
            regBm: standarLabel || null,
            standar: standarLabel || null,
            jenisSampel: sampleData.jenisSampel || null,
            nomorFppl: sampleData.nomorFppl || null,
            tanggalPendaftaran: sampleData.tanggalPendaftaran || null,
            maksudPengujian: sampleData.maksudPengujian || null,
            lokasiPengambilanSampel: sampleData.lokasiPengambilanSampel || null,
            jenisPengambilanSampel: sampleData.jenisPengambilanSampel || null,
            idPelanggan: sampleData.idPelanggan || null,
            namaPelanggan: sampleData.namaPelanggan || sampleData.namaInstansi || null,
            alamatPelanggan: sampleData.alamatPelanggan || sampleData.alamat || null,
            picPelanggan: sampleData.picPelanggan || sampleData.pic || null,
            telpPelanggan: sampleData.telpPelanggan || sampleData.noTelp || null,
            emailPelanggan: sampleData.emailPelanggan || sampleData.emailKontak || null,
            namaPkt: bmData.namaPkt || null,
            klasifikasi: bmData.klasifikasi || null,
            teksLhu: bmData.teksLhu || null,
            qcNama: names.qcNama || null,
            kalabNama: names.kalabNama || null,
        };
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

    getDetailLhuRows = async (nomorLhu, transaction = null, options = {}) => {
        const header = await this.getLhuHeaderForPdf(nomorLhu, transaction);
        if (!header) return [];
        const sampleRows = await this.getLhuSampleRowsForPdf(nomorLhu, transaction);
        
        const explicitDetailOrder = this.normalizeDetailOrderInput(options.detailOrder || options.detail_order || []);
        const storedDetailOrder = explicitDetailOrder.length ? explicitDetailOrder : await this.getStoredDetailOrderForLhu(nomorLhu, transaction);

        return toCamelCaseDeep(await this.getLhuDetailRowsForPdf(nomorLhu, header, sampleRows, transaction, { ...options, detailOrder: storedDetailOrder }));
    };

    buildLhuListRow = async (lhu = {}) => {
        const lhuData = toCamelCaseDeep(lhu);
        const sampleInfos = await this.getSampleInfosForLhu(lhuData.nomorLhu || lhuData.nomor_lhu);
        const firstSample = sampleInfos[0] || {};
        const sampleNos = sampleInfos.map((sample) => sample.noSampel || sample.no_sampel).filter(Boolean);
        const qcNama = await this.getPegawaiDisplayName(lhuData.qcBy || lhuData.qc_by);
        const kalabNama = await this.getPegawaiDisplayName(lhuData.kalabBy || lhuData.kalab_by);
        const nomorFppl = firstSample.nomorFppl || firstSample.nomor_fppl || lhuData.nomorFppl || lhuData.nomor_fppl || null;
        return {
            ...lhuData,
            nomorLhu: lhuData.nomorLhu,
            idRegistrasi: lhuData.idRegistrasi,
            nomorFppl,
            noSampel: sampleNos.join(', '),
            sampleNos,
            jenisSampel: firstSample.jenisSampel || null,
            namaPelanggan: firstSample.namaPelanggan || firstSample.namaInstansi || null,
            qcNama,
            kalabNama,
        };
    };
}
module.exports = new LhuPdfDataService();
module.exports.LhuPdfDataService = LhuPdfDataService;
