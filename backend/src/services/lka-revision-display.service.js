'use strict';

/**
 * Sumber runtime revisi LKA berbasis model Sequelize.
 * Identitas hasil LKA adalah pasangan kodeLka + noSampel.
 */
const { Op } = require('sequelize');
const { LkaRevisi } = require('../models/Associations');
const { enrichRevisionRowsWithResultSnapshots } = require('./assignment/assignment-revision-snapshot.helper');
const { toCamelCaseDeep } = require('../utils/case-transform.util');

class LkaRevisionDisplayService {
    normalizeTargets = (targets = []) => {
        return (Array.isArray(targets) ? targets : [targets])
            .map((item) => {
                const row = toCamelCaseDeep(item || {});
                return {
                    kodeLka: String(row.kodeLka || '').trim(),
                    noSampel: String(row.noSampel || '').trim(),
                };
            })
            .filter((item) => item.kodeLka && item.noSampel);
    };

    viewExists = async () => {
        // Tidak lagi memakai database view; sumber resmi dibaca dari model lka_revisi.
        return true;
    };

    plain = (row) => {
        return row ? row.get({ plain: true }) : null;
    };

    normalizeKodeLka = (kodeLka) => String(kodeLka || '').trim();
    normalizeNoSampel = (noSampel) => String(noSampel || '').trim();

    mapRevisionRow = (row = {}) => {
        const data = toCamelCaseDeep(row || {});
        const previous = data.revisiSebelumnya || data.RevisiSebelumnya || null;

        return {
            idRevisiLka: data.idRevisiLka || null,
            idRevisiSebelumnya: data.idRevisiSebelumnya || null,
            kodeLka: data.kodeLka || null,
            noSampel: data.noSampel || null,
            catatanRevisi: data.catatanRevisi || null,
            sumberRevisi: data.sumberRevisi || null,
            levelRevisi: data.levelRevisi || null,
            diajukanOleh: data.diajukanOleh || null,
            diajukanPada: data.diajukanPada || null,
            statusRevisi: data.statusRevisi || null,
            ditinjauOleh: data.ditinjauOleh || null,
            ditinjauPada: data.ditinjauPada || null,
            catatanTinjauan: data.catatanTinjauan || null,
            hasilSebelumRevisi: data.hasilSebelumRevisi || null,
            hasilSetelahRevisi: data.hasilSetelahRevisi || null,
            catatanHasilSebelumRevisi: data.catatanHasilSebelumRevisi || null,
            catatanHasilSetelahRevisi: data.catatanHasilSetelahRevisi || null,
            revisionComparison: data.revisionComparison || null,
            revisiSebelumnya: previous ? this.mapRevisionRow(previous) : null,
        };
    };

    getRevisionDisplayByKodeLka = async (kodeLka, options = {}) => {
        const kode = this.normalizeKodeLka(kodeLka);
        if (!kode) {
            return {
                kodeLka: null,
                revisions: [],
                items: [],
                sumberUtama: 'lka_revisi',
            };
        }

        const rows = await this.getRevisionRowsByKodeLka(kode, options);
        const revisions = rows.map(this.mapRevisionRow);

        return {
            kodeLka: kode,
            revisions,
            items: revisions,
            sumberUtama: 'lka_revisi',
        };
    };

    getRevisionHistoryByTarget = async (kodeLka, noSampel, options = {}) => {
        const kode = this.normalizeKodeLka(kodeLka);
        const sample = this.normalizeNoSampel(noSampel);
        if (!kode || !sample) return [];

        const rows = await LkaRevisi.findAll({
            where: {
                kode_lka: kode,
                [Op.or]: [
                    { no_sampel: sample },
                    { level_revisi: 'LKA', no_sampel: null },
                ],
            },
            include: [
                { model: LkaRevisi, as: 'RevisiSebelumnya', required: false },
            ],
            order: [
                ['diajukan_pada', 'DESC'],
                ['id_revisi_lka', 'DESC'],
            ],
            transaction: options.transaction || null,
        });

        const enrichedRows = await enrichRevisionRowsWithResultSnapshots(rows, options.transaction || null);
        return enrichedRows.map(this.mapRevisionRow);
    };

    buildSourceRow = (kodeLka, noSampel, revisions = []) => {
        const rows = (Array.isArray(revisions) ? revisions : []).map((row) => toCamelCaseDeep(row || {}));
        const matching = rows
            .filter((revision) => revision.kodeLka === kodeLka && revision.noSampel === noSampel)
            .sort((a, b) => new Date(b.diajukanPada || 0) - new Date(a.diajukanPada || 0));

        const latestBySource = (source) => {
            const revision = matching.find((row) => row.sumberRevisi === source);
            if (!revision) return { revision: null, item: null };
            return { revision, item: revision };
        };

        const penyelia = latestBySource('PENYELIA');
        const kasi = latestBySource('KASI_PENGUJIAN');
        const latestLkaNote = matching.find((row) => row.levelRevisi === 'LKA') || null;
        const latest = matching[0] || {};

        return {
            kodeLka,
            noSampel,
            catatanRevisiHasilPenyeliaSource: penyelia.item?.catatanRevisi || null,
            catatanRevisiHasilKasiPengujianSource: kasi.item?.catatanRevisi || null,
            revisiPenyeliaBySource: penyelia.revision?.diajukanOleh || null,
            revisiPenyeliaAtSource: penyelia.revision?.diajukanPada || null,
            revisiKasiPengujianBySource: kasi.revision?.diajukanOleh || null,
            revisiKasiPengujianAtSource: kasi.revision?.diajukanPada || null,
            catatanRevisiLkaSource: latestLkaNote?.catatanRevisi || null,
            idRevisiTerakhirSource: latest.idRevisiLka || null,
            idRevisiSebelumnyaSource: latest.idRevisiSebelumnya || null,
            revisiSebelumnyaSource: latest.RevisiSebelumnya || latest.revisiSebelumnya || null,
            hasilSebelumRevisiSource: latest.hasilSebelumRevisi || null,
            hasilSetelahRevisiSource: latest.hasilSetelahRevisi || null,
            catatanHasilSebelumRevisiSource: latest.catatanHasilSebelumRevisi || null,
            catatanHasilSetelahRevisiSource: latest.catatanHasilSetelahRevisi || null,
            revisionComparisonSource: latest.revisionComparison || null,
            jumlahRevisiHasilSource: matching.length,
        };
    };

