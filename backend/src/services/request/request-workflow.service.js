const { sequelize, Fppl, FpplParameterMetode, ParameterMetode, TarifPengambilan, JadwalSampel, Pegawai, FpplSampel, Sampel, SampelParameter, JenisSampel, RegBm, Invoice, Payment } = require('../../models/Associations');
const RequestStatus = require('../../constants/request-status');
const { generateId, generateNomorFppl } = require('../../utils/id-generator');
const ReferenceService = require('../reference.service');
const { Op } = require('sequelize');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { assertBusinessDateOrThrow: assertScheduleBusinessDateOrThrow, normalizeDateOnly: normalizeScheduleDateOnly, normalizeTimeForDb: normalizeScheduleTimeForDb, } = require('../../utils/schedule-policy.util');
const { assertRequestReadyForSampleReceipt, buildNoSampel, formatLocalHms, formatLocalYmd, getNextSampleSequence, normalizeLegacyPaymentVerificationIfSettled, normalizeSampleCondition, resolveTanggalPengambilanSampel, } = require('./request-sample-code.util');

const sameFpplSampelComposite = (a = {}, b = {}) => {
    const pick = (row, snake, camel) => String(row?.[snake] ?? row?.[camel] ?? '').trim();
    return pick(a, 'id_registrasi', 'idRegistrasi') === pick(b, 'id_registrasi', 'idRegistrasi') &&
        pick(a, 'id_jenis_sampel', 'idJenisSampel') === pick(b, 'id_jenis_sampel', 'idJenisSampel') &&
        pick(a, 'id_reg_bm', 'idRegBm') === pick(b, 'id_reg_bm', 'idRegBm');
};
const normalizeFpplSampelCompositePayload = (payload = {}) => {
    const pick = (snake, camel) => String(payload?.[snake] ?? payload?.[camel] ?? '').trim();
    const idRegistrasi = pick('id_registrasi', 'idRegistrasi');
    const idJenisSampel = pick('id_jenis_sampel', 'idJenisSampel');
    const idRegBm = pick('id_reg_bm', 'idRegBm');
    if (!idRegistrasi || !idJenisSampel || !idRegBm) {
        return null;
    }
    return {
        id_registrasi: idRegistrasi,
        id_jenis_sampel: idJenisSampel,
        id_reg_bm: idRegBm,
    };
};

const buildFpplSampelCompositeKey = (row = {}) => {
    const pick = (snake, camel) => String(row?.[snake] ?? row?.[camel] ?? '').trim();
    return [
        pick('id_registrasi', 'idRegistrasi'),
        pick('id_jenis_sampel', 'idJenisSampel'),
        pick('id_reg_bm', 'idRegBm'),
    ].join('|');
};
const buildFpplParameterBusinessKey = (row = {}) => {
    const pick = (snake, camel) => String(row?.[snake] ?? row?.[camel] ?? '').trim();
    return [
        pick('id_registrasi', 'idRegistrasi'),
        pick('id_jenis_sampel', 'idJenisSampel'),
        pick('id_reg_bm', 'idRegBm'),
        pick('id_parameter', 'idParameter'),
    ].join('|');
};
const compactBusinessKeyLabel = (key = '') => {
    const [, idJenisSampel, idRegBm, idParameter] = String(key).split('|');
    return [idJenisSampel, idRegBm, idParameter].filter(Boolean).join(' / ');
};

