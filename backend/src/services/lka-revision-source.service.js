'use strict';
/**
 * Sumber runtime revisi LKA berbasis satu tabel lka_revisi.
 * Identitas hasil LKA adalah pasangan kode_lka + no_sampel.
 */
const { LkaRevisi } = require('../models/Associations');
const { enrichRevisionRowsWithResultSnapshots } = require('./assignment/assignment-revision-snapshot.helper');

class LkaRevisionSourceService {
normalizeTargets = (targets = []) => {
        return (Array.isArray(targets) ? targets : [targets])
            .map((item) => ({
            kode_lka: String(item?.kode_lka || item?.kodeLka || '').trim(),
            no_sampel: String(item?.no_sampel || item?.noSampel || '').trim(),
        }))
            .filter((item) => item.kode_lka && item.no_sampel);
    };

    viewExists = async () => {
        // Tidak lagi memakai database view.
        // Sumber resmi dibaca dari satu tabel lka_revisi.
        return true;
    };

    plain = (row) => {
        return row ? row.get({ plain: true }) : null;
    };

    matchesTarget = (revision, kodeLka, noSampel) => {
        if (!revision || revision.kode_lka !== kodeLka)
            return false;
        if (revision.no_sampel === noSampel)
            return true;
        return revision.level_revisi === 'LKA' && !revision.no_sampel;
    };

