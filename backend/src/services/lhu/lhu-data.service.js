const { Op } = require('sequelize');
const { User, Pegawai, Role, Pelanggan, Fppl, JadwalSampel, FpplSampel, JenisSampel, RegBm, PktBm, PktBmParam, PktBmNilai, Parameter, Metode, ParameterMetode, FpplParameterMetode, Sampel, SampelParameter, PenugasanItem, PenugasanDetail, Lka, LkaHasil, Lhu, } = require('../../models/Associations');
const { buildLkaHasilRevisionResponse } = require('../assignment/assignment-revision.helper');
const { calculateAccreditationStats, getPlain, pickObject, pickArray, getAssociatedFpmsFromSample, getMethodIdFromFpm, getMethodIdFromDetail, firstDate, toDateOnly, buildAcuanBmSnapshot, getLkaHasilTargetKey, getFpplParameterMetodeKey, getParameterMethodKey, getFallbackParameterKey, applyDetailOrder, getDetailOrderDescriptor, sortDetailRowsForLhu, toTinyIntFlag, getSubkontrakSnapshot, getLkaHasilReviewStatus, isResultApprovedByKasi, getScheduleCreatedTime, getScheduleDateTime, getScheduleIdOrder, getActiveJadwalFromFppl, } = require('./lhu-data-utils');
const { findApprovedResultForExpectedParameter, groupLhuDetailRowsByParameter, normalizeBmText, normalizeNilaiBmForLhu, } = require('./lhu-detail-row.mapper');
const { isEditableByQcStatus, buildStandarLabel, mapSamplePayload, mapPelangganPayload, mapRequestPayload, buildDefaultDetailRows, getPegawaiDisplayName, getPktBmHeaderById, countDetailStats, mapLhuHeaderPayload, } = require('./lhu-payload.mapper');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');

