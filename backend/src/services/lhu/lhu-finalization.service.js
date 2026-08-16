const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../../config/database');
const lhuPdfService = require('./lhu-pdf.service');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { generateNomorLhu } = require('../../utils/id-generator');
const { Fppl, FpplSampel, Pelanggan, JadwalSampel, JenisSampel, RegBm, PktBm, Klasifikasi, PktBmParam, Parameter, Metode, ParameterMetode, FpplParameterMetode, Sampel, Lhu, } = require('../../models/Associations');
const { LHU_STATUS, LHU_EDITABLE_BY_QC_STATUSES, LHU_NEXT_STATUS, } = require('../../constants/lhu-status.constant');
const { calculateAccreditationStats, getPlain, pickObject, getLkaHasilTargetKey, getFallbackParameterKey, sortDetailRowsForLhu, applyDetailOrder, getExistingLhuBySample, getSampleInfo, getLkaResultRows, getExpectedParameterRows, getBmInfo, isEditableByQcStatus, mapSampleRequestData, mapPelangganRequestData, mapRequestRequestData, buildDefaultDetailRows, toTinyIntFlag, getSubkontrakSnapshot, } = require('./lhu-data.service');
const { findApprovedResultForExpectedParameter, mapDetailRow, } = require('./lhu-detail-row.mapper');
const { getApprovedLkaRowsForExpectedParameters, } = require('./lhu-approved-lka-rows.service');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');
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
    buildDetailOrderSnapshot = (rows = []) => (Array.isArray(rows) ? rows : [])
        .map((row, index) => {
            const data = toCamelCaseDeep(row || {});
            return {
                urutanLhu: index + 1,
                detailKey: data.detailKey || data.key || null,
                idFpplParameterMetode: data.idFpplParameterMetode || null,
                idMetodeParameter: data.idMetodeParameter || data.idParameterMetode || null,
                idParameter: data.idParameter || null,
                namaParameter: data.namaParameter || data.namaParameterSnapshot || null,
                namaMetode: data.namaMetode || data.metode || data.metodeSnapshot || null,
                acuanMetode: data.acuanMetode || data.acuanMetodeSnapshot || null,
            };
        });
    saveDetailOrderSnapshot = async ({ nomorLhu, rows, currentNik, transaction }) => {
        const lhuNo = String(nomorLhu || '').trim();
        if (!lhuNo)
            return null;
        const detailOrder = this.buildDetailOrderSnapshot(rows);
        if (!detailOrder.length)
            return null;
        return WorkflowLogService.logStatusTransition({
            entityType: 'LHU',
            entityId: lhuNo,
            action: 'MENYIMPAN_URUTAN_DETAIL_LHU',
            statusBefore: null,
            statusAfter: null,
            source: 'QC',
            note: JSON.stringify({ detailOrder }),
            actorNik: currentNik || null,
            transaction,
        });
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
        const fpplSampel = pickObject(sample, ['fpplSampel', 'fppl_sampel', 'FpplSampel']) || {};
        const fppl = pickObject(sample, ['fppl', 'Fppl']) || pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
        const jenis = pickObject(sample, ['jenisSampel', 'jenis_sampel', 'JenisSampel']) || pickObject(fpplSampel, ['jenisSampel', 'jenis_sampel', 'JenisSampel']) || {};
        const regBm = pickObject(sample, ['regBm', 'reg_bm', 'RegBm']) || pickObject(fpplSampel, ['regBm', 'reg_bm', 'RegBm']) || {};
        return {
            noSampel: sample.noSampel || sample.no_sampel,
            idRegistrasi: sample.idRegistrasi || sample.id_registrasi || fpplSampel.idRegistrasi || fpplSampel.id_registrasi || null,
            nomorFppl: fppl.nomorFppl || fppl.nomor_fppl || null,
            idJenisSampel: sample.idJenisSampel || sample.id_jenis_sampel || fpplSampel.idJenisSampel || fpplSampel.id_jenis_sampel || null,
            jenisSampel: jenis.jenisSampel || jenis.jenis_sampel || null,
            idRegBm: sample.idRegBm || sample.id_reg_bm || fpplSampel.idRegBm || fpplSampel.id_reg_bm || null,
            regBm: [regBm.instansi, regBm.refReg || regBm.ref_reg].filter(Boolean).join(' - '),
            tanggalPengambilanSampel: sample.tanggalPengambilanSampel || sample.tanggal_pengambilan || sample.tanggal_pengambilan_sampel || null,
            tanggalPenerimaan: sample.diterimaPada || sample.diterima_pada || null,
            abnormalitasSampel: sample.abnormalitasSampel || sample.abnormalitas_sampel || null,
            acuanPengambilanSampel: sample.acuanPengambilanSampel || sample.acuan_pengambilan_sampel || null,
            lokasiSpesifik: sample.lokasiSpesifik || sample.lokasi_spesifik || sample.lokasiPengambilanSampel || sample.lokasi_pengambilan_sampel || null,
            lokasiPengambilanSampel: sample.lokasiSpesifik || sample.lokasi_spesifik || sample.lokasiPengambilanSampel || sample.lokasi_pengambilan_sampel || null,
            koordinat: sample.koordinat || null,
            totalParameter: readiness.totalParameter || 0,
            totalSelesai: readiness.totalSelesai || 0,
            siapQc: Boolean(readiness.ready),
            nomorLhu: existing?.nomor_lhu || null,
            statusLhu: existing?.status_lhu || LHU_STATUS.WAIT_QC,
            idPktBm: existing?.id_pkt_bm || null,
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
                total_parameter: 0,
                totalSelesai: 0,
                total_selesai: 0,
                totalBelumDisetujuiKasi: 0,
                total_belum_disetujui_kasi: 0,
                ready: false,
            };
        }

        // Sumber paling valid untuk antrean QC adalah baris hasil yang benar-benar
        // sudah terbentuk di lka_hasil. Query sebelumnya membandingkan ke
        // sampel_parameter + penugasan_detail sehingga bisa gagal ketika id_metode_parameter
        // dipakai ulang lintas permohonan atau status induk LKA tidak sinkron.
        const [summary = {}] = await sequelize.query(`
            SELECT
                COUNT(*) AS totalParameter,
                SUM(CASE
                    WHEN status_review_hasil = 'Disetujui Kasi Pengujian'
                     AND TRIM(COALESCE(hasil, '')) <> ''
                    THEN 1
                    ELSE 0
                END) AS totalSelesai
            FROM lka_hasil
            WHERE no_sampel = :sampleNo
        `, {
            replacements: { sampleNo },
            type: QueryTypes.SELECT,
            transaction,
        });

        const totalParameter = Number(summary.totalParameter || summary.total_parameter || 0);
        const totalSelesai = Number(summary.totalSelesai || summary.total_selesai || 0);
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
            const readiness = await this.getSampleQcReadiness(sample.no_sampel || sample.noSampel, transaction);
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
        const firstFpplSampel = pickObject(firstSample, ['fpplSampel', 'fppl_sampel', 'FpplSampel']) || {};
        const firstFppl = pickObject(firstSample, ['fppl', 'Fppl']) || pickObject(firstFpplSampel, ['fppl', 'Fppl']) || {};
        const firstPelanggan = pickObject(firstFppl, ['pelanggan', 'Pelanggan']) || {};
        const firstJenis = pickObject(firstSample, ['jenisSampel', 'jenis_sampel', 'JenisSampel']) || pickObject(firstFpplSampel, ['jenisSampel', 'jenis_sampel', 'JenisSampel']) || {};
        const firstRegBm = pickObject(firstSample, ['regBm', 'reg_bm', 'RegBm']) || pickObject(firstFpplSampel, ['regBm', 'reg_bm', 'RegBm']) || {};
        const firstIdRegistrasi = firstSample.idRegistrasi || firstSample.id_registrasi || firstFpplSampel.idRegistrasi || firstFpplSampel.id_registrasi || null;
        const firstIdJenisSampel = firstSample.idJenisSampel || firstSample.id_jenis_sampel || firstFpplSampel.idJenisSampel || firstFpplSampel.id_jenis_sampel || null;
        const firstIdRegBm = firstSample.idRegBm || firstSample.id_reg_bm || firstFpplSampel.idRegBm || firstFpplSampel.id_reg_bm || null;
        const sampleRows = [];
        let totalParameter = 0;
        let totalSelesai = 0;
        let lockedSamples = 0;
        for (const sample of uniqueSamples) {
            const sampleNo = sample.no_sampel || sample.noSampel;
            const readiness = await this.getSampleQcReadiness(sampleNo, transaction);
            const existing = await getExistingLhuBySample(sampleNo, transaction);
            totalParameter += readiness.totalParameter;
            totalSelesai += readiness.totalSelesai;
            if (existing && !isEditableByQcStatus(existing.status_lhu)) {
                lockedSamples += 1;
            }
            sampleRows.push(this.mapQcSampleRowFromPlain(sample, readiness, existing));
        }
        // Permohonan baru boleh muncul di QC kalau SELURUH sampel dalam FPPL sudah lengkap
        // dan semua parameter tiap sampel sudah berstatus Disetujui Kasi Pengujian.
        const allReady = sampleRows.length > 0 && sampleRows.every((sample) => sample.siapQc);
        if (!allReady)
            return null;
        const readySampleRows = sampleRows.filter((sample) => sample.siapQc);
        const availableSampleRows = sampleRows.filter((sample) => !sample.nomorLhu || isEditableByQcStatus(sample.statusLhu));
        // Kalau semua sampel sudah pernah dimasukkan ke LHU, permohonan tidak perlu masuk antrean finalisasi baru.
        if (availableSampleRows.length === 0 || lockedSamples >= sampleRows.length)
            return null;
        const unassignedSamples = availableSampleRows;
        const jenisLabels = [...new Set(sampleRows.map((sample) => sample.jenisSampel).filter(Boolean))];
        return {
            idRegistrasi: firstIdRegistrasi,
            nomorFppl: firstFppl.nomorFppl || firstFppl.nomor_fppl || null,
            namaPelanggan: firstPelanggan.namaInstansi || firstPelanggan.nama_instansi || null,
            jenisSampel: jenisLabels.join(', ') || firstJenis.jenisSampel || firstJenis.jenis_sampel || null,
            idJenisSampel: firstIdJenisSampel,
            idRegBm: firstIdRegBm,
            regBm: [firstRegBm.instansi, firstRegBm.refReg || firstRegBm.ref_reg].filter(Boolean).join(' - '),
            totalSampel: sampleRows.length,
            totalSampelSiap: readySampleRows.length,
            totalParameter,
            totalSelesai,
            sampleNos: this.normalizeSampleNoList(unassignedSamples.map((sample) => sample.noSampel)),
            samples: availableSampleRows,
            allSamples: sampleRows,
            defaultSampleNos: this.normalizeSampleNoList(unassignedSamples.map((sample) => sample.noSampel)),
            statusLhu: LHU_STATUS.WAIT_QC,
            statusQcLabel: unassignedSamples.length === sampleRows.length ? 'Semua sampel menunggu QC' : 'Sebagian sampel sudah dibuat LHU',
            totalBelumDisetujuiKasi: 0,
            statusReviewHasil: 'Disetujui Kasi Pengujian',
        };
    };
    getFinalizationQueue = async () => {
        const sampleInstances = await Sampel.findAll({
            include: [
                { model: JenisSampel, as: 'jenis_sampel', required: false },
                { model: RegBm, as: 'reg_bm', required: false },
                {
                    model: Fppl,
                    as: 'fppl',
                    required: true,
                    include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
                },
            ],
            order: [['id_registrasi', 'ASC'], ['no_sampel', 'ASC']],
        });
        const grouped = new Map();
        sampleInstances.map(getPlain).forEach((sample) => {
            const idRegistrasi = sample.idRegistrasi || sample.id_registrasi;
            const noSampel = sample.noSampel || sample.no_sampel;
            if (!idRegistrasi) {
                console.debug('[QC-Queue] Sampel tanpa idRegistrasi dilewati:', noSampel);
                return;
            }
            if (!grouped.has(idRegistrasi))
                grouped.set(idRegistrasi, []);
            grouped.get(idRegistrasi).push(sample);
        });
        console.debug('[QC-Queue] Jumlah id_registrasi kandidat:', grouped.size);
        const rows = [];
        for (const [idRegistrasi, samples] of grouped.entries()) {
            console.debug(`[QC-Queue] Memproses ${idRegistrasi} (${samples.length} sampel)...`);
            const row = await this.buildQcRegistrationQueueRow(samples);
            if (row) {
                rows.push(row);
                console.debug(`[QC-Queue] ${idRegistrasi} MASUK antrean. totalParameter=${row.totalParameter}, totalSelesai=${row.totalSelesai}`);
            } else {
                // Debug per sampel untuk mengetahui alasan sampel tidak masuk
                for (const sample of samples) {
                    const sampleNo = sample.noSampel || sample.no_sampel;
                    const readiness = await this.getSampleQcReadiness(sampleNo);
                    console.debug(`[QC-Queue] ${idRegistrasi}/${sampleNo}: totalParameter=${readiness.totalParameter}, totalSelesai=${readiness.totalSelesai}, ready=${readiness.ready}, nomorLhu=${sample.nomorLhu || sample.nomor_lhu || '-'}`);
                }
            }
        }
        return rows.sort((a, b) => String(b.idRegistrasi || '').localeCompare(String(a.idRegistrasi || '')));
    };
    getPaketBmOptions = async (identifier) => {
        const samples = await this.getSamplesForRegistration(identifier);
        const firstSampleNo = samples[0]?.noSampel || samples[0]?.no_sampel || null;
        const sample = firstSampleNo ? await getSampleInfo(firstSampleNo) : await getSampleInfo(identifier);
        const rows = await PktBm.findAll({
            where: {
                id_jenis_sampel: sample.idJenisSampel,
                id_reg_bm: sample.idRegBm,
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
                idPktBm: row.id_pkt_bm,
                idRegBm: row.id_reg_bm,
                idJenisSampel: row.id_jenis_sampel,
                klasifikasi: row.klasifikasi,
                namaPkt: row.nama_pkt,
                teksLhu: row.teks_lhu,
                instansi: regBm.instansi,
                refReg: regBm.ref_reg,
            };
        });
    };
    getPaketBmOptionsForSampleInfos = async (sampleInfos = [], transaction = null) => {
        const optionMap = new Map();
        for (const sample of Array.isArray(sampleInfos) ? sampleInfos : []) {
            const idJenisSampel = sample?.idJenisSampel || sample?.id_jenis_sampel || null;
            const idRegBm = sample?.idRegBm || sample?.id_reg_bm || null;
            console.debug('[PaketBM] Sample:', sample?.noSampel || sample?.no_sampel, '| idJenisSampel:', idJenisSampel, '| idRegBm:', idRegBm);
            if (!idJenisSampel || !idRegBm) {
                console.debug('[PaketBM] Dilewati - idJenisSampel atau idRegBm kosong');
                continue;
            }
            const rows = await PktBm.findAll({
                where: {
                    id_jenis_sampel: idJenisSampel,
                    id_reg_bm: idRegBm,
                },
                include: [
                    { model: RegBm, required: false },
                    { model: JenisSampel, required: false },
                    { model: Klasifikasi, required: false },
                ],
                order: [['id_klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
                transaction,
            });
            console.debug('[PaketBM] Ditemukan', rows.length, 'baris pkt_bm untuk idJenisSampel=', idJenisSampel, 'idRegBm=', idRegBm);
            // getPlain sudah toCamelCaseDeep → pakai camelCase key
            rows.map((item) => withPaketBmDisplayFields(getPlain(item))).forEach((row) => {
                const pktId = row?.idPktBm || row?.id_pkt_bm;
                if (!pktId || optionMap.has(pktId))
                    return;
                const regBm = pickObject(row, ['regBm', 'reg_bm', 'RegBm']) || {};
                optionMap.set(pktId, {
                    idPktBm: pktId,
                    idRegBm: row.idRegBm || row.id_reg_bm,
                    idJenisSampel: row.idJenisSampel || row.id_jenis_sampel,
                    klasifikasi: row.klasifikasi,
                    namaPkt: row.namaPkt || row.nama_pkt,
                    teksLhu: row.teksLhu || row.teks_lhu,
                    instansi: regBm.instansi,
                    refReg: regBm.refReg || regBm.ref_reg,
                });
            });
        }
        const result = Array.from(optionMap.values()).sort((a, b) =>
            String(a.klasifikasi || '').localeCompare(String(b.klasifikasi || '')) ||
            String(a.namaPkt || '').localeCompare(String(b.namaPkt || ''))
        );
        console.debug('[PaketBM] Total opsi dikembalikan:', result.length);
        return result;
    };
    resolveSelectedSampleInfos = async (identifier, sampleNosInput = null, transaction = null) => {
        const registrationReadiness = await this.assertFullRegistrationReadyForQc(identifier, transaction);
        const allSamples = registrationReadiness.samples;
        const requestedNos = this.normalizeSampleNoList(sampleNosInput);
        const sampleMap = new Map(allSamples
            .map((sample) => [String(sample.no_sampel || sample.noSampel || '').trim(), sample])
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
            const sampleNo = sample.no_sampel || sample.noSampel;
            const existing = await getExistingLhuBySample(sampleNo, transaction);
            if (existing?.nomor_lhu && !isEditableByQcStatus(existing.status_lhu)) {
                throw new Error(`Sampel ${sample.noSampel} sudah masuk ke LHU ${existing.nomor_lhu} yang sedang proses approval atau sudah disahkan.`);
            }
            infos.push(await getSampleInfo(sample.noSampel, transaction));
        }
        return this.dedupeSampleInfos(infos);
    };
    validateSampleCompatibilityForLhu = (sampleInfos = [], bmInfo = null) => {
        if (!sampleInfos.length)
            throw new Error('Daftar sampel untuk LHU wajib dipilih.');
        const first = sampleInfos[0];
        sampleInfos.forEach((sample) => {
            if (sample.idRegistrasi !== first.idRegistrasi) {
                throw new Error('Semua sampel dalam satu LHU harus berasal dari permohonan yang sama.');
            }
            if (sample.idJenisSampel !== first.idJenisSampel || sample.idRegBm !== first.idRegBm) {
                throw new Error('Semua sampel dalam satu LHU harus memiliki jenis sampel dan regulasi baku mutu yang sama.');
            }
        });
        if (bmInfo && (
            bmInfo.header.id_jenis_sampel !== (first.id_jenis_sampel || first.idJenisSampel) ||
            bmInfo.header.id_reg_bm !== (first.id_reg_bm || first.idRegBm)
        )) {
            throw new Error('Paket baku mutu tidak sesuai dengan jenis sampel/regulasi baku mutu sampel.');
        }
    };
    buildLhuPreviewDetails = async (sampleInfos = [], bmInfo, transaction = null) => {
        const grouped = new Map();
        const selectedSampleInfos = this.dedupeSampleInfos(sampleInfos);
        for (const sample of selectedSampleInfos) {
            const lkaRows = await getApprovedLkaRowsForExpectedParameters(sample.noSampel || sample.no_sampel, transaction);
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
                        resultsBySample: {},
                        kode_lka_by_sample: {},
                        kodeLkaBySample: {},
                    });
                }
                const group = grouped.get(key);
                const noSampel = String(row.no_sampel || '').trim();
                group.resultsBySample[noSampel] = row.hasil || null;
                group.kode_lka_by_sample[noSampel] = row.kode_lka || null;
                group.kodeLkaBySample[noSampel] = row.kode_lka || null;
                this.pushSampleNoOnce(group, noSampel);
                // Untuk validasi lama dan tampilan ringkas, hasil disimpan sebagai daftar per sampel.
                group.hasil = group.samples.map((sampleNo) => `${sampleNo}: ${group.resultsBySample[sampleNo] || '-'}`).join('\n');
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
            const { __sampleNoKeySet, ...requestData } = row;
            return requestData;
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
            const sampleNo = sample.no_sampel || sample.noSampel;
            const info = await getSampleInfo(sampleNo);
            const existing = await getExistingLhuBySample(sampleNo);
            if (existing) {
                lhuRowsMap.set(existing.nomor_lhu, existing);
                info.nomorLhu = existing.nomor_lhu;
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
        const availableSampleRequestDatas = availableSampleInfos.map(mapSampleRequestData);
        const allSampleRequestDatas = sampleInfos.map(mapSampleRequestData);
        return {
            sample: mapSampleRequestData(firstInfo),
            samples: availableSampleRequestDatas,
            sampels: availableSampleRequestDatas,
            pelanggan: mapPelangganRequestData(firstInfo),
            request: mapRequestRequestData(firstInfo),
            lhu: null,
            lhus,
            allSamples: allSampleRequestDatas,
            all_samples: allSampleRequestDatas,
            unavailableSamples: allSampleRequestDatas.filter((sample) => sample.nomor_lhu || sample.nomorLhu),
            unavailable_samples: allSampleRequestDatas.filter((sample) => sample.nomor_lhu || sample.nomorLhu),
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
    finalizeLhu = async (identifier, requestData, currentNik) => {
        const idPktBm = requestData?.idPktBm || requestData?.id_pkt_bm || null;
        const sampleNosInput = requestData?.sampleNos ||
            requestData?.sample_nos ||
            requestData?.noSampelList ||
            requestData?.no_sampel_list ||
            requestData?.noSampel ||
            requestData?.no_sampel ||
            null;
        const detailOrderInput = this.normalizeDetailOrderInput(requestData?.detailOrder || requestData?.detail_order || []);
        if (!idPktBm)
            throw new Error('Paket baku mutu wajib dipilih.');
        if (!currentNik)
            throw new Error('User Pengendalian Mutu tidak valid.');
        return sequelize.transaction(async (transaction) => {
            const sampleInfos = this.dedupeSampleInfos(await this.resolveSelectedSampleInfos(identifier, sampleNosInput, transaction));
            const bmInfo = await getBmInfo(idPktBm, transaction);
            this.validateSampleCompatibilityForLhu(sampleInfos, bmInfo);
            const details = applyDetailOrder(await this.buildLhuPreviewDetails(sampleInfos, bmInfo, transaction), detailOrderInput);
            const sampleNos = this.normalizeSampleNoList(sampleInfos.map((sample) => sample.noSampel || sample.no_sampel));
            const existingRows = [];
            for (const noSampel of sampleNos) {
                const existing = await getExistingLhuBySample(noSampel, transaction);
                if (existing)
                    existingRows.push(existing);
            }
            const locked = existingRows.find((row) => !isEditableByQcStatus(row.status_lhu));
            if (locked) {
                throw new Error(`Sampel sudah masuk LHU ${locked.nomor_lhu} yang sudah final dan tidak dapat diubah QC.`);
            }
            const existingNomors = [...new Set(existingRows.map((row) => row.nomor_lhu).filter(Boolean))];
            if (existingNomors.length > 1) {
                throw new Error('Sampel pilihan sudah tersebar di beberapa draft LHU. Buka masing-masing draft atau batalkan salah satunya terlebih dahulu.');
            }
            const existing = existingRows[0] || null;
            let lhuInstance = existing
                ? await Lhu.findOne({ where: { nomor_lhu: existing.nomor_lhu }, transaction, lock: transaction.LOCK.UPDATE })
                : null;
            const issuedAt = new Date();
            const oldNomorLhu = existing?.nomor_lhu || null;
            const nomorLhu = await generateNomorLhu(Lhu, transaction, issuedAt);
            const duplicate = await Lhu.findOne({
                where: { nomor_lhu: nomorLhu },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (duplicate && duplicate.nomor_lhu !== oldNomorLhu) {
                throw new Error(`Nomor LHU resmi ${nomorLhu} sudah digunakan. Silakan ulangi finalisasi.`);
            }
            const firstSample = sampleInfos[0];
            const lhuRequestData = {
                nomor_lhu: nomorLhu,
                id_registrasi: firstSample.id_registrasi || firstSample.idRegistrasi,
                id_pkt_bm: idPktBm,
                tanggal_penerbitan: issuedAt,
                file_lhu_path: null,
                qc_by: currentNik,
                qc_at: issuedAt,
                                                status_lhu: LHU_NEXT_STATUS.AFTER_QC_FINALIZE,
            };
            if (lhuInstance) {
                await Lhu.update(lhuRequestData, { where: { nomor_lhu: oldNomorLhu }, transaction });
                lhuInstance = await Lhu.findOne({ where: { nomor_lhu: nomorLhu }, transaction, lock: transaction.LOCK.UPDATE });
            }
            else {
                lhuInstance = await Lhu.create(lhuRequestData, { transaction });
            }
            await Sampel.update({ nomor_lhu: null }, {
                where: { nomor_lhu: oldNomorLhu || nomorLhu },
                transaction,
            });
            await Sampel.update({ nomor_lhu: nomorLhu }, {
                where: { no_sampel: { [Op.in]: sampleNos } },
                transaction,
            });
            const orderedDetails = applyDetailOrder(details.map((row) => ({ ...row, nomor_lhu: nomorLhu, nomorLhu })), detailOrderInput);
            await this.saveDetailOrderSnapshot({ nomorLhu, rows: orderedDetails, currentNik, transaction });
            const pdfResult = await lhuPdfService.generateFinalLhuPdf(nomorLhu, transaction, { detailOrder: orderedDetails });
            await lhuInstance.update({ file_lhu_path: pdfResult.filePath }, { transaction });
            await WorkflowLogService.logStatusTransition({
                entityType: 'LHU',
                entityId: nomorLhu,
                action: existing ? 'MEMPERBARUI_LHU_FINAL' : 'MEMBUAT_LHU_FINAL',
                statusBefore: existing?.status_lhu || null,
                statusAfter: LHU_NEXT_STATUS.AFTER_QC_FINALIZE,
                source: 'QC',
                note: existing
                    ? `LHU ${oldNomorLhu || ''} diperbarui dan langsung disahkan oleh QC.`.trim()
                    : 'LHU multi-sampel dibuat dan langsung disahkan oleh QC.',
                actorNik: currentNik || null,
                transaction,
            });
            return {
                nomorLhu,
                idRegistrasi: firstSample.id_registrasi || firstSample.idRegistrasi,
                sampleNos,
                statusLhu: LHU_NEXT_STATUS.AFTER_QC_FINALIZE,
                idPktBm,
                fileLhuPath: pdfResult.filePath,
                akreditasi: calculateAccreditationStats(orderedDetails),
            };
        });
    };
}
module.exports = new LhuFinalizationService();
module.exports.LhuFinalizationService = LhuFinalizationService;
