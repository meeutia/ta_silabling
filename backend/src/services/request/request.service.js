const { Op } = require('sequelize');
const { withPaketBmDisplayFields, buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
const { sequelize, Fppl, FpplSampel, FpplParameterMetode, Pelanggan, JenisSampel, RegBm, ParameterMetode, Parameter, Metode, TarifPengambilan, JadwalSampel, PktBm, Klasifikasi, Pegawai, Sampel, SampelParameter, Penugasan, PenugasanDetail, PenugasanItem, Lka, LkaHasil, Lhu, JadwalPengambilanLhu, PengajuanPerubahanJadwal, User, PermintaanSubkontrak } = require('../../models/Associations');
const { generateId } = require('../../utils/id-generator');
const { buildInvoiceSummary } = require('../payment/payment-billing.service');
const { getAvailablePaymentMethods } = require('../payment/payment-policy.util');
const RequestStatus = require('../../constants/request-status');
const Roles = require('../../constants/roles');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { buildPenyeliaRequestSummary, deriveCustomerDecisionStatus, deriveCustomerHistoryStatus, getKasiDecisionStatus, resolveSampleQuantity, resolveSamplingLocation, resolveSamplingSchedule, resolveSamplingType } = require('./request-transform.util');
const { decorateSampleReceiptFields, decorateScheduleFields, stripCustomerSensitiveLhuData, stripSignedLhuStorageFields } = require('./request-schedule-fields.util');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');
const { ACTIVE_REQUEST_STATUSES, buildDuplicateFingerprint, serializeDuplicateFingerprint, isDuplicateRequest, normalizeCompanyName } = require('./request-duplicate.util');
const LhuSignedFileService = require('../lhu/lhu-signed-file.service');
const {
    normalizeRequestWritePayload,
    validateRequestSampleComposition,
    buildCandidateSamples,
    buildCandidateParameters,
    buildFpplWriteFields
} = require('./request-write.util');
const sameFpplSampelComposite = (a = {}, b = {}) => {
    const pick = (row, snake, camel) => String(row?.[snake] ?? row?.[camel] ?? '').trim();
    return pick(a, 'id_registrasi', 'idRegistrasi') === pick(b, 'id_registrasi', 'idRegistrasi') &&
        pick(a, 'id_jenis_sampel', 'idJenisSampel') === pick(b, 'id_jenis_sampel', 'idJenisSampel') &&
        pick(a, 'id_reg_bm', 'idRegBm') === pick(b, 'id_reg_bm', 'idRegBm');
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
const normalizeRequestFpplSampelGraph = (requestJson = {}) => {
    ['fppl_sampels', 'FpplSampels', 'fpplSampels'].forEach((key) => {
        if (Array.isArray(requestJson[key])) {
            requestJson[key] = requestJson[key].map(filterFpplSampelCompositeChildren);
        }
    });
    return requestJson;
};
class RequestService {
    /**
     * Memeriksa apakah permohonan baru merupakan duplikat dari permohonan aktif.
     * Jika duplikat ditemukan, melempar Error dengan code 'DUPLICATE_REQUEST'.
     *
     * @param {string} idPelanggan  - ID pelanggan yang membuat permohonan baru
     * @param {Object} newFppl      - Data FPPL baru (plain object, sebelum insert)
     * @param {Array}  newSampels   - Array entry sampel baru
     * @param {Array}  newParams    - Array entry parameter baru (flat: {id_jenis_sampel, id_reg_bm, id_parameter}[])
     */
    checkDuplicateRequest = async ({ userNik, companyName, candidateFppl, candidateSampels, candidateParams, excludeRegistrationId, transaction }) => {
        // Ambil semua permohonan aktif beserta pelanggan
        const whereClause = { status_fppl: { [Op.in]: ACTIVE_REQUEST_STATUSES } };
        if (excludeRegistrationId) {
            whereClause.id_registrasi = { [Op.ne]: excludeRegistrationId };
        }

        const activeFppls = await Fppl.findAll({
            where: whereClause,
            attributes: [
                'id_registrasi',
                'nomor_fppl',
                'id_pelanggan',
                'maksud_pengujian',
                'lokasi_pengambilan_sampel',
                'jenis_pengambilan_sampel',
                'tanggal_rencana_pengambilan_sampel',
                'jam_rencana_pengambilan_sampel',
                'tanggal_rencana_pengantaran_sampel',
                'status_fppl',
                'tanggal_pendaftaran',
            ],
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    attributes: ['id_pelanggan', 'nik', 'nama_instansi', 'pic', 'no_telp'],
                    required: true
                }
            ],
            transaction
        });

        if (!activeFppls || activeFppls.length === 0) return;

        const normalizedCompany = normalizeCompanyName(companyName);
        const sameCompanyFppls = activeFppls.filter(f => {
            const fCustomer = f.pelanggan || f.Pelanggan;
            return normalizeCompanyName(fCustomer.nama_instansi) === normalizedCompany;
        });

        const registrationIds = sameCompanyFppls.map(f => f.id_registrasi);

        // Ambil data sampel dan parameter untuk permohonan yang ada (untuk perbandingan komposisi)
        const [existingSampels, existingParams] = await Promise.all([
            FpplSampel.findAll({
                where: { id_registrasi: { [Op.in]: registrationIds } },
                attributes: ['id_registrasi', 'id_jenis_sampel', 'id_reg_bm', 'jumlah_sampel'],
                transaction
            }),
            FpplParameterMetode.findAll({
                where: { id_registrasi: { [Op.in]: registrationIds } },
                attributes: ['id_registrasi', 'id_jenis_sampel', 'id_reg_bm', 'id_parameter'],
                transaction
            })
        ]);

        // Buat lookup per id_registrasi
        const sampelsByReg = {};
        const paramsByReg = {};
        for (const s of existingSampels) {
            const id = s.id_registrasi;
            if (!sampelsByReg[id]) sampelsByReg[id] = [];
            sampelsByReg[id].push(s.toJSON());
        }
        for (const p of existingParams) {
            const id = p.id_registrasi;
            if (!paramsByReg[id]) paramsByReg[id] = [];
            paramsByReg[id].push(p.toJSON());
        }

        // Fingerprint kandidat baru — include komposisi sampel & parameter
        const newFingerprint = buildDuplicateFingerprint(
            companyName,
            candidateFppl,
            candidateSampels || [],
            candidateParams || []
        );

        for (const existingFppl of sameCompanyFppls) {
            const existingFpplJson = existingFppl.toJSON();
            const existingCustomer = existingFpplJson.pelanggan || existingFpplJson.Pelanggan;
            const regId = existingFpplJson.id_registrasi;

            const existingFingerprint = buildDuplicateFingerprint(
                existingCustomer.nama_instansi,
                existingFpplJson,
                sampelsByReg[regId] || [],
                paramsByReg[regId] || []
            );

            if (isDuplicateRequest(newFingerprint, existingFingerprint)) {
                const isSameAccount = String(existingCustomer.nik) === String(userNik);

                if (isSameAccount) {
                    const error = new Error('Anda masih memiliki permohonan aktif dengan data pengujian yang sama (jenis air, standar, parameter, dan jumlah identik).');
                    error.code = 'DUPLICATE_REQUEST';
                    error.duplicateScope = 'OWN_ACCOUNT';
                    error.canViewExisting = true;
                    error.existingRequest = {
                        id_registrasi: existingFpplJson.id_registrasi,
                        nomor_fppl: existingFpplJson.nomor_fppl || null,
                        status_fppl: existingFpplJson.status_fppl,
                        tanggal_pendaftaran: existingFpplJson.tanggal_pendaftaran,
                    };
                    error.duplicateMetadata = {
                        existingSchedule: {
                            tanggal_pengambilan: existingFpplJson.tanggal_rencana_pengambilan_sampel || null,
                            jam_pengambilan: existingFpplJson.jam_rencana_pengambilan_sampel || null,
                            tanggal_pengantaran: existingFpplJson.tanggal_rencana_pengantaran_sampel || null,
                        }
                    };
                    throw error;
                } else {
                    const picName = existingCustomer.pic || 'PIC Perusahaan';
                    const picPhone = existingCustomer.no_telp || '-';
                    const error = new Error(`Permohonan dengan jenis air, standar baku mutu, parameter, dan jumlah yang sama sudah didaftarkan pada sistem oleh akun lain. PIC yang memegang permohonan tersebut adalah ${picName} (${picPhone}).`);
                    error.code = 'DUPLICATE_REQUEST';
                    error.duplicateScope = 'SAME_COMPANY_OTHER_ACCOUNT';
                    error.canViewExisting = false;
                    error.existingRequest = null;
                    error.picName = picName;
                    error.picPhone = picPhone;
                    throw error;
                }
            }
        }
    };

    validateStep1Duplicate = async (userNik, data) => {
        // Pengecekan duplikasi di Step 1/3 UI ditiadakan karena belum ada parameter.
        // Pengecekan duplikasi yang sebenarnya dilakukan di Step 2/4 UI (via validateStep2Duplicate) 
        // dan saat final submission.
        return { isDuplicate: false };
    };


    /**
     * Cek apakah komposisi sampel+parameter dari form Step 2 sudah ada
     * di permohonan aktif manapun (lintas semua perusahaan).
     *
     * Hanya membandingkan: jenis air (id_jenis_sampel) + standar (id_reg_bm)
     * + parameter (id_parameter) + jumlah (jumlah_sampel).
     * Tidak membandingkan nama perusahaan, lokasi, atau jadwal.
     *
     * Mengembalikan daftar permohonan yang cocok beserta info PIC-nya.
     * Tidak melempar error — caller memutuskan bagaimana menanganinya.
     */
    validateStep2Duplicate = async (userNik, sampleEntries, excludeRegistrationId = null) => {
        // Bangun candidateSampels dan candidateParams dari input
        const candidateSampels = [];
        const candidateParams = [];

        for (const entry of sampleEntries) {
            const idJenisSampel = entry.idJenisSampel || entry.id_jenis_sampel;
            const idRegBm = entry.idRegBm || entry.id_reg_bm;
            const jumlahSampel = parseInt(entry.jumlahSampel || entry.jumlah_sampel, 10) || 1;
            const parameters = Array.isArray(entry.parameters) ? entry.parameters : [];

            if (idJenisSampel && idRegBm && parameters.length > 0) {
                candidateSampels.push({ id_jenis_sampel: idJenisSampel, id_reg_bm: idRegBm, jumlah_sampel: jumlahSampel });
                for (const idParameter of parameters) {
                    if (idParameter) {
                        candidateParams.push({ id_jenis_sampel: idJenisSampel, id_reg_bm: idRegBm, id_parameter: idParameter });
                    }
                }
            }
        }

        if (candidateSampels.length === 0) return { found: false };

        // Buat key set kandidat (sorted)
        const { normalizeText } = require('./request-duplicate.util');
        const candidateSampelKeys = Array.from(new Set(
            candidateSampels.map(s => `${normalizeText(s.id_jenis_sampel)}|${normalizeText(s.id_reg_bm)}|${parseInt(s.jumlah_sampel, 10) || 1}`)
        )).sort();
        const candidateParamKeys = Array.from(new Set(
            candidateParams.map(p => `${normalizeText(p.id_jenis_sampel)}|${normalizeText(p.id_reg_bm)}|${normalizeText(p.id_parameter)}`)
        )).sort();

        // Ambil semua permohonan aktif
        const whereClause = { status_fppl: { [Op.in]: ACTIVE_REQUEST_STATUSES } };
        if (excludeRegistrationId) {
            whereClause.id_registrasi = { [Op.ne]: excludeRegistrationId };
        }

        const activeFppls = await Fppl.findAll({
            where: whereClause,
            attributes: ['id_registrasi', 'id_pelanggan'],
            include: [{
                model: Pelanggan,
                as: 'pelanggan',
                attributes: ['id_pelanggan', 'nik', 'nama_instansi', 'pic', 'no_telp'],
                required: true
            }]
        });

        if (!activeFppls || activeFppls.length === 0) return { found: false };

        const allRegIds = activeFppls.map(f => f.id_registrasi);

        // Ambil sampel dan parameter dari semua permohonan aktif
        const [existingSampels, existingParams] = await Promise.all([
            FpplSampel.findAll({
                where: { id_registrasi: { [Op.in]: allRegIds } },
                attributes: ['id_registrasi', 'id_jenis_sampel', 'id_reg_bm', 'jumlah_sampel']
            }),
            FpplParameterMetode.findAll({
                where: { id_registrasi: { [Op.in]: allRegIds } },
                attributes: ['id_registrasi', 'id_jenis_sampel', 'id_reg_bm', 'id_parameter']
            })
        ]);

        // Buat lookup per id_registrasi
        const sampelsByReg = {};
        const paramsByReg = {};
        for (const s of existingSampels) {
            if (!sampelsByReg[s.id_registrasi]) sampelsByReg[s.id_registrasi] = [];
            sampelsByReg[s.id_registrasi].push(s);
        }
        for (const p of existingParams) {
            if (!paramsByReg[p.id_registrasi]) paramsByReg[p.id_registrasi] = [];
            paramsByReg[p.id_registrasi].push(p);
        }

        // Bandingkan tiap permohonan aktif
        const matches = [];
        for (const fppl of activeFppls) {
            const regId = fppl.id_registrasi;
            const pelanggan = fppl.pelanggan || fppl.Pelanggan;
            const mySampels = sampelsByReg[regId] || [];
            const myParams = paramsByReg[regId] || [];

            if (mySampels.length === 0 || myParams.length === 0) continue;

            const existSampelKeys = Array.from(new Set(
                mySampels.map(s => `${normalizeText(s.id_jenis_sampel)}|${normalizeText(s.id_reg_bm)}|${parseInt(s.jumlah_sampel, 10) || 1}`)
            )).sort();
            const existParamKeys = Array.from(new Set(
                myParams.map(p => `${normalizeText(p.id_jenis_sampel)}|${normalizeText(p.id_reg_bm)}|${normalizeText(p.id_parameter)}`)
            )).sort();

            const sampelMatch = JSON.stringify(candidateSampelKeys) === JSON.stringify(existSampelKeys);
            const paramMatch = JSON.stringify(candidateParamKeys) === JSON.stringify(existParamKeys);

            if (sampelMatch && paramMatch) {
                const isOwnAccount = String(pelanggan?.nik) === String(userNik);
                matches.push({
                    id_registrasi: regId,
                    isOwnAccount,
                    namaInstansi: pelanggan?.nama_instansi || '-',
                    pic: pelanggan?.pic || '-',
                    noTelp: pelanggan?.no_telp || '-',
                });
            }
        }

        if (matches.length === 0) return { found: false };

        return { found: true, matches };
    };


validateCompositionPersisted = async ({ id_registrasi, expectedSampelCount, expectedParameterCount, transaction }) => {
        const fpplCount = await Fppl.count({ where: { id_registrasi }, transaction });
        const fpplSampelCount = await FpplSampel.count({ where: { id_registrasi }, transaction });
        const fpplParamCount = await FpplParameterMetode.count({ where: { id_registrasi }, transaction });
        if (fpplCount !== 1 || fpplSampelCount !== expectedSampelCount || fpplParamCount !== expectedParameterCount) {
            throw new Error('Data FPPL tersimpan tidak lengkap. Silakan ulangi submit.');
        }
    };
    createRequest = async (userNik, data) => {
        const idPelanggan = data.idPelanggan || data.id_pelanggan || null;
        
        const normalizedData = normalizeRequestWritePayload(data);
        validateRequestSampleComposition(normalizedData.sampleEntries);

        // --- Susun kandidat untuk validasi anti-duplikasi ---
        const candidateSampels = buildCandidateSamples(normalizedData.sampleEntries);
        const candidateParams = buildCandidateParameters(normalizedData.sampleEntries);
        const candidateFppl = buildFpplWriteFields(normalizedData);

        const crypto = require('crypto');
        const fingerprint = buildDuplicateFingerprint(normalizedData.customer.namaInstansi, candidateFppl, candidateSampels, candidateParams);
        const serializedFingerprint = serializeDuplicateFingerprint(fingerprint);
        const lockHash = crypto.createHash('sha256').update(serializedFingerprint).digest('hex').slice(0, 48);
        const lockKey = `dup:${lockHash}`;

        const t = await sequelize.transaction();
        try {
            const [lockResult] = await sequelize.query(`SELECT GET_LOCK(:lockKey, 10) AS acquired`, {
                replacements: { lockKey },
                type: sequelize.QueryTypes.SELECT,
                transaction: t
            });

            if (!lockResult || lockResult.acquired !== 1) {
                throw new Error('Permohonan serupa sedang diproses. Silakan kirim ulang beberapa saat lagi.');
            }

            // Jalankan pengecekan duplikasi
            await this.checkDuplicateRequest({
                userNik,
                companyName: normalizedData.customer.namaInstansi,
                candidateFppl,
                candidateSampels,
                candidateParams,
                transaction: t
            });
            // --- Akhir validasi anti-duplikasi ---

            let pelanggan;
            if (idPelanggan) {
                pelanggan = await Pelanggan.findOne({ where: { id_pelanggan: idPelanggan, nik: userNik }, transaction: t });
            }
            
            if (pelanggan) {
                await pelanggan.update({
                    nama_instansi: normalizedData.customer.namaInstansi,
                    pic: normalizedData.customer.pic,
                    email_kontak: normalizedData.customer.emailPic,
                    no_telp: normalizedData.customer.noTelp,
                    alamat: normalizedData.customer.alamat
                }, { transaction: t });
            }
            else {
                const newIdPelanggan = await generateId(Pelanggan, 'id_pelanggan', 'PL-');
                pelanggan = await Pelanggan.create({
                    id_pelanggan: newIdPelanggan,
                    nik: userNik,
                    nama_instansi: normalizedData.customer.namaInstansi,
                    pic: normalizedData.customer.pic,
                    email_kontak: normalizedData.customer.emailPic,
                    no_telp: normalizedData.customer.noTelp,
                    alamat: normalizedData.customer.alamat
                }, { transaction: t });
            }


            const idRegistrasi = await generateId(Fppl, 'id_registrasi', 'REG-');
            await Fppl.create({
                id_registrasi: idRegistrasi,
                id_pelanggan: pelanggan.id_pelanggan,
                tanggal_pendaftaran: new Date(),
                ...candidateFppl,
                status_fppl: RequestStatus.WAITING_VERIFICATION
            }, { transaction: t });
            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: idRegistrasi,
                action: 'MEMBUAT_PERMOHONAN',
                statusBefore: null,
                statusAfter: RequestStatus.WAITING_VERIFICATION,
                source: 'Pelanggan',
                note: 'Permohonan dibuat oleh pelanggan.',
                actorNik: userNik,
                transaction: t,
            });
            let sampelCounter = 1;
            let parameterCounter = 1;
            let createdParamCount = 0;
            for (const entry of normalizedData.sampleEntries) {
                const idJenisSampel = entry.idJenisSampel || entry.id_jenis_sampel || entry.jenisSampel;
                const idRegBm = entry.idRegBm || entry.id_reg_bm;
                const qty = resolveSampleQuantity(entry);
                const parameterIds = Array.isArray(entry.parameters)
                    ? entry.parameters.map(p => (typeof p === 'string' ? p : p?.id_parameter)).filter(Boolean)
                    : [];
                if (!idJenisSampel || !idRegBm || parameterIds.length === 0) {
                    throw new Error('Setiap sampel wajib memiliki jenis sampel, standar, dan parameter.');
                }
                await FpplSampel.create({
                    id_registrasi: idRegistrasi,
                    id_jenis_sampel: idJenisSampel,
                    id_reg_bm: idRegBm,
                    jumlah_sampel: qty
                }, { transaction: t });
                for (const idParam of parameterIds) {
                    const idFpm = `FPM-${idRegistrasi.replace('REG-', '')}-${String(sampelCounter).padStart(2, '0')}-${String(parameterCounter).padStart(2, '0')}`;
                    await FpplParameterMetode.create({
                        id_fppl_parameter_metode: idFpm,
                        id_registrasi: idRegistrasi,
                        id_jenis_sampel: idJenisSampel,
                        id_reg_bm: idRegBm,
                        id_parameter: idParam,
                        id_metode_parameter: null,
                        status_kemampuan_lab: 'MAMPU',
                        catatan_kemampuan: null,
                        is_insitu: 0,
                    }, { transaction: t });
                    parameterCounter++;
                    createdParamCount++;
                }
                sampelCounter++;
            }
            await this.validateCompositionPersisted({
                id_registrasi: idRegistrasi,
                expectedSampelCount: normalizedData.sampleEntries.length,
                expectedParameterCount: createdParamCount,
                transaction: t
            });
            await t.commit();
            return { idRegistrasi, status: RequestStatus.WAITING_VERIFICATION };
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
        finally {
            try {
                await sequelize.query(`SELECT RELEASE_LOCK(:lockKey)`, {
                    replacements: { lockKey },
                    type: sequelize.QueryTypes.SELECT
                });
            } catch (releaseErr) {
                console.error('Failed to release lock:', releaseErr);
            }
        }
    };
    updateRequestByCustomer = async (requestId, userNik, data) => {
        const idPelanggan = data.idPelanggan || data.id_pelanggan || null;
        
        const normalizedData = normalizeRequestWritePayload(data);
        validateRequestSampleComposition(normalizedData.sampleEntries);

        // --- Susun kandidat untuk validasi anti-duplikasi ---
        const candidateSampels = buildCandidateSamples(normalizedData.sampleEntries);
        const candidateParams = buildCandidateParameters(normalizedData.sampleEntries);
        const candidateFppl = buildFpplWriteFields(normalizedData);

        const crypto = require('crypto');
        const fingerprint = buildDuplicateFingerprint(normalizedData.customer.namaInstansi, candidateFppl, candidateSampels, candidateParams);
        const serializedFingerprint = serializeDuplicateFingerprint(fingerprint);
        const lockHash = crypto.createHash('sha256').update(serializedFingerprint).digest('hex').slice(0, 48);
        const lockKey = `dup:${lockHash}`;

        const t = await sequelize.transaction();
        try {
            const requestRecord = await Fppl.findByPk(requestId, {
                include: [{ model: Pelanggan, as: 'pelanggan' }],
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!requestRecord) {
                throw Object.assign(new Error('Permohonan tidak ditemukan.'), { code: 'REQUEST_NOT_FOUND', statusCode: 404 });
            }
            if (requestRecord.pelanggan?.nik !== userNik) {
                throw Object.assign(new Error('Anda tidak memiliki akses untuk mengubah permohonan ini.'), { code: 'UNAUTHORIZED', statusCode: 403 });
            }
            if (!requestRecord.canBeEditedByCustomer()) {
                throw Object.assign(new Error('Permohonan sudah tidak dapat diubah karena sedang/telah diverifikasi.'), { code: 'REQUEST_NOT_EDITABLE', statusCode: 409 });
            }

            const [lockResult] = await sequelize.query(`SELECT GET_LOCK(:lockKey, 10) AS acquired`, {
                replacements: { lockKey },
                type: sequelize.QueryTypes.SELECT,
                transaction: t
            });

            if (!lockResult || lockResult.acquired !== 1) {
                throw new Error('Permohonan serupa sedang diproses. Silakan kirim ulang beberapa saat lagi.');
            }

            await this.checkDuplicateRequest({
                userNik,
                companyName: normalizedData.customer.namaInstansi,
                candidateFppl,
                candidateSampels,
                candidateParams,
                excludeRegistrationId: requestRecord.id_registrasi,
                transaction: t
            });

            if (requestRecord.pelanggan) {
                await requestRecord.pelanggan.update({
                    nama_instansi: normalizedData.customer.namaInstansi,
                    pic: normalizedData.customer.pic,
                    email_kontak: normalizedData.customer.emailPic,
                    no_telp: normalizedData.customer.noTelp,
                    alamat: normalizedData.customer.alamat
                }, { transaction: t });
            }

            await requestRecord.update({
                ...candidateFppl,
                versi_data: (requestRecord.versi_data || 1) + 1,
                terakhir_diubah_pada: new Date(),
                terakhir_diubah_oleh: userNik,
            }, { transaction: t });

            await FpplParameterMetode.destroy({
                where: { id_registrasi: requestRecord.id_registrasi },
                transaction: t,
            });
            await FpplSampel.destroy({
                where: { id_registrasi: requestRecord.id_registrasi },
                transaction: t,
            });

            let sampelCounter = 1;
            let parameterCounter = 1;
            let createdParamCount = 0;
            for (const entry of normalizedData.sampleEntries) {
                const idJenisSampel = entry.idJenisSampel || entry.id_jenis_sampel || entry.jenisSampel;
                const idRegBm = entry.idRegBm || entry.id_reg_bm;
                const qty = resolveSampleQuantity(entry);
                const parameterIds = Array.isArray(entry.parameters)
                    ? entry.parameters.map(p => (typeof p === 'string' ? p : p?.id_parameter)).filter(Boolean)
                    : [];
                if (!idJenisSampel || !idRegBm || parameterIds.length === 0) {
                    throw new Error('Setiap sampel wajib memiliki jenis sampel, standar, dan parameter.');
                }
                await FpplSampel.create({
                    id_registrasi: requestRecord.id_registrasi,
                    id_jenis_sampel: idJenisSampel,
                    id_reg_bm: idRegBm,
                    jumlah_sampel: qty
                }, { transaction: t });
                for (const idParam of parameterIds) {
                    const idFpm = `FPM-${requestRecord.id_registrasi.replace('REG-', '')}-${String(sampelCounter).padStart(2, '0')}-${String(parameterCounter).padStart(2, '0')}`;
                    await FpplParameterMetode.create({
                        id_fppl_parameter_metode: idFpm,
                        id_registrasi: requestRecord.id_registrasi,
                        id_jenis_sampel: idJenisSampel,
                        id_reg_bm: idRegBm,
                        id_parameter: idParam,
                        id_metode_parameter: null,
                        status_kemampuan_lab: 'MAMPU',
                        catatan_kemampuan: null,
                        is_insitu: 0,
                    }, { transaction: t });
                    parameterCounter++;
                    createdParamCount++;
                }
                sampelCounter++;
            }
            await this.validateCompositionPersisted({
                id_registrasi: requestRecord.id_registrasi,
                expectedSampelCount: normalizedData.sampleEntries.length,
                expectedParameterCount: createdParamCount,
                transaction: t
            });

            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: requestRecord.id_registrasi,
                action: 'MENGUBAH_PERMOHONAN',
                statusBefore: requestRecord.status_fppl,
                statusAfter: requestRecord.status_fppl,
                source: 'Pelanggan',
                note: 'Pelanggan memperbarui data permohonan pengujian.',
                actorNik: userNik,
                transaction: t,
            });

            await t.commit();
            return { idRegistrasi: requestRecord.id_registrasi, status: requestRecord.status_fppl };
        } catch (error) {
            await t.rollback();
            throw error;
        } finally {
            try {
                await sequelize.query(`SELECT RELEASE_LOCK(:lockKey)`, {
                    replacements: { lockKey },
                    type: sequelize.QueryTypes.SELECT
                });
            } catch (releaseErr) {
                console.error('Failed to release lock:', releaseErr);
            }
        }
    };
    detailRequest = async (requestId, userNik, role) => {
        const requestRecord = await Fppl.findByPk(requestId, {
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    attributes: ['id_pelanggan', 'nik', 'nama_instansi', 'pic', 'email_kontak', 'no_telp', 'alamat']
                },
                {
                    model: TarifPengambilan
                },
                {
                    model: JadwalSampel,
                    as: 'jadwal_sampels',
                    attributes: [
                        'id_jadwal',
                        'tanggal_jadwal',
                        'jam_jadwal',
                        'id_pegawai_pcc',
                        'dibuat_pada',
                        'status_jadwal',
                    ],
                    required: false,
                    include: [
                        {
                            model: Pegawai,
                            as: 'pegawai_pcc',
                            attributes: ['id_pegawai', 'nama_pegawai', 'no_wa'],
                            required: false
                        }
                    ]
                },
                {
                    model: JadwalPengambilanLhu,
                    as: 'jadwal_pengambilan_lhu',
                    attributes: [
                        'id_jadwal_lhu',
                        'id_registrasi',
                        'tanggal_pengambilan',
                        'jam_pengambilan',
                        'status_pengambilan',
                        'catatan',
                        'dijadwalkan_oleh',
                        'dijadwalkan_pada',
                        'nama_pengambil',
                        'diambil_pada',
                    ],
                    required: false
                },
                {
                    model: PengajuanPerubahanJadwal,
                    as: 'pengajuan_perubahan_jadwal',
                    required: false,
                    attributes: [
                        'id_pengajuan_jadwal',
                        'jenis_jadwal',
                        'id_jadwal_sampel',
                        'id_jadwal_lhu',
                        'tanggal_sebelumnya',
                        'jam_sebelumnya',
                        'tanggal_usulan',
                        'jam_usulan',
                        'alasan_pengajuan',
                        'status_pengajuan',
                        'catatan_admin',
                        'diajukan_pada',
                        'created_at',
                        'updated_at'
                    ]
                },
                {
                    model: FpplSampel,
                    as: 'fppl_sampels',
                    attributes: [
                        'id_registrasi',
                        'id_jenis_sampel',
                        'id_reg_bm',
                        'jumlah_sampel'
                    ],
                    include: [
                        {
                            model: JenisSampel,
                            attributes: ['id_jenis_sampel', 'jenis_sampel']
                        },
                        {
                            model: RegBm,
                            attributes: ['id_reg_bm', 'instansi', 'ref_reg']
                        },
                        {
                            model: FpplParameterMetode,
                            attributes: [
                                'id_fppl_parameter_metode',
                                'id_registrasi',
                                'id_jenis_sampel',
                                'id_reg_bm',
                                'id_parameter',
                                'id_metode_parameter',
                                'status_kemampuan_lab',
                                'catatan_kemampuan',
                                'dipilih_pada',
                                'is_insitu'
                            ],
                            include: [
                                {
                                    model: Parameter,
                                    attributes: [
                                        'id_parameter', 'id_kategori_parameter', 'nama_parameter'
                                    ]
                                },
                                {
                                    model: ParameterMetode,
                                    required: false,
                                    attributes: [
                                        'id_metode_parameter',
                                        'id_parameter',
                                        'id_metode',
                                        'tarif',
                                        'acuan_metode',
                                        'is_terakreditasi',
                                        'is_subkontrak'
                                    ],
                                    include: [
                                        {
                                            model: Metode,
                                            attributes: ['id_metode', 'nama_metode'],
                                            required: false
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: Sampel,
                            as: 'sampels',
                            attributes: [
                                'no_sampel',
                                'id_registrasi',
                                'id_jenis_sampel',
                                'id_reg_bm',
                                'tanggal_pengambilan_sampel',
                                'diterima_pada',
                                'kondisi_sampel',
                                'abnormalitas_sampel',
                                'acuan_pengambilan_sampel',
                                'lokasi_spesifik',
                                'koordinat',
                                'status_sample'
                            ],
                            required: false,
                            include: [
                                {
                                    model: PenugasanItem,
                                    as: 'penugasan_items',
                                    attributes: ['id_penugasan_detail', 'no_sampel'],
                                    required: false,
                                    include: [
                                        {
                                            model: PenugasanDetail,
                                            attributes: [
                                                'id_penugasan_detail',
                                                'id_penugasan',
                                                'id_metode_parameter',
                                                'status_detail',
                                                'tanggal_tenggat',
                                                'catatan_detail'
                                            ],
                                            required: false,
                                            include: [
                                                {
                                                    model: Penugasan,
                                                    attributes: [
                                                        'id_penugasan',
                                                        'id_user_analis',
                                                        'assigned_by',
                                                        'assigned_at',
                                                        'status_penugasan'
                                                    ],
                                                    required: false
                                                },
                                                {
                                                    model: Lka,
                                                    required: false,
                                                    attributes: [
                                                        'kode_lka',
                                                        'id_penugasan_detail',
                                                        'tanggal_mulai_pengujian',
                                                        'tanggal_selesai_pengujian',
                                                        'tanggal_pelaporan',
                                                        'tanggal_pemeriksaan',
                                                        'status_lka'
                                                    ],
                                                    include: [
                                                        {
                                                            model: LkaHasil,
                                                            required: false,
                                                            attributes: [
                                                                'kode_lka',
                                                                'no_sampel',
                                                                'statusReviewHasil'
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    model: Lhu,
                                    as: 'lhu',
                                    attributes: [
                                        'nomor_lhu',
                                        'id_registrasi',
                                        'id_pkt_bm',
                                        'tanggal_penerbitan',
                                        'file_lhu_path',
                                        'file_lhu_signed_path',
                                        'qc_by',
                                        'qc_at',
                                        'kalab_by',
                                        'kalab_at',
                                        'status_lhu',
                                        'created_at',
                                        'updated_at'
                                    ],
                                    required: false,
                                    include: [
                                        {
                                            model: PktBm,
                                            attributes: ['id_pkt_bm', 'id_reg_bm', 'id_jenis_sampel', 'id_klasifikasi'],
                                            required: false,
                                            include: [{ model: RegBm, required: false }, { model: JenisSampel, required: false }, { model: Klasifikasi, required: false }]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
        if (!requestRecord)
            throw new Error('Permohonan tidak ditemukan.');
        const pelangganEntity = requestRecord.Pelanggan || requestRecord.pelanggan;
        if (role === Roles.CUSTOMER && pelangganEntity?.nik !== userNik) {
            throw new Error('FORBIDDEN');
        }
        const responseData = decorateSampleReceiptFields(decorateScheduleFields(normalizeRequestFpplSampelGraph(requestRecord.toJSON())));
        // Hapus nik dari response pelanggan
        if (responseData.Pelanggan)
            delete responseData.Pelanggan.nik;
        if (responseData.pelanggan)
            delete responseData.pelanggan.nik;
        if (role === Roles.CUSTOMER) {
            stripCustomerSensitiveLhuData(responseData);
            responseData.lhu_signed_documents = LhuSignedFileService.buildCustomerSignedLhuDocuments(responseData);
        } else if (role === Roles.ADMIN) {
            responseData.lhu_signed_documents = LhuSignedFileService.buildAdminSignedLhuDocuments(responseData);
        } else {
            stripSignedLhuStorageFields(responseData);
        }
        
        responseData.status = responseData.status_fppl;
        responseData.requestVersion = requestRecord.getDataVersion();
        responseData.canEditByCustomer = requestRecord.canBeEditedByCustomer();
        responseData.invoice = await buildInvoiceSummary(requestId);
        responseData.billing = responseData.invoice;
        responseData.rincianBiaya = responseData.invoice?.rincian || null;
        responseData.rincian_biaya = responseData.invoice?.rincian || null;
        responseData.metodeSampling = responseData.invoice?.metodeSampling || responseData.invoice?.rincian?.metodeSampling || null;
        responseData.metode_sampling = responseData.metodeSampling;
        responseData.biayaSampling = responseData.invoice?.biayaSampling ?? responseData.invoice?.rincian?.biayaSampling ?? null;
        responseData.biaya_sampling = responseData.biayaSampling;
        responseData.paymentMethods = getAvailablePaymentMethods();
        const activityLogs = await WorkflowLogService.getRequestTimeline(requestId);
        responseData.aktivitas_sistem_logs = activityLogs;
        responseData.activity_logs = activityLogs;
        responseData.timeline_logs = activityLogs;
        return responseData;
    };
    getRequestActivityLogs = async (requestId, userNik, role) => {
        const requestRecord = await Fppl.findByPk(requestId, {
            include: [{ model: Pelanggan, as: 'pelanggan', attributes: ['nik'] }]
        });
        if (!requestRecord)
            throw new Error('Permohonan tidak ditemukan.');
        const pelangganEntity = requestRecord.Pelanggan || requestRecord.pelanggan;
        if (role === Roles.CUSTOMER && pelangganEntity?.nik !== userNik) {
            throw new Error('FORBIDDEN');
        }
        return WorkflowLogService.getRequestTimeline(requestId);
    };
    getKasiRequestDetail = async (requestId) => {
        const request = await Fppl.findByPk(requestId, {
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    attributes: ['nama_instansi', 'pic', 'no_telp', 'alamat']
                },
                {
                    model: FpplSampel,
                    as: 'fppl_sampels',
                    attributes: ['id_registrasi', 'id_jenis_sampel', 'id_reg_bm', 'jumlah_sampel'],
                    include: [
                        {
                            model: JenisSampel,
                            attributes: ['id_jenis_sampel', 'jenis_sampel']
                        },
                        {
                            model: RegBm,
                            attributes: ['id_reg_bm', 'instansi', 'ref_reg']
                        },
                        {
                            model: FpplParameterMetode,
                            attributes: [
                                'id_fppl_parameter_metode',
                                'id_registrasi',
                                'id_jenis_sampel',
                                'id_reg_bm',
                                'id_parameter',
                                'id_metode_parameter',
                                'status_kemampuan_lab',
                                'catatan_kemampuan',
                                'dipilih_pada',
                                'is_insitu',
                            ],
                            include: [
                                {
                                    model: Parameter,
                                    attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter']
                                },
                                {
                                    model: ParameterMetode,
                                    required: false,
                                    attributes: [
                                        'id_metode_parameter',
                                        'id_parameter',
                                        'id_metode',
                                        'tarif',
                                        'acuan_metode',
                                        'is_terakreditasi',
                                        'is_subkontrak'
                                    ],
                                    include: [
                                        {
                                            model: Metode,
                                            attributes: ['id_metode', 'nama_metode']
                                        }
                                    ]
                                },
                                {
                                    model: PermintaanSubkontrak,
                                    as: 'permintaan_subkontrak',
                                    required: false
                                }
                            ]
                        }
                    ]
                }
            ]
        });
        if (!request) {
            throw new Error('Permohonan tidak ditemukan.');
        }
        const json = toCamelCaseDeep(normalizeRequestFpplSampelGraph(request.toJSON()));
        const fpplSamples = Array.isArray(json.fpplSampels) ? json.fpplSampels : [];
        const parameterIds = new Set();
        fpplSamples.forEach((sampel) => {
            const pmList = sampel?.fpplParameterMetodes || sampel?.FpplParameterMetodes || [];
            pmList.forEach((fpm) => {
                const paramId = fpm?.parameter?.idParameter ||
                    fpm?.Parameter?.idParameter ||
                    fpm?.idParameter;
                if (paramId) {
                    parameterIds.add(paramId);
                }
            });
        });
        const methodRows = parameterIds.size
            ? await ParameterMetode.findAll({
                where: {
                    id_parameter: {
                        [Op.in]: Array.from(parameterIds)
                    },
                    is_active: 1
                },
                attributes: [
                    'id_metode_parameter',
                    'id_parameter',
                    'id_metode',
                    'tarif',
                    'acuan_metode',
                    'is_terakreditasi',
                    'is_subkontrak',
                    'is_active'
                ],
                include: [
                    {
                        model: Metode,
                        attributes: ['id_metode', 'nama_metode'],
                        required: false
                    }
                ],
                order: [['id_parameter', 'ASC'], ['id_metode_parameter', 'ASC']]
            })
            : [];
        const methodOptionsByParameter = {};
        methodRows.forEach((row) => {
            const item = toCamelCaseDeep(row);
            const idParameter = item.idParameter;
            if (!methodOptionsByParameter[idParameter]) {
                methodOptionsByParameter[idParameter] = [];
            }
            const namaMetode = item.metode?.namaMetode ||
                item.Metode?.namaMetode ||
                '-';
            const acuanMetode = item.acuanMetode || '';
            const normalizeTinyIntFlag = (value) => {
                return value === true || value === 1 || value === '1' || value === 'true';
            };
            const isSubkontrak = normalizeTinyIntFlag(item.isSubkontrak);
            methodOptionsByParameter[idParameter].push({
                id: item.idMetodeParameter,
                idMetodeParameter: item.idMetodeParameter,
                idMetodeParameter: item.idMetodeParameter,
                idMetode: item.idMetode,
                idMetode: item.idMetode,
                name: namaMetode,
                label: acuanMetode ? `${namaMetode} - ${acuanMetode}` : namaMetode,
                nama: namaMetode,
                namaMetode: namaMetode,
                namaMetode,
                acuan: acuanMetode,
                acuanMetode: acuanMetode,
                acuanMetode,
                tarif: item.tarif,
                isTerakreditasi: item.isTerakreditasi,
                isSubkontrak,
                isActive: item.isActive
            });
        });
        const requestDecisionStatus = deriveCustomerDecisionStatus(json.statusFppl);
        const kelompokSampel = fpplSamples.map((sampel) => {
            const jenisSampelNama = sampel?.jenisSampel?.jenisSampel ||
                sampel?.JenisSampel?.jenisSampel ||
                '-';
            const regBmInstansi = sampel?.regBm?.instansi ||
                sampel?.RegBm?.instansi ||
                '';
            const regBmRef = sampel?.regBm?.refReg ||
                sampel?.regBm?.ref_reg ||
                sampel?.RegBm?.refReg ||
                sampel?.RegBm?.ref_reg ||
                '-';
            const regBmLabel = [regBmInstansi, regBmRef]
                .filter((item) => item && item !== '-')
                .join(' - ') || '-';
            const pmList = sampel?.fpplParameterMetodes || sampel?.FpplParameterMetodes || [];
            const parameters = pmList.map((fpm) => {
                const paramId = fpm?.parameter?.idParameter ||
                    fpm?.Parameter?.idParameter ||
                    fpm?.idParameter;
                const paramName = fpm?.parameter?.namaParameter ||
                    fpm?.Parameter?.namaParameter ||
                    '-';
                const currentMethodId = fpm?.idMetodeParameter || null;
                const currentMethod = fpm?.parameterMetode ||
                    fpm?.ParameterMetode ||
                    null;
                const currentMetodeName = currentMethod?.metode?.namaMetode ||
                    currentMethod?.Metode?.namaMetode ||
                    '-';
                const availableMethods = methodOptionsByParameter[paramId] || [];
                const currentMethodIsSubkontrak = currentMethod?.isSubkontrak === true ||
                    currentMethod?.isSubkontrak === 1 ||
                    currentMethod?.isSubkontrak === '1'
                    ? 1
                    : 0;
                const isSubkontrakSnapshot = undefined !== null &&
                    undefined !== undefined
                    ? Number(undefined)
                    : currentMethod
                        ? currentMethodIsSubkontrak
                        : null;
                return {
                    fpmId: fpm.idFpplParameterMetode,
                    paramId,
                    paramName,
                    currentMethodId,
                    currentMethodName: currentMetodeName,
                    capabilityStatus: fpm.statusKemampuanLab || '',
                    capabilityNote: fpm.catatanKemampuan || '',
                    tarifSnapshot: null,
                    isSubkontrakSnapshot,
                    isInsitu: fpm.isInsitu ? 1 : 0,
                    availableMethods,
                    subcontractRequests: fpm.permintaanSubkontrak || [],
                    statusPersetujuanPelanggan: requestDecisionStatus,
                    tarif: fpm.parameterMetode?.tarif ?? fpm.ParameterMetode?.tarif ?? null,
                    methods: availableMethods
                };
            });
            return {
                idRegistrasi: sampel.idRegistrasi || json.idRegistrasi || null,
                jenisSampel: jenisSampelNama,
                idJenisSampel: sampel.idJenisSampel,
                idRegBm: sampel.idRegBm,
                standar: regBmRef,
                regBm: regBmLabel,
                jumlahSampel: sampel.jumlahSampel,
                parameters,
            };
        });
        const pelanggan = json.Pelanggan ||
            json.pelanggan ||
            {};
        return {
            noReg: json.idRegistrasi,
            idRegistrasi: json.idRegistrasi,
            tanggal: json.tanggalPendaftaran,
            tanggalPendaftaran: json.tanggalPendaftaran,
            tanggalDaftar: json.tanggalPendaftaran,
            tanggalVerifikasi: json.tanggalVerifikasi || null,
            pelanggan: pelanggan.namaInstansi || pelanggan.pic || '-',
            idPelanggan: json.idPelanggan || pelanggan.idPelanggan || pelanggan.id_pelanggan || '',
            pic: pelanggan.pic || '-',
            noTelp: pelanggan.noTelp || '-',
            alamat: pelanggan.alamat || '-',
            status: json.statusFppl,
            statusFppl: json.statusFppl,
            maksudPengujian: json.maksudPengujian,
            jenisPengambilanSampel: json.jenisPengambilanSampel,
            tanggalRencanaPengambilanSampel: json.tanggalRencanaPengambilanSampel,
            jamRencanaPengambilanSampel: json.jamRencanaPengambilanSampel,
            tanggalRencanaPengantaranSampel: json.tanggalRencanaPengantaranSampel,
            lokasiPengambilanSampel: json.lokasiPengambilanSampel,
            kelompokSampel,
            requestVersion: request.getDataVersion(),
            canEditByCustomer: request.canBeEditedByCustomer()
        };
    };
    getMyPelanggans = async (userNik) => {
        const rows = await Pelanggan.findAll({
            where: { nik: userNik },
            order: [['id_pelanggan', 'DESC']],
        });
        return rows.map((row) => toCamelCaseDeep(row));
    };
}
module.exports = new RequestService();
module.exports.RequestService = RequestService;