    getRevisionRowsByKodeLka = async (kodeLka, options = {}) => {
        const rows = await LkaRevisi.findAll({
            where: { kode_lka: kodeLka },
            include: [
                { model: LkaRevisi, as: 'RevisiSebelumnya', required: false },
            ],
            order: [
                ['diajukan_pada', 'DESC'],
                ['id_revisi_lka', 'DESC'],
                ['no_sampel', 'DESC'],
            ],
            transaction: options.transaction || null,
        });

        return enrichRevisionRowsWithResultSnapshots(rows, options.transaction || null);
    };

    getRevisionSourceByTargets = async (targets = [], options = {}) => {
        const rowsTarget = this.normalizeTargets(targets);
        if (!rowsTarget.length) return new Map();

        const kodeList = [...new Set(rowsTarget.map((row) => row.kodeLka))];
        const revisionsByKode = new Map();

        for (const kode of kodeList) {
            revisionsByKode.set(kode, await this.getRevisionRowsByKodeLka(kode, options));
        }

        const result = new Map();
        rowsTarget.forEach((target) => {
            const source = this.buildSourceRow(target.kodeLka, target.noSampel, revisionsByKode.get(target.kodeLka) || []);
            result.set(`${target.kodeLka}|${target.noSampel}`, source);
        });

        return result;
    };

    getRevisionSourceByKodeLka = async (kodeLka, options = {}) => {
        const kode = String(kodeLka || '').trim();
        if (!kode) return [];

        const revisions = await this.getRevisionRowsByKodeLka(kode, options);
        const targets = [];
        revisions.forEach((revision) => {
            const row = toCamelCaseDeep(revision || {});
            if (row.kodeLka && row.noSampel) {
                targets.push({ kodeLka: row.kodeLka, noSampel: row.noSampel });
            }
        });

        const uniqueTargets = Array.from(new Map(targets.map((item) => [`${item.kodeLka}|${item.noSampel}`, item])).values());
        return uniqueTargets
            .map((target) => this.buildSourceRow(target.kodeLka, target.noSampel, revisions))
            .sort((a, b) => String(a.noSampel || '').localeCompare(String(b.noSampel || '')));
    };

    buildRevisionResponse = (row = {}, source = null) => {
        const resultRow = toCamelCaseDeep(row || {});
        const sourceRow = toCamelCaseDeep(source || {});
        const penyeliaNote = sourceRow.catatanRevisiHasilPenyeliaSource || null;
        const kasiNote = sourceRow.catatanRevisiHasilKasiPengujianSource || null;
        const combinedNote = penyeliaNote || kasiNote || null;
        const penyeliaBy = sourceRow.revisiPenyeliaBySource || null;
        const kasiBy = sourceRow.revisiKasiPengujianBySource || null;
        const combinedBy = penyeliaBy || kasiBy || null;
        const penyeliaAt = sourceRow.revisiPenyeliaAtSource || null;
        const kasiAt = sourceRow.revisiKasiPengujianAtSource || null;
        const combinedAt = penyeliaAt || kasiAt || null;

        return {
            kodeLka: resultRow.kodeLka || sourceRow.kodeLka || null,
            noSampel: resultRow.noSampel || sourceRow.noSampel || null,
            catatanRevisiHasilPenyelia: penyeliaNote,
            catatanRevisiHasilKasiPengujian: kasiNote,
            revisiPenyeliaBy: penyeliaBy,
            revisiPenyeliaAt: penyeliaAt,
            revisiKasiPengujianBy: kasiBy,
            revisiKasiPengujianAt: kasiAt,
            catatanRevisiHasil: combinedNote,
            direvisiOleh: combinedBy,
            direvisiPada: combinedAt,
            idRevisiTerakhirSource: sourceRow.idRevisiTerakhirSource || null,
            idRevisiSebelumnyaSource: sourceRow.idRevisiSebelumnyaSource || null,
            revisiSebelumnyaSource: sourceRow.revisiSebelumnyaSource || null,
            hasilSebelumRevisi: sourceRow.hasilSebelumRevisiSource || null,
            hasilSetelahRevisi: sourceRow.hasilSetelahRevisiSource || null,
            catatanHasilSebelumRevisi: sourceRow.catatanHasilSebelumRevisiSource || null,
            catatanHasilSetelahRevisi: sourceRow.catatanHasilSetelahRevisiSource || null,
            revisionComparison: sourceRow.revisionComparisonSource || null,
            revisionSource: source ? 'lka_revisi' : 'none',
            jumlahRevisiHasilSource: Number(sourceRow.jumlahRevisiHasilSource || 0),
        };
    };
}

module.exports = new LkaRevisionDisplayService();
module.exports.LkaRevisionDisplayService = LkaRevisionDisplayService;
