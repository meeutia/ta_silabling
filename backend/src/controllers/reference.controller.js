const ReferenceService = require('../services/reference.service');
const { successResponse, errorResponse } = require('../utils/response');

const getJenisSampel = async (req, res) => {
    try {
        const data = await ReferenceService.getJenisSampel();
        return successResponse(res, 'Berhasil mengambil jenis sampel', data);
    } catch (error) {
        console.error('getJenisSampel error:', error);
        return errorResponse(res, 'Terjadi kesalahan pada server.');
    }
};

const getBmStandards = async (req, res) => {
    try {
        const { id_jenis_sampel } = req.query;
        const data = await ReferenceService.getBmStandards(id_jenis_sampel || null);
        return successResponse(res, 'Berhasil mengambil standar baku mutu', data);
    } catch (error) {
        console.error('getBmStandards error:', error);
        return errorResponse(res, 'Terjadi kesalahan pada server.');
    }
};


const getPaketBm = async (req, res) => {
    try {
        const data = await ReferenceService.getPaketBm();
        return successResponse(res, 'Berhasil mengambil paket baku mutu', data);
    } catch (error) {
        console.error('getPaketBm error:', error);
        return errorResponse(res, 'Terjadi kesalahan pada server.');
    }
};

const getPaketBmByJenisSampel = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await ReferenceService.getPaketBmByJenisSampel(id);
        return successResponse(res, 'Berhasil mengambil paket baku mutu berdasarkan jenis sampel', data);
    } catch (error) {
        console.error('getPaketBmByJenisSampel error:', error);
        return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
    }
};

const getParameter = async (req, res) => {
    try {
        const data = await ReferenceService.getParameter();
        return successResponse(res, 'Berhasil mengambil parameter', data);
    } catch (error) {
        console.error('getParameter error:', error);
        return errorResponse(res, 'Terjadi kesalahan pada server.');
    }
};


const getParameterTariffs = async (req, res) => {
    try {
        const data = await ReferenceService.getParameterTariffs();
        return successResponse(res, 'Berhasil mengambil tarif parameter', data);
    } catch (error) {
        console.error('getParameterTariffs error:', error);
        return errorResponse(res, 'Terjadi kesalahan pada server.');
    }
};

const getTarifPengambilan = async (req, res) => {
    try {
        const data = await ReferenceService.getTarifPengambilan();
        return successResponse(res, 'Berhasil mengambil tarif pengambilan', data);
    } catch (error) {
        console.error('getTarifPengambilan error:', error);
        return errorResponse(res, 'Terjadi kesalahan pada server.');
    }
};

const getParameterByJenisSampel = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_pkt_bm, id_reg_bm } = req.query;

        const data = await ReferenceService.getParameterByJenisSampel(id, id_pkt_bm, id_reg_bm);
        return successResponse(res, 'Berhasil mengambil parameter berdasarkan jenis sampel', data);
    } catch (error) {
        console.error('getParameterByJenisSampel error:', error);
        return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
    }
};

const getParameterByPaketBm = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await ReferenceService.getParameterByPaketBm(id);
        return successResponse(res, 'Berhasil mengambil parameter berdasarkan paket baku mutu', data);
    } catch (error) {
        console.error('getParameterByPaketBm error:', error);
        return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
    }
};

const getHariLibur = async (req, res) => {
    try {
        const data = await ReferenceService.getHariLibur();
        return successResponse(res, 'Berhasil mengambil hari libur', data);
    } catch (error) {
        console.error('getHariLibur error:', error.message);
        return errorResponse(res, error.message || 'Gagal mengambil data hari libur.');
    }
};


const getAdminContact = async (req, res) => {
  try {
    const data = await ReferenceService.getAdminContact();
    return successResponse(res, 'Berhasil mengambil kontak admin', data);
  } catch (error) {
    console.error('getAdminContact error:', error.message);
    return errorResponse(res, error.message || 'Gagal mengambil kontak admin.');
  }
};

const getPccPegawai = async (req, res) => {
  try {
    const data = await ReferenceService.getPccPegawai();
    return successResponse(res, 'Berhasil mengambil data PCC', data);
  } catch (error) {
    console.error('getPccPegawai error:', error.message);
    return errorResponse(res, error.message || 'Gagal mengambil data PCC.');
  }
};

module.exports = {
    getJenisSampel,
    getBmStandards,
    getPaketBm,
    getPaketBmByJenisSampel,
    getParameter,
    getParameterTariffs,
    getTarifPengambilan,
    getParameterByPaketBm,
    getParameterByJenisSampel,
    getHariLibur,
    getAdminContact,
    getPccPegawai
};