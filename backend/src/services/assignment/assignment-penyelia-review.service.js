const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { User, Penugasan, PenugasanDetail, PenugasanItem, Sampel, Parameter, Metode, ParameterMetode, Lka, LkaHasil, LkaRevisi, } = require('../../models/Associations');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { getPlain, pickObject, pickArray, normalizeIdList, uniqueText, firstDate, } = require('./assignment-object.helper');
const { parseWorksheetFiles, getPrimaryWorksheetPath, } = require('./assignment-worksheet-files.helper');
const { getDetailParameterInfo, } = require('./assignment-monitor.mapper');
const { internalAssignmentWhere, } = require('./assignment-scope.helper');
const { loadRevisionRowsForLka } = require('./assignment-worksheet-revision-history.helper');
const { markRevisionItemsApprovedByPenyelia } = require('./assignment-worksheet-result.helper');
const { SNAPSHOT_BEFORE_ACTION, logRevisionResultSnapshotFromCurrentResult } = require('./assignment-revision-snapshot.helper');
const { prefixRevisionNote, stripRevisionNotePrefix, appendRevisionNote, buildRevisionNotePatch, buildRevisionResultNotePatch, buildLkaHasilRevisionResponse, normalizeRevisionTargetItem, buildWorksheetRevisionResponse, collectRevisionNotesForSample, getLkaHasilKey, parseLkaHasilKey, lkaHasilWhereFromKey, lkaHasilWhereFromKeys, } = require('./assignment-revision.helper');
const { resolveLkaHasilStatus, syncAssignmentHeaderStatusFromDetail, } = require('./assignment-status.helper');
const { assertPenugasanDetailSamplesEditableBeforeLhu, } = require('./assignment-lhu-lock.helper');
class AssignmentPenyeliaReviewService {
normalizePenyeliaRevisionItems = (catatanRevisi, hasilTargets = [], revisionsRequestData = null, fallbackKodeLka = null) => {
        const source = Array.isArray(revisionsRequestData) && revisionsRequestData.length > 0
            ? revisionsRequestData
            : Array.isArray(hasilTargets)
                ? hasilTargets
                : [];
        const sharedNote = String(catatanRevisi || '').trim();
        const seen = new Set();
        return source
            .map((item = {}) => {
            const normalized = normalizeRevisionTargetItem(item, fallbackKodeLka);
            if (!normalized)
                return null;
            return {
                ...normalized,
                catatanRevisi: normalized.catatanRevisi || sharedNote,
            };
        })
            .filter((item) => {
            if (!item || seen.has(item.hasilTargetKey))
                return false;
            seen.add(item.hasilTargetKey);
            return true;
        });
    };
    nextRevisionId = async (model, field, prefix, pad, transaction) => {
        const row = await model.findOne({
            where: {
                [field]: {
                    [Op.like]: `${prefix}%`,
                },
            },
            attributes: [field],
            order: [[field, 'DESC']],
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
        const lastId = row?.get(field) || null;
        const lastNumber = lastId ? Number(String(lastId).replace(prefix, '')) || 0 : 0;
        return `${prefix}${String(lastNumber + 1).padStart(pad, '0')}`;
    };
    resolvePreviousRevisionId = async ({ kodeLka, items = [] }, transaction) => {
        const kode = String(kodeLka || '').trim();
        if (!kode)
            return null;
        const sampleNos = Array.from(new Set((Array.isArray(items) ? items : [])
            .map((item) => String(item.noSampel || item.no_sampel || '').trim())
            .filter(Boolean)));
        const where = { kode_lka: kode };
        if (sampleNos.length > 0) {
            where.no_sampel = sampleNos[0];
        }
        const previous = await LkaRevisi.findOne({
            where,
            order: [['diajukan_pada', 'DESC'], ['id_revisi_lka', 'DESC']],
            transaction: transaction || undefined,
        });
        return previous?.get('id_revisi_lka') || previous?.id_revisi_lka || null;
    };
    createLkaRevisionLog = async ({ kodeLka, sumberRevisi, levelRevisi = 'HASIL', catatanRevisi = null, diajukanOleh, statusRevisi = 'Diajukan', ditinjauOleh = null, ditinjauPada = null, catatanTinjauan = null, items = [], }, transaction) => {
        const kode = String(kodeLka || '').trim();
        const source = String(sumberRevisi || '').trim();
        const userNik = String(diajukanOleh || '').trim();
        const normalizedLevel = String(levelRevisi || '').trim().toUpperCase() || 'HASIL';
        const normalizedItems = Array.isArray(items) ? items : [];
        if (!kode || !source || !userNik) {
            return null;
        }
        if (source === 'KASI_PENGUJIAN' && normalizedLevel !== 'HASIL') {
            throw new Error('Kasi Pengujian hanya dapat meminta revisi hasil/sampel.');
        }
        if (normalizedLevel === 'HASIL' && normalizedItems.length === 0) {
            throw new Error('Revisi hasil wajib memiliki minimal satu sampel/hasil yang direvisi.');
        }
        const rowsBySample = new Map();
        for (const item of normalizedLevel === 'LKA' ? [] : normalizedItems) {
            const note = String(item.catatanRevisi || item.catatan_revisi || item.catatan || '').trim();
            if (!note)
                continue;
            const parsedKey = parseLkaHasilKey(item.hasilTargetKey || item.hasil_target_key || getLkaHasilKey(item), kode);
            const noSampel = String(item.noSampel || item.no_sampel || parsedKey?.no_sampel || '').trim();
            if (!noSampel) {
                throw new Error('Nomor sampel revisi LKA wajib dikirim.');
            }
            if (rowsBySample.has(noSampel))
                continue;
            rowsBySample.set(noSampel, {
                kode_lka: item.kodeLka || item.kode_lka || parsedKey?.kode_lka || kode,
                no_sampel: noSampel,
                status_revisi: statusRevisi === 'Menunggu Persetujuan Penyelia' ? 'Menunggu Review Penyelia' : 'Disetujui untuk Analis',
                catatan_revisi: note,
            });
        }
        const rowsToCreate = rowsBySample.size > 0
            ? Array.from(rowsBySample.values())
            : [{ kode_lka: kode, no_sampel: null, status_revisi: statusRevisi, catatan_revisi: catatanRevisi || null }];
        let firstRevision = null;
        for (const row of rowsToCreate) {
            const idRevisiLka = await this.nextRevisionId(LkaRevisi, 'id_revisi_lka', 'RVL-', 6, transaction);
            const idRevisiSebelumnya = await this.resolvePreviousRevisionId({
                kodeLka: row.kode_lka || kode,
                items: row.no_sampel ? [row] : [],
            }, transaction);
            const revision = await LkaRevisi.create({
                id_revisi_lka: idRevisiLka,
                id_revisi_sebelumnya: idRevisiSebelumnya,
                kode_lka: row.kode_lka || kode,
                no_sampel: row.no_sampel || null,
                catatan_revisi: row.catatan_revisi || catatanRevisi || null,
                sumber_revisi: source,
                level_revisi: normalizedLevel,
                diajukan_oleh: userNik,
                diajukan_pada: new Date(),
                status_revisi: row.status_revisi || statusRevisi,
                ditinjau_oleh: ditinjauOleh || null,
                ditinjau_pada: ditinjauPada || null,
                catatan_tinjauan: catatanTinjauan || null,
                created_at: new Date(),
                updated_at: null,
            }, { transaction });
            if (row.no_sampel) {
                await logRevisionResultSnapshotFromCurrentResult({
                    idRevisiLka,
                    action: SNAPSHOT_BEFORE_ACTION,
                    kodeLka: row.kode_lka || kode,
                    noSampel: row.no_sampel,
                    actorNik: userNik,
                    source: source === 'KASI_PENGUJIAN' ? 'Kasi' : 'Penyelia',
                }, transaction);
            }
            if (!firstRevision)
                firstRevision = revision;
            await WorkflowLogService.logStatusTransition({
                entityType: 'LKA_REVISI',
                entityId: idRevisiLka,
                action: source === 'KASI_PENGUJIAN' ? 'REVISI_LKA_DIAJUKAN_KASI' : 'REVISI_LKA_DIAJUKAN_PENYELIA',
                statusBefore: null,
                statusAfter: statusRevisi,
                source: source === 'KASI_PENGUJIAN' ? 'Kasi' : 'Penyelia',
                note: catatanRevisi || row.catatan_revisi || null,
                actorNik: userNik,
                transaction,
            });
        }
        return firstRevision;
    };
    getReviewQueue = async () => {
        const detailInstances = await PenugasanDetail.findAll({
            where: {
                status_detail: { [Op.in]: ['Worksheet Terkirim', 'Perlu Revisi'] },
            },
            include: [
                {
                    model: Penugasan,
                    required: true,
                    where: internalAssignmentWhere({ status_penugasan: { [Op.ne]: 'Dibatalkan' } }),
                    include: [{ model: User, as: 'Analis', required: false, attributes: ['nik', 'username'] }],
                },
                {
                    model: ParameterMetode,
                    required: false,
                    include: [
                        { model: Parameter, required: false },
                        { model: Metode, required: false },
                    ],
                },
                { model: PenugasanItem, required: false, include: [{ model: Sampel, required: false }] },
                { model: Lka, required: false, include: [{ model: LkaHasil, required: false }] },
            ],
            order: [['tanggal_tenggat', 'ASC'], ['id_penugasan_detail', 'ASC']],
        });
        return detailInstances.map((instance) => {
            const row = getPlain(instance);
            const penugasan = pickObject(row, ['penugasan', 'Penugasan']) || {};
            const analis = pickObject(penugasan, ['Analis']) || {};
            const info = getDetailParameterInfo(row);
            const penugasanItems = pickArray(row, ['penugasan_items', 'PenugasanItems', 'penugasan_item']);
            const lka = pickObject(row, ['lka', 'Lka']) || {};
            const lkaHasilRows = pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']);
            const sampleNos = Array.from(new Set(penugasanItems.map((item) => item.no_sampel).filter(Boolean)));
            const totalSampel = sampleNos.length;
            const totalHasil = lkaHasilRows.filter((hasil) => sampleNos.includes(hasil.no_sampel) &&
                String(hasil.hasil || '').trim()).length;
            return {
                idPenugasan: penugasan.id_penugasan,
                idPenugasanDetail: row.id_penugasan_detail,
                analis: analis.username || penugasan.id_user_analis || '-',
                analisNama: analis.username || penugasan.id_user_analis || '-',
                parameter: info.namaParameter,
                namaParameter: info.namaParameter,
                metode: info.acuanMetode || info.namaMetode || '-',
                namaMetode: info.namaMetode,
                acuanMetode: info.acuanMetode,
                deadline: row.tanggal_tenggat,
                tanggalTenggat: row.tanggal_tenggat,
                statusDetail: row.status_detail,
                statusLka: lka.status_lka || 'Draft',
                totalSampel,
                total_sampel: totalSampel,
                totalHasil,
                total_hasil: totalHasil,
            };
        });
    };
    getReviewDetail = async (idPenugasanDetail) => {
        const detailInstance = await PenugasanDetail.findOne({
            where: { id_penugasan_detail: idPenugasanDetail },
            include: [
                {
                    model: Penugasan,
                    required: true,
                    include: [{ model: User, as: 'Analis', required: false, attributes: ['nik', 'username'] }],
                },
                {
                    model: ParameterMetode,
                    required: false,
                    include: [
                        { model: Parameter, required: false },
                        { model: Metode, required: false },
                    ],
                },
                { model: PenugasanItem, required: false, include: [{ model: Sampel, required: false }] },
                { model: Lka, required: false, include: [{ model: LkaHasil, required: false }] },
            ],
        });
        if (!detailInstance) {
            throw new Error('Detail review tidak ditemukan.');
        }
        const row = getPlain(detailInstance);
        const penugasan = pickObject(row, ['penugasan', 'Penugasan']) || {};
        const analis = pickObject(penugasan, ['Analis']) || {};
        const info = getDetailParameterInfo(row);
        const penugasanItems = pickArray(row, ['penugasan_items', 'PenugasanItems', 'penugasan_item']);
        const lka = pickObject(row, ['lka', 'Lka']) || {};
        const lkaHasilRows = pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']);
        const lkaRevisionRows = lka?.kode_lka ? await loadRevisionRowsForLka(lka.kode_lka) : [];
        const worksheetRevisionRequestData = buildWorksheetRevisionResponse(lka || {}, lkaRevisionRows, { audience: 'penyelia' });
        const worksheetFiles = parseWorksheetFiles(lka.file_worksheet_path);
        const resultRows = penugasanItems
            .map((item) => {
            const sampel = pickObject(item, ['sampel', 'Sampel']) || {};
            const noSampel = item.no_sampel || sampel.no_sampel;
            const hasilRow = lkaHasilRows.find((hasil) => hasil.no_sampel === noSampel) || {};
            const revisionNoteRequestData = collectRevisionNotesForSample(lkaRevisionRows, noSampel, lka?.kode_lka || hasilRow.kode_lka || null, { audience: 'penyelia' });
            return {
                kodeLka: lka?.kode_lka || hasilRow.kode_lka || null,
                no_sampel: noSampel,
                noSampel,
                tanggal_pengambilan_sampel: sampel.tanggal_pengambilan_sampel || null,
                tanggal_penerimaan: sampel.diterima_pada || null,
                jam_penerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,
                kondisi_sampel: sampel.kondisi_sampel || '-',
                abnormalitas_sampel: sampel.abnormalitas_sampel || '',
                acuan_pengambilan_sampel: sampel.acuan_pengambilan_sampel || '',
                koordinat: sampel.koordinat || '-',
                hasil: hasilRow.hasil || '',
                catatan_hasil: hasilRow.catatan_hasil || '',
                statusReviewHasil: resolveLkaHasilStatus(hasilRow, lka?.status_lka, lkaHasilRows),
                ...buildLkaHasilRevisionResponse({ ...hasilRow, ...revisionNoteRequestData }),
            };
        })
            .filter((item) => item.no_sampel)
            .sort((a, b) => String(a.no_sampel).localeCompare(String(b.no_sampel)));
        const tanggalSampling = firstDate(resultRows.map((item) => item.tanggal_pengambilan_sampel)) ||
            lka.tanggal_sampling ||
            null;
        const abnormalitasSampel = uniqueText(resultRows.map((item) => item.abnormalitas_sampel));
        const acuanPengambilanSampel = uniqueText(resultRows.map((item) => item.acuan_pengambilan_sampel));
        return {
            idPenugasan: penugasan.id_penugasan,
            idPenugasanDetail: row.id_penugasan_detail,
            analis: analis.username || penugasan.id_user_analis || '-',
            analisNama: analis.username || penugasan.id_user_analis || '-',
            parameter: info.namaParameter,
            namaParameter: info.namaParameter,
            metode: info.acuanMetode || info.namaMetode || '-',
            namaMetode: info.namaMetode,
            acuanMetode: info.acuanMetode,
            deadline: row.tanggal_tenggat,
            tanggalTenggat: row.tanggal_tenggat,
            statusDetail: row.status_detail,
            tanggalSampling,
            tanggal_sampling: tanggalSampling,
            tanggalPengambilanSampel: tanggalSampling,
            abnormalitasSampel,
            abnormalitas_sampel: abnormalitasSampel,
            acuanPengambilanSampel,
            acuan_pengambilan_sampel: acuanPengambilanSampel,
            ...worksheetRevisionRequestData,
            catatanRevisi: worksheetRevisionRequestData.catatanRevisiLka || worksheetRevisionRequestData.catatanRevisi || null,
            lkaRevisionNote: worksheetRevisionRequestData.lkaRevisionNote || null,
            worksheet: {
                kodeLka: lka.kode_lka || null,
                fileWorksheetPath: getPrimaryWorksheetPath(lka.file_worksheet_path),
                worksheetUrl: getPrimaryWorksheetPath(lka.file_worksheet_path),
                worksheetFiles,
                statusLka: lka.status_lka || 'Draft',
                ...worksheetRevisionRequestData,
                catatanRevisi: worksheetRevisionRequestData.catatanRevisiLka || worksheetRevisionRequestData.catatanRevisi || null,
                lkaRevisionNote: worksheetRevisionRequestData.lkaRevisionNote || null,
                tanggalSampling,
                tanggal_sampling: tanggalSampling,
                tanggalPengambilanSampel: tanggalSampling,
                abnormalitasSampel,
                abnormalitas_sampel: abnormalitasSampel,
                acuanPengambilanSampel,
                acuan_pengambilan_sampel: acuanPengambilanSampel,
            },
            results: resultRows.map((item) => ({
                kodeLka: item.kodeLka || item.kode_lka || lka?.kode_lka || null,
                noSampel: item.no_sampel,
                tanggalPengambilanSampel: item.tanggal_pengambilan_sampel || null,
                tanggalSampling: item.tanggal_pengambilan_sampel || null,
                tanggalPenerimaan: item.tanggal_penerimaan || null,
                jamPenerimaan: item.jam_penerimaan || null,
                kondisiSampel: item.kondisi_sampel || '-',
                koordinat: item.koordinat || '-',
                hasil: item.hasil || '',
                catatanHasil: item.catatan_hasil || '',
                statusReviewHasil: item.statusReviewHasil || null,
                ...buildLkaHasilRevisionResponse(item),
                abnormalitasSampel: item.abnormalitas_sampel || '',
                acuanPengambilanSampel: item.acuan_pengambilan_sampel || '',
            })),
        };
    };
    reviewWorksheet = async (idPenugasanDetail, requestData, penyeliaNik) => {
        const { action, catatanRevisi = null, hasilTargets = [], revisions = [], levelRevisi = null, level_revisi = null, } = requestData || {};
        if (!['approve', 'revise'].includes(action)) {
            throw new Error('Aksi review tidak valid.');
        }
        return sequelize.transaction(async (transaction) => {
            const detail = await PenugasanDetail.findOne({
                where: { id_penugasan_detail: idPenugasanDetail },
                include: [{ model: Lka, required: true }],
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!detail) {
                throw new Error('Detail penugasan atau LKA tidak ditemukan.');
            }
            const plain = getPlain(detail);
            const lkaPlain = pickObject(plain, ['lka', 'Lka']) || {};
            if (!lkaPlain.kode_lka || lkaPlain.status_lka !== 'Menunggu Verifikasi Penyelia') {
                throw new Error('LKA belum dikirim ke penyelia atau sudah diproses.');
            }
            await assertPenugasanDetailSamplesEditableBeforeLhu(idPenugasanDetail, transaction);
            const lka = await Lka.findOne({
                where: { kode_lka: lkaPlain.kode_lka },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!lka) {
                throw new Error('Data LKA tidak ditemukan.');
            }
            if (action === 'revise') {
                const itemRows = await PenugasanItem.findAll({
                    where: { id_penugasan_detail: idPenugasanDetail },
                    attributes: ['no_sampel'],
                    transaction,
                });
                const sampleNos = itemRows
                    .map((item) => getPlain(item)?.no_sampel)
                    .filter(Boolean);
                if (!sampleNos.length) {
                    throw new Error('Sampel pada detail penugasan tidak ditemukan.');
                }
                const allRows = await LkaHasil.findAll({
                    where: {
                        kode_lka: lka.kode_lka,
                        no_sampel: { [Op.in]: sampleNos },
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                const allPlainRows = allRows.map(getPlain);
                if (!allPlainRows.length) {
                    throw new Error('Hasil LKA untuk detail ini tidak ditemukan.');
                }
                const revisionItems = this.normalizePenyeliaRevisionItems(catatanRevisi, hasilTargets, revisions, lka.kode_lka);
                const selectedIds = normalizeIdList(revisionItems.map((item) => item.hasilTargetKey));
                const requestedRevisionLevel = String(levelRevisi || level_revisi || '').trim().toUpperCase();
                const isLkaLevelRevision = requestedRevisionLevel === 'LKA' || selectedIds.length === 0;
                const isSpecificRevision = !isLkaLevelRevision && selectedIds.length > 0;
                const rowsById = new Map(allPlainRows
                    .filter((row) => getLkaHasilKey(row))
                    .map((row) => [String(getLkaHasilKey(row)), row]));
                const invalidIds = selectedIds.filter((id) => !rowsById.has(String(id)));
                if (invalidIds.length > 0) {
                    throw new Error(`Target sampel revisi tidak valid untuk LKA ini: ${invalidIds.join(', ')}.`);
                }
                const targetRows = isSpecificRevision
                    ? selectedIds.map((id) => rowsById.get(String(id))).filter(Boolean)
                    : allPlainRows;
                if (!targetRows.length) {
                    throw new Error('Pilih minimal satu hasil sampel yang perlu direvisi.');
                }
                const noteById = new Map();
                const sharedNote = String(catatanRevisi || '').trim();
                if (isSpecificRevision) {
                    for (const item of revisionItems) {
                        const targetKey = String(item.hasilTargetKey || '').trim();
                        const note = String(item.catatanRevisi || '').trim();
                        if (!note) {
                            const row = rowsById.get(targetKey);
                            const noSampel = row?.no_sampel || row?.noSampel || targetKey;
                            throw new Error(`Catatan revisi untuk sampel ${noSampel} wajib diisi.`);
                        }
                        noteById.set(targetKey, prefixRevisionNote('Penyelia', note));
                    }
                }
                else {
                    if (!sharedNote) {
                        throw new Error('Catatan revisi wajib diisi.');
                    }
                }
                const wholeLkaRevisionNote = !isSpecificRevision
                    ? prefixRevisionNote('Penyelia', sharedNote)
                    : null;
                await lka.update({
                    diperiksa_oleh: penyeliaNik,
                    tanggal_pemeriksaan: new Date(),
                    ...(!isSpecificRevision
                        ? buildRevisionNotePatch(lka.catatan_revisi, wholeLkaRevisionNote)
                        : {}),
                    status_lka: 'Perlu Perbaikan',
                }, { transaction });
                const targetNoteById = new Map();
                for (const targetRow of targetRows) {
                    const hasilTargetKey = getLkaHasilKey(targetRow);
                    const newTargetNote = isSpecificRevision
                        ? noteById.get(String(hasilTargetKey))
                        : null;
                    const targetNote = newTargetNote
                        ? appendRevisionNote(targetRow.catatan_revisi_hasil_penyelia, newTargetNote)
                        : (targetRow.catatan_revisi_hasil_penyelia || null);
                    targetNoteById.set(String(hasilTargetKey), targetNote);
                    await LkaHasil.update({
                        statusReviewHasil: 'Perlu Revisi',
                        ...(newTargetNote
                            ? buildRevisionResultNotePatch('catatan_revisi_hasil_penyelia', targetRow.catatan_revisi_hasil_penyelia, newTargetNote)
                            : {}),
                    }, {
                        where: lkaHasilWhereFromKey(hasilTargetKey),
                        transaction,
                    });
                }
                if (isSpecificRevision) {
                    const targetIdSet = new Set(targetRows.map((row) => String(getLkaHasilKey(row))));
                    const nonTargetIds = allPlainRows
                        .map((row) => getLkaHasilKey(row))
                        .filter((id) => id && !targetIdSet.has(String(id)));
                    if (nonTargetIds.length > 0) {
                        await LkaHasil.update({
                            statusReviewHasil: 'Disetujui Penyelia',
                        }, {
                            where: {
                                [Op.and]: [
                                    lkaHasilWhereFromKeys(nonTargetIds),
                                    {
                                        [Op.or]: [
                                            { statusReviewHasil: null },
                                            { statusReviewHasil: 'Menunggu Verifikasi Penyelia' },
                                        ],
                                    },
                                ].filter(Boolean),
                            },
                            transaction,
                        });
                    }
                }
                await detail.update({ status_detail: 'Perlu Revisi' }, { transaction });
                await syncAssignmentHeaderStatusFromDetail(idPenugasanDetail, transaction);
                const targetSampleNos = Array.from(new Set(targetRows.map((row) => row.no_sampel || row.noSampel).filter(Boolean)));
                await this.createLkaRevisionLog({
                    kodeLka: lka.kode_lka,
                    sumberRevisi: 'PENYELIA',
                    levelRevisi: isSpecificRevision ? 'HASIL' : 'LKA',
                    catatanRevisi: isSpecificRevision
                        ? null
                        : stripRevisionNotePrefix(wholeLkaRevisionNote),
                    diajukanOleh: penyeliaNik,
                    statusRevisi: 'Dikirim ke Analis',
                    items: isSpecificRevision
                        ? targetRows.map((row) => {
                            const id = String(getLkaHasilKey(row) || '');
                            const note = noteById.get(id);
                            return {
                                kodeLka: row.kode_lka,
                                noSampel: row.no_sampel,
                                catatanRevisi: stripRevisionNotePrefix(note),
                            };
                        })
                        : [],
                }, transaction);
                return {
                    status: 'Perlu Revisi',
                    idPenugasanDetail,
                    id_penugasan_detail: idPenugasanDetail,
                    noSampel: targetSampleNos,
                    hasilTargets: targetRows.map((row) => ({ kodeLka: row.kode_lka,  noSampel: row.no_sampel, })).filter((row) => row.kode_lka && row.no_sampel),
                    catatanRevisi: wholeLkaRevisionNote,
                    revisions: isSpecificRevision
                        ? targetRows.map((row) => {
                            const id = String(getLkaHasilKey(row) || '');
                            const note = targetNoteById.get(id) || noteById.get(id) || null;
                            return {
                                noSampel: row.no_sampel || row.noSampel || null,
                                catatanRevisi: note,
                            };
                        })
                        : [],
                };
            }
            await LkaHasil.update({
                statusReviewHasil: 'Disetujui Penyelia',
            }, {
                where: {
                    kode_lka: lka.kode_lka,
                    [Op.or]: [
                        { statusReviewHasil: null },
                        { statusReviewHasil: 'Menunggu Verifikasi Penyelia' },
                    ],
                },
                transaction,
            });
            await lka.update({
                diperiksa_oleh: penyeliaNik,
                tanggal_pemeriksaan: new Date(),
                status_lka: 'Disetujui Penyelia',
            }, { transaction });
            const approvedRows = await LkaHasil.findAll({
                where: {
                    kode_lka: lka.kode_lka,
                    statusReviewHasil: 'Disetujui Penyelia',
                },
                attributes: ['no_sampel'],
                transaction,
            });
            await markRevisionItemsApprovedByPenyelia(lka.kode_lka, approvedRows.map((row) => getPlain(row)?.no_sampel).filter(Boolean), transaction);
            await detail.update({ status_detail: 'Disetujui' }, { transaction });
            await syncAssignmentHeaderStatusFromDetail(idPenugasanDetail, transaction);
            return { status: 'Disetujui' };
        });
    };
    updateAssignmentDetailDeadline = async (idPenugasanDetail, tanggalTenggat, currentUserNik = null) => {
            const detailId = String(idPenugasanDetail || '').trim();
            const nextDeadline = String(tanggalTenggat || '').trim();
            if (!detailId)
                throw new Error('ID detail penugasan wajib dikirim.');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDeadline)) {
                throw new Error('Deadline harus berformat YYYY-MM-DD.');
            }
            const deadlineDate = new Date(`${nextDeadline}T00:00:00`);
            if (Number.isNaN(deadlineDate.getTime())) {
                throw new Error('Deadline tidak valid.');
            }
            const t = await sequelize.transaction();
            try {
                const detail = await PenugasanDetail.findOne({
                    where: { id_penugasan_detail: detailId },
                    include: [
                        {
                            model: Penugasan,
                            required: true,
                        },
                    ],
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (!detail)
                    throw new Error('Detail penugasan tidak ditemukan.');
                const plainDetail = getPlain(detail);
                const penugasan = plainDetail.penugasan || plainDetail.Penugasan || {};
                if (penugasan.status_penugasan === 'Dibatalkan') {
                    throw new Error('Deadline tidak bisa diubah karena penugasan sudah dibatalkan.');
                }
                const nonEditableStatuses = new Set(['Disetujui', 'Selesai']);
                if (nonEditableStatuses.has(plainDetail.status_detail)) {
                    throw new Error(`Deadline tidak bisa diubah karena detail sudah berstatus ${plainDetail.status_detail}.`);
                }
                await assertPenugasanDetailSamplesEditableBeforeLhu(detailId, t);
                await detail.update({ tanggal_tenggat: nextDeadline }, { transaction: t });
                await t.commit();
                return {
                    idPenugasan: penugasan.id_penugasan || null,
                    idPenugasanDetail: detailId,
                    tanggalTenggat: nextDeadline,
                    updatedBy: currentUserNik || null,
                };
            }
            catch (error) {
                await t.rollback();
                throw error;
            }
        };
}
module.exports = new AssignmentPenyeliaReviewService();
module.exports.AssignmentPenyeliaReviewService = AssignmentPenyeliaReviewService;
