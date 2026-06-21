const AdminParameterService = require('../services/admin-parameter.service');
const { successResponse, errorResponse } = require('../utils/response');

class CatalogController {
    constructor(adminParameterService) {
        this.adminParameterService = adminParameterService;
    }

    getSampleTypes = async (req, res) => {
        try {
            const data = await this.adminParameterService.getPublicJenisSampel();
            return successResponse(res, 'Berhasil mengambil jenis sampel', data);
        }
        catch (error) {
            console.error('getSampleTypes catalog error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };

    getBmStandards = async (req, res) => {
        try {
            const { id_jenis_sampel } = req.query;
            const data = await this.adminParameterService.getPublicBmStandards(id_jenis_sampel || null);
            return successResponse(res, 'Berhasil mengambil standar baku mutu', data);
        }
        catch (error) {
            console.error('getBmStandards catalog error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };

    getPaketBm = async (req, res) => {
        try {
            const data = await this.adminParameterService.getPublicPaketBm();
            return successResponse(res, 'Berhasil mengambil paket baku mutu', data);
        }
        catch (error) {
            console.error('getPaketBm catalog error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };

    getPaketBmByJenisSampel = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.adminParameterService.getPublicPaketBmByJenisSampel(id);
            return successResponse(res, 'Berhasil mengambil paket baku mutu berdasarkan jenis sampel', data);
        }
        catch (error) {
            console.error('getPaketBmByJenisSampel catalog error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };

    getParameterTariffs = async (req, res) => {
        try {
            const data = await this.adminParameterService.getPublicParameterTariffs();
            return successResponse(res, 'Berhasil mengambil tarif parameter', data);
        }
        catch (error) {
            console.error('getParameterTariffs catalog error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };

    getPickupTariffs = async (req, res) => {
        try {
            const data = await this.adminParameterService.getPublicTarifPengambilan();
            return successResponse(res, 'Berhasil mengambil tarif pengambilan', data);
        }
        catch (error) {
            console.error('getPickupTariffs catalog error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };

    getParameterBySampleType = async (req, res) => {
        try {
            const { id } = req.params;
            const { id_pkt_bm, id_reg_bm } = req.query;
            const data = await this.adminParameterService.getPublicParameterByJenisSampel(id, id_pkt_bm, id_reg_bm);
            return successResponse(res, 'Berhasil mengambil parameter berdasarkan jenis sampel', data);
        }
        catch (error) {
            console.error('getParameterBySampleType catalog error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };

    getParameterByPackage = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.adminParameterService.getPublicParameterByPaketBm(id);
            return successResponse(res, 'Berhasil mengambil parameter berdasarkan paket baku mutu', data);
        }
        catch (error) {
            console.error('getParameterByPackage catalog error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
}

module.exports = new CatalogController(AdminParameterService);
module.exports.CatalogController = CatalogController;
