const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { User, Fppl, FpplSampel, RegBm, PktBm, PktBmParam, JenisSampel, Parameter, Metode, ParameterMetode, FpplParameterMetode, Penugasan, PenugasanDetail, PenugasanItem, Sampel, Lhu, Lka, LkaHasil, LkaRevisi, JadwalSampel, } = require('../../models/Associations');
const { SAMPLE_REVIEW_STATUS, SAMPLE_REVIEW_KASI_QUEUE_STATUSES, } = require('../../constants/lhu-status.constant');
const { LKA_HASIL_STATUS, } = require('./assignment.constants');
const { prefixRevisionNote, stripRevisionNotePrefix, buildLkaHasilRevisionResponse, collectRevisionNotesForSample, getLkaHasilKey, lkaHasilWhereFromKey, lkaHasilWhereFromKeys, normalizeKasiRevisionItems, } = require('./assignment-revision.helper');
const { resolveLkaHasilStatus, normalizeLegacyLkaHasilStatuses, syncLkaAggregateStatus, syncDetailStatusFromLka, } = require('./assignment-status.helper');
const { assertSamplesEditableBeforeLhu, } = require('./assignment-lhu-lock.helper');
const { getPlain, pickObject, pickArray, normalizeIdList, } = require('./assignment-object.helper');
const { parseWorksheetFiles, getPrimaryWorksheetPath, } = require('./assignment-worksheet-files.helper');
const { getDetailParameterInfo, } = require('./assignment-monitor.mapper');
const { isSubkontrakAssignment, } = require('./assignment-scope.helper');
const { getActiveJadwalFromFppl, getAssociatedFpmsFromSample, toTinyInt, isSubkontrakFpm, } = require('./assignment-fpm.helper');
const { loadRevisionRowsForLka, markRevisionItemsApprovedByKasi, } = require('./assignment-worksheet.service');
const { createLkaRevisionLog, groupRevisionRowsByLka, } = require('./assignment-kasi-revision-log.service');
const { countKasiReviewCompletion, findKasiReviewSample, getCompletedKasiResultRowsFromSample, getKasiReviewResultRows, getKasiReviewSampleHeader, mapKasiReviewSampleHeader, } = require('./assignment-kasi-review-query.service');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
class AssignmentKasiReviewService {
getKasiReviewQueue = async () => {
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
                            required: false,
                            include: [{ model: JadwalSampel, as: 'jadwal_sampels', required: false }],
                        },
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
        const mappedRows = [];
        for (const sampleInstance of sampleInstances) {
            const sample = getPlain(sampleInstance);
            const { totalParameter, totalSelesai, completedRows } = await countKasiReviewCompletion(sample);
            if (totalParameter <= 0 || totalSelesai !== totalParameter) {
                continue;
            }
            const alreadyApprovedByKasi = (completedRows || []).length === totalParameter &&
                (completedRows || []).every((row) => row.statusReviewHasil === LKA_HASIL_STATUS.APPROVED_KASI ||
                    row.statusReviewHasil === SAMPLE_REVIEW_STATUS.APPROVED_KASI_PENGUJIAN);
            if (alreadyApprovedByKasi) {
                continue;
            }
            const hasRowsReadyForKasi = (completedRows || []).some((row) => [
                LKA_HASIL_STATUS.APPROVED_PENYELIA,
                LKA_HASIL_STATUS.WAIT_KASI,
                LKA_HASIL_STATUS.WAIT_PENYELIA_KASI,
                SAMPLE_REVIEW_STATUS.WAIT_KASI_PENGUJIAN,
                SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN,
            ].includes(row.statusReviewHasil));
            if (!hasRowsReadyForKasi) {
                continue;
            }
            const derivedQueueStatus = (completedRows || []).some((row) => row.statusReviewHasil === SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN)
                ? SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN
                : SAMPLE_REVIEW_STATUS.WAIT_KASI_PENGUJIAN;
            const sampleHeader = mapKasiReviewSampleHeader({
                ...sample,
                statusReviewHasil: derivedQueueStatus,
            });
            mappedRows.push({
                noSampel: sampleHeader.noSampel,
                no_sampel: sampleHeader.no_sampel,
                idRegistrasi: sampleHeader.idRegistrasi,
                id_registrasi: sampleHeader.id_registrasi,
                nomorFppl: sampleHeader.nomorFppl,
                nomor_fppl: sampleHeader.nomor_fppl,
                idJenisSampel: sampleHeader.idJenisSampel,
                id_jenis_sampel: sampleHeader.id_jenis_sampel,
                idRegBm: sampleHeader.idRegBm,
                id_reg_bm: sampleHeader.id_reg_bm,
                jenisSampel: sampleHeader.jenisSampel,
                jenis_sampel: sampleHeader.jenis_sampel,
                tanggalPengambilanSampel: sampleHeader.tanggalPengambilanSampel,
                tanggal_pengambilan_sampel: sampleHeader.tanggal_pengambilan_sampel,
                tanggalSampling: sampleHeader.tanggalSampling,
                tanggal_sampling: sampleHeader.tanggal_sampling,
                tanggalPenerimaan: sampleHeader.tanggalPenerimaan,
                tanggal_penerimaan: sampleHeader.tanggal_penerimaan,
                acuanPengambilanSampel: sampleHeader.acuanPengambilanSampel,
                acuan_pengambilan_sampel: sampleHeader.acuan_pengambilan_sampel,
                abnormalitasSampel: sampleHeader.abnormalitasSampel,
                abnormalitas_sampel: sampleHeader.abnormalitas_sampel,
                totalParameter,
                total_parameter: totalParameter,
                totalSelesai,
                total_selesai: totalSelesai,
                statusReviewHasil: sampleHeader.statusReviewHasil,
                status_review_hasil: sampleHeader.statusReviewHasil,
                kasiPengujianReviewBy: sampleHeader.kasiPengujianReviewBy,
                kasi_pengujian_review_by: sampleHeader.kasiPengujianReviewBy,
                kasiPengujianReviewAt: sampleHeader.kasiPengujianReviewAt,
                kasi_pengujian_review_at: sampleHeader.kasiPengujianReviewAt,
            });
        }
        return mappedRows.sort((a, b) => String(b.idRegistrasi || '').localeCompare(String(a.idRegistrasi || '')) ||
            String(a.noSampel || '').localeCompare(String(b.noSampel || '')));
    };
    getKasiReviewHistory = async () => {
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
                            required: false,
                            include: [{ model: JadwalSampel, as: 'jadwal_sampels', required: false }],
                        },
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
                {
                    model: Lhu,
                    as: 'lhu',
                    required: false,
                    include: [{ model: PktBm, required: false, include: [{ model: RegBm, required: false }, { model: JenisSampel, required: false }] }],
                },
            ],
            // statusReviewHasil dan kasiPengujianReviewAt bukan kolom tabel sampel.
            // Keduanya berasal dari lka_hasil/alur review, sehingga filter dan sorting
            // dilakukan setelah data hasil LKA dibaca melalui model LkaHasil.
            order: [['no_sampel', 'ASC']],
        });
        const rows = [];
        for (const sampleInstance of sampleInstances) {
            const sample = getPlain(sampleInstance);
            const resultRows = await getCompletedKasiResultRowsFromSample(sample);
            const totalParameter = getAssociatedFpmsFromSample(sample).length;
            if (totalParameter <= 0)
                continue;
            const approvedKasiRows = resultRows.filter((row) => row.statusReviewHasil === SAMPLE_REVIEW_STATUS.APPROVED_KASI_PENGUJIAN ||
                row.statusReviewHasil === LKA_HASIL_STATUS.APPROVED_KASI);
            if (approvedKasiRows.length !== totalParameter)
                continue;
            const sampleHeader = mapKasiReviewSampleHeader({
                ...sample,
                statusReviewHasil: SAMPLE_REVIEW_STATUS.APPROVED_KASI_PENGUJIAN,
                kasiPengujianReviewAt: sample.kasiPengujianReviewAt ||
                    approvedKasiRows
                        .map((row) => row.tanggal_selesai_pengujian || row.tanggal_mulai_pengujian)
                        .filter(Boolean)
                        .sort()
                        .slice(-1)[0] ||
                    null,
            });
            const lhu = pickObject(sample, ['lhu', 'Lhu', 'LHU']) || {};
            const pktBm = withPaketBmDisplayFields(pickObject(lhu, ['pkt_bm', 'PktBm']) || {});
            rows.push({
                noSampel: sampleHeader.noSampel,
                no_sampel: sampleHeader.no_sampel,
                idRegistrasi: sampleHeader.idRegistrasi,
                id_registrasi: sampleHeader.id_registrasi,
                nomorFppl: sampleHeader.nomorFppl ||
                    sampleHeader.nomor_fppl ||
                    pickObject(pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {}, ['fppl', 'Fppl'])?.nomor_fppl ||
                    null,
                nomor_fppl: sampleHeader.nomor_fppl ||
                    sampleHeader.nomorFppl ||
                    pickObject(pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {}, ['fppl', 'Fppl'])?.nomor_fppl ||
                    null,
                idJenisSampel: sampleHeader.idJenisSampel,
                id_jenis_sampel: sampleHeader.id_jenis_sampel,
                idRegBm: sampleHeader.idRegBm,
                id_reg_bm: sampleHeader.id_reg_bm,
                jenisSampel: sampleHeader.jenisSampel,
                jenis_sampel: sampleHeader.jenis_sampel,
                regBm: sampleHeader.regBm,
                reg_bm: sampleHeader.reg_bm,
                standar: sampleHeader.standar,
                tanggalPengambilanSampel: sampleHeader.tanggalPengambilanSampel,
                tanggal_pengambilan_sampel: sampleHeader.tanggal_pengambilan_sampel,
                tanggalPenerimaan: sampleHeader.tanggalPenerimaan,
                tanggal_penerimaan: sampleHeader.tanggal_penerimaan,
                acuanPengambilanSampel: sampleHeader.acuanPengambilanSampel,
                acuan_pengambilan_sampel: sampleHeader.acuan_pengambilan_sampel,
                abnormalitasSampel: sampleHeader.abnormalitasSampel,
                abnormalitas_sampel: sampleHeader.abnormalitas_sampel,
                totalParameter,
                total_parameter: totalParameter,
                totalSelesai: approvedKasiRows.length,
                total_selesai: approvedKasiRows.length,
                statusReviewHasil: SAMPLE_REVIEW_STATUS.APPROVED_KASI_PENGUJIAN,
                status_review_hasil: SAMPLE_REVIEW_STATUS.APPROVED_KASI_PENGUJIAN,
                kasiPengujianReviewBy: sampleHeader.kasiPengujianReviewBy,
                kasi_pengujian_review_by: sampleHeader.kasiPengujianReviewBy,
                kasiPengujianReviewAt: sampleHeader.kasiPengujianReviewAt,
                kasi_pengujian_review_at: sampleHeader.kasiPengujianReviewAt,
                nomorLhu: lhu.nomor_lhu || null,
                nomor_lhu: lhu.nomor_lhu || null,
                statusLhu: lhu.status_lhu || null,
                status_lhu: lhu.status_lhu || null,
                tanggalPenerbitan: lhu.tanggal_penerbitan || null,
                tanggal_penerbitan: lhu.tanggal_penerbitan || null,
                fileLhuPath: lhu.file_lhu_path || null,
                file_lhu_path: lhu.file_lhu_path || null,
                namaPkt: pktBm.nama_pkt || null,
                nama_pkt: pktBm.nama_pkt || null,
            });
        }
        return rows.sort((a, b) => String(b.kasiPengujianReviewAt || '').localeCompare(String(a.kasiPengujianReviewAt || '')) ||
            String(a.no_sampel || '').localeCompare(String(b.no_sampel || '')));
    };
    getKasiReviewDetail = async (noSampel) => {
        const sampleNo = String(noSampel || '').trim();
        if (!sampleNo) {
            throw new Error('Nomor sampel wajib dikirim.');
        }
        const sampleInstance = await findKasiReviewSample(sampleNo);
        if (!sampleInstance) {
            throw new Error('Sampel tidak ditemukan.');
        }
        const samplePlain = getPlain(sampleInstance);
        const sample = mapKasiReviewSampleHeader(samplePlain);
        const results = await getCompletedKasiResultRowsFromSample(samplePlain);
        if (!results.length) {
            throw new Error('Belum ada hasil LKA yang sudah disetujui Penyelia untuk sampel ini.');
        }
        return {
            sample,
            results: results.map((row) => ({
                kodeLka: row.kode_lka,
                kode_lka: row.kode_lka,
                noSampel: row.no_sampel,
                no_sampel: row.no_sampel,
                hasil: row.hasil,
                satuanBm: row.satuan_bm || null,
                satuan_bm: row.satuan_bm || null,
                nilaiBm: row.nilai_bm || null,
                nilai_bm: row.nilai_bm || null,
                catatanHasil: row.catatan_hasil || '-',
                catatan_hasil: row.catatan_hasil || '-',
                statusReviewHasil: row.statusReviewHasil || null,
                status_review_hasil: row.statusReviewHasil || null,
                ...buildLkaHasilRevisionResponse(row),
                statusLka: row.status_lka,
                status_lka: row.status_lka,
                tanggalMulaiPengujian: row.tanggal_mulai_pengujian,
                tanggal_mulai_pengujian: row.tanggal_mulai_pengujian,
                tanggalSelesaiPengujian: row.tanggal_selesai_pengujian,
                tanggal_selesai_pengujian: row.tanggal_selesai_pengujian,
                fileWorksheetPath: row.file_worksheet_path || null,
                file_worksheet_path: row.file_worksheet_path || null,
                worksheetFiles: row.worksheetFiles || row.worksheet_files || [],
                worksheet_files: row.worksheet_files || row.worksheetFiles || [],
                idPenugasanDetail: row.id_penugasan_detail,
                id_penugasan_detail: row.id_penugasan_detail,
                idFpplParameterMetode: row.id_fppl_parameter_metode,
                id_fppl_parameter_metode: row.id_fppl_parameter_metode,
                idParameter: row.id_parameter,
                id_parameter: row.id_parameter,
                namaParameter: row.nama_parameter,
                nama_parameter: row.nama_parameter,
                kategoriParameter: row.kategori_parameter,
                kategori_parameter: row.kategori_parameter,
                idMetodeParameter: row.id_metode_parameter,
                id_metode_parameter: row.id_metode_parameter,
                namaMetode: row.nama_metode,
                nama_metode: row.nama_metode,
                acuanMetode: row.acuan_metode,
                acuan_metode: row.acuan_metode,
                isTerakreditasi: Number(row.is_terakreditasi || 0),
                is_terakreditasi: Number(row.is_terakreditasi || 0),
                statusKemampuanLab: row.status_kemampuan_lab || null,
                status_kemampuan_lab: row.status_kemampuan_lab || null,
                isSubkontrak: Number(row.is_subkontrak || row.isSubkontrak || 0),
                is_subkontrak: Number(row.is_subkontrak || row.isSubkontrak || 0),
                isInsitu: Number(row.is_insitu || row.isInsitu || 0),
                is_insitu: Number(row.is_insitu || row.isInsitu || 0),
                catatanKemampuan: row.catatan_kemampuan || null,
                catatan_kemampuan: row.catatan_kemampuan || null,
                abnormalitasSampel: sample.abnormalitasSampel || '-',
                abnormalitas_sampel: sample.abnormalitas_sampel || '-',
                acuanPengambilanSampel: sample.acuanPengambilanSampel || '-',
                acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || '-',
                tanggalPengambilanSampel: sample.tanggalPengambilanSampel || null,
                tanggal_pengambilan_sampel: sample.tanggal_pengambilan_sampel || null,
                tanggalSampling: sample.tanggalSampling || null,
                tanggal_sampling: sample.tanggal_sampling || null,
                tanggalPenerimaan: sample.tanggalPenerimaan || null,
                tanggal_penerimaan: sample.diterima_pada || null,
                jamPenerimaan: sample.jamPenerimaan || null,
                jam_penerimaan: (sample.diterima_pada ? new Date(sample.diterima_pada).toTimeString().slice(0, 8) : null) || null,
            })),
        };
    };
    assertSampleReadyForKasiReview = async (noSampel, transaction = null) => {
        const sampleInstance = await findKasiReviewSample(noSampel, transaction);
        if (!sampleInstance) {
            throw new Error('Sampel tidak ditemukan.');
        }
        const sample = getPlain(sampleInstance);
        const fpms = getAssociatedFpmsFromSample(sample);
        const completedRows = await getCompletedKasiResultRowsFromSample(sample);
        const totalParameter = fpms.length;
        const completedFpmIds = new Set(completedRows
            .map((row) => row.id_fppl_parameter_metode)
            .filter(Boolean));
        const totalSelesai = completedFpmIds.size;
        if (totalParameter <= 0) {
            throw new Error('Parameter sampel tidak ditemukan.');
        }
        if (totalSelesai !== totalParameter) {
            throw new Error('Semua hasil LKA harus lengkap dan sudah Disetujui Penyelia.');
        }
        return {
            totalParameter,
            totalSelesai,
            completedRows,
            sample,
        };
    };
    approveKasiReview = async (noSampel, currentNik) => {
        const sampleNo = String(noSampel || '').trim();
        const userNik = String(currentNik || '').trim();
        if (!sampleNo) {
            throw new Error('Nomor sampel wajib dikirim.');
        }
        if (!userNik) {
            throw new Error('User review tidak valid.');
        }
        const result = await sequelize.transaction(async (transaction) => {
            const sample = await Sampel.findOne({
                where: { no_sampel: sampleNo },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!sample) {
                throw new Error('Sampel tidak ditemukan.');
            }
            await assertSamplesEditableBeforeLhu([sampleNo], transaction);
            const readyState = await this.assertSampleReadyForKasiReview(sampleNo, transaction);
            const completedRows = readyState.completedRows || [];
            const completedIds = completedRows.map((row) => getLkaHasilKey(row)).filter(Boolean);
            if (!completedIds.length) {
                throw new Error('Tidak ada hasil LKA yang bisa disetujui.');
            }
            await LkaHasil.update({
                statusReviewHasil: LKA_HASIL_STATUS.APPROVED_KASI,
            }, {
                where: lkaHasilWhereFromKeys(completedIds),
                transaction,
            });
            const affectedLkaCodes = Array.from(new Set(completedRows.map((row) => row.kode_lka).filter(Boolean)));
            for (const kodeLka of affectedLkaCodes) {
                const approvedSampleNos = completedRows
                    .filter((row) => row.kode_lka === kodeLka)
                    .map((row) => row.no_sampel)
                    .filter(Boolean);
                await markRevisionItemsApprovedByKasi(kodeLka, approvedSampleNos, transaction);
                await syncLkaAggregateStatus(kodeLka, transaction);
                await syncDetailStatusFromLka(kodeLka, transaction);
            }
            return {
                noSampel: sampleNo,
                statusReviewHasil: SAMPLE_REVIEW_STATUS.APPROVED_KASI_PENGUJIAN,
                processed: completedIds.length,
            };
        });
        try {
            const { notifyKasiReviewApprovedToQc } = require('../notification/notification.service');
            await notifyKasiReviewApprovedToQc({ noSampel: sampleNo });
        }
        catch (error) {
            console.error('Gagal mengirim notifikasi hasil Kasi ke QC:', error);
        }
        return result;
    };
    reviseKasiReview = async (noSampel, catatanRevisi, currentNik, hasilTargets = [], revisionsPayload = null) => {
        const sampleNo = String(noSampel || '').trim();
        const userNik = String(currentNik || '').trim();
        const revisionItems = normalizeKasiRevisionItems(catatanRevisi, hasilTargets, revisionsPayload, null);
        const selectedIds = normalizeIdList(revisionItems.map((item) => item.hasilTargetKey));
        if (!sampleNo) {
            throw new Error('Nomor sampel wajib dikirim.');
        }
        if (!userNik) {
            throw new Error('User review tidak valid.');
        }
        if (!selectedIds.length) {
            throw new Error('Pilih minimal satu parameter/metode yang perlu direvisi.');
        }
        const noteById = new Map();
        for (const item of revisionItems) {
            const note = String(item.catatanRevisi || '').trim();
            if (!note) {
                throw new Error(`Catatan revisi untuk target hasil ${item.hasilTargetKey || item.noSampel || item.no_sampel} wajib diisi.`);
            }
            noteById.set(String(item.hasilTargetKey), prefixRevisionNote('Kasi Pengujian', note));
        }
        return sequelize.transaction(async (transaction) => {
            const sample = await Sampel.findOne({
                where: { no_sampel: sampleNo },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!sample) {
                throw new Error('Sampel tidak ditemukan.');
            }
            await assertSamplesEditableBeforeLhu([sampleNo], transaction);
            const readyState = await this.assertSampleReadyForKasiReview(sampleNo, transaction);
            const completedRows = readyState.completedRows || [];
            const completedById = new Map(completedRows
                .filter((row) => getLkaHasilKey(row))
                .map((row) => [String(getLkaHasilKey(row)), row]));
            const invalidIds = selectedIds.filter((id) => !completedById.has(String(id)));
            if (invalidIds.length > 0) {
                throw new Error(`Parameter/metode revisi tidak valid untuk sampel ${sampleNo}: ${invalidIds.join(', ')}.`);
            }
            const targetRows = selectedIds.map((id) => completedById.get(String(id))).filter(Boolean);
            const subkontrakRows = targetRows.filter((row) => {
                const statusKemampuan = String(row.status_kemampuan_lab || row.statusKemampuanLab || '')
                    .trim()
                    .toUpperCase();
                return (statusKemampuan === 'TIDAK_MAMPU' ||
                    toTinyInt(row.is_subkontrak) === 1 ||
                    toTinyInt(row.isSubkontrak) === 1 ||
                    toTinyInt(row.is_subkontrak) === 1 ||
                    toTinyInt(row.isSubkontrak) === 1);
            });
            if (subkontrakRows.length > 0) {
                const labels = subkontrakRows
                    .map((row) => row.nama_parameter || row.namaParameter || getLkaHasilKey(row))
                    .filter(Boolean)
                    .join(', ');
                throw new Error(`Hasil subkontrak tidak bisa diminta revisi oleh Kasi Pengujian: ${labels}.`);
            }
            const affectedLkaCodes = Array.from(new Set(completedRows.map((row) => row.kode_lka).filter(Boolean)));
            for (const kodeLka of affectedLkaCodes) {
                await normalizeLegacyLkaHasilStatuses(kodeLka, transaction);
            }
            const targetIds = targetRows.map((row) => getLkaHasilKey(row)).filter(Boolean);
            const targetDetailIds = Array.from(new Set(targetRows.map((row) => row.id_penugasan_detail).filter(Boolean)));
            const nonTargetIds = completedRows
                .map((row) => getLkaHasilKey(row))
                .filter((id) => id && !targetIds.includes(id));
            const targetNoteById = new Map();
            for (const targetRow of targetRows) {
                const targetId = getLkaHasilKey(targetRow);
                const newTargetNote = noteById.get(String(targetId));
                const targetNote = stripRevisionNotePrefix(newTargetNote);
                targetNoteById.set(String(targetId), targetNote);
                await LkaHasil.update({
                    // Revisi Kasi belum boleh dibuka ke Analis.
                    // Catatan revisinya hanya disimpan di lka_revisi sampai Penyelia menyetujui.
                    statusReviewHasil: LKA_HASIL_STATUS.WAIT_PENYELIA_KASI,
                }, {
                    where: lkaHasilWhereFromKey(targetId),
                    transaction,
                });
            }
            // Revisi dari Kasi Pengujian disimpan di lka_revisi.
            // Jangan menulis catatan ke lka_hasil sebelum Penyelia menyetujui,
            // agar halaman Analis tidak membaca revisi terlalu cepat.
            const rowsByLka = groupRevisionRowsByLka(targetRows);
            for (const [kodeLka, rows] of rowsByLka.entries()) {
                await createLkaRevisionLog({
                    kodeLka,
                    sumberRevisi: 'KASI_PENGUJIAN',
                    levelRevisi: 'HASIL',
                    catatanRevisi: null,
                    diajukanOleh: userNik,
                    // Fase aman: belum memblokir UI lama. Status ini menandai bahwa revisi Kasi perlu ditinjau penyelia pada fase berikutnya.
                    statusRevisi: 'Menunggu Persetujuan Penyelia',
                    items: rows.map((row) => ({
                        kodeLka: row.kode_lka,
                        kode_lka: row.kode_lka,
                        noSampel: row.no_sampel,
                        no_sampel: row.no_sampel,
                        catatanRevisi: stripRevisionNotePrefix(noteById.get(String(getLkaHasilKey(row)))),
                    })),
                }, transaction);
            }
            if (nonTargetIds.length > 0) {
                await LkaHasil.update({
                    statusReviewHasil: LKA_HASIL_STATUS.APPROVED_KASI,
                }, {
                    where: { [Op.or]: (lkaHasilWhereFromKeys(nonTargetIds)?.[Op.or] || [lkaHasilWhereFromKeys(nonTargetIds)].filter(Boolean)) },
                    transaction,
                });
            }
            await sample.update({
                statusReviewHasil: SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN,
                kasiPengujianReviewBy: userNik,
                kasiPengujianReviewAt: new Date(),
            }, { transaction });
            for (const kodeLka of affectedLkaCodes) {
                await syncLkaAggregateStatus(kodeLka, transaction);
                await syncDetailStatusFromLka(kodeLka, transaction);
            }
            return {
                noSampel: sampleNo,
                statusReviewHasil: SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN,
                processed: targetIds.length,
                hasilTargets: targetRows.map((row) => ({ kodeLka: row.kode_lka, kode_lka: row.kode_lka, noSampel: row.no_sampel, no_sampel: row.no_sampel })),
                hasil_targets: targetRows.map((row) => ({ kodeLka: row.kode_lka, kode_lka: row.kode_lka, noSampel: row.no_sampel, no_sampel: row.no_sampel })),
                revisions: targetRows.map((row) => ({
                    catatanRevisi: targetNoteById.get(String(getLkaHasilKey(row))) || noteById.get(String(getLkaHasilKey(row))) || null,
                    catatan_revisi: targetNoteById.get(String(getLkaHasilKey(row))) || noteById.get(String(getLkaHasilKey(row))) || null,
                })),
                idPenugasanDetailList: targetDetailIds,
            };
        });
    };
    getPendingKasiRevisionRequests = async () => {
        const rows = await LkaRevisi.findAll({
            where: {
                sumber_revisi: 'KASI_PENGUJIAN',
                status_revisi: 'Menunggu Persetujuan Penyelia',
            },
            include: [
                {
                    model: Lka,
                    as: 'lka',
                    required: false,
                    attributes: ['kode_lka', 'id_penugasan_detail', 'status_lka'],
                    include: [
                        {
                            model: PenugasanDetail,
                            required: false,
                            attributes: ['id_penugasan_detail', 'id_metode_parameter'],
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
                {
                    model: User,
                    as: 'PengajuRevisi',
                    required: false,
                    attributes: ['nik', 'username', 'email'],
                },
                {
                    model: LkaRevisi,
                    as: 'RevisiSebelumnya',
                    required: false,
                },
            ],
            order: [
                ['diajukan_pada', 'DESC'],
                ['no_sampel', 'ASC'],
            ],
        });
        return rows.map((instance) => {
            const row = getPlain(instance);
            const lka = pickObject(row, ['lka', 'Lka']) || {};
            const detail = pickObject(lka, ['penugasan_detail', 'PenugasanDetail']) || {};
            const info = getDetailParameterInfo(detail);
            const sourceItems = pickArray(row, ['items']);
            const items = (sourceItems.length ? sourceItems : [row]).map((item) => ({
                ...item,
                idPenugasanDetail: detail.id_penugasan_detail || lka.id_penugasan_detail || null,
                id_penugasan_detail: detail.id_penugasan_detail || lka.id_penugasan_detail || null,
                idMetodeParameter: info.idMetodeParameter || null,
                id_metode_parameter: info.idMetodeParameter || null,
                namaParameter: info.namaParameter,
                nama_parameter: info.namaParameter,
                namaMetode: info.namaMetode,
                nama_metode: info.namaMetode,
                acuanMetode: info.acuanMetode,
                acuan_metode: info.acuanMetode,
            }));
            return {
                ...row,
                items,
            };
        });
    };
    reviewKasiRevisionRequest = async (idRevisiLka, payload = {}, penyeliaNik) => {
        const revisionId = String(idRevisiLka || '').trim();
        const userNik = String(penyeliaNik || '').trim();
        const action = String(payload.action || payload.aksi || '').trim().toLowerCase();
        const catatanTinjauan = String(payload.catatanTinjauan || payload.catatan_tinjauan || payload.catatan || '').trim() || null;
        if (!revisionId) {
            throw new Error('ID revisi wajib dikirim.');
        }
        if (!userNik) {
            throw new Error('User penyelia tidak valid.');
        }
        if (!['approve', 'reject', 'setuju', 'tolak'].includes(action)) {
            throw new Error('Aksi tinjauan revisi Kasi tidak valid.');
        }
        const isApprove = action === 'approve' || action === 'setuju';
        return sequelize.transaction(async (transaction) => {
            const revision = await LkaRevisi.findOne({
                where: { id_revisi_lka: revisionId },
                include: [],
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!revision) {
                throw new Error('Data revisi tidak ditemukan.');
            }
            if (revision.sumber_revisi !== 'KASI_PENGUJIAN') {
                throw new Error('Revisi ini bukan berasal dari Kasi Pengujian.');
            }
            if (revision.status_revisi !== 'Menunggu Persetujuan Penyelia') {
                throw new Error('Revisi ini sudah ditinjau atau tidak menunggu persetujuan penyelia.');
            }
            await revision.update({
                status_revisi: isApprove ? 'Dikirim ke Analis' : 'Ditolak Penyelia',
                ditinjau_oleh: userNik,
                ditinjau_pada: new Date(),
                catatan_tinjauan: catatanTinjauan,
                updated_at: new Date(),
            }, { transaction });
            const plain = getPlain(revision);
            const sourceItems = Array.isArray(plain.items) ? plain.items : [];
            const items = sourceItems.length ? sourceItems : [plain];
            const hasilTargetKeys = items.map((item) => getLkaHasilKey(item)).filter(Boolean);
            const lkaContextInstance = await Lka.findOne({
                where: { kode_lka: revision.kode_lka },
                include: [
                    {
                        model: PenugasanDetail,
                        required: false,
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
                transaction,
            });
            const lkaContext = getPlain(lkaContextInstance) || {};
            const detailContext = pickObject(lkaContext, ['penugasan_detail', 'PenugasanDetail']) || {};
            const parameterInfo = getDetailParameterInfo(detailContext);
            const idPenugasanDetailList = detailContext.id_penugasan_detail
                ? [detailContext.id_penugasan_detail]
                : [];
            const sampleNos = Array.from(new Set(items.map((item) => item.no_sampel).filter(Boolean)));
            const notificationItems = items.map((item) => ({
                idPenugasanDetail: detailContext.id_penugasan_detail || null,
                id_penugasan_detail: detailContext.id_penugasan_detail || null,
                namaParameter: parameterInfo.namaParameter || '-',
                nama_parameter: parameterInfo.namaParameter || '-',
                namaMetode: parameterInfo.namaMetode || '-',
                nama_metode: parameterInfo.namaMetode || '-',
                acuanMetode: parameterInfo.acuanMetode || '-',
                acuan_metode: parameterInfo.acuanMetode || '-',
                catatanRevisi: item.catatan_revisi || null,
                catatan_revisi: item.catatan_revisi || null,
            }));
            const catatanRevisiGabungan = Array.from(new Set(notificationItems.map((item) => String(item.catatan_revisi || '').trim()).filter(Boolean))).join('\n');
            if (hasilTargetKeys.length > 0) {
                if (isApprove) {
                    // Fase 5: Revisi dari Kasi baru benar-benar dibuka ke Analis
                    // setelah Penyelia menyetujui permintaan revisi tersebut.
                    await LkaHasil.update({ statusReviewHasil: LKA_HASIL_STATUS.REVISION }, { where: lkaHasilWhereFromKeys(hasilTargetKeys, revision.kode_lka), transaction });
                }
                else {
                    // Jika Penyelia menolak, hasil dikembalikan ke antrean review Kasi.
                    await LkaHasil.update({ statusReviewHasil: LKA_HASIL_STATUS.WAIT_KASI }, { where: lkaHasilWhereFromKeys(hasilTargetKeys, revision.kode_lka), transaction });
                    if (sampleNos.length > 0) {
                        await Sampel.update({ statusReviewHasil: SAMPLE_REVIEW_STATUS.WAIT_KASI_PENGUJIAN }, { where: { no_sampel: { [Op.in]: sampleNos } }, transaction });
                    }
                }
                await syncLkaAggregateStatus(revision.kode_lka, transaction);
                await syncDetailStatusFromLka(revision.kode_lka, transaction);
            }
            return {
                idRevisiLka: revisionId,
                id_revisi_lka: revisionId,
                statusRevisi: isApprove ? 'Dikirim ke Analis' : 'Ditolak Penyelia',
                status_revisi: isApprove ? 'Dikirim ke Analis' : 'Ditolak Penyelia',
                action: isApprove ? 'approve' : 'reject',
                noSampel: sampleNos[0] || null,
                no_sampel: sampleNos[0] || null,
                noSampelList: sampleNos,
                no_sampel_list: sampleNos,
                idPenugasanDetailList,
                id_penugasan_detail_list: idPenugasanDetailList,
                diajukanOleh: revision.diajukan_oleh || null,
                diajukan_oleh: revision.diajukan_oleh || null,
                catatanRevisi: catatanRevisiGabungan || null,
                catatan_revisi: catatanRevisiGabungan || null,
                catatanTinjauan,
                catatan_tinjauan: catatanTinjauan,
                items: notificationItems,
                revisions: notificationItems,
            };
        });
    };
    getKasiReviewSampleHeader = (...args) => {
        return getKasiReviewSampleHeader(...args);
    };
    getKasiReviewResultRows = (...args) => {
        return getKasiReviewResultRows(...args);
    };
}
module.exports = new AssignmentKasiReviewService();
module.exports.AssignmentKasiReviewService = AssignmentKasiReviewService;