const normalizeSampleNoKey = (value) => String(value || '').trim().replace(/\s*\/\s*/g, '/').toLowerCase();
const sortSampleNos = (items = []) => [...items].sort((a, b) => String(a || '').localeCompare(String(b || ''), 'id', { numeric: true, sensitivity: 'base' }));
const dedupeRowsBySampleNo = (rows = []) => {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const noSampel = String(row?.no_sampel || row?.noSampel || '').trim();
        const key = normalizeSampleNoKey(noSampel);
        if (!key || map.has(key))
            return;
        map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => String(a?.no_sampel || a?.noSampel || '').localeCompare(String(b?.no_sampel || b?.noSampel || ''), 'id', { numeric: true, sensitivity: 'base' }));
};
const dedupeSampleNos = (values = []) => {
    const map = new Map();
    (Array.isArray(values) ? values : []).forEach((value) => {
        const noSampel = String(value || '').trim();
        const key = normalizeSampleNoKey(noSampel);
        if (!key || map.has(key))
            return;
        map.set(key, noSampel);
    });
    return sortSampleNos(Array.from(map.values()));
};
class LhuDataService {
getExistingLhuBySample = async (noSampel, transaction = null) => {
        const sampleNo = String(noSampel || '').trim();
        if (!sampleNo)
            return null;
        const sampleInstance = await Sampel.findOne({
            where: { no_sampel: sampleNo },
            include: [
                {
                    model: Lhu,
                    as: 'lhu',
                    required: false,
                },
            ],
            transaction,
        });
        const sample = getPlain(sampleInstance);
        const lhu = pickObject(sample, ['lhu', 'Lhu']);
        if (lhu)
            return lhu;
        if (!sample?.nomor_lhu)
            return null;
        return getPlain(await Lhu.findByPk(sample.nomor_lhu, { transaction }));
    };
    getSampleInfo = async (noSampel, transaction = null) => {
        const sampleInstance = await Sampel.findOne({
            where: { no_sampel: noSampel },
            include: [
                { model: JenisSampel, as: 'jenis_sampel', required: false },
                { model: RegBm, as: 'reg_bm', required: false },
                {
                    model: Fppl,
                    as: 'fppl',
                    required: true,
                    include: [
                        { model: Pelanggan, as: 'pelanggan', required: true },
                        { model: JadwalSampel, as: 'jadwal_sampels', required: false },
                    ],
                },
                { model: Lhu, as: 'lhu', required: false },
            ],
            transaction,
        });
        if (!sampleInstance) {
            throw new Error('Sampel tidak ditemukan.');
        }
        const sample = getPlain(sampleInstance);
        const fpplSampel = await FpplSampel.findOne({
            where: {
                id_registrasi: sample.id_registrasi,
                id_jenis_sampel: sample.id_jenis_sampel,
                id_reg_bm: sample.id_reg_bm,
            },
            transaction,
        }).then(getPlain);
        const jenis = pickObject(sample, ['jenis_sampel', 'JenisSampel']) || {};
        const regBm = pickObject(sample, ['reg_bm', 'RegBm']) || {};
        const fppl = pickObject(sample, ['fppl', 'Fppl']) || {};
        const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
        const jadwal = getActiveJadwalFromFppl(fppl);
        return {
            no_sampel: sample.no_sampel,
            nomor_lhu: sample.nomor_lhu || null,
            nomorLhu: sample.nomor_lhu || null,
            status_lhu: pickObject(sample, ['lhu', 'Lhu'])?.status_lhu || null,
            statusLhu: pickObject(sample, ['lhu', 'Lhu'])?.status_lhu || null,
            tanggal_pengambilan_sampel: sample.tanggal_pengambilan ||
                sample.tanggal_pengambilan_sampel ||
                null,
            tanggal_jadwal: jadwal?.tanggal_jadwal || null,
            jam_jadwal: jadwal?.jam_jadwal || null,
            diterima_pada: sample.diterima_pada || null,
            tanggal_penerimaan: sample.diterima_pada || null,
            jam_penerimaan: sample.diterima_pada ? new Date(sample.diterima_pada).toTimeString().slice(0, 8) : null,
            kondisi_sampel: sample.kondisi_sampel || null,
            abnormalitas_sampel: sample.abnormalitas_sampel || null,
            acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || null,
            lokasi_spesifik: sample.lokasi_spesifik || null,
            lokasi_pengambilan_sampel: sample.lokasi_spesifik || fppl.lokasi_pengambilan_sampel || null,
            koordinat: sample.koordinat || null,
            status_sample: sample.status_sample || null,
            id_registrasi: sample.id_registrasi || fpplSampel?.id_registrasi || null,
            id_jenis_sampel: sample.id_jenis_sampel || fpplSampel?.id_jenis_sampel || null,
            id_reg_bm: sample.id_reg_bm || fpplSampel?.id_reg_bm || null,
            jumlah_sampel: fpplSampel?.jumlah_sampel || null,
            jenis_sampel: jenis.jenis_sampel || null,
            jenisSampel: jenis.jenis_sampel || null,
            reg_bm_instansi: regBm.instansi || null,
            ref_reg: regBm.ref_reg || null,
            nomor_fppl: fppl.nomor_fppl || null,
            tanggal_pendaftaran: fppl.tanggal_pendaftaran || null,
            maksud_pengujian: fppl.maksud_pengujian || null,
            lokasi_pengambilan_permohonan: fppl.lokasi_pengambilan_sampel || null,
            jenis_pengambilan_sampel: fppl.jenis_pengambilan_sampel || null,
            tanggal_rencana_pengambilan_sampel: fppl.tanggal_rencana_pengambilan_sampel || null,
            jam_rencana_pengambilan_sampel: fppl.jam_rencana_pengambilan_sampel || null,
            tanggal_rencana_pengantaran_sampel: fppl.tanggal_rencana_pengantaran_sampel || null,
            status_fppl: fppl.status_fppl || null,
            id_pelanggan: pelanggan.id_pelanggan || null,
            nama_pelanggan: pelanggan.nama_instansi || null,
            nama_instansi: pelanggan.nama_instansi || null,
            alamat_pelanggan: pelanggan.alamat || null,
            alamat: pelanggan.alamat || null,
            pic_pelanggan: pelanggan.pic || null,
            pic: pelanggan.pic || null,
            telp_pelanggan: pelanggan.no_telp || null,
            no_telp: pelanggan.no_telp || null,
            email_pelanggan: pelanggan.email_kontak || null,
            email_kontak: pelanggan.email_kontak || null,
        };
    };
    resolvePersonelDihubungiPic = (sample = {}, payloadValue = null) => {
        const pic = sample.pic_pelanggan ||
            sample.pic ||
            payloadValue ||
            null;
        const value = String(pic || '').trim();
        return value || null;
    };
    getPersonelOptions = async () => {
        const rows = await Pegawai.findAll({
            where: {
                nik: {
                    [Op.ne]: null,
                },
            },
            include: [
                {
                    model: User,
                    required: false,
                    include: [{ model: Role, required: false }],
                },
            ],
            order: [['nama_pegawai', 'ASC']],
        });
        return rows.map((instance) => {
            const row = getPlain(instance);
            const user = pickObject(row, ['user', 'User']) || {};
            const role = pickObject(user, ['role', 'Role']) || {};
            return {
                id_pegawai: row.id_pegawai,
                nik: row.nik,
                nip: row.nip,
                nama_pegawai: row.nama_pegawai,
                username: user.username || row.nama_pegawai,
                no_wa: row.no_wa,
                nama_role: role.nama_role || null,
                is_pcc: Number(row.is_pcc || 0),
            };
        });
    };
    dedupeLkaResultRows = (rows = []) => {
        const map = new Map();
        (Array.isArray(rows) ? rows : []).forEach((row, index) => {
            const key = String(row.id_fppl_parameter_metode ||
                row.idFpplParameterMetode ||
                row.id_metode_parameter ||
                row.idMetodeParameter ||
                row.id_parameter ||
                row.idParameter ||
                getLkaHasilTargetKey(row) ||
                `row-${index}`).trim();
            if (!key)
                return;
            const current = map.get(key);
            if (!current) {
                map.set(key, row);
                return;
            }
            const currentId = Number(String(current.kode_lka || current.kodeLka || getLkaHasilTargetKey(current) || '').replace(/\D/g, '')) || 0;
            const nextId = Number(String(row.kode_lka || row.kodeLka || getLkaHasilTargetKey(row) || '').replace(/\D/g, '')) || 0;
            if (nextId >= currentId) {
                map.set(key, row);
            }
        });
        return Array.from(map.values());
    };
    getLkaResultRows = async (noSampel, transaction = null) => {
        const expectedRows = await this.getExpectedParameterRows(noSampel, transaction);
        const expectedByFpmId = new Map(expectedRows
            .filter((row) => row.id_fppl_parameter_metode)
            .map((row) => [String(row.id_fppl_parameter_metode), row]));
        const expectedByMethodId = new Map();
        expectedRows.forEach((row) => {
            if (!row.id_metode_parameter)
                return;
            const key = String(row.id_metode_parameter);
            if (!expectedByMethodId.has(key)) {
                expectedByMethodId.set(key, row);
            }
        });
        const rows = await LkaHasil.findAll({
            where: { no_sampel: noSampel },
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
        const mappedRows = rows
            .map((instance) => {
            const row = getPlain(instance);
            const lka = pickObject(row, ['lka', 'Lka']) || {};
            const detail = pickObject(lka, ['penugasan_detail', 'PenugasanDetail']) || {};
            const directParameterMetode = pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};
            const detailFpm = pickObject(detail, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};
            const detailMethodId = getMethodIdFromDetail(detail);
            const expectedByMethod = detailMethodId
                ? expectedByMethodId.get(String(detailMethodId))
                : null;
            const expectedByFpm = detail.id_fppl_parameter_metode
                ? expectedByFpmId.get(String(detail.id_fppl_parameter_metode))
                : null;
            const expected = expectedByMethod || expectedByFpm || null;
            const fpmParameter = pickObject(detailFpm, ['parameter', 'Parameter']) || {};
            const fpmParameterMetode = pickObject(detailFpm, ['parameter_metode', 'ParameterMetode']) || {};
            const fpmMetode = pickObject(fpmParameterMetode, ['metode', 'Metode']) || {};
            const directParameter = pickObject(directParameterMetode, ['parameter', 'Parameter']) || {};
            const directMetode = pickObject(directParameterMetode, ['metode', 'Metode']) || {};
            return {
                kode_lka: row.kode_lka,
                no_sampel: row.no_sampel,
                hasil: row.hasil,
                catatan_hasil: row.catatan_hasil,
                status_review_hasil: getLkaHasilReviewStatus(row),
                statusReviewHasil: getLkaHasilReviewStatus(row),
                ...buildLkaHasilRevisionResponse(row),
                status_lka: lka.status_lka,
                tanggal_mulai_pengujian: lka.tanggal_mulai_pengujian,
                tanggal_selesai_pengujian: lka.tanggal_selesai_pengujian,
                id_penugasan_detail: detail.id_penugasan_detail,
                // ini tetap diisi dari FPM asli sampel kalau ada
                id_fppl_parameter_metode: expected?.id_fppl_parameter_metode ||
                    detail.id_fppl_parameter_metode ||
                    detailFpm.id_fppl_parameter_metode ||
                    null,
                id_parameter: expected?.id_parameter ||
                    detailFpm.id_parameter ||
                    directParameter.id_parameter ||
                    fpmParameter.id_parameter ||
                    null,
                id_metode_parameter: expected?.id_metode_parameter ||
                    detail.id_metode_parameter ||
                    directParameterMetode.id_metode_parameter ||
                    detailFpm.id_metode_parameter ||
                    fpmParameterMetode.id_metode_parameter ||
                    null,
                is_insitu: expected?.is_insitu ??
                    detailFpm.is_insitu ??
                    0,
                status_kemampuan_lab: expected?.status_kemampuan_lab ||
                    detailFpm.status_kemampuan_lab ||
                    null,
                is_subkontrak: expected?.is_subkontrak ??
                    directParameterMetode.is_subkontrak ??
                    fpmParameterMetode.is_subkontrak ??
                    0,
                is_subkontrak_snapshot: directParameterMetode.is_subkontrak ??
                    fpmParameterMetode.is_subkontrak ??
                    expected?.is_subkontrak ??
                    0,
                nama_parameter: expected?.nama_parameter ||
                    directParameter.nama_parameter ||
                    fpmParameter.nama_parameter ||
                    '-',
                kategori_parameter: expected?.kategori_parameter ||
                    directParameter.kategori_parameter ||
                    fpmParameter.kategori_parameter ||
                    null,
                acuan_metode: expected?.acuan_metode ||
                    directParameterMetode.acuan_metode ||
                    fpmParameterMetode.acuan_metode ||
                    '-',
                is_terakreditasi: expected?.is_terakreditasi ??
                    directParameterMetode.is_terakreditasi ??
                    fpmParameterMetode.is_terakreditasi ??
                    0,
                nama_metode: expected?.nama_metode ||
                    directMetode.nama_metode ||
                    fpmMetode.nama_metode ||
                    '-',
            };
        })
            .filter((row) => row.kode_lka && row.no_sampel);
        return this.dedupeLkaResultRows(mappedRows).sort((a, b) => String(a.nama_parameter || '').localeCompare(String(b.nama_parameter || '')));
    };
    getExpectedParameterRows = async (noSampel, transaction = null) => {
        const sample = await Sampel.findOne({
            where: { no_sampel: noSampel },
            include: [
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
            transaction,
        });
        if (!sample)
            return [];
        const plain = getPlain(sample);
        const fpms = getAssociatedFpmsFromSample(plain);
        return fpms
            .map((fpm) => {
            const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
            const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
            const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};
            return {
                no_sampel: plain.no_sampel,
                id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,
                id_parameter: fpm.id_parameter,
                id_metode_parameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
                is_insitu: fpm.is_insitu,
                status_kemampuan_lab: fpm.status_kemampuan_lab,
                is_subkontrak: parameterMetode.is_subkontrak ?? 0,
                is_subkontrak_snapshot: parameterMetode.is_subkontrak ?? 0,
                nama_parameter: parameter.nama_parameter,
                kategori_parameter: parameter.kategori_parameter,
                acuan_metode: parameterMetode.acuan_metode,
                is_terakreditasi: parameterMetode.is_terakreditasi,
                nama_metode: metode.nama_metode,
            };
        })
            .sort((a, b) => String(a.nama_parameter || '').localeCompare(String(b.nama_parameter || '')));
    };
    getBmInfo = async (idPktBm, transaction = null) => {
        const pktInstance = await PktBm.findOne({
            where: { id_pkt_bm: idPktBm },
            include: [
                { model: RegBm, required: false },
                { model: JenisSampel, required: false },
            ],
            transaction,
        });
        if (!pktInstance) {
            throw new Error('Paket baku mutu tidak ditemukan.');
        }
        const pkt = withPaketBmDisplayFields(getPlain(pktInstance));
        const regBm = pickObject(pkt, ['reg_bm', 'RegBm']) || {};
        const header = {
            id_pkt_bm: pkt.id_pkt_bm,
            id_reg_bm: pkt.id_reg_bm,
            id_jenis_sampel: pkt.id_jenis_sampel,
            klasifikasi: pkt.klasifikasi,
            nama_pkt: pkt.nama_pkt,
            teks_lhu: pkt.teks_lhu,
            instansi: regBm.instansi,
            ref_reg: regBm.ref_reg,
        };
        const [paramRows, nilaiRows] = await Promise.all([
            PktBmParam.findAll({
                where: { id_reg_bm: pkt.id_reg_bm, id_jenis_sampel: pkt.id_jenis_sampel },
                transaction,
            }),
            PktBmNilai.findAll({ where: { id_pkt_bm: pkt.id_pkt_bm }, transaction }),
        ]);
        const nilaiMap = new Map(nilaiRows.map((row) => [String(row.id_parameter), getPlain(row)]));
        const rows = paramRows.map(getPlain).map((row) => ({
            ...header,
            id_parameter: row.id_parameter,
            nilai_bm: nilaiMap.get(String(row.id_parameter))?.nilai_bm ?? null,
            satuan_bm: row.satuan_bm,
            ket_bm: row.ket_bm,
        })).sort((a, b) => String(a.id_parameter || '').localeCompare(String(b.id_parameter || '')));
        const map = new Map();
        rows.forEach((row) => {
            if (row.id_parameter) {
                map.set(row.id_parameter, row);
            }
        });
        return { header, rows, map };
    };
    getDetailLhuRows = async (nomorLhu, transaction = null) => {
        const lhuInstance = await Lhu.findByPk(nomorLhu, {
            include: [
                {
                    model: Sampel,
                    as: 'sampels',
                    required: false,
                    attributes: ['no_sampel'],
                },
            ],
            transaction,
        });
        if (!lhuInstance)
            return [];
        const lhu = getPlain(lhuInstance);
        const lhuSamples = dedupeRowsBySampleNo(pickArray(lhu, ['sampels', 'Sampels']));
        const sampleNos = dedupeSampleNos(lhuSamples.map((row) => row.no_sampel || row.noSampel));
        if (!sampleNos.length)
            return [];
        const bmInfo = lhu.id_pkt_bm
            ? await this.getBmInfo(lhu.id_pkt_bm, transaction)
            : { map: new Map() };
        const rows = [];
        for (const sampleNo of sampleNos) {
            const resultRows = await this.getLkaResultRows(sampleNo, transaction);
            resultRows
                .filter((row) => String(row.hasil || '').trim() && isResultApprovedByKasi(row))
                .forEach((row) => {
                    const bm = bmInfo.map.get(row.id_parameter) || null;
                    const nilaiBm = normalizeNilaiBmForLhu(bm?.nilai_bm);
                    const satuanBm = normalizeBmText(bm?.satuan_bm);
                    const adaDiBm = bm ? 1 : 0;
                    rows.push({
                        nomor_lhu: nomorLhu,
                        nomorLhu,
                        no_sampel: sampleNo,
                        noSampel: sampleNo,
                        kode_lka: row.kode_lka || row.kodeLka || null,
                        kodeLka: row.kode_lka || row.kodeLka || null,
                        id_fppl_parameter_metode: row.id_fppl_parameter_metode || row.idFpplParameterMetode || null,
                        idFpplParameterMetode: row.id_fppl_parameter_metode || row.idFpplParameterMetode || null,
                        id_parameter: row.id_parameter || row.idParameter || null,
                        idParameter: row.id_parameter || row.idParameter || null,
                        id_metode_parameter: row.id_metode_parameter || row.idMetodeParameter || null,
                        idMetodeParameter: row.id_metode_parameter || row.idMetodeParameter || null,
                        nama_parameter: row.nama_parameter || row.namaParameter || '-',
                        namaParameter: row.nama_parameter || row.namaParameter || '-',
                        nama_parameter_snapshot: row.nama_parameter || row.namaParameter || '-',
                        namaParameterSnapshot: row.nama_parameter || row.namaParameter || '-',
                        kategori_parameter: row.kategori_parameter || row.kategoriParameter || null,
                        kategoriParameter: row.kategori_parameter || row.kategoriParameter || null,
                        metode: row.nama_metode || row.namaMetode || row.metode || '-',
                        nama_metode: row.nama_metode || row.namaMetode || row.metode || '-',
                        namaMetode: row.nama_metode || row.namaMetode || row.metode || '-',
                        metode_snapshot: row.nama_metode || row.namaMetode || row.metode || '-',
                        metodeSnapshot: row.nama_metode || row.namaMetode || row.metode || '-',
                        acuan_metode: row.acuan_metode || row.acuanMetode || '-',
                        acuanMetode: row.acuan_metode || row.acuanMetode || '-',
                        acuan_metode_snapshot: row.acuan_metode || row.acuanMetode || '-',
                        acuanMetodeSnapshot: row.acuan_metode || row.acuanMetode || '-',
                        hasil: row.hasil || null,
                        hasil_snapshot: row.hasil || null,
                        hasilSnapshot: row.hasil || null,
                        catatan_hasil: row.catatan_hasil || row.catatanHasil || null,
                        catatanHasil: row.catatan_hasil || row.catatanHasil || null,
                        is_terakreditasi: toTinyIntFlag(row.is_terakreditasi),
                        isTerakreditasi: toTinyIntFlag(row.isTerakreditasi ?? row.is_terakreditasi),
                        is_terakreditasi_snapshot: toTinyIntFlag(row.is_terakreditasi),
                        isTerakreditasiSnapshot: toTinyIntFlag(row.isTerakreditasi ?? row.is_terakreditasi),
                        is_insitu: toTinyIntFlag(row.is_insitu),
                        isInsitu: toTinyIntFlag(row.isInsitu ?? row.is_insitu),
                        is_insitu_snapshot: toTinyIntFlag(row.is_insitu),
                        isInsituSnapshot: toTinyIntFlag(row.isInsitu ?? row.is_insitu),
                        is_subkontrak: getSubkontrakSnapshot(row),
                        isSubkontrak: getSubkontrakSnapshot(row),
                        is_subkontrak_snapshot: getSubkontrakSnapshot(row),
                        isSubkontrakSnapshot: getSubkontrakSnapshot(row),
                        bm: nilaiBm,
                        nilai_bm: nilaiBm,
                        nilaiBm,
                        nilai_bm_pkt: nilaiBm,
                        nilaiBmPkt: nilaiBm,
                        satuan_bm: satuanBm,
                        satuanBm,
                        satuan_bm_pkt: satuanBm,
                        satuanBmPkt: satuanBm,
                        ada_di_bm: adaDiBm,
                        adaDiBm,
                        ada_di_bm_pkt: adaDiBm,
                        adaDiBmPkt: adaDiBm,
                    });
                });
        }
        return sortDetailRowsForLhu(groupLhuDetailRowsByParameter(rows));
    };
    getLhuSampleRows = async (nomorLhu, transaction = null) => {
        const rows = await Sampel.findAll({
            where: { nomor_lhu: nomorLhu },
            order: [['no_sampel', 'ASC']],
            transaction,
        });
        return dedupeRowsBySampleNo(rows.map((instance) => getPlain(instance)));
    };
    getFirstSampleInfoForLhu = async (nomorLhu, transaction = null) => {
        const rows = await this.getLhuSampleRows(nomorLhu, transaction);
        const noSampel = rows?.[0]?.no_sampel;
        return noSampel ? this.getSampleInfo(noSampel, transaction) : null;
    };
    getSampleInfosForLhu = async (nomorLhu, transaction = null) => {
        const rows = await this.getLhuSampleRows(nomorLhu, transaction);
        const sampleNos = dedupeSampleNos((rows || []).map((row) => row.no_sampel));
        const sampleInfos = [];
        for (const noSampel of sampleNos) {
            sampleInfos.push(await this.getSampleInfo(noSampel, transaction));
        }
        return sampleInfos;
    };
    buildLhuListRow = async (lhu = {}) => {
        const sampleInfos = await this.getSampleInfosForLhu(lhu.nomor_lhu);
        const sample = sampleInfos[0] || {};
        const samplePayloads = sampleInfos.map(mapSamplePayload);
        const sampleNos = dedupeSampleNos(sampleInfos.map((info) => info.no_sampel));
        const noSampelText = sampleNos.join('\n') || null;
        const joinUnique = (values = [], separator = ', ') => {
            const seen = new Set();
            const result = [];
            values.forEach((value) => {
                const text = String(value || '').trim();
                if (!text || seen.has(text.toLowerCase()))
                    return;
                seen.add(text.toLowerCase());
                result.push(text);
            });
            return result.join(separator) || null;
        };
        const nomorFppl = joinUnique(sampleInfos.map((info) => info.nomor_fppl)) || sample.nomor_fppl || null;
        const jenisSampel = joinUnique(sampleInfos.map((info) => info.jenis_sampel)) || sample.jenis_sampel || null;
        const acuanPengambilan = joinUnique(sampleInfos.map((info) => info.acuan_pengambilan_sampel), '\n') || sample.acuan_pengambilan_sampel || null;
        const abnormalitas = joinUnique(sampleInfos.map((info) => info.abnormalitas_sampel), '\n') || sample.abnormalitas_sampel || null;
        const pktBm = await getPktBmHeaderById(lhu.id_pkt_bm);
        const details = await this.getDetailLhuRows(lhu.nomor_lhu);
        const stats = countDetailStats(details);
        const standarLabel = buildAcuanBmSnapshot(pktBm) || buildStandarLabel(sample);
        const [qcNama, kalabNama] = await Promise.all([
            getPegawaiDisplayName(lhu.qc_by),
            getPegawaiDisplayName(lhu.kalab_by),
        ]);
        return {
            nomorLhu: lhu.nomor_lhu,
            nomor_lhu: lhu.nomor_lhu,
            nomorFppl,
            nomor_fppl: nomorFppl,
            noSampel: noSampelText,
            no_sampel: noSampelText,
            sampleNos,
            sample_nos: sampleNos,
            daftarSampelFinalisasiQc: noSampelText,
            daftar_sampel_finalisasi_qc: noSampelText,
            totalSampelFinalisasiQc: sampleNos.length,
            total_sampel_finalisasi_qc: sampleNos.length,
            samples: samplePayloads,
            sampels: samplePayloads,
            idRegistrasi: sample.id_registrasi,
            id_registrasi: sample.id_registrasi,
            idPktBm: lhu.id_pkt_bm,
            id_pkt_bm: lhu.id_pkt_bm,
            jenisSampel,
            jenis_sampel: jenisSampel,
            namaPkt: pktBm.nama_pkt,
            nama_pkt: pktBm.nama_pkt,
            klasifikasi: pktBm.klasifikasi,
            teksLhu: pktBm.teks_lhu,
            teks_lhu: pktBm.teks_lhu,
            statusLhu: lhu.status_lhu,
            status_lhu: lhu.status_lhu,
            tanggalPenerbitan: lhu.tanggal_penerbitan,
            tanggal_penerbitan: lhu.tanggal_penerbitan,
            fileLhuPath: lhu.file_lhu_path,
            file_lhu_path: lhu.file_lhu_path,
            acuanPengambilanSampel: acuanPengambilan,
            acuan_pengambilan_sampel: acuanPengambilan,
            abnormalitasSampel: abnormalitas,
            abnormalitas_sampel: abnormalitas,
            regBm: standarLabel,
            reg_bm: standarLabel,
            standar: standarLabel,
            regBmInstansi: sample.reg_bm_instansi || pktBm.instansi || null,
            reg_bm_instansi: sample.reg_bm_instansi || pktBm.instansi || null,
            refReg: sample.ref_reg || pktBm.ref_reg || null,
            ref_reg: sample.ref_reg || pktBm.ref_reg || null,
            qcBy: lhu.qc_by,
            qc_by: lhu.qc_by,
            qcNama,
            qc_nama: qcNama,
            qcAt: lhu.qc_at,
            qc_at: lhu.qc_at,
            kalabBy: lhu.kalab_by,
            kalab_by: lhu.kalab_by,
            kalabNama,
            kalab_nama: kalabNama,
            kalabAt: lhu.kalab_at,
            kalab_at: lhu.kalab_at,
            ...stats,
        };
    };
    calculateAccreditationStats = (...args) => {
        return calculateAccreditationStats(...args);
    };
    getPlain = (...args) => {
        return getPlain(...args);
    };
    pickObject = (...args) => {
        return pickObject(...args);
    };
    pickArray = (...args) => {
        return pickArray(...args);
    };
    getAssociatedFpmsFromSample = (...args) => {
        return getAssociatedFpmsFromSample(...args);
    };
    getMethodIdFromFpm = (...args) => {
        return getMethodIdFromFpm(...args);
    };
    getMethodIdFromDetail = (...args) => {
        return getMethodIdFromDetail(...args);
    };
    firstDate = (...args) => {
        return firstDate(...args);
    };
    toDateOnly = (...args) => {
        return toDateOnly(...args);
    };
    buildAcuanBmSnapshot = (...args) => {
        return buildAcuanBmSnapshot(...args);
    };
    getLkaHasilTargetKey = (...args) => {
        return getLkaHasilTargetKey(...args);
    };
    getFpplParameterMetodeKey = (...args) => {
        return getFpplParameterMetodeKey(...args);
    };
    getParameterMethodKey = (...args) => {
        return getParameterMethodKey(...args);
    };
    getFallbackParameterKey = (...args) => {
        return getFallbackParameterKey(...args);
    };
    applyDetailOrder = (...args) => {
        return applyDetailOrder(...args);
    };
    getDetailOrderDescriptor = (...args) => {
        return getDetailOrderDescriptor(...args);
    };
    sortDetailRowsForLhu = (...args) => {
        return sortDetailRowsForLhu(...args);
    };
    toTinyIntFlag = (...args) => {
        return toTinyIntFlag(...args);
    };
    getSubkontrakSnapshot = (...args) => {
        return getSubkontrakSnapshot(...args);
    };
    getLkaHasilReviewStatus = (...args) => {
        return getLkaHasilReviewStatus(...args);
    };
    isResultApprovedByKasi = (...args) => {
        return isResultApprovedByKasi(...args);
    };
    getScheduleCreatedTime = (...args) => {
        return getScheduleCreatedTime(...args);
    };
    getScheduleDateTime = (...args) => {
        return getScheduleDateTime(...args);
    };
    getScheduleIdOrder = (...args) => {
        return getScheduleIdOrder(...args);
    };
    getActiveJadwalFromFppl = (...args) => {
        return getActiveJadwalFromFppl(...args);
    };
    isEditableByQcStatus = (...args) => {
        return isEditableByQcStatus(...args);
    };
    buildStandarLabel = (...args) => {
        return buildStandarLabel(...args);
    };
    mapSamplePayload = (...args) => {
        return mapSamplePayload(...args);
    };
    mapPelangganPayload = (...args) => {
        return mapPelangganPayload(...args);
    };
    mapRequestPayload = (...args) => {
        return mapRequestPayload(...args);
    };
    buildDefaultDetailRows = (...args) => {
        return buildDefaultDetailRows(...args);
    };
    getPegawaiDisplayName = (...args) => {
        return getPegawaiDisplayName(...args);
    };
    getPktBmHeaderById = (...args) => {
        return getPktBmHeaderById(...args);
    };
    countDetailStats = (...args) => {
        return countDetailStats(...args);
    };
    mapLhuHeaderPayload = (...args) => {
        return mapLhuHeaderPayload(...args);
    };
}
module.exports = new LhuDataService();
module.exports.LhuDataService = LhuDataService;