const filterFpplSampelCompositeChildren = (row = {}) => {
    if (!row || typeof row !== 'object') {
        return row;
    }
    ['fppl_parameter_metodes', 'FpplParameterMetodes', 'fpplParameterMetodes', 'sampels', 'Sampels'].forEach((key) => {
        if (Array.isArray(row[key])) {
            row[key] = row[key].filter((child) => sameFpplSampelComposite(child, row));
        }
    });
    return row;
};
const SAMPLE_SCHEDULE_EDITABLE_REQUEST_STATUSES = [
    RequestStatus.WAITING_PARAMETER,
    RequestStatus.WAITING_PAYMENT,
    RequestStatus.WAITING_SAMPLE,
    RequestStatus.WAITING_SAMPLE_PICKUP,
    RequestStatus.WAITING_SAMPLE_DELIVERY,
];
class RequestWorkflowService {
    constructor({ referenceService = ReferenceService } = {}) {
        this.referenceService = referenceService;
    }
    verifyRequest = async (requestId, action, rejectionNote, selectedSamplingTariffId, verifiedBy = null) => {
        if (!['approve', 'reject'].includes(action))
            throw new Error('Action harus "approve" atau "reject".');
        const requestRecord = await Fppl.findByPk(requestId);
        if (!requestRecord)
            throw new Error('Permohonan tidak ditemukan.');
        if (requestRecord.status_fppl !== RequestStatus.WAITING_VERIFICATION) {
            throw new Error(`Permohonan tidak dalam status "Menunggu Verifikasi". Status saat ini: ${requestRecord.status_fppl}`);
        }
        if (action === 'approve') {
            let samplingTariffId = requestRecord.id_tarif_pengambilan || null;
            if (requestRecord.jenis_pengambilan_sampel === 'Petugas') {
                if (!selectedSamplingTariffId)
                    throw new Error('Keterangan jarak wajib dipilih untuk permohonan dengan pengambilan oleh petugas.');
                const selectedSamplingTariff = await TarifPengambilan.findByPk(selectedSamplingTariffId);
                if (!selectedSamplingTariff)
                    throw new Error('Tarif pengambilan yang dipilih tidak ditemukan.');
                samplingTariffId = selectedSamplingTariff.id_tarif_pengambilan;
            }
            const previousStatus = requestRecord.status_fppl;
            await requestRecord.update({
                status_fppl: RequestStatus.WAITING_PARAMETER,
                id_tarif_pengambilan: samplingTariffId,
                catatan_penolakan: null,
                tanggal_verifikasi: new Date(),
                diverifikasi_oleh: verifiedBy || null,
            });
            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: requestRecord.id_registrasi,
                action: 'MEMVERIFIKASI_PERMOHONAN',
                statusBefore: previousStatus,
                statusAfter: RequestStatus.WAITING_PARAMETER,
                source: 'Admin',
                note: 'Permohonan disetujui admin dan dilanjutkan ke penentuan metode.',
                actorNik: verifiedBy || null,
            });
            return { id_registrasi: requestRecord.id_registrasi, status: RequestStatus.WAITING_PARAMETER, id_tarif_pengambilan: samplingTariffId };
        }
        const previousStatus = requestRecord.status_fppl;
        await requestRecord.update({
            status_fppl: RequestStatus.REJECTED_BY_ADMIN,
            catatan_penolakan: rejectionNote ? `[Admin] ${rejectionNote}` : null,
            tanggal_verifikasi: new Date(),
            diverifikasi_oleh: verifiedBy || null,
        });
        await WorkflowLogService.logStatusTransition({
            entityType: 'FPPL',
            entityId: requestRecord.id_registrasi,
            action: 'MENOLAK_PERMOHONAN_ADMIN',
            statusBefore: previousStatus,
            statusAfter: RequestStatus.REJECTED_BY_ADMIN,
            source: 'Admin',
            note: rejectionNote || null,
            actorNik: verifiedBy || null,
        });
        return { id_registrasi: requestRecord.id_registrasi, status: RequestStatus.REJECTED_BY_ADMIN, catatan: rejectionNote || '', catatan_penolakan: rejectionNote || '' };
    };
    normalizeBoolean01 = (value) => {
        if (value === true || value === 1 || value === '1')
            return 1;
        if (value === false || value === 0 || value === '0')
            return 0;
        return null;
    };
    isSampleScheduleEditableStatus = (status) => {
        return SAMPLE_SCHEDULE_EDITABLE_REQUEST_STATUSES.includes(String(status || '').trim());
    };
    assignMethods = async (requestId, selections, kasiNik) => {
        const t = await sequelize.transaction();
        try {
            const request = await Fppl.findByPk(requestId, { transaction: t, lock: t.LOCK.UPDATE });
            if (!request)
                throw new Error('Permohonan tidak ditemukan.');
            if (request.status_fppl !== RequestStatus.WAITING_PARAMETER)
                throw new Error(`Status permohonan saat ini adalah: ${request.status_fppl}`);
            if (!Array.isArray(selections) || selections.length === 0)
                throw new Error('Pilihan metode tidak boleh kosong.');

            const fpplSampels = await FpplSampel.findAll({
                where: { id_registrasi: request.id_registrasi },
                attributes: ['id_registrasi', 'id_jenis_sampel', 'id_reg_bm'],
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            const validSampleCompositeKeys = new Set(
                fpplSampels.map((row) => buildFpplSampelCompositeKey(row)).filter((key) => key && key !== '||')
            );

            const requestFpmsRaw = await FpplParameterMetode.findAll({
                where: { id_registrasi: request.id_registrasi },
                order: [['id_fppl_parameter_metode', 'ASC']],
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            const requestFpmsFiltered = validSampleCompositeKeys.size > 0
                ? requestFpmsRaw.filter((fpm) => validSampleCompositeKeys.has(buildFpplSampelCompositeKey(fpm)))
                : requestFpmsRaw;
            const requestFpms = Array.from(new Map(
                requestFpmsFiltered.map((fpm) => [String(fpm.id_fppl_parameter_metode), fpm])
            ).values());
            if (requestFpms.length === 0)
                throw new Error('Parameter permohonan tidak ditemukan.');

            const rowByFpmId = new Map(requestFpms.map((fpm) => [String(fpm.id_fppl_parameter_metode), fpm]));
            const requiredGroupByKey = new Map();
            for (const fpm of requestFpms) {
                const key = buildFpplParameterBusinessKey(fpm);
                if (!requiredGroupByKey.has(key)) {
                    requiredGroupByKey.set(key, {
                        key,
                        representative: fpm,
                        rows: [],
                    });
                }
                requiredGroupByKey.get(key).rows.push(fpm);
            }

            const selectionByGroupKey = new Map();
            for (const sel of selections) {
                const fpmId = String(sel.fpmId || sel.id_fppl_parameter_metode || sel.idFpplParameterMetode || '').trim();
                if (!fpmId)
                    throw new Error('fpmId wajib diisi.');
                const matchedFpm = rowByFpmId.get(fpmId);
                if (!matchedFpm)
                    throw new Error(`Parameter sampel ${fpmId} tidak sesuai dengan permohonan ${request.id_registrasi}.`);
                const groupKey = buildFpplParameterBusinessKey(matchedFpm);
                const existingSelection = selectionByGroupKey.get(groupKey);
                if (existingSelection) {
                    const existingMethod = String(existingSelection.methodId || existingSelection.id_metode_parameter || existingSelection.idMetodeParameter || '').trim();
                    const nextMethod = String(sel.methodId || sel.id_metode_parameter || sel.idMetodeParameter || '').trim();
                    const existingCapability = String(existingSelection.capabilityStatus || existingSelection.status_kemampuan_lab || existingSelection.statusKemampuanLab || '').toUpperCase();
                    const nextCapability = String(sel.capabilityStatus || sel.status_kemampuan_lab || sel.statusKemampuanLab || '').toUpperCase();
                    if (existingMethod !== nextMethod || existingCapability !== nextCapability) {
                        throw new Error(`Pilihan metode untuk parameter ${compactBusinessKeyLabel(groupKey)} dikirim lebih dari satu kali dengan nilai berbeda.`);
                    }
                    continue;
                }
                selectionByGroupKey.set(groupKey, sel);
            }

            if (selectionByGroupKey.size !== requiredGroupByKey.size) {
                const missingLabels = Array.from(requiredGroupByKey.keys())
                    .filter((key) => !selectionByGroupKey.has(key))
                    .map(compactBusinessKeyLabel)
                    .filter(Boolean);
                throw new Error(`Semua parameter wajib ditentukan status dan metodenya. Belum lengkap: ${missingLabels.join(', ') || 'parameter tidak teridentifikasi'}`);
            }

            for (const group of requiredGroupByKey.values()) {
                const fpm = group.representative;
                const sel = selectionByGroupKey.get(group.key);
                const capabilityStatus = String(sel.capabilityStatus || sel.status_kemampuan_lab || sel.statusKemampuanLab || '').toUpperCase();
                if (!['MAMPU', 'TIDAK_MAMPU'].includes(capabilityStatus))
                    throw new Error(`Status kemampuan laboratorium untuk parameter ${compactBusinessKeyLabel(group.key)} harus MAMPU atau TIDAK_MAMPU.`);
                const isInsitu = this.normalizeBoolean01(sel.isInsitu ?? sel.is_insitu ?? sel.insitu);
                if (![0, 1].includes(isInsitu))
                    throw new Error(`Status insitu wajib dipilih untuk parameter ${compactBusinessKeyLabel(group.key)}.`);
                const selectedMethodId = sel.methodId || sel.id_metode_parameter || sel.idMetodeParameter;
                if (!selectedMethodId)
                    throw new Error(`Metode wajib dipilih untuk parameter ${compactBusinessKeyLabel(group.key)}.`);
                const pm = await ParameterMetode.findOne({ where: { id_metode_parameter: selectedMethodId, id_parameter: fpm.id_parameter }, transaction: t });
                if (!pm)
                    throw new Error(`Metode ${selectedMethodId} tidak valid untuk parameter ${fpm.id_parameter}.`);
                if (!(pm.is_active === true || pm.is_active === 1 || pm.is_active === '1'))
                    throw new Error(`Metode ${selectedMethodId} sedang nonaktif dan tidak dapat dipilih untuk permohonan baru.`);
                const isSubkontrak = Number(pm.is_subkontrak) === 1 || pm.is_subkontrak === true || pm.is_subkontrak === '1';
                if (capabilityStatus === 'MAMPU' && isSubkontrak)
                    throw new Error(`Parameter ${compactBusinessKeyLabel(group.key)}: status MAMPU harus memilih metode internal.`);
                if (capabilityStatus === 'TIDAK_MAMPU' && !isSubkontrak)
                    throw new Error(`Parameter ${compactBusinessKeyLabel(group.key)}: status TIDAK_MAMPU harus memilih metode subkontrak.`);

                await Promise.all(group.rows.map((row) => row.update({
                    id_metode_parameter: selectedMethodId,
                    status_kemampuan_lab: capabilityStatus,
                    is_insitu: isInsitu,
                    catatan_kemampuan: sel.capabilityNote || sel.catatan_kemampuan || sel.catatanKemampuan || null,
                    dipilih_oleh: kasiNik || null,
                    dipilih_pada: new Date()
                }, { transaction: t })));
            }
            const previousStatus = request.status_fppl;
            await request.update({ status_fppl: RequestStatus.WAITING_PAYMENT, catatan_penolakan: null }, { transaction: t });
            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: request.id_registrasi,
                action: 'MENETAPKAN_METODE_DAN_INVOICE',
                statusBefore: previousStatus,
                statusAfter: RequestStatus.WAITING_PAYMENT,
                source: 'Kasi',
                note: 'Kasi Pengujian menetapkan metode uji dan sistem menerbitkan invoice.',
                actorNik: kasiNik || null,
                transaction: t,
            });
            const { createOrRefreshInvoiceForRequest } = require('../payment/payment.service');
            const invoice = await createOrRefreshInvoiceForRequest(requestId, t);
            await t.commit();
            return {
                id_registrasi: request.id_registrasi,
                status: RequestStatus.WAITING_PAYMENT,
                id_invoice: invoice?.id_invoice || null,
                invoiceId: invoice?.id_invoice || null,
            };
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    };
    rejectRequest = async (requestId, alasan, kasiNik = null) => {
        const request = await Fppl.findByPk(requestId);
        if (!request)
            throw new Error('Permohonan tidak ditemukan.');
        const previousStatus = request.status_fppl;
        await request.update({ status_fppl: RequestStatus.REJECTED_BY_KASI, catatan_penolakan: alasan ? `[Kasi] ${alasan}` : null });
        await WorkflowLogService.logStatusTransition({
            entityType: 'FPPL',
            entityId: request.id_registrasi,
            action: 'MENOLAK_PERMOHONAN_KASI',
            statusBefore: previousStatus,
            statusAfter: RequestStatus.REJECTED_BY_KASI,
            source: 'Kasi',
            note: alasan || null,
            actorNik: kasiNik || null,
        });
        return {
            id_registrasi: request.id_registrasi,
            status: RequestStatus.REJECTED_BY_KASI,
            catatan_penolakan: request.catatan_penolakan,
        };
    };
    saveSamplingSchedule = async (requestId, scheduleDate, scheduleTime) => {
        const t = await sequelize.transaction();
        try {
            const requestRecord = await Fppl.findByPk(requestId, { transaction: t, lock: t.LOCK.UPDATE });
            if (!requestRecord)
                throw new Error('Permohonan tidak ditemukan.');
            await normalizeLegacyPaymentVerificationIfSettled(requestRecord, t);
            if (!this.isSampleScheduleEditableStatus(requestRecord.status_fppl)) {
                throw new Error(`Jadwal hanya dapat disimpan setelah permohonan disetujui admin dan sebelum sampel diterima. Status saat ini: ${requestRecord.status_fppl}`);
            }
            const normalizedDate = normalizeScheduleDateOnly(scheduleDate, 'Tanggal jadwal');
            const normalizedTime = normalizeScheduleTimeForDb(scheduleTime, 'Jam jadwal');
            await this.assertBusinessDateOrThrow(normalizedDate, 'Tanggal jadwal');
            const existingSchedule = await JadwalSampel.findOne({
                where: { id_registrasi: requestId, status_jadwal: { [Op.ne]: 'Dibatalkan' } },
                order: [['dibuat_pada', 'DESC'], ['id_jadwal', 'DESC']],
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            let savedSchedule = existingSchedule;
            let actionType = 'updated';
            if (!existingSchedule) {
                const newScheduleId = await generateId(JadwalSampel, 'id_jadwal', 'JDW-');
                savedSchedule = await JadwalSampel.create({ id_jadwal: newScheduleId, id_registrasi: requestId, tanggal_jadwal: normalizedDate, jam_jadwal: normalizedTime, status_jadwal: 'Terjadwal' }, { transaction: t });
                actionType = 'created';
            }
            else {
                await existingSchedule.update({ tanggal_jadwal: normalizedDate, jam_jadwal: normalizedTime, status_jadwal: 'Terjadwal' }, { transaction: t });
                savedSchedule = existingSchedule;
            }
            const requestPayload = { catatan_penolakan: null };
            if (requestRecord.jenis_pengambilan_sampel === 'Petugas') {
                requestPayload.tanggal_rencana_pengambilan_sampel = normalizedDate;
                requestPayload.jam_rencana_pengambilan_sampel = normalizedTime;
            }
            else {
                requestPayload.tanggal_rencana_pengantaran_sampel = normalizedDate;
            }
            await requestRecord.update(requestPayload, { transaction: t });
            await WorkflowLogService.logStatusTransition({
                entityType: 'JADWAL_SAMPEL',
                entityId: savedSchedule.id_jadwal,
                action: actionType === 'created' ? 'MENJADWALKAN_SAMPEL' : 'MEMPERBARUI_JADWAL_SAMPEL',
                statusBefore: null,
                statusAfter: savedSchedule.status_jadwal,
                source: 'Admin',
                note: actionType === 'created' ? 'Jadwal sampel dibuat.' : 'Jadwal sampel diperbarui.',
                actorNik: null,
                transaction: t,
            });
            await t.commit();
            return {
                id_registrasi: requestRecord.id_registrasi,
                status: requestRecord.status_fppl,
                actionType,
                jadwal: {
                    id_jadwal: savedSchedule.id_jadwal,
                    tanggal_jadwal: savedSchedule.tanggal_jadwal,
                    jam_jadwal: savedSchedule.jam_jadwal,
                    status_jadwal: savedSchedule.status_jadwal,
                    jenis_pengambilan_sampel: requestRecord.jenis_pengambilan_sampel,
                    tanggal_iso: `${savedSchedule.tanggal_jadwal}T${String(savedSchedule.jam_jadwal).slice(0, 8)}`
                }
            };
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    };
    isValidBusinessDate = (dateStr) => {
        if (!dateStr)
            return false;
        const date = new Date(`${dateStr}T00:00:00`);
        const day = date.getDay();
        return day !== 0 && day !== 6;
    };
    isValidTime24h = (timeStr) => {
        try {
            normalizeScheduleTimeForDb(timeStr, 'Jam jadwal');
            return true;
        }
        catch (_) {
            return false;
        }
    };
    formatTimeForDb = (timeStr) => {
        return normalizeScheduleTimeForDb(timeStr, 'Jam jadwal');
    };
    normalizeTimeForCompare = (timeStr = '') => {
        const raw = String(timeStr || '').trim();
        if (/^\d{2}:\d{2}$/.test(raw))
            return `${raw}:00`;
        return raw.slice(0, 8);
    };
    buildDateTime = (dateStr, timeStr) => {
        return new Date(`${dateStr}T${this.normalizeTimeForCompare(timeStr)}`);
    };
    isWeekendDate = (dateStr) => {
        const [year, month, day] = String(dateStr || '').split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const weekday = date.getDay();
        return weekday === 0 || weekday === 6;
    };
    getHolidayLookup = async () => {
        const holidays = await this.referenceService.getHariLibur();
        const holidayDateSet = new Set();
        const holidayNameByDate = {};
        for (const item of holidays || []) {
            if (!item?.date)
                continue;
            holidayDateSet.add(item.date);
            holidayNameByDate[item.date] = item.nama || 'Hari libur nasional';
        }
        return { holidayDateSet, holidayNameByDate };
    };
    assertBusinessDateOrThrow = async (dateValue, label = 'Tanggal') => {
        let holidays = [];
        try {
            holidays = await this.referenceService.getHariLibur();
        }
        catch (error) {
            throw new Error(`Gagal memvalidasi tanggal merah: ${error.message || 'referensi hari libur tidak tersedia'}.`);
        }
        return assertScheduleBusinessDateOrThrow(dateValue, label, holidays);
    };
    validateReceiptDateTimeOrThrow = ({ receiptDate, receiptTime, scheduleDate, scheduleTime, holidayDateSet, holidayNameByDate, sampleIndex }) => {
        if (this.isWeekendDate(receiptDate))
            throw new Error(`Sample ${sampleIndex}: tanggal penerimaan tidak boleh hari Sabtu atau Minggu.`);
        if (holidayDateSet.has(receiptDate))
            throw new Error(`Sample ${sampleIndex}: tanggal penerimaan tidak boleh tanggal merah (${holidayNameByDate[receiptDate]}).`);
        const receiptDateTime = this.buildDateTime(receiptDate, receiptTime);
        const scheduleDateTime = this.buildDateTime(scheduleDate, scheduleTime);
        if (receiptDateTime < scheduleDateTime) {
            throw new Error(`Sample ${sampleIndex}: tanggal/jam penerimaan tidak boleh lebih awal dari jadwal aktif (${scheduleDate} ${String(scheduleTime).slice(0, 5)}).`);
        }
    };
    generateNextJadwalId = async () => {
        const last = await JadwalSampel.findOne({ order: [['id_jadwal', 'DESC']] });
        if (!last)
            return 'JDW-001';
        const num = Number(String(last.id_jadwal).replace('JDW-', '')) || 0;
        return `JDW-${String(num + 1).padStart(3, '0')}`;
    };
    createOrUpdateSamplingSchedule = async ({ idRegistrasi, tanggalPengambilan, jamPengambilan, idPegawaiPcc }) => {
        const t = await sequelize.transaction();
        try {
            const request = await Fppl.findByPk(idRegistrasi, { transaction: t, lock: t.LOCK.UPDATE });
            if (!request)
                throw new Error('Permohonan tidak ditemukan.');
            await normalizeLegacyPaymentVerificationIfSettled(request, t);
            if (request.status_fppl === RequestStatus.WAITING_PAYMENT_VERIFICATION) {
                throw new Error('Jadwal belum dapat dibuat karena data lama masih berstatus verifikasi pembayaran dan invoice belum Lunas/Bayar Nanti.');
            }
            if (!this.isSampleScheduleEditableStatus(request.status_fppl)) {
                throw new Error(`Jadwal hanya dapat dibuat setelah permohonan disetujui admin dan sebelum sampel diterima. Status saat ini: ${request.status_fppl}`);
            }
            const normalizedScheduleDate = normalizeScheduleDateOnly(tanggalPengambilan, 'Tanggal jadwal');
            const normalizedScheduleTime = normalizeScheduleTimeForDb(jamPengambilan, 'Jam jadwal');
            await this.assertBusinessDateOrThrow(normalizedScheduleDate, 'Tanggal jadwal');
            const isOfficerSampling = request.jenis_pengambilan_sampel === 'Petugas';
            const isSelfDelivery = request.jenis_pengambilan_sampel === 'Mandiri';
            if (!isOfficerSampling && !isSelfDelivery)
                throw new Error('Jenis pengambilan sampel tidak valid.');
            let pccPayload = { id_pegawai_pcc: null };
            if (isOfficerSampling) {
                if (!idPegawaiPcc)
                    throw new Error('PCC wajib dipilih.');
                const pegawaiPcc = await Pegawai.findOne({ where: { id_pegawai: idPegawaiPcc, is_pcc: 1 }, transaction: t });
                if (!pegawaiPcc)
                    throw new Error('PCC tidak valid.');
                pccPayload = { id_pegawai_pcc: idPegawaiPcc };
            }
            const existingSchedule = await JadwalSampel.findOne({
                where: { id_registrasi: idRegistrasi, status_jadwal: { [Op.ne]: 'Dibatalkan' } },
                order: [['dibuat_pada', 'DESC']],
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            const schedulePayload = {
                tanggal_jadwal: normalizedScheduleDate,
                jam_jadwal: normalizedScheduleTime,
                status_jadwal: 'Terjadwal',
                ...pccPayload
            };
            let jadwal;
            let actionType = 'updated';
            if (existingSchedule) {
                jadwal = await existingSchedule.update(schedulePayload, { transaction: t });
            }
            else {
                jadwal = await JadwalSampel.create({ id_jadwal: await this.generateNextJadwalId(), id_registrasi: idRegistrasi, ...schedulePayload }, { transaction: t });
                actionType = 'created';
            }
            await t.commit();
            return {
                actionType,
                id_registrasi: idRegistrasi,
                jenis_pengambilan_sampel: request.jenis_pengambilan_sampel,
                jadwal: {
                    id_jadwal: jadwal.id_jadwal,
                    tanggal_jadwal: jadwal.tanggal_jadwal,
                    jam_jadwal: jadwal.jam_jadwal,
                    id_pegawai_pcc: jadwal.id_pegawai_pcc,
                    status_jadwal: jadwal.status_jadwal
                }
            };
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    };
    receiveSamplesAndGenerateCodes = async (idRegistrasi, payload = {}, currentNik = null) => {
        const transaction = await sequelize.transaction();
        try {
            const sampelsPayload = Array.isArray(payload) ? payload : Array.isArray(payload.sampels) ? payload.sampels : [];
            const request = await Fppl.findByPk(idRegistrasi, { transaction, lock: transaction.LOCK.UPDATE });
            if (!request)
                throw new Error('Permohonan tidak ditemukan.');
            await assertRequestReadyForSampleReceipt(request, transaction);
            const jadwalAktif = await JadwalSampel.findOne({
                where: { id_registrasi: idRegistrasi, status_jadwal: { [Op.ne]: 'Dibatalkan' } },
                order: [['tanggal_jadwal', 'DESC'], ['jam_jadwal', 'DESC'], ['dibuat_pada', 'DESC']],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!jadwalAktif) {
                throw new Error('Sampel belum dapat diterima karena jadwal pengambilan/pengantaran sampel belum ditetapkan admin.');
            }
            const fpplSampelRows = await FpplSampel.findAll({
                where: { id_registrasi: idRegistrasi },
                include: [
                    { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'], required: false },
                    { model: FpplParameterMetode, attributes: ['id_fppl_parameter_metode', 'id_registrasi', 'id_jenis_sampel', 'id_reg_bm'], required: false }
                ],
                order: [['id_jenis_sampel', 'ASC'], ['id_reg_bm', 'ASC']],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!fpplSampelRows.length)
                throw new Error('Data kelompok sampel pada permohonan tidak ditemukan.');
            const existingSamples = await Sampel.count({
                where: { id_registrasi: idRegistrasi },
                transaction
            });
            if (existingSamples > 0)
                throw new Error('Nomor sampel untuk permohonan ini sudah pernah dibuat.');
            const receivedAt = new Date();
            const tanggalPenerimaan = formatLocalYmd(receivedAt);
            const jamPenerimaan = formatLocalHms(receivedAt);
            const diterimaPada = `${tanggalPenerimaan} ${jamPenerimaan}`;
            let nextSequence = await getNextSampleSequence(transaction);
            const generatedSamples = [];
            for (const fpplSampel of fpplSampelRows) {
                const fpplSampelJson = filterFpplSampelCompositeChildren(fpplSampel.toJSON());
                const jenisSampel = fpplSampelJson.jenis_sampel?.jenis_sampel ||
                    fpplSampelJson.JenisSampel?.jenis_sampel ||
                    fpplSampelJson.jenisSampel?.jenis_sampel ||
                    '-';
                const parameterRows = fpplSampelJson.fppl_parameter_metodes ||
                    fpplSampelJson.FpplParameterMetodes ||
                    fpplSampelJson.fpplParameterMetodes ||
                    [];
                const payloadForThisGroup = sampelsPayload.filter((item) => {
                    const itemKey = normalizeFpplSampelCompositePayload({ ...item, id_registrasi: item.id_registrasi || item.idRegistrasi || idRegistrasi });
                    return itemKey ? sameFpplSampelComposite(itemKey, fpplSampelJson) : false;
                });
                const jumlahSampelDb = Number(fpplSampelJson.jumlah_sampel || 1);
                const totalSampel = Number.isFinite(jumlahSampelDb) && jumlahSampelDb > 0 ? jumlahSampelDb : Math.max(payloadForThisGroup.length, 1);
                for (let i = 0; i < totalSampel; i += 1) {
                    const itemPayload = payloadForThisGroup.find((item) => Number(item.sample_unit_index) === i + 1) ||
                        payloadForThisGroup[i] ||
                        {};
                    const noSampel = buildNoSampel(nextSequence, jenisSampel, receivedAt, fpplSampelJson.id_jenis_sampel);
                    nextSequence += 1;
                    const tanggalPengambilanSampel = resolveTanggalPengambilanSampel({
                        itemPayload,
                        payload,
                        request,
                        jadwal: jadwalAktif,
                    });
                    if (!tanggalPengambilanSampel) {
                        throw new Error(`Tanggal pengambilan sampel wajib diisi untuk sampel ${noSampel}.`);
                    }
                    const sampleInstance = await Sampel.create({
                        no_sampel: noSampel,
                        id_registrasi: fpplSampelJson.id_registrasi,
                        id_jenis_sampel: fpplSampelJson.id_jenis_sampel,
                        id_reg_bm: fpplSampelJson.id_reg_bm,
                        tanggal_pengambilan_sampel: tanggalPengambilanSampel,
                        diterima_pada: diterimaPada,
                        kondisi_sampel: normalizeSampleCondition(itemPayload.kondisi_sampel || itemPayload.kondisiSampel || payload.kondisi_sampel || payload.kondisiSampel || 'Sesuai'),
                        abnormalitas_sampel: itemPayload.abnormalitas_sampel || itemPayload.abnormalitasSampel || payload.abnormalitas_sampel || payload.abnormalitasSampel || null,
                        acuan_pengambilan_sampel: itemPayload.acuan_pengambilan_sampel || itemPayload.acuanPengambilanSampel || payload.acuan_pengambilan_sampel || payload.acuanPengambilanSampel || null,
                        lokasi_spesifik: itemPayload.lokasi_spesifik || itemPayload.lokasiSpesifik || payload.lokasi_spesifik || payload.lokasiSpesifik || null,
                        koordinat: itemPayload.koordinat || payload.koordinat || null,
                        diterima_oleh: currentNik || payload.diterima_oleh || payload.diterimaOleh || null,
                        status_sample: 'Diterima',
                    }, { transaction });
                    await WorkflowLogService.logStatusTransition({
                        entityType: 'SAMPEL',
                        entityId: noSampel,
                        action: 'MENERIMA_SAMPEL',
                        statusBefore: null,
                        statusAfter: sampleInstance.status_sample || 'Diterima',
                        source: 'Admin',
                        note: 'Sampel diterima oleh laboratorium.',
                        actorNik: currentNik || payload.diterima_oleh || payload.diterimaOleh || null,
                        createdAt: receivedAt,
                        transaction,
                    });
                    for (const parameter of parameterRows) {
                        await SampelParameter.create({ no_sampel: noSampel, id_fppl_parameter_metode: parameter.id_fppl_parameter_metode }, { transaction });
                    }
                    generatedSamples.push({
                        no_sampel: noSampel,
                        id_registrasi: fpplSampelJson.id_registrasi,
                        id_jenis_sampel: fpplSampelJson.id_jenis_sampel,
                        id_reg_bm: fpplSampelJson.id_reg_bm,
                        jenis_sampel: jenisSampel,
                        tanggal_pengambilan_sampel: tanggalPengambilanSampel,
                        diterima_pada: diterimaPada,
                        lokasi_spesifik: itemPayload.lokasi_spesifik || itemPayload.lokasiSpesifik || payload.lokasi_spesifik || payload.lokasiSpesifik || null,
                        koordinat: itemPayload.koordinat || payload.koordinat || null,
                        total_parameter: parameterRows.length,
                    });
                }
            }
            if (jadwalAktif && jadwalAktif.status_jadwal !== 'Selesai') {
                const previousJadwalStatus = jadwalAktif.status_jadwal;
                await jadwalAktif.update({
                    status_jadwal: 'Selesai',
                }, { transaction });
                await WorkflowLogService.logStatusTransition({
                    entityType: 'JADWAL_SAMPEL',
                    entityId: jadwalAktif.id_jadwal,
                    action: 'MENYELESAIKAN_JADWAL_SAMPEL',
                    statusBefore: previousJadwalStatus,
                    statusAfter: 'Selesai',
                    source: 'Admin',
                    note: 'Jadwal sampel diselesaikan saat sampel diterima.',
                    actorNik: currentNik || null,
                    transaction,
                });
            }
            const previousStatus = request.status_fppl;
            await request.update({ status_fppl: RequestStatus.TESTING_PROCESS || 'Proses Pengujian' }, { transaction });
            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: request.id_registrasi,
                action: 'MENERIMA_SAMPEL',
                statusBefore: previousStatus,
                statusAfter: RequestStatus.TESTING_PROCESS,
                source: 'Admin',
                note: 'Sampel diterima dan nomor sampel dibuat.',
                actorNik: currentNik || null,
                transaction,
            });
            await transaction.commit();
            return {
                id_registrasi: idRegistrasi,
                status: RequestStatus.TESTING_PROCESS,
                total_sampels: generatedSamples.length,
                sampels: generatedSamples,
            };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };
    generateFpplNumber = async (requestId, fallbackDate = null, transaction = undefined) => {
        const request = await Fppl.findByPk(requestId, {
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
        if (!request) {
            throw new Error('Permohonan tidak ditemukan.');
        }
        if (request.nomor_fppl) {
            return request.nomor_fppl;
        }
        // Tanggal penetapan FPPL = saat nomor FPPL dibuat.
        // Kalau ada fallbackDate dari controller, pakai itu.
        const tanggalPenetapan = fallbackDate || new Date();
        const nomorFppl = await generateNomorFppl(Fppl, transaction, tanggalPenetapan);
        await request.update({
            nomor_fppl: nomorFppl,
            tanggal_verifikasi: request.tanggal_verifikasi || tanggalPenetapan,
        }, { transaction });
        return nomorFppl;
    };
}
module.exports = new RequestWorkflowService();
module.exports.RequestWorkflowService = RequestWorkflowService;
