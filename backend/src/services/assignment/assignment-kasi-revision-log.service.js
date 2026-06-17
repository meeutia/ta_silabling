const sequelize = require('../../config/database');
const { LkaRevisi } = require('../../models/Associations');
const { SNAPSHOT_BEFORE_ACTION, logRevisionResultSnapshotFromCurrentResult } = require('./assignment-revision-snapshot.helper');

const LKA_REVISION_STATUSES = new Set([
    'Diajukan',
    'Menunggu Persetujuan Penyelia',
    'Menunggu Review Penyelia',
    'Disetujui Penyelia',
    'Ditolak Penyelia',
    'Disetujui untuk Analis',
    'Dikirim ke Analis',
    'Diperbaiki Analis',
    'Disetujui Kasi',
    'Selesai',
]);

class AssignmentKasiRevisionLogService {
nextRunningId = async (tableName, fieldName, prefix, padLength, transaction) => {
        const [[row]] = await sequelize.query(`SELECT ${fieldName} AS value FROM ${tableName} WHERE ${fieldName} LIKE :prefix ORDER BY ${fieldName} DESC LIMIT 1`, {
            replacements: { prefix: `${prefix}%` },
            transaction,
        });
        const lastValue = row?.value || '';
        const lastNumber = Number(String(lastValue).replace(prefix, '')) || 0;
        return `${prefix}${String(lastNumber + 1).padStart(padLength, '0')}`;
    };

    nextLkaRevisiId = async (transaction) => {
        return this.nextRunningId('lka_revisi', 'id_revisi_lka', 'RVL-', 6, transaction);
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

    normalizeLkaRevisionStatus = (status, fallbackStatus = '') => {
        const value = String(status || '').trim();
        if (LKA_REVISION_STATUSES.has(value))
            return value;
        const fallback = String(fallbackStatus || '').trim();
        if (LKA_REVISION_STATUSES.has(fallback))
            return fallback;
        return 'Dikirim ke Analis';
    };

    createLkaRevisionLog = async ({
        kodeLka,
        sumberRevisi,
        levelRevisi = 'HASIL',
        catatanRevisi = null,
        diajukanOleh = null,
        ditinjauOleh = null,
        statusRevisi = 'Dikirim ke Analis',
        items = [],
    }, transaction) => {
        const normalizedItems = Array.isArray(items) ? items : [];
        const rowsBySample = new Map();
        for (const item of normalizedItems) {
            const noSampel = String(item.noSampel || item.no_sampel || '').trim();
            if (!noSampel) {
                throw new Error('Nomor sampel revisi LKA wajib dikirim.');
            }
            const kodeItemLka = item.kodeLka || item.kode_lka || kodeLka;
            const rowStatusRevisi = this.normalizeLkaRevisionStatus(statusRevisi);
            const note = String(item.catatanRevisi || item.catatan_revisi || catatanRevisi || '').trim();
            const existing = rowsBySample.get(noSampel);
            if (existing) {
                const notes = [existing.catatan_revisi, note].map((value) => String(value || '').trim()).filter(Boolean);
                existing.catatan_revisi = Array.from(new Set(notes)).join('\n') || null;
                existing.status_revisi = rowStatusRevisi;
                continue;
            }
            rowsBySample.set(noSampel, {
                kode_lka: kodeItemLka,
                no_sampel: noSampel,
                catatan_revisi: note || null,
                status_revisi: rowStatusRevisi,
            });
        }
        const rowsToCreate = rowsBySample.size > 0
            ? Array.from(rowsBySample.values())
            : [{
                kode_lka: kodeLka,
                no_sampel: null,
                catatan_revisi: catatanRevisi || null,
                status_revisi: this.normalizeLkaRevisionStatus(statusRevisi),
            }];
        const createdIds = [];
        for (const row of rowsToCreate) {
            const revisionId = await this.nextLkaRevisiId(transaction);
            const idRevisiSebelumnya = await this.resolvePreviousRevisionId({
                kodeLka: row.kode_lka || kodeLka,
                items: row.no_sampel ? [row] : [],
            }, transaction);
            await LkaRevisi.create({
                id_revisi_lka: revisionId,
                id_revisi_sebelumnya: idRevisiSebelumnya,
                kode_lka: row.kode_lka || kodeLka,
                no_sampel: row.no_sampel || null,
                catatan_revisi: row.catatan_revisi || null,
                sumber_revisi: sumberRevisi,
                level_revisi: levelRevisi,
                diajukan_oleh: diajukanOleh,
                diajukan_pada: new Date(),
                ditinjau_oleh: ditinjauOleh || null,
                ditinjau_pada: ditinjauOleh ? new Date() : null,
                status_revisi: row.status_revisi,
                created_at: new Date(),
                updated_at: new Date(),
            }, { transaction });
            if (row.no_sampel) {
                await logRevisionResultSnapshotFromCurrentResult({
                    idRevisiLka: revisionId,
                    action: SNAPSHOT_BEFORE_ACTION,
                    kodeLka: row.kode_lka || kodeLka,
                    noSampel: row.no_sampel,
                    actorNik: diajukanOleh,
                    source: sumberRevisi === 'KASI_PENGUJIAN' ? 'Kasi' : 'Penyelia',
                }, transaction);
            }
            createdIds.push(revisionId);
        }
        return createdIds[0] || null;
    };

    groupRevisionRowsByLka = (rows = []) => {
        const groups = new Map();
        rows.forEach((row) => {
            const kodeLka = row.kode_lka || row.kodeLka;
            if (!kodeLka)
                return;
            if (!groups.has(kodeLka))
                groups.set(kodeLka, []);
            groups.get(kodeLka).push(row);
        });
        return groups;
    };
}

module.exports = new AssignmentKasiRevisionLogService();
module.exports.AssignmentKasiRevisionLogService = AssignmentKasiRevisionLogService;
