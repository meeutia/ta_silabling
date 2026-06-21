const pickupService = require('../services/lhu/lhu-pickup.service');
const { getHariLibur } = require('../utils/holiday-calendar.util');
class LhuPickupController {
    constructor(pickupService) {
        this.pickupService = pickupService;
    }
    requireValue = (value, message) => {
        if (!value || !String(value).trim()) {
            const error = new Error(message);
            error.statusCode = 400;
            throw error;
        }
        return String(value).trim();
    };
    getCurrentNik = (req) => {
        return req.user?.nik || req.user?.id || req.user?.id_user || null;
    };
    handleError = (res, error, fallbackMessage) => {
        console.error(fallbackMessage, error);
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message || fallbackMessage,
        });
    };
    getHolidays = async (req, res) => {
        try {
            const data = await getHariLibur();
            return res.json({
                success: true,
                message: 'Berhasil mengambil hari libur',
                data,
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal mengambil data hari libur.', 500);
        }
    };

    getPickupQueue = async (req, res) => {
        try {
            const data = await this.pickupService.getPickupQueue();
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat antrean pengambilan LHU.');
        }
    };
    schedulePickup = async (req, res) => {
        try {
            const currentNik = this.getCurrentNik(req);
            if (!currentNik) {
                return res.status(401).json({
                    success: false,
                    message: 'User admin tidak valid. Silakan login ulang.',
                });
            }
            const idRegistrasi = this.requireValue(req.body?.idRegistrasi || req.body?.id_registrasi, 'ID registrasi wajib dikirim.');
            const tanggalPengambilan = this.requireValue(req.body?.tanggalPengambilan || req.body?.tanggal_pengambilan, 'Tanggal pengambilan wajib diisi.');
            const jamPengambilan = this.requireValue(req.body?.jamPengambilan || req.body?.jam_pengambilan, 'Jam pengambilan wajib diisi.');
            const catatan = req.body?.catatan || null;
            const data = await this.pickupService.schedulePickup({
                idRegistrasi,
                tanggalPengambilan,
                jamPengambilan,
                catatan,
            }, currentNik);
            return res.json({
                success: true,
                message: 'Jadwal pengambilan LHU berhasil disimpan.',
                data,
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal menyimpan jadwal pengambilan LHU.');
        }
    };
    completePickup = async (req, res) => {
        try {
            const currentNik = this.getCurrentNik(req);
            if (!currentNik) {
                return res.status(401).json({
                    success: false,
                    message: 'User admin tidak valid. Silakan login ulang.',
                });
            }
            const idRegistrasi = this.requireValue(req.body?.idRegistrasi || req.body?.id_registrasi, 'ID registrasi wajib dikirim.');
            const namaPengambil = this.requireValue(req.body?.namaPengambil || req.body?.nama_pengambil, 'Nama pengambil wajib diisi.');
            const data = await this.pickupService.completePickup({
                idRegistrasi,
                namaPengambil,
            }, currentNik);
            return res.json({
                success: true,
                message: 'Pengambilan LHU berhasil ditandai.',
                data,
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal menandai pengambilan LHU.');
        }
    };
}
module.exports = new LhuPickupController(pickupService);
module.exports.LhuPickupController = LhuPickupController;