    buildSourceRow = (kodeLka, noSampel, revisions = []) => {
        const matching = revisions
            .filter((revision) => this.matchesTarget(revision, kodeLka, noSampel))
            .sort((a, b) => new Date(b.diajukan_pada || 0) - new Date(a.diajukan_pada || 0));
        const latestBySource = (source) => {
            const revision = matching.find((row) => row.sumber_revisi === source) || null;
            return { revision, item: revision };
        };
        const penyelia = latestBySource('PENYELIA');
        const kasi = latestBySource('KASI_PENGUJIAN');
        const latestLkaNote = matching.find((row) => row.level_revisi === 'LKA') || null;
        return {
            kode_lka: kodeLka,
            no_sampel: noSampel,
            catatan_revisi_hasil_penyelia_source: penyelia.revision?.catatan_revisi || null,
            catatan_revisi_hasil_kasi_pengujian_source: kasi.revision?.catatan_revisi || null,
            revisi_penyelia_by_source: penyelia.revision?.diajukan_oleh || null,
            revisi_penyelia_at_source: penyelia.revision?.diajukan_pada || null,
            revisi_kasi_pengujian_by_source: kasi.revision?.diajukan_oleh || null,
            revisi_kasi_pengujian_at_source: kasi.revision?.diajukan_pada || null,
            catatan_revisi_lka_source: latestLkaNote?.catatan_revisi || null,
            id_revisi_terakhir_source: matching[0]?.id_revisi_lka || null,
            id_revisi_sebelumnya_source: matching[0]?.id_revisi_sebelumnya || null,
            revisi_sebelumnya_source: matching[0]?.RevisiSebelumnya || matching[0]?.revisiSebelumnya || null,
            jumlah_revisi_hasil_source: matching.filter((revision) => revision.level_revisi === 'HASIL' && revision.no_sampel === noSampel).length,
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
        if (!rowsTarget.length)
            return new Map();
        const kodeList = [...new Set(rowsTarget.map((row) => row.kode_lka))];
        const revisionsByKode = new Map();
        for (const kode of kodeList) {
            revisionsByKode.set(kode, await this.getRevisionRowsByKodeLka(kode, options));
        }
        const result = new Map();
        rowsTarget.forEach((target) => {
            const source = this.buildSourceRow(target.kode_lka, target.no_sampel, revisionsByKode.get(target.kode_lka) || []);
            result.set(`${target.kode_lka}|${target.no_sampel}`, source);
        });
        return result;
    };

    getRevisionSourceByKodeLka = async (kodeLka, options = {}) => {
        const kode = String(kodeLka || '').trim();
        if (!kode)
            return [];
        const revisions = await this.getRevisionRowsByKodeLka(kode, options);
        const targets = revisions
            .map((revision) => ({ kode_lka: revision.kode_lka, no_sampel: revision.no_sampel }))
            .filter((item) => item.kode_lka && item.no_sampel);
        const uniqueTargets = Array.from(new Map(targets.map((item) => [`${item.kode_lka}|${item.no_sampel}`, item])).values());
        return uniqueTargets
            .map((target) => this.buildSourceRow(target.kode_lka, target.no_sampel, revisions))
            .sort((a, b) => String(a.no_sampel || '').localeCompare(String(b.no_sampel || '')));
    };

    buildRevisionResponse = (row = {}, source = null) => {
        const penyeliaNote = source?.catatan_revisi_hasil_penyelia_source || null;
        const kasiNote = source?.catatan_revisi_hasil_kasi_pengujian_source || null;
        const combinedNote = penyeliaNote || kasiNote || null;
        const penyeliaBy = source?.revisi_penyelia_by_source || null;
        const kasiBy = source?.revisi_kasi_pengujian_by_source || null;
        const combinedBy = penyeliaBy || kasiBy || null;
        const penyeliaAt = source?.revisi_penyelia_at_source || null;
        const kasiAt = source?.revisi_kasi_pengujian_at_source || null;
        const combinedAt = penyeliaAt || kasiAt || null;
        return {
            kodeLka: row.kode_lka || row.kodeLka || source?.kode_lka || null,
            kode_lka: row.kode_lka || row.kodeLka || source?.kode_lka || null,
            noSampel: row.no_sampel || row.noSampel || source?.no_sampel || null,
            no_sampel: row.no_sampel || row.noSampel || source?.no_sampel || null,
            catatanRevisiHasilPenyelia: penyeliaNote,
            catatan_revisi_hasil_penyelia: penyeliaNote,
            catatanRevisiHasilKasiPengujian: kasiNote,
            catatan_revisi_hasil_kasi_pengujian: kasiNote,
            revisiPenyeliaBy: penyeliaBy,
            revisi_penyelia_by: penyeliaBy,
            revisiPenyeliaAt: penyeliaAt,
            revisi_penyelia_at: penyeliaAt,
            revisiKasiPengujianBy: kasiBy,
            revisi_kasi_pengujian_by: kasiBy,
            revisiKasiPengujianAt: kasiAt,
            revisi_kasi_pengujian_at: kasiAt,
            catatanRevisiHasil: combinedNote,
            catatan_revisi_hasil: combinedNote,
            direvisiOleh: combinedBy,
            direvisi_oleh: combinedBy,
            direvisiPada: combinedAt,
            direvisi_pada: combinedAt,
            idRevisiTerakhirSource: source?.id_revisi_terakhir_source || null,
            id_revisi_terakhir_source: source?.id_revisi_terakhir_source || null,
            idRevisiSebelumnyaSource: source?.id_revisi_sebelumnya_source || null,
            id_revisi_sebelumnya_source: source?.id_revisi_sebelumnya_source || null,
            revisiSebelumnyaSource: source?.revisi_sebelumnya_source || null,
            revisi_sebelumnya_source: source?.revisi_sebelumnya_source || null,
            hasilSebelumRevisi: source?.hasil_sebelum_revisi_source || null,
            hasil_sebelum_revisi: source?.hasil_sebelum_revisi_source || null,
            hasilSetelahRevisi: source?.hasil_setelah_revisi_source || null,
            hasil_setelah_revisi: source?.hasil_setelah_revisi_source || null,
            catatanHasilSebelumRevisi: source?.catatan_hasil_sebelum_revisi_source || null,
            catatan_hasil_sebelum_revisi: source?.catatan_hasil_sebelum_revisi_source || null,
            catatanHasilSetelahRevisi: source?.catatan_hasil_setelah_revisi_source || null,
            catatan_hasil_setelah_revisi: source?.catatan_hasil_setelah_revisi_source || null,
            revisionComparison: source?.revision_comparison_source || null,
            revision_comparison: source?.revision_comparison_source || null,
            revisionSource: source ? 'lka_revisi' : 'none',
            revision_source: source ? 'lka_revisi' : 'none',
            jumlahRevisiHasilSource: Number(source?.jumlah_revisi_hasil_source || 0),
            jumlah_revisi_hasil_source: Number(source?.jumlah_revisi_hasil_source || 0),
        };
    };
}

module.exports = new LkaRevisionSourceService();
module.exports.LkaRevisionSourceService = LkaRevisionSourceService;
