'use strict';
const lkaRevisionDisplayService = require('../services/lka-revision-display.service');
class LkaRevisionController {
    constructor(revisionDisplayService) {
        this.revisionDisplayService = revisionDisplayService;
    }
    success = (res, message, data = null) => {
        return res.status(200).json({ success: true, message, data });
    };
    fail = (res, error, fallbackMessage = 'Terjadi kesalahan.') => {
        if (process.env.NODE_ENV !== 'production') {
            console.error(fallbackMessage, error);
        }
        return res.status(500).json({ success: false, message: error?.message || fallbackMessage });
    };
    getByKodeLka = async (req, res) => {
        try {
            const kodeLka = req.params.kodeLka || req.query.kodeLka || req.query.kode_lka;
            const data = await this.revisionDisplayService.getRevisionDisplayByKodeLka(kodeLka, { user: req.user });
            return this.success(res, 'Riwayat revisi LKA berhasil diambil.', data);
        }
        catch (error) {
            return this.fail(res, error, 'Gagal mengambil riwayat revisi LKA.');
        }
    };
    getByTarget = async (req, res) => {
        try {
            const kodeLka = req.params.kodeLka || req.query.kodeLka || req.query.kode_lka;
            const noSampel = req.params.noSampel || req.query.noSampel || req.query.no_sampel;
            const revisions = await this.revisionDisplayService.getRevisionHistoryByTarget(kodeLka, noSampel, { user: req.user });
            return this.success(res, 'Riwayat revisi hasil LKA berhasil diambil.', {
                kodeLka,
                kode_lka: kodeLka,
                noSampel,
                no_sampel: noSampel,
                revisions,
                revision_items: revisions,
                sumberUtama: 'lka_revisi',
                sumber_utama: 'lka_revisi',
            });
        }
        catch (error) {
            return this.fail(res, error, 'Gagal mengambil riwayat revisi hasil LKA.');
        }
    };
}
module.exports = new LkaRevisionController(lkaRevisionDisplayService);
module.exports.LkaRevisionController = LkaRevisionController;
