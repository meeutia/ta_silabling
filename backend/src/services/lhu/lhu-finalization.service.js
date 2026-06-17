const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const lhuPdfService = require('./lhu-pdf.service');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { generateDraftNomorLhu } = require('../../utils/id-generator');
const { Fppl, FpplSampel, Pelanggan, JadwalSampel, JenisSampel, RegBm, PktBm, Klasifikasi, PktBmParam, Parameter, Metode, ParameterMetode, FpplParameterMetode, Sampel, Lhu, } = require('../../models/Associations');
const { LHU_STATUS, LHU_EDITABLE_BY_QC_STATUSES, LHU_NEXT_STATUS, } = require('../../constants/lhu-status.constant');
const { calculateAccreditationStats, getPlain, pickObject, getLkaHasilTargetKey, getFallbackParameterKey, sortDetailRowsForLhu, applyDetailOrder, getExistingLhuBySample, getSampleInfo, getLkaResultRows, getExpectedParameterRows, getBmInfo, isEditableByQcStatus, mapSamplePayload, mapPelangganPayload, mapRequestPayload, buildDefaultDetailRows, toTinyIntFlag, getSubkontrakSnapshot, } = require('./lhu-data.service');
const { findApprovedResultForExpectedParameter, mapDetailRow, } = require('./lhu-detail-row.mapper');
const { getApprovedLkaRowsForExpectedParameters, } = require('./lhu-approved-lka-rows.service');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
class LhuFinalizationService {
dedupeLkaResultRows = (rows = []) => {
        const map = new Map();
        rows.forEach((row) => {
            const key = String(row.id_metode_parameter ||
                row.id_parameter ||
                getLkaHasilTargetKey(row) ||
                '');
            if (!key)
                return;
            const current = map.get(key);
            if (!current) {
                map.set(key, row);
                return;
            }
            const currentId = Number(String(getLkaHasilTargetKey(current) || '').replace(/\D/g, '')) || 0;
            const nextId = Number(String(getLkaHasilTargetKey(row) || '').replace(/\D/g, '')) || 0;
            if (nextId >= currentId) {
                map.set(key, row);
            }
        });
        return Array.from(map.values());
    };
    normalizeSampleNoList = (value) => {
        const rawItems = Array.isArray(value) ? value : [value];
        const values = rawItems
            .flatMap((item) => Array.isArray(item) ? this.normalizeSampleNoList(item) : String(item || '').split(/[\n,]+/))
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        const map = new Map();
        values.forEach((value) => {
            const key = this.normalizeSampleNoKey(value);
            if (key && !map.has(key))
                map.set(key, value);
        });
        return Array.from(map.values()).sort((a, b) => String(a || '').localeCompare(String(b || ''), 'id', { numeric: true, sensitivity: 'base' }));
    };
    normalizeSampleNoKey = (value) => String(value || '').trim().replace(/\s*\/\s*/g, '/').toLowerCase();
    pushSampleNoOnce = (group, noSampel) => {
        const value = String(noSampel || '').trim();
        if (!value)
            return;
        if (!group.__sampleNoKeySet)
            group.__sampleNoKeySet = new Set((group.samples || []).map((sampleNo) => this.normalizeSampleNoKey(sampleNo)));
        const key = this.normalizeSampleNoKey(value);
        if (group.__sampleNoKeySet.has(key))
            return;
        group.__sampleNoKeySet.add(key);
        group.samples.push(value);
        group.sampels.push(value);
    };
    dedupeSampleInfos = (sampleInfos = []) => {
        const map = new Map();
        (Array.isArray(sampleInfos) ? sampleInfos : []).forEach((sample) => {
            const noSampel = String(sample?.no_sampel || sample?.noSampel || '').trim();
            const key = this.normalizeSampleNoKey(noSampel);
            if (!noSampel || !key || map.has(key))
                return;
            map.set(key, sample);
        });
        return Array.from(map.values()).sort((a, b) => String(a?.no_sampel || a?.noSampel || '').localeCompare(String(b?.no_sampel || b?.noSampel || ''), 'id', { numeric: true, sensitivity: 'base' }));
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
                return value.split(/[,\n]+/).map((item) => item.trim()).filter(Boolean);
            }
        }
        return [];
    };
    getSamplesForRegistration = async (identifier, transaction = null) => {
        const id = String(identifier || '').trim();
        if (!id)
            return [];
        let registrationId = id;
        const sampleByNo = await Sampel.findOne({
            where: { no_sampel: id },
            transaction,
        });
        if (sampleByNo) {
            const sample = getPlain(sampleByNo);
            registrationId = sample.id_registrasi || id;
        }
        const rows = await Sampel.findAll({
            where: { id_registrasi: registrationId },
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
            ],
            order: [['no_sampel', 'ASC']],
            transaction,
        });
        return rows.map(getPlain);
    };
    mapQcSampleRowFromPlain = (sample = {}, readiness = {}, existing = null) => {
        const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
        const fppl = pickObject(sample, ['fppl', 'Fppl']) || pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
        const jenis = pickObject(sample, ['jenis_sampel', 'JenisSampel']) || pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
        const regBm = pickObject(sample, ['reg_bm', 'RegBm']) || pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
        return {
            noSampel: sample.no_sampel,
            no_sampel: sample.no_sampel,
            idRegistrasi: sample.id_registrasi || fpplSampel.id_registrasi || null,
            id_registrasi: sample.id_registrasi || fpplSampel.id_registrasi || null,
            nomorFppl: fppl.nomor_fppl || null,
            nomor_fppl: fppl.nomor_fppl || null,
            idJenisSampel: sample.id_jenis_sampel || fpplSampel.id_jenis_sampel || null,
            id_jenis_sampel: sample.id_jenis_sampel || fpplSampel.id_jenis_sampel || null,
            jenisSampel: jenis.jenis_sampel || null,
            jenis_sampel: jenis.jenis_sampel || null,
            idRegBm: sample.id_reg_bm || fpplSampel.id_reg_bm || null,
            id_reg_bm: sample.id_reg_bm || fpplSampel.id_reg_bm || null,
            regBm: [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - '),
            reg_bm: [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - '),
            tanggalPengambilanSampel: sample.tanggal_pengambilan || sample.tanggal_pengambilan_sampel || null,
            tanggal_pengambilan_sampel: sample.tanggal_pengambilan || sample.tanggal_pengambilan_sampel || null,
            tanggalPenerimaan: sample.diterima_pada || null,
            tanggal_penerimaan: sample.diterima_pada || null,
            abnormalitasSampel: sample.abnormalitas_sampel || null,
            abnormalitas_sampel: sample.abnormalitas_sampel || null,
            acuanPengambilanSampel: sample.acuan_pengambilan_sampel || null,
            acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || null,
            lokasiSpesifik: sample.lokasi_spesifik || sample.lokasi_pengambilan_sampel || null,
            lokasi_spesifik: sample.lokasi_spesifik || sample.lokasi_pengambilan_sampel || null,
            lokasiPengambilanSampel: sample.lokasi_spesifik || sample.lokasi_pengambilan_sampel || null,
            lokasi_pengambilan_sampel: sample.lokasi_spesifik || sample.lokasi_pengambilan_sampel || null,
            koordinat: sample.koordinat || null,
            kondisiSampel: sample.kondisi_sampel || null,
            kondisi_sampel: sample.kondisi_sampel || null,
            totalParameter: readiness.totalParameter || 0,
            total_parameter: readiness.totalParameter || 0,
            totalSelesai: readiness.totalSelesai || 0,
            total_selesai: readiness.totalSelesai || 0,
            siapQc: Boolean(readiness.ready),
            siap_qc: Boolean(readiness.ready),
            nomorLhu: existing?.nomor_lhu || null,
            nomor_lhu: existing?.nomor_lhu || null,
            statusLhu: existing?.status_lhu || LHU_STATUS.WAIT_QC,
            status_lhu: existing?.status_lhu || LHU_STATUS.WAIT_QC,
            idPktBm: existing?.id_pkt_bm || null,
            id_pkt_bm: existing?.id_pkt_bm || null,
        };
    };
    getQcParameterKey = (row = {}) => {
        return String(row.id_fppl_parameter_metode ||
            row.idFpplParameterMetode ||
            row.id_metode_parameter ||
            row.idMetodeParameter ||
            row.id_parameter ||
            row.idParameter ||
            '').trim();
    };
    getSampleQcReadiness = async (noSampel, transaction = null) => {
        const sampleNo = String(noSampel || '').trim();
        if (!sampleNo) {
            return {
                totalParameter: 0,
                totalSelesai: 0,
                totalBelumDisetujuiKasi: 0,
                total_belum_disetujui_kasi: 0,
                ready: false,
            };
        }
        // Sumber kebenaran QC tetap dari parameter yang melekat ke sampel
        // (`sampel_parameter`) dan hasil LKA yang statusnya sudah Disetujui Kasi Pengujian.
        // Implementasi ini sengaja pakai Sequelize models, bukan raw SQL.
        const expectedRows = await getExpectedParameterRows(sampleNo, transaction);
        if (!expectedRows.length) {
            return {
                totalParameter: 0,
                total_parameter: 0,
                totalSelesai: 0,
                total_selesai: 0,
                totalBelumDisetujuiKasi: 0,
                total_belum_disetujui_kasi: 0,
                ready: false,
            };
        }
        const resultRows = await getLkaResultRows(sampleNo, transaction);
        const totalParameter = expectedRows.length;
        const totalSelesai = expectedRows.reduce((count, expected) => {
            const approved = findApprovedResultForExpectedParameter(expected, resultRows);
            return approved ? count + 1 : count;
        }, 0);
        const totalBelumDisetujuiKasi = Math.max(totalParameter - totalSelesai, 0);
        return {
            totalParameter,
            total_parameter: totalParameter,
            totalSelesai,
            total_selesai: totalSelesai,
            totalBelumDisetujuiKasi,
            total_belum_disetujui_kasi: totalBelumDisetujuiKasi,
            ready: totalParameter > 0 && totalSelesai === totalParameter,
        };
    };
    getRegistrationQcReadiness = async (identifier, transaction = null) => {
        const samples = await this.getSamplesForRegistration(identifier, transaction);
        const uniqueSamples = this.dedupeSampleInfos(samples);
        const sampleRows = [];
        let totalParameter = 0;
        let totalSelesai = 0;
        let totalBelumDisetujuiKasi = 0;
        for (const sample of uniqueSamples) {
            const readiness = await this.getSampleQcReadiness(sample.no_sampel, transaction);
            totalParameter += readiness.totalParameter || 0;
            totalSelesai += readiness.totalSelesai || 0;
            totalBelumDisetujuiKasi += readiness.totalBelumDisetujuiKasi || readiness.total_belum_disetujui_kasi || 0;
            sampleRows.push({ sample, readiness });
        }
        const allReady = sampleRows.length > 0 && sampleRows.every(({ readiness }) => readiness.ready);
        return {
            samples: uniqueSamples,
            sampleRows,
            totalParameter,
            totalSelesai,
            totalBelumDisetujuiKasi,
            allReady,
        };
    };
    assertFullRegistrationReadyForQc = async (identifier, transaction = null) => {
        const readiness = await this.getRegistrationQcReadiness(identifier, transaction);
        if (!readiness.samples.length) {
            throw new Error('Permohonan/sampel tidak ditemukan.');
        }
        if (!readiness.allReady) {
            const pendingSamples = readiness.sampleRows
                .filter(({ readiness: sampleReady }) => !sampleReady.ready)
                .map(({ sample }) => sample.no_sampel)
                .filter(Boolean);
            const pendingText = pendingSamples.length ? ` Sampel belum siap: ${pendingSamples.join(', ')}.` : '';
            throw new Error(`Permohonan belum dapat masuk QC karena masih ada parameter yang belum Disetujui Kasi Pengujian.${pendingText}`);
        }
        return readiness;
    };
    buildQcRegistrationQueueRow = async (samples = [], transaction = null) => {
        const uniqueSamples = this.dedupeSampleInfos(samples);
        if (!uniqueSamples.length)
            return null;
        const firstSample = uniqueSamples[0];
        const firstFpplSampel = pickObject(firstSample, ['fppl_sampel', 'FpplSampel']) || {};
        const firstFppl = pickObject(firstSample, ['fppl', 'Fppl']) || pickObject(firstFpplSampel, ['fppl', 'Fppl']) || {};
        const firstPelanggan = pickObject(firstFppl, ['pelanggan', 'Pelanggan']) || {};
        const firstJenis = pickObject(firstSample, ['jenis_sampel', 'JenisSampel']) || pickObject(firstFpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
        const firstRegBm = pickObject(firstSample, ['reg_bm', 'RegBm']) || pickObject(firstFpplSampel, ['reg_bm', 'RegBm']) || {};
        const firstIdRegistrasi = firstSample.id_registrasi || firstFpplSampel.id_registrasi || null;
        const firstIdJenisSampel = firstSample.id_jenis_sampel || firstFpplSampel.id_jenis_sampel || null;
        const firstIdRegBm = firstSample.id_reg_bm || firstFpplSampel.id_reg_bm || null;
        const sampleRows = [];
        let totalParameter = 0;
        let totalSelesai = 0;
        let lockedSamples = 0;
        for (const sample of uniqueSamples) {
            const readiness = await this.getSampleQcReadiness(sample.no_sampel, transaction);
            const existing = await getExistingLhuBySample(sample.no_sampel, transaction);
            totalParameter += readiness.totalParameter;
            totalSelesai += readiness.totalSelesai;
            if (existing && !isEditableByQcStatus(existing.status_lhu)) {
                lockedSamples += 1;
            }
            sampleRows.push(this.mapQcSampleRowFromPlain(sample, readiness, existing));
        }
        // Permohonan baru boleh muncul di QC kalau SELURUH sampel dalam FPPL sudah lengkap
        // dan semua parameter tiap sampel sudah berstatus Disetujui Kasi Pengujian.
        const allReady = sampleRows.length > 0 && sampleRows.every((sample) => sample.siapQc || sample.siap_qc);
        if (!allReady)
            return null;
        const readySampleRows = sampleRows.filter((sample) => sample.siapQc || sample.siap_qc);
        const availableSampleRows = sampleRows.filter((sample) => (!sample.nomor_lhu && !sample.nomorLhu) || isEditableByQcStatus(sample.status_lhu || sample.statusLhu));
        // Kalau semua sampel sudah pernah dimasukkan ke LHU, permohonan tidak perlu masuk antrean finalisasi baru.
        if (availableSampleRows.length === 0 || lockedSamples >= sampleRows.length)
            return null;
        const unassignedSamples = availableSampleRows;
        const jenisLabels = [...new Set(sampleRows.map((sample) => sample.jenis_sampel).filter(Boolean))];
        return {
            idRegistrasi: firstIdRegistrasi,
            id_registrasi: firstIdRegistrasi,
            nomorFppl: firstFppl.nomor_fppl || null,
            nomor_fppl: firstFppl.nomor_fppl || null,
            namaPelanggan: firstPelanggan.nama_instansi || null,
            nama_pelanggan: firstPelanggan.nama_instansi || null,
            jenisSampel: jenisLabels.join(', ') || firstJenis.jenis_sampel || null,
            jenis_sampel: jenisLabels.join(', ') || firstJenis.jenis_sampel || null,
            idJenisSampel: firstIdJenisSampel,
            id_jenis_sampel: firstIdJenisSampel,
            idRegBm: firstIdRegBm,
            id_reg_bm: firstIdRegBm,
            regBm: [firstRegBm.instansi, firstRegBm.ref_reg].filter(Boolean).join(' - '),
            reg_bm: [firstRegBm.instansi, firstRegBm.ref_reg].filter(Boolean).join(' - '),
            totalSampel: sampleRows.length,
            total_sampel: sampleRows.length,
            totalSampelSiap: readySampleRows.length,
            total_sampel_siap: readySampleRows.length,
            totalParameter,
            total_parameter: totalParameter,
            totalSelesai,
            total_selesai: totalSelesai,
            sampleNos: this.normalizeSampleNoList(unassignedSamples.map((sample) => sample.no_sampel)),
            sample_nos: this.normalizeSampleNoList(unassignedSamples.map((sample) => sample.no_sampel)),
            samples: availableSampleRows,
            sampels: availableSampleRows,
            allSamples: sampleRows,
            all_samples: sampleRows,
            defaultSampleNos: this.normalizeSampleNoList(unassignedSamples.map((sample) => sample.no_sampel)),
            default_sample_nos: this.normalizeSampleNoList(unassignedSamples.map((sample) => sample.no_sampel)),
            statusLhu: LHU_STATUS.WAIT_QC,
            status_lhu: LHU_STATUS.WAIT_QC,
            statusQcLabel: unassignedSamples.length === sampleRows.length ? 'Semua sampel menunggu QC' : 'Sebagian sampel sudah dibuat LHU',
            status_qc_label: unassignedSamples.length === sampleRows.length ? 'Semua sampel menunggu QC' : 'Sebagian sampel sudah dibuat LHU',
            totalBelumDisetujuiKasi: 0,
            total_belum_disetujui_kasi: 0,
            statusReviewHasil: 'Disetujui Kasi Pengujian',
            status_review_hasil: 'Disetujui Kasi Pengujian',
        };
    };
    getFinalizationQueue = async () => {
        const sampleInstances = await Sampel.findAll({
            include: [
                {
                    model: FpplSampel,
                    as: 'fppl_sampel',
                    required: true,
                    include: [
                        { model: JenisSampel, required: false },
                        { model: RegBm, required: false },
                        {
                            model: Fppl,
                            as: 'fppl',
                            required: true,
                            include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
                        },
                    ],
                },
            ],
            order: [['no_sampel', 'ASC']],
        });
        const grouped = new Map();
        sampleInstances.map(getPlain).forEach((sample) => {
            const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
            const idRegistrasi = fpplSampel.id_registrasi;
            if (!idRegistrasi)
                return;
            if (!grouped.has(idRegistrasi))
                grouped.set(idRegistrasi, []);
            grouped.get(idRegistrasi).push(sample);
        });
        const rows = [];
        for (const samples of grouped.values()) {
            const row = await this.buildQcRegistrationQueueRow(samples);
            if (row)
                rows.push(row);
        }
        return rows.sort((a, b) => String(b.idRegistrasi || '').localeCompare(String(a.idRegistrasi || '')));
    };
    getPaketBmOptions = async (identifier) => {
        const samples = await this.getSamplesForRegistration(identifier);
        const sample = samples[0] ? await getSampleInfo(samples[0].no_sampel) : await getSampleInfo(identifier);
        const rows = await PktBm.findAll({
            where: {
                id_jenis_sampel: sample.id_jenis_sampel,
                id_reg_bm: sample.id_reg_bm,
            },
            include: [
                { model: RegBm, required: false },
                { model: JenisSampel, required: false },
                { model: Klasifikasi, required: false },
            ],
            order: [['id_klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
        });
        return rows.map((instance) => {
            const row = withPaketBmDisplayFields(getPlain(instance));
            const regBm = pickObject(row, ['reg_bm', 'RegBm']) || {};
            return {
                id_pkt_bm: row.id_pkt_bm,
                idPktBm: row.id_pkt_bm,
                id_reg_bm: row.id_reg_bm,
                id_jenis_sampel: row.id_jenis_sampel,
                klasifikasi: row.klasifikasi,
                nama_pkt: row.nama_pkt,
                namaPkt: row.nama_pkt,
                teks_lhu: row.teks_lhu,
                teksLhu: row.teks_lhu,
                instansi: regBm.instansi,
                ref_reg: regBm.ref_reg,
            };
        });
    };
    getPaketBmOptionsForSampleInfos = async (sampleInfos = [], transaction = null) => {
        const optionMap = new Map();
        for (const sample of Array.isArray(sampleInfos) ? sampleInfos : []) {
            if (!sample?.id_jenis_sampel || !sample?.id_reg_bm)
                continue;
            const rows = await PktBm.findAll({
                where: {
                    id_jenis_sampel: sample.id_jenis_sampel,
                    id_reg_bm: sample.id_reg_bm,
                },
                include: [
                    { model: RegBm, required: false },
                    { model: JenisSampel, required: false },
                    { model: Klasifikasi, required: false },
                ],
                order: [['id_klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
                transaction,
            });
            rows.map((item) => withPaketBmDisplayFields(getPlain(item))).forEach((row) => {
                if (!row?.id_pkt_bm || optionMap.has(row.id_pkt_bm))
                    return;
                const regBm = pickObject(row, ['reg_bm', 'RegBm']) || {};
                optionMap.set(row.id_pkt_bm, {
                    id_pkt_bm: row.id_pkt_bm,
                    idPktBm: row.id_pkt_bm,
                    id_reg_bm: row.id_reg_bm,
                    id_jenis_sampel: row.id_jenis_sampel,
                    klasifikasi: row.klasifikasi,
                    nama_pkt: row.nama_pkt,
                    namaPkt: row.nama_pkt,
                    teks_lhu: row.teks_lhu,
                    teksLhu: row.teks_lhu,
                    instansi: regBm.instansi,
                    ref_reg: regBm.ref_reg,
                });
            });
        }
        return Array.from(optionMap.values()).sort((a, b) => String(a.klasifikasi || '').localeCompare(String(b.klasifikasi || '')) ||
            String(a.nama_pkt || '').localeCompare(String(b.nama_pkt || '')));
    };
    resolveSelectedSampleInfos = async (identifier, sampleNosInput = null, transaction = null) => {
        const registrationReadiness = await this.assertFullRegistrationReadyForQc(identifier, transaction);
        const allSamples = registrationReadiness.samples;
        const requestedNos = this.normalizeSampleNoList(sampleNosInput);
        const sampleMap = new Map(allSamples
            .map((sample) => [String(sample.no_sampel || '').trim(), sample])
            .filter(([noSampel]) => Boolean(noSampel)));
        const selectedPlain = requestedNos.length
            ? requestedNos.map((noSampel) => sampleMap.get(String(noSampel).trim())).filter(Boolean)
            : allSamples;
        if (requestedNos.length && selectedPlain.length !== requestedNos.length) {
            const missing = requestedNos.filter((noSampel) => !sampleMap.has(String(noSampel).trim()));
            throw new Error(`Sampel pilihan tidak ditemukan atau belum siap QC: ${missing.join(', ')}`);
        }
        if (!selectedPlain.length) {
            throw new Error('Daftar sampel untuk LHU tidak ditemukan.');
        }
        const infos = [];
        const selectedUnique = this.dedupeSampleInfos(selectedPlain);
        for (const sample of selectedUnique) {
            const existing = await getExistingLhuBySample(sample.no_sampel, transaction);
            if (existing?.nomor_lhu && !isEditableByQcStatus(existing.status_lhu)) {
                throw new Error(`Sampel ${sample.no_sampel} sudah masuk ke LHU ${existing.nomor_lhu} yang sedang proses approval atau sudah disahkan.`);
            }
            infos.push(await getSampleInfo(sample.no_sampel, transaction));
        }
        return this.dedupeSampleInfos(infos);
    };
    validateSampleCompatibilityForLhu = (sampleInfos = [], bmInfo = null) => {
        if (!sampleInfos.length)
            throw new Error('Daftar sampel untuk LHU wajib dipilih.');
        const first = sampleInfos[0];
        sampleInfos.forEach((sample) => {
            if (sample.id_registrasi !== first.id_registrasi) {
                throw new Error('Semua sampel dalam satu LHU harus berasal dari permohonan yang sama.');
            }
            if (sample.id_jenis_sampel !== first.id_jenis_sampel || sample.id_reg_bm !== first.id_reg_bm) {
                throw new Error('Semua sampel dalam satu LHU harus memiliki jenis sampel dan regulasi baku mutu yang sama.');
            }
        });
        if (bmInfo && (bmInfo.header.id_jenis_sampel !== first.id_jenis_sampel || bmInfo.header.id_reg_bm !== first.id_reg_bm)) {
            throw new Error('Paket baku mutu tidak sesuai dengan jenis sampel/regulasi baku mutu sampel.');
        }
    };
    buildLhuPreviewDetails = async (sampleInfos = [], bmInfo, transaction = null) => {
        const grouped = new Map();
        const selectedSampleInfos = this.dedupeSampleInfos(sampleInfos);
        for (const sample of selectedSampleInfos) {
            const lkaRows = await getApprovedLkaRowsForExpectedParameters(sample.no_sampel, transaction);
            lkaRows.forEach((row) => {
                const detail = mapDetailRow(row, bmInfo, sample);
                const key = getFallbackParameterKey(detail);
                if (!key)
                    return;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        ...detail,
                        no_sampel: null,
                        noSampel: null,
                        kode_lka: null,
                        kodeLka: null,
                        samples: [],
                        sampels: [],
                        hasil_by_sample: {},
                        hasilBySample: {},
                        kode_lka_by_sample: {},
                        kodeLkaBySample: {},
                    });
                }
                const group = grouped.get(key);
                const noSampel = String(row.no_sampel || '').trim();
                group.hasil_by_sample[noSampel] = row.hasil || null;
                group.hasilBySample[noSampel] = row.hasil || null;
                group.kode_lka_by_sample[noSampel] = row.kode_lka || null;
                group.kodeLkaBySample[noSampel] = row.kode_lka || null;
                this.pushSampleNoOnce(group, noSampel);
                // Untuk validasi lama dan tampilan ringkas, hasil disimpan sebagai daftar per sampel.
                group.hasil = group.samples.map((sampleNo) => `${sampleNo}: ${group.hasil_by_sample[sampleNo] || '-'}`).join('\n');
                group.hasil_snapshot = group.hasil;
                group.hasilSnapshot = group.hasil;
                const nextInsitu = Number(group.is_insitu || group.isInsitu || group.is_insitu_snapshot || detail.is_insitu || detail.isInsitu || detail.is_insitu_snapshot || 0) ? 1 : 0;
                const nextSubkontrak = Number(group.is_subkontrak || group.isSubkontrak || group.is_subkontrak_snapshot || detail.is_subkontrak || detail.isSubkontrak || detail.is_subkontrak_snapshot || 0) ? 1 : 0;
                group.is_insitu = nextInsitu;
                group.isInsitu = nextInsitu;
                group.is_insitu_snapshot = nextInsitu;
                group.isInsituSnapshot = nextInsitu;
                group.is_subkontrak = nextSubkontrak;
                group.isSubkontrak = nextSubkontrak;
                group.is_subkontrak_snapshot = nextSubkontrak;
                group.isSubkontrakSnapshot = nextSubkontrak;
            });
        }
        const groupedRows = Array.from(grouped.values()).map((row) => {
            const { __sampleNoKeySet, ...payload } = row;
            return payload;
        });
        return sortDetailRowsForLhu(groupedRows);
    };
    getFinalizationDetail = async (identifier) => {
        const registrationReadiness = await this.assertFullRegistrationReadyForQc(identifier);
        const samplesPlain = registrationReadiness.samples;
        if (!samplesPlain.length)
            throw new Error('Permohonan/sampel tidak ditemukan.');
        const sampleInfos = [];
        const availableSampleInfos = [];
        const lhuRowsMap = new Map();
        for (const sample of samplesPlain) {
            const info = await getSampleInfo(sample.no_sampel);
            const existing = await getExistingLhuBySample(sample.no_sampel);
            if (existing) {
                lhuRowsMap.set(existing.nomor_lhu, existing);
                info.nomor_lhu = existing.nomor_lhu;
                info.nomorLhu = existing.nomor_lhu;
                info.status_lhu = existing.status_lhu || null;
                info.statusLhu = existing.status_lhu || null;
            }
            else {
                availableSampleInfos.push(info);
            }
            sampleInfos.push(info);
        }
        const firstInfo = availableSampleInfos[0] || sampleInfos[0];
        const lhus = Array.from(lhuRowsMap.values());
        const paketBmOptions = await this.getPaketBmOptionsForSampleInfos(availableSampleInfos.length ? availableSampleInfos : sampleInfos);
        const details = [];
        const availableSamplePayloads = availableSampleInfos.map(mapSamplePayload);
        const allSamplePayloads = sampleInfos.map(mapSamplePayload);
        return {
            sample: mapSamplePayload(firstInfo),
            samples: availableSamplePayloads,
            sampels: availableSamplePayloads,
            pelanggan: mapPelangganPayload(firstInfo),
            request: mapRequestPayload(firstInfo),
            lhu: null,
            lhus,
            allSamples: allSamplePayloads,
            all_samples: allSamplePayloads,
            unavailableSamples: allSamplePayloads.filter((sample) => sample.nomor_lhu || sample.nomorLhu),
            unavailable_samples: allSamplePayloads.filter((sample) => sample.nomor_lhu || sample.nomorLhu),
            paketBmOptions,
            paket_bm_options: paketBmOptions,
            details,
            akreditasi: calculateAccreditationStats(details),
        };
    };
    previewFinalization = async (identifier, idPktBm, sampleNosInput = null) => {
        if (!idPktBm)
            throw new Error('Paket baku mutu wajib dipilih.');
        const sampleInfos = this.dedupeSampleInfos(await this.resolveSelectedSampleInfos(identifier, sampleNosInput));
        const bmInfo = await getBmInfo(idPktBm);
        this.validateSampleCompatibilityForLhu(sampleInfos, bmInfo);
        const details = await this.buildLhuPreviewDetails(sampleInfos, bmInfo);
        const sampleNos = this.normalizeSampleNoList(sampleInfos.map((sample) => sample.no_sampel));
        return {
            sample: sampleInfos[0],
            samples: sampleInfos,
            sampels: sampleInfos,
            sampleNos,
            sample_nos: sampleNos,
            paketBm: bmInfo.header,
            paket_bm: bmInfo.header,
            details,
            akreditasi: calculateAccreditationStats(details),
        };
    };
    finalizeLhu = async (identifier, payload, currentNik) => {
        const idPktBm = payload?.idPktBm || payload?.id_pkt_bm || null;
        const sampleNosInput = payload?.sampleNos ||
            payload?.sample_nos ||
            payload?.noSampelList ||
            payload?.no_sampel_list ||
            payload?.noSampel ||
            payload?.no_sampel ||
            null;
        const detailOrderInput = this.normalizeDetailOrderInput(payload?.detailOrder || payload?.detail_order || []);
        if (!idPktBm)
            throw new Error('Paket baku mutu wajib dipilih.');
        if (!currentNik)
            throw new Error('User Pengendalian Mutu tidak valid.');
        return sequelize.transaction(async (transaction) => {
            const sampleInfos = this.dedupeSampleInfos(await this.resolveSelectedSampleInfos(identifier, sampleNosInput, transaction));
            const bmInfo = await getBmInfo(idPktBm, transaction);
            this.validateSampleCompatibilityForLhu(sampleInfos, bmInfo);
            const details = applyDetailOrder(await this.buildLhuPreviewDetails(sampleInfos, bmInfo, transaction), detailOrderInput);
            const sampleNos = this.normalizeSampleNoList(sampleInfos.map((sample) => sample.no_sampel));
            const existingRows = [];
            for (const noSampel of sampleNos) {
                const existing = await getExistingLhuBySample(noSampel, transaction);
                if (existing)
                    existingRows.push(existing);
            }
            const locked = existingRows.find((row) => !isEditableByQcStatus(row.status_lhu));
            if (locked) {
                throw new Error(`Sampel sudah masuk LHU ${locked.nomor_lhu} yang sedang proses approval dan tidak dapat diubah QC.`);
            }
            const existingNomors = [...new Set(existingRows.map((row) => row.nomor_lhu).filter(Boolean))];
            if (existingNomors.length > 1) {
                throw new Error('Sampel pilihan sudah tersebar di beberapa draft LHU. Buka masing-masing draft atau batalkan salah satunya terlebih dahulu.');
            }
            const existing = existingRows[0] || null;
            let lhuInstance = existing
                ? await Lhu.findOne({ where: { nomor_lhu: existing.nomor_lhu }, transaction, lock: transaction.LOCK.UPDATE })
                : null;
            const nomorLhu = existing?.nomor_lhu || await generateDraftNomorLhu(Lhu, transaction);
            const firstSample = sampleInfos[0];
            const lhuPayload = {
                nomor_lhu: nomorLhu,
                id_registrasi: firstSample.id_registrasi,
                id_pkt_bm: idPktBm,
                tanggal_penerbitan: null,
                file_lhu_path: null,
                qc_by: currentNik,
                qc_at: new Date(),
                kalab_by: null,
                kalab_at: null,
                status_lhu: LHU_NEXT_STATUS.AFTER_QC_FINALIZE,
            };
            if (lhuInstance) {
                await lhuInstance.update(lhuPayload, { transaction });
            }
            else {
                lhuInstance = await Lhu.create(lhuPayload, { transaction });
            }
            await Sampel.update({ nomor_lhu: null }, {
                where: { nomor_lhu: nomorLhu },
                transaction,
            });
            await Sampel.update({ nomor_lhu: nomorLhu }, {
                where: { no_sampel: { [Op.in]: sampleNos } },
                transaction,
            });
            const orderedDetails = applyDetailOrder(details.map((row) => ({ ...row, nomor_lhu: nomorLhu })), detailOrderInput);
            const pdfResult = await lhuPdfService.generateDraftLhuPdf(nomorLhu, transaction, { detailOrder: orderedDetails });
            await lhuInstance.update({ file_lhu_path: pdfResult.filePath }, { transaction });
            await WorkflowLogService.logStatusTransition({
                entityType: 'LHU',
                entityId: nomorLhu,
                action: existing ? 'MEMPERBARUI_DRAFT_LHU' : 'MEMBUAT_DRAFT_LHU',
                statusBefore: existing?.status_lhu || null,
                statusAfter: LHU_NEXT_STATUS.AFTER_QC_FINALIZE,
                source: 'QC',
                note: existing ? 'Draft LHU multi-sampel diperbarui oleh QC.' : 'Draft LHU multi-sampel dibuat oleh QC.',
                actorNik: currentNik || null,
                transaction,
            });
            return {
                nomorLhu,
                nomor_lhu: nomorLhu,
                idRegistrasi: firstSample.id_registrasi,
                id_registrasi: firstSample.id_registrasi,
                sampleNos,
                sample_nos: sampleNos,
                statusLhu: LHU_NEXT_STATUS.AFTER_QC_FINALIZE,
                status_lhu: LHU_NEXT_STATUS.AFTER_QC_FINALIZE,
                idPktBm,
                id_pkt_bm: idPktBm,
                fileLhuPath: pdfResult.filePath,
                file_lhu_path: pdfResult.filePath,
                akreditasi: calculateAccreditationStats(orderedDetails),
            };
        });
    };
}
module.exports = new LhuFinalizationService();
module.exports.LhuFinalizationService = LhuFinalizationService;
