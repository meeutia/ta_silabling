const ReferenceService = require('../services/reference.service');
const { successResponse, errorResponse } = require('../utils/response');
class ReferenceController {
    constructor(referenceService) {
        this.referenceService = referenceService;
    }
    getJenisSampel = async (req, res) => {
        try {
            const data = await this.referenceService.getJenisSampel();
            return successResponse(res, 'Berhasil mengambil jenis sampel', data);
        }
        catch (error) {
            console.error('getJenisSampel error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };
    getBmStandards = async (req, res) => {
        try {
            const { id_jenis_sampel } = req.query;
            const data = await this.referenceService.getBmStandards(id_jenis_sampel || null);
            return successResponse(res, 'Berhasil mengambil standar baku mutu', data);
        }
        catch (error) {
            console.error('getBmStandards error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };
    getPaketBm = async (req, res) => {
        try {
            const data = await this.referenceService.getPaketBm();
            return successResponse(res, 'Berhasil mengambil paket baku mutu', data);
        }
        catch (error) {
            console.error('getPaketBm error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };
    getPaketBmByJenisSampel = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.referenceService.getPaketBmByJenisSampel(id);
            return successResponse(res, 'Berhasil mengambil paket baku mutu berdasarkan jenis sampel', data);
        }
        catch (error) {
            console.error('getPaketBmByJenisSampel error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    getParameter = async (req, res) => {
        try {
            const data = await this.referenceService.getParameter();
            return successResponse(res, 'Berhasil mengambil parameter', data);
        }
        catch (error) {
            console.error('getParameter error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };
    getParameterTariffs = async (req, res) => {
        try {
            const data = await this.referenceService.getParameterTariffs();
            return successResponse(res, 'Berhasil mengambil tarif parameter', data);
        }
        catch (error) {
            console.error('getParameterTariffs error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };
    getTarifPengambilan = async (req, res) => {
        try {
            const data = await this.referenceService.getTarifPengambilan();
            return successResponse(res, 'Berhasil mengambil tarif pengambilan', data);
        }
        catch (error) {
            console.error('getTarifPengambilan error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };
    getParameterByJenisSampel = async (req, res) => {
        try {
            const { id } = req.params;
            const { id_pkt_bm, id_reg_bm } = req.query;
            const data = await this.referenceService.getParameterByJenisSampel(id, id_pkt_bm, id_reg_bm);
            return successResponse(res, 'Berhasil mengambil parameter berdasarkan jenis sampel', data);
        }
        catch (error) {
            console.error('getParameterByJenisSampel error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    getParameterByPaketBm = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.referenceService.getParameterByPaketBm(id);
            return successResponse(res, 'Berhasil mengambil parameter berdasarkan paket baku mutu', data);
        }
        catch (error) {
            console.error('getParameterByPaketBm error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    getHariLibur = async (req, res) => {
        try {
            const data = await this.referenceService.getHariLibur();
            return successResponse(res, 'Berhasil mengambil hari libur', data);
        }
        catch (error) {
            console.error('getHariLibur error:', error.message);
            return errorResponse(res, error.message || 'Gagal mengambil data hari libur.');
        }
    };
    getAdminContact = async (req, res) => {
        try {
            const data = await this.referenceService.getAdminContact();
            return successResponse(res, 'Berhasil mengambil kontak admin', data);
        }
        catch (error) {
            console.error('getAdminContact error:', error.message);
            return errorResponse(res, error.message || 'Gagal mengambil kontak admin.');
        }
    };
    getPccPegawai = async (req, res) => {
        try {
            const data = await this.referenceService.getPccPegawai();
            return successResponse(res, 'Berhasil mengambil data PCC', data);
        }
        catch (error) {
            console.error('getPccPegawai error:', error.message);
            return errorResponse(res, error.message || 'Gagal mengambil data PCC.');
        }
    };
}
module.exports = new ReferenceController(ReferenceService);
module.exports.ReferenceController = ReferenceController;
