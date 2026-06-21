const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { User, Pelanggan, Fppl, FpplSampel, RegBm, JenisSampel, Parameter, Metode, ParameterMetode, Penugasan, PenugasanDetail, PenugasanItem, Sampel, Lka, LkaHasil, LkaRevisi, } = require('../../models/Associations');
const notificationService = require('../notification/notification.service');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { asYmd, isBusinessDay, validateTestingPhaseDate } = require('../../utils/business-day.util');
const { getHariLibur } = require('../../utils/holiday-calendar.util');
const { previewWorksheetFile: buildWorksheetPreview } = require('../../utils/worksheet-preview');
const { createFileAccessToken } = require('../../utils/file-access-token.util');
const { EDITABLE_LKA_STATUSES, LKA_HASIL_STATUS } = require('./assignment.constants');
const { getPlain, pickObject, pickArray, uniqueText, firstDate } = require('./assignment-object.helper');
const worksheetFileService = require('./assignment-worksheet-files.helper');
const { parseWorksheetFiles, serializeWorksheetFiles, getPrimaryWorksheetPath, } = worksheetFileService;
const { getDetailParameterInfo } = require('./assignment-monitor.mapper');
const { getStatusOrderValue } = require('./assignment-fpm.helper');
const { resolveLkaHasilStatus, normalizeLegacyLkaHasilStatuses, syncLkaAggregateStatus, syncAssignmentHeaderStatusFromDetail, syncDetailStatusFromLka, hasActiveRevisionForMonitorDetail, resolveMonitorDisplayStatus, } = require('./assignment-status.helper');
const { assertPenugasanDetailSamplesEditableBeforeLhu, getSampleNosForPenugasanDetail, getLockedLhuRowsBySamples, toLhuLockRequestData, } = require('./assignment-lhu-lock.helper');
const { collectRevisionNotesForSample, buildWorksheetRevisionResponse, buildLkaHasilRevisionResponse, } = require('./assignment-revision.helper');
const worksheetRevisionHistoryService = require('./assignment-worksheet-revision-history.helper');
const { loadRevisionRowsForLka } = worksheetRevisionHistoryService;
const { normalizeResultRows, getLkaRevisionScope, upsertWorksheetResults, assertWorksheetReadyToSubmit, markRevisionItemsWorkedByAnalyst, } = require('./assignment-worksheet-result.helper');
const RUNNING_ID_MODEL_MAP = {
    lka: {
        model: Lka,
        field: 'kode_lka',
    },
};
class AssignmentWorksheetService {
    constructor({ notificationService: injectedNotificationService = notificationService } = {}) {
        this.notificationService = injectedNotificationService;
    }
    assertWorksheetFileAccess = async (rawPath, user = {}, transaction = null) => {
        return worksheetFileService.assertWorksheetFileAccess(rawPath, user, transaction);
    };
    getLkaRevisionHistory = async (kodeLka) => {
        return worksheetRevisionHistoryService.getLkaRevisionHistory(kodeLka);
    };
    buildSignedWorksheetUrl = (filePath, download = false, expiresInSeconds = 12 * 60 * 60) => {
        const token = createFileAccessToken({
            scope: 'worksheet',
            path: filePath,
            expiresInSeconds,
        });
        return `/files/worksheet?token=${encodeURIComponent(token)}${download ? '&download=1' : ''}`;
    };
    attachSignedWorksheetUrl = (previewRequestData, sourcePath) => {
        if (!previewRequestData || typeof previewRequestData !== 'object')
            return previewRequestData;
        const rawPath = sourcePath || previewRequestData.url;
        if (!rawPath)
            return previewRequestData;
        const signedUrl = this.buildSignedWorksheetUrl(rawPath);
        const signedDownloadUrl = this.buildSignedWorksheetUrl(rawPath, true);
        return {
            ...previewRequestData,
            originalUrl: previewRequestData.url || rawPath,
            url: previewRequestData.url ? signedUrl : previewRequestData.url,
            downloadUrl: signedDownloadUrl,
        };
    };
    getWorksheetPreview = async (worksheetPath, user = {}) => {
        await this.assertWorksheetFileAccess(worksheetPath, user);
        const data = await buildWorksheetPreview(worksheetPath);
        return this.attachSignedWorksheetUrl(data, worksheetPath);
    };
    getWorksheetAccessUrl = async (worksheetPath, user = {}, download = false) => {
        await this.assertWorksheetFileAccess(worksheetPath, user);
        return {
            path: worksheetPath,
            url: this.buildSignedWorksheetUrl(worksheetPath, download),
            downloadUrl: this.buildSignedWorksheetUrl(worksheetPath, true),
        };
    };
    formatUploadedWorksheetFiles = (uploadedFiles = []) => {
        return uploadedFiles.map((file) => {
            const ext = path
                .extname(file.originalname || file.filename || '')
                .replace('.', '')
                .toLowerCase();
            const filePath = `/worksheets/${file.filename}`;
            return {
                path: filePath,
                originalName: file.originalname || file.filename,
                mimeType: file.mimetype || null,
                size: file.size || null,
                ext,
                uploadedAt: new Date().toISOString(),
                secureUrl: this.buildSignedWorksheetUrl(filePath),
                downloadUrl: this.buildSignedWorksheetUrl(filePath, true),
            };
        });
    };
    getHolidayDateSet = async () => {
            const holidays = await getHariLibur();
            return new Set((Array.isArray(holidays) ? holidays : []).map((item) => asYmd(item?.date)).filter(Boolean));
        };
        getReceiptDateForPenugasanDetail = async (idPenugasanDetail, transaction = null) => {
            const sampleNos = await getSampleNosForPenugasanDetail(idPenugasanDetail, transaction);
            if (!sampleNos.length)
                return null;
            const samples = await Sampel.findAll({
                where: { no_sampel: { [Op.in]: sampleNos } },
                attributes: ['diterima_pada'],
                transaction,
            });
            return samples
                .map((row) => asYmd(getPlain(row)?.diterima_pada))
                .filter(Boolean)
                .sort()[0] || null;
        };
        assertWorksheetBusinessDatesOrThrow = async (idPenugasanDetail, tanggalMulaiPengujian, tanggalSelesaiPengujian, transaction = null) => {
            const holidays = await this.getHolidayDateSet();
            const dateRows = [
                ['Tanggal pengerjaan', asYmd(tanggalMulaiPengujian)],
                ['Tanggal selesai', asYmd(tanggalSelesaiPengujian)],
            ].filter(([, value]) => Boolean(value));
            for (const [label, value] of dateRows) {
                if (!isBusinessDay(value, holidays)) {
                    throw new Error(`${label} harus hari kerja dan tidak boleh Sabtu/Minggu/tanggal merah.`);
                }
            }
            if (tanggalMulaiPengujian && tanggalSelesaiPengujian && asYmd(tanggalSelesaiPengujian) < asYmd(tanggalMulaiPengujian)) {
                throw new Error('Tanggal selesai tidak boleh sebelum tanggal pengerjaan.');
            }
            const receiptDate = await this.getReceiptDateForPenugasanDetail(idPenugasanDetail, transaction);
            if (!receiptDate)
                return;
            if (tanggalMulaiPengujian) {
                const message = validateTestingPhaseDate({ value: tanggalMulaiPengujian, receivedYmd: receiptDate, label: 'Tanggal pengerjaan', holidays });
                if (message)
                    throw new Error(message);
            }
            if (tanggalSelesaiPengujian) {
                const message = validateTestingPhaseDate({ value: tanggalSelesaiPengujian, receivedYmd: receiptDate, label: 'Tanggal selesai', holidays });
                if (message)
                    throw new Error(message);
            }
        };
    nextRunningId = async (tableName, fieldName, prefix, pad, transaction) => {
        const config = RUNNING_ID_MODEL_MAP[tableName];
        if (!config || config.field !== fieldName) {
            throw new Error(`Konfigurasi running ID tidak ditemukan untuk ${tableName}.${fieldName}.`);
        }
        const latest = await config.model.findOne({
            attributes: [config.field],
            where: {
                [config.field]: {
                    [Op.like]: `${prefix}%`,
                },
            },
            order: [[config.field, 'DESC']],
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
        const latestValue = latest ? latest.get(config.field) : null;
        const numeric = latestValue ? parseInt(String(latestValue).replace(prefix, ''), 10) : 0;
        const nextNumber = Number.isFinite(numeric) ? numeric + 1 : 1;
        return `${prefix}${String(nextNumber).padStart(pad, '0')}`;
    };
    ensureLkaForDetail = async (idPenugasanDetail, transaction) => {
        const existing = await Lka.findOne({
            where: { id_penugasan_detail: idPenugasanDetail },
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
        if (existing)
            return existing.kode_lka;
        const kodeLka = await this.nextRunningId('lka', 'kode_lka', 'LKA-', 5, transaction);
        await Lka.create({
            kode_lka: kodeLka,
            id_penugasan_detail: idPenugasanDetail,
            status_lka: 'Draft',
        }, { transaction });
        return kodeLka;
    };
    assertOwnedPenugasanDetail = async (idPenugasanDetail, userNik, transaction = null) => {
        const detail = await PenugasanDetail.findOne({
            where: { id_penugasan_detail: idPenugasanDetail },
            include: [
                {
                    model: Penugasan,
                    required: true,
                    where: { id_user_analis: userNik },
                },
            ],
            transaction,
        });
        if (!detail) {
            throw new Error('Detail penugasan tidak ditemukan atau bukan milik analis ini.');
        }
        return getPlain(detail);
    };
    getAssignmentWorkDetail = async (idPenugasanDetail, userNik) => {
        await this.assertOwnedPenugasanDetail(idPenugasanDetail, userNik);
        const detailInstance = await PenugasanDetail.findOne({
            where: { id_penugasan_detail: idPenugasanDetail },
            include: [
                {
                    model: Penugasan,
                    required: true,
                    include: [
                        { model: User, as: 'Analis', required: false, attributes: ['nik', 'username'] },
                    ],
                },
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
        if (!detailInstance) {
            throw new Error('Detail penugasan tidak ditemukan.');
        }
        const detail = getPlain(detailInstance);
        const penugasan = pickObject(detail, ['penugasan', 'Penugasan']) || {};
        const analis = pickObject(penugasan, ['Analis']) || {};
        const info = getDetailParameterInfo(detail);
        const fpm = info.fpm || {};
        const fpplSampel = pickObject(fpm, ['fppl_sampel', 'FpplSampel']) || {};
        const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
        const penugasanItems = pickArray(detail, ['penugasan_items', 'PenugasanItems', 'penugasan_item', 'PenugasanItem']);
        const lka = pickObject(detail, ['lka', 'Lka']) || null;
        const lkaHasilRows = lka ? pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']) : [];
        const includedLkaRevisionRows = lka ? pickArray(lka, ['revisi_lka', 'RevisiLka', 'LkaRevisis']) : [];
        const lkaRevisionRows = lka?.kode_lka
            ? await loadRevisionRowsForLka(lka.kode_lka)
            : includedLkaRevisionRows;
        const sampleRows = penugasanItems
            .map((item) => {
            const sampel = pickObject(item, ['sampel', 'Sampel']) || {};
            const sampelFppl = pickObject(sampel, ['fppl_sampel', 'FpplSampel']) || {};
            const sampelJenis = pickObject(sampelFppl, ['jenis_sampel', 'JenisSampel']) || {};
            const hasilRow = lkaHasilRows.find((hasil) => hasil.no_sampel === item.no_sampel || hasil.no_sampel === sampel.no_sampel) || {};
            const noSampel = item.no_sampel || sampel.no_sampel;
            const jenisContohSampel = sampelJenis.jenis_sampel || sampelJenis.jenisSampel || jenis.jenis_sampel || jenis.jenisSampel || '-';
            const revisionNoteRequestData = collectRevisionNotesForSample(lkaRevisionRows, noSampel, lka?.kode_lka || hasilRow.kode_lka || null, { audience: 'analis' });
            return {
                kodeLka: lka?.kode_lka || hasilRow.kode_lka || null,
                no_sampel: noSampel,
                noSampel,
                id_registrasi: sampelFppl.id_registrasi || sampel.id_registrasi || null,
                id_jenis_sampel: sampelFppl.id_jenis_sampel || sampel.id_jenis_sampel || null,
                id_reg_bm: sampelFppl.id_reg_bm || sampel.id_reg_bm || null,
                jenisSampel: jenisContohSampel,
                jenis_sampel: jenisContohSampel,
                jenisContoh: jenisContohSampel,
                jenis_contoh: jenisContohSampel,
                tanggal_pengambilan_sampel: sampel.tanggal_pengambilan_sampel || null,
                tanggal_penerimaan: sampel.diterima_pada || null,
                jam_penerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,
                kondisi_sampel: sampel.kondisi_sampel || '-',
                abnormalitas_sampel: sampel.abnormalitas_sampel || '-',
                acuan_pengambilan_sampel: sampel.acuan_pengambilan_sampel || '-',
                koordinat: sampel.koordinat || '-',
                hasil: hasilRow.hasil || '',
                catatan_hasil: hasilRow.catatan_hasil || '',
                statusReviewHasil: resolveLkaHasilStatus(hasilRow, lka?.status_lka, lkaHasilRows),
                ...buildLkaHasilRevisionResponse({ ...hasilRow, ...revisionNoteRequestData }),
            };
        })
            .filter((row) => row.no_sampel);
        const tanggalSampling = firstDate(sampleRows.map((row) => row.tanggal_pengambilan_sampel)) || lka?.tanggal_sampling || null;
        const abnormalitasSampel = uniqueText(sampleRows.map((row) => row.abnormalitas_sampel));
        const acuanPengambilanSampel = uniqueText(sampleRows.map((row) => row.acuan_pengambilan_sampel));
        const jenisContoh = uniqueText(sampleRows.map((row) => row.jenis_sampel || row.jenisSampel || row.jenis_contoh || row.jenisContoh)) || jenis.jenis_sampel || jenis.jenisSampel || '-';
        const worksheetFiles = parseWorksheetFiles(lka?.file_worksheet_path);
        const worksheetRevisionRequestData = buildWorksheetRevisionResponse(lka || {}, lkaRevisionRows, { audience: 'analis' });
        const lhuLock = toLhuLockRequestData(await getLockedLhuRowsBySamples(sampleRows.map((row) => row.no_sampel)));
        const idJenisSampel = sampleRows.find((row) => row.id_jenis_sampel)?.id_jenis_sampel ||
            null;
        return {
            ...lhuLock,
            idPenugasan: detail.id_penugasan,
            catatanPenugasan: penugasan.catatan_penugasan || null,
            idPenugasanDetail: detail.id_penugasan_detail,
            idFpplParameterMetode: detail.id_fppl_parameter_metode,
            idAnalis: penugasan.id_user_analis || null,
            analisNama: analis.username || penugasan.id_user_analis || '-',
            idPenyelia: lka?.diperiksa_oleh || penugasan.assigned_by || null,
            penyeliaNama: lka?.Pemeriksa?.username || penugasan.assigned_by || '-',
            idJenisSampel,
            id_jenis_sampel: idJenisSampel,
            jenisContoh,
            jenis_contoh: jenisContoh,
            jenisSampel: jenisContoh,
            idMetodeParameter: info.idMetodeParameter || null,
            parameter: info.namaParameter,
            namaParameter: info.namaParameter,
            metode: info.acuanMetode || info.namaMetode || info.idMetodeParameter || '-',
            namaMetode: info.namaMetode,
            acuanMetode: info.acuanMetode,
            tanggalSampling,
            tanggal_sampling: tanggalSampling,
            tanggalPengambilanSampel: tanggalSampling,
            abnormalitasSampel,
            abnormalitas_sampel: abnormalitasSampel,
            abnormalitasContoh: abnormalitasSampel,
            acuanPengambilanSampel,
            acuan_pengambilan_sampel: acuanPengambilanSampel,
            deadline: detail.tanggal_tenggat,
            tanggalTenggat: detail.tanggal_tenggat,
            statusDetail: detail.status_detail,
            worksheet: {
                kodeLka: lka?.kode_lka || null,
                tanggalSampling,
                tanggal_sampling: tanggalSampling,
                tanggalPengambilanSampel: tanggalSampling,
                abnormalitasSampel,
                abnormalitas_sampel: abnormalitasSampel,
                abnormalitasContoh: abnormalitasSampel,
                acuanPengambilanSampel,
                acuan_pengambilan_sampel: acuanPengambilanSampel,
                tanggalMulaiPengujian: lka?.tanggal_mulai_pengujian || null,
                tanggalSelesaiPengujian: lka?.tanggal_selesai_pengujian || null,
                dhlAkuades: lka?.dhl_akuades || null,
                fileWorksheetPath: getPrimaryWorksheetPath(lka?.file_worksheet_path),
                worksheetFiles,
                statusLka: lka?.status_lka || 'Draft',
                ...worksheetRevisionRequestData,
                catatanRevisi: worksheetRevisionRequestData.catatanRevisiLka || worksheetRevisionRequestData.catatanRevisi || null,
                lkaRevisionNote: worksheetRevisionRequestData.lkaRevisionNote || null,
                dilaporkanOleh: lka?.dilaporkan_oleh || penugasan.id_user_analis || null,
                dilaporkanOlehNama: lka?.Pelapor?.username || analis.username || penugasan.id_user_analis || '-',
                tanggalPelaporan: lka?.tanggal_pelaporan || null,
                diperiksaOleh: lka?.diperiksa_oleh || null,
                diperiksaOlehNama: lka?.Pemeriksa?.username || lka?.diperiksa_oleh || '-',
                tanggalPemeriksaan: lka?.tanggal_pemeriksaan || null,
            },
            samples: sampleRows.map((row) => ({
                kodeLka: row.kodeLka || row.kode_lka || lka?.kode_lka || null,
                noSampel: row.no_sampel,
                jenisSampel: row.jenis_sampel || row.jenisSampel || '-',
                jenis_sampel: row.jenis_sampel || row.jenisSampel || '-',
                jenisContoh: row.jenis_contoh || row.jenisContoh || row.jenis_sampel || row.jenisSampel || '-',
                jenis_contoh: row.jenis_contoh || row.jenisContoh || row.jenis_sampel || row.jenisSampel || '-',
                idJenisSampel: row.id_jenis_sampel || null,
                tanggalPengambilanSampel: row.tanggal_pengambilan_sampel || null,
                tanggalSampling: row.tanggal_pengambilan_sampel || null,
                tanggalPenerimaan: row.tanggal_penerimaan || null,
                jamPenerimaan: row.jam_penerimaan || null,
                kondisiSampel: row.kondisi_sampel || '-',
                koordinat: row.koordinat || '-',
                abnormalitasSampel: row.abnormalitas_sampel || '-',
                acuanPengambilanSampel: row.acuan_pengambilan_sampel || '-',
                hasil: row.hasil || '',
                hasHasil: Boolean(String(row.hasil || '').trim()),
                catatanHasil: row.catatan_hasil || '',
                statusReviewHasil: row.statusReviewHasil || null,
                ...buildLkaHasilRevisionResponse(row),
            })),
        };
    };
    saveWorksheetDraft = async (idPenugasanDetail, requestData, userNik) => {
        const { tanggalMulaiPengujian = null, tanggalSelesaiPengujian = null, dhlAkuades = null, fileWorksheetPath = null } = requestData || {};
        return sequelize.transaction(async (transaction) => {
            await this.assertWorksheetEditableForAnalyst(idPenugasanDetail, userNik, transaction);
            await assertPenugasanDetailSamplesEditableBeforeLhu(idPenugasanDetail, transaction);
            await this.assertWorksheetBusinessDatesOrThrow(idPenugasanDetail, tanggalMulaiPengujian, tanggalSelesaiPengujian, transaction);
            const kodeLka = await this.ensureLkaForDetail(idPenugasanDetail, transaction);
            const lka = await Lka.findOne({
                where: { kode_lka: kodeLka },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!lka) {
                throw new Error('Data LKA tidak ditemukan.');
            }
            const nextStatusLka = lka.status_lka === 'Perlu Perbaikan' ? 'Perlu Perbaikan' : 'Draft';
            const revisionScope = await getLkaRevisionScope(kodeLka, transaction);
            const canEditLkaMeta = lka.status_lka !== 'Perlu Perbaikan' ||
                !revisionScope.hasSpecificRevisionRows ||
                revisionScope.allRowsRevision;
            const lkaRequestData = {
                file_worksheet_path: fileWorksheetPath
                    ? serializeWorksheetFiles(fileWorksheetPath)
                    : lka.file_worksheet_path,
                dilaporkan_oleh: userNik,
                tanggal_pemeriksaan: null,
                diperiksa_oleh: null,
                catatan_revisi: lka.status_lka === 'Perlu Perbaikan' ? lka.catatan_revisi : null,
                status_lka: nextStatusLka,
            };
            if (canEditLkaMeta) {
                lkaRequestData.tanggal_mulai_pengujian = tanggalMulaiPengujian;
                lkaRequestData.tanggal_selesai_pengujian = tanggalSelesaiPengujian;
                lkaRequestData.dhl_akuades = dhlAkuades;
            }
            await lka.update(lkaRequestData, { transaction });
            await PenugasanDetail.update({ status_detail: 'Sedang Dikerjakan' }, { where: { id_penugasan_detail: idPenugasanDetail }, transaction });
            await syncAssignmentHeaderStatusFromDetail(idPenugasanDetail, transaction);
            return { kodeLka };
        });
    };
    saveWorksheetResults = async (idPenugasanDetail, requestData, userNik) => {
        const { results = [] } = requestData || {};
        return sequelize.transaction(async (transaction) => {
            await this.assertWorksheetEditableForAnalyst(idPenugasanDetail, userNik, transaction);
            await assertPenugasanDetailSamplesEditableBeforeLhu(idPenugasanDetail, transaction);
            const kodeLka = await this.ensureLkaForDetail(idPenugasanDetail, transaction);
            await upsertWorksheetResults(idPenugasanDetail, kodeLka, results, transaction);
            await Lka.update({
                dilaporkan_oleh: userNik,
                tanggal_pemeriksaan: null,
                diperiksa_oleh: null,
            }, { where: { kode_lka: kodeLka }, transaction });
            await PenugasanDetail.update({ status_detail: 'Sedang Dikerjakan' }, { where: { id_penugasan_detail: idPenugasanDetail }, transaction });
            await syncAssignmentHeaderStatusFromDetail(idPenugasanDetail, transaction);
            return { kodeLka };
        });
    };
    submitWorksheet = async (idPenugasanDetail, userNik, requestData = {}) => {
        const { worksheet = null, results = null } = requestData || {};
        const requiredWorksheet = worksheet || {};
        const tanggalMulaiPengujian = String(requiredWorksheet.tanggalMulaiPengujian || '').trim();
        const tanggalSelesaiPengujian = String(requiredWorksheet.tanggalSelesaiPengujian || '').trim();
        const dhlAkuades = String(requiredWorksheet.dhlAkuades || '').trim();
        const fileWorksheetPath = requiredWorksheet.fileWorksheetPath || null;
        if (!tanggalMulaiPengujian)
            throw new Error('Tanggal pengerjaan wajib diisi.');
        if (!tanggalSelesaiPengujian)
            throw new Error('Tanggal selesai wajib diisi.');
        if (!dhlAkuades)
            throw new Error('DHL akuades wajib diisi.');
        if (!fileWorksheetPath)
            throw new Error('File Worksheet wajib diupload.');
        if (new Date(tanggalSelesaiPengujian) < new Date(tanggalMulaiPengujian))
            throw new Error('Tanggal selesai tidak boleh sebelum tanggal pengerjaan.');
        if (!Array.isArray(results) || results.length === 0)
            throw new Error('Hasil pengujian sampel wajib diisi.');
        const emptyResult = results.find((row) => !String(row?.hasil || '').trim());
        if (emptyResult)
            throw new Error('Semua hasil pengujian sampel wajib diisi.');
        const result = await sequelize.transaction(async (transaction) => {
            await this.assertWorksheetEditableForAnalyst(idPenugasanDetail, userNik, transaction);
            await assertPenugasanDetailSamplesEditableBeforeLhu(idPenugasanDetail, transaction);
            await this.assertWorksheetBusinessDatesOrThrow(idPenugasanDetail, tanggalMulaiPengujian, tanggalSelesaiPengujian, transaction);
            const kodeLka = await this.ensureLkaForDetail(idPenugasanDetail, transaction);
            const lka = await Lka.findOne({
                where: { kode_lka: kodeLka },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!lka) {
                throw new Error('Data LKA tidak ditemukan.');
            }
            const revisionScope = await getLkaRevisionScope(kodeLka, transaction);
            const canEditLkaMeta = lka.status_lka !== 'Perlu Perbaikan' ||
                !revisionScope.hasSpecificRevisionRows ||
                revisionScope.allRowsRevision;
            const lkaRequestData = {
                file_worksheet_path: fileWorksheetPath
                    ? serializeWorksheetFiles(fileWorksheetPath)
                    : lka.file_worksheet_path,
                dilaporkan_oleh: userNik,
                tanggal_pemeriksaan: null,
                diperiksa_oleh: null,
            };
            if (canEditLkaMeta) {
                lkaRequestData.tanggal_mulai_pengujian = tanggalMulaiPengujian;
                lkaRequestData.tanggal_selesai_pengujian = tanggalSelesaiPengujian;
                lkaRequestData.dhl_akuades = dhlAkuades;
            }
            await lka.update(lkaRequestData, { transaction });
            await normalizeLegacyLkaHasilStatuses(kodeLka, transaction);
            await upsertWorksheetResults(idPenugasanDetail, kodeLka, results, transaction);
            await assertWorksheetReadyToSubmit(idPenugasanDetail, kodeLka, transaction);
            const submittedNoSampels = normalizeResultRows(results).map((row) => row.noSampel);
            if (submittedNoSampels.length > 0) {
                await LkaHasil.update({
                    statusReviewHasil: LKA_HASIL_STATUS.WAIT_PENYELIA,
                }, {
                    where: {
                        kode_lka: kodeLka,
                        no_sampel: { [Op.in]: submittedNoSampels },
                    },
                    transaction,
                });
                await markRevisionItemsWorkedByAnalyst(kodeLka, submittedNoSampels, transaction);
            }
            await syncLkaAggregateStatus(kodeLka, transaction, {
                dilaporkan_oleh: userNik,
                tanggal_pelaporan: new Date(),
            });
            await syncDetailStatusFromLka(kodeLka, transaction);
            return { kodeLka };
        });
        await WorkflowLogService.logStatusTransition({
            entityType: 'LKA',
            entityId: result.kodeLka,
            action: 'MELAPORKAN_LKA',
            statusBefore: null,
            statusAfter: 'Menunggu Verifikasi Penyelia',
            source: 'Analis',
            note: 'Analis mengirim LKA ke Penyelia.',
            actorNik: userNik || null,
        });
        try {
            await this.notificationService.notifyAnalisSubmitKePenyelia(idPenugasanDetail);
        }
        catch (error) {
            console.error('Gagal kirim email submit hasil analis ke penyelia:', error);
        }
        return result;
    };
    getLkaStateForDetail = async (idPenugasanDetail, transaction = null, forUpdate = false) => {
        const detail = await PenugasanDetail.findOne({
            where: { id_penugasan_detail: idPenugasanDetail },
            include: [
                {
                    model: Penugasan,
                    required: true,
                    attributes: ['id_penugasan', 'id_user_analis'],
                },
                {
                    model: Lka,
                    required: false,
                    attributes: ['kode_lka', 'status_lka'],
                },
            ],
            transaction,
            lock: forUpdate && transaction ? transaction.LOCK.UPDATE : undefined,
        });
        if (!detail)
            return null;
        const plain = getPlain(detail);
        const penugasan = pickObject(plain, ['penugasan', 'Penugasan']) || {};
        const lka = pickObject(plain, ['lka', 'Lka']) || {};
        return {
            kode_lka: lka.kode_lka || null,
            status_lka: lka.status_lka || null,
            status_detail: plain.status_detail || null,
            id_user_analis: penugasan.id_user_analis || null,
        };
    };
    assertWorksheetEditableForAnalyst = async (idPenugasanDetail, userNik, transaction = null) => {
        await this.assertOwnedPenugasanDetail(idPenugasanDetail, userNik, transaction);
        const state = await this.getLkaStateForDetail(idPenugasanDetail, transaction, Boolean(transaction));
        const statusLka = state?.status_lka || null;
        if (statusLka && !EDITABLE_LKA_STATUSES.has(statusLka)) {
            throw new Error('LKA sudah dikirim ke penyelia dan tidak dapat diubah sebelum diminta revisi.');
        }
        return state;
    };
}
module.exports = new AssignmentWorksheetService();
module.exports.AssignmentWorksheetService = AssignmentWorksheetService;
