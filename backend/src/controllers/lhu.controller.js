const lhuService = require('../services/lhu/lhu.service');
const lhuFinalizationService = require('../services/lhu/lhu-finalization.service');
const lhuDataService = require('../services/lhu/lhu-data.service');
const notificationService = require('../services/notification/notification.service');
const { secureKnownFileFields } = require('../utils/file-url.util');
class LhuController {
    constructor({ lhuService, lhuFinalizationService, lhuDataService, notificationService }) {
        this.lhuService = lhuService;
        this.lhuFinalizationService = lhuFinalizationService;
        this.lhuDataService = lhuDataService;
        this.notificationService = notificationService;
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
        const isDatabaseError = Boolean(error?.name && String(error.name).includes('Sequelize'));
        const statusCode = error.statusCode || (isDatabaseError ? 500 : 400);
        const sqlMessage = error?.parent?.sqlMessage || error?.original?.sqlMessage;
        const message = error.message || sqlMessage || fallbackMessage;
        return res.status(statusCode).json({
            success: false,
            message,
            errorCode: error?.name || undefined,
            detail: process.env.NODE_ENV === 'production' ? undefined : sqlMessage,
        });
    };
    hideCustomerInfo = (data) => {
        if (!data || typeof data !== 'object')
            return data;
        const cloned = { ...data };
        delete cloned.pelanggan;
        delete cloned.pemohon;
        delete cloned.customer;
        if (cloned.lhu) {
            cloned.lhu = { ...cloned.lhu };
            delete cloned.lhu.id_pelanggan;
            delete cloned.lhu.nama_pelanggan;
            delete cloned.lhu.alamat_pelanggan;
            delete cloned.lhu.pic_pelanggan;
            delete cloned.lhu.telp_pelanggan;
            delete cloned.lhu.email_pelanggan;
            delete cloned.lhu.nama_instansi;
            delete cloned.lhu.pic;
            delete cloned.lhu.no_telp;
            delete cloned.lhu.email_kontak;
            delete cloned.lhu.alamat;
        }
        return cloned;
    };
    getFinalizationQueue = async (req, res) => {
        try {
            const data = await this.lhuFinalizationService.getFinalizationQueue();
            return res.json({
                success: true,
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat antrean finalisasi LHU.');
        }
    };
    getFinalizationDetail = async (req, res) => {
        try {
            const identifier = this.requireValue(req.query.idRegistrasi || req.query.id_registrasi || req.query.noSampel || req.query.no_sampel, 'ID registrasi atau nomor sampel wajib dikirim.');
            const data = await this.lhuFinalizationService.getFinalizationDetail(identifier, req.query.sampleNos || req.query.sample_nos || null);
            return res.json({
                success: true,
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat detail finalisasi LHU.');
        }
    };
    getPaketBmOptions = async (req, res) => {
        try {
            const identifier = this.requireValue(req.query.idRegistrasi || req.query.id_registrasi || req.query.noSampel || req.query.no_sampel, 'ID registrasi atau nomor sampel wajib dikirim.');
            const data = await this.lhuFinalizationService.getPaketBmOptions(identifier);
            return res.json({
                success: true,
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat paket baku mutu.');
        }
    };
    getPersonelOptions = async (req, res) => {
        try {
            const data = await this.lhuDataService.getPersonelOptions();
            return res.json({
                success: true,
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat daftar personel.');
        }
    };
    previewFinalization = async (req, res) => {
        try {
            const identifier = this.requireValue(req.query.idRegistrasi || req.query.id_registrasi || req.query.noSampel || req.query.no_sampel, 'ID registrasi atau nomor sampel wajib dikirim.');
            const idPktBm = this.requireValue(req.query.idPktBm || req.query.id_pkt_bm, 'Paket baku mutu wajib dipilih.');
            const data = await this.lhuFinalizationService.previewFinalization(identifier, idPktBm, req.query.sampleNos || req.query.sample_nos);
            return res.json({
                success: true,
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal membuat preview finalisasi LHU.');
        }
    };
    finalizeLhu = async (req, res) => {
        try {
            const currentNik = this.getCurrentNik(req);
            if (!currentNik) {
                return res.status(401).json({
                    success: false,
                    message: 'User Pengendalian Mutu tidak valid. Silakan login ulang.',
                });
            }
            const identifier = this.requireValue(req.body.idRegistrasi || req.body.id_registrasi || req.body.noSampel || req.body.no_sampel || (Array.isArray(req.body.sampleNos) ? req.body.sampleNos[0] : ''), 'ID registrasi atau daftar sampel wajib dikirim.');
            this.requireValue(req.body.idPktBm || req.body.id_pkt_bm, 'Paket baku mutu wajib dipilih.');
            const data = await this.lhuFinalizationService.finalizeLhu(identifier, req.body, currentNik);
            try {
                await this.notificationService.notifyLhuNeedsKalabApproval({
                    nomorLhu: data?.nomorLhu || data?.nomor_lhu,
                });
            }
            catch (notificationError) {
                console.error('Gagal kirim notifikasi LHU ke Kalab:', notificationError);
            }
            return res.json({
                success: true,
                message: 'LHU berhasil dibuat, PDF draft dibuat, dan dikirim ke Kepala Lab.',
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal finalisasi LHU.');
        }
    };
    getLhuDetail = async (req, res) => {
        try {
            const nomorLhu = this.requireValue(req.query.nomorLhu, 'Nomor LHU wajib dikirim.');
            const data = await this.lhuService.getLhuDetail(nomorLhu);
            return res.json({
                success: true,
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat detail LHU.');
        }
    };
    getKasiPengujianQueue = async (req, res) => {
        return res.status(410).json({
            success: false,
            message: 'Antrean Kasi Pengujian LHU sudah tidak digunakan. Gunakan endpoint /assignments/kasi-review/queue.',
        });
    };
    approveKasiPengujian = async (req, res) => {
        return res.status(410).json({
            success: false,
            message: 'Approval Kasi Pengujian LHU sudah tidak digunakan. Gunakan endpoint /assignments/kasi-review/approve.',
        });
    };
    reviseKasiPengujian = async (req, res) => {
        return res.status(410).json({
            success: false,
            message: 'Revisi Kasi Pengujian LHU sudah tidak digunakan. Gunakan endpoint /assignments/kasi-review/revise.',
        });
    };
    getFinalizationHistory = async (req, res) => {
        try {
            const data = await this.lhuService.getFinalizationHistory();
            return res.json({
                success: true,
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat riwayat finalisasi LHU.');
        }
    };
    getKalabApprovalQueue = async (req, res) => {
        try {
            const data = await this.lhuService.getKalabApprovalQueue();
            return res.json({
                success: true,
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat antrean persetujuan Kepala Lab.');
        }
    };
    approveByKalab = async (req, res) => {
        try {
            const currentNik = this.getCurrentNik(req);
            if (!currentNik) {
                return res.status(401).json({
                    success: false,
                    message: 'User Kepala Lab tidak valid. Silakan login ulang.',
                });
            }
            const nomorLhu = this.requireValue(req.body.nomorLhu ||
                req.body.nomor_lhu ||
                req.query.nomorLhu ||
                req.query.nomor_lhu ||
                req.params.nomorLhu ||
                req.params.nomor_lhu, 'Nomor LHU wajib dikirim.');
            const data = await this.lhuService.approveByKalab(nomorLhu, currentNik);
            const approvedNomorLhu = data?.nomor_lhu || data?.nomorLhu || nomorLhu;
            setImmediate(() => {
                Promise.allSettled([
                    this.notificationService.notifyLhuReady({ nomorLhu: approvedNomorLhu }),
                    this.notificationService.notifyAdminWhenRequestLhusComplete({ nomorLhu: approvedNomorLhu }),
                ]).then((results) => {
                    results.forEach((result, index) => {
                        if (result.status === 'rejected') {
                            const target = index === 0 ? 'Pelanggan LHU siap diambil' : 'Admin kelengkapan LHU';
                            console.error(`notify${target} this.approveByKalab error:`, result.reason);
                        }
                    });
                });
            });
            return res.json({
                success: true,
                message: 'LHU berhasil disahkan dan PDF final berhasil dibuat.',
                data: secureKnownFileFields(data),
            });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal menyetujui LHU.');
        }
    };
}
module.exports = new LhuController({
    lhuService,
    lhuFinalizationService,
    lhuDataService,
    notificationService,
});
module.exports.LhuController = LhuController;
