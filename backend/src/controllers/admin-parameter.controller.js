const AdminParameterService = require('../services/admin-parameter.service');
class AdminParameterController {
    constructor(adminParameterService = AdminParameterService) {
        this.adminParameterService = adminParameterService;
    }
    getAllParameterMetode = async (req, res) => {
        try {
            const data = await this.adminParameterService.getAllParameterMetode();
            res.json({
                success: true,
                data,
                message: 'Berhasil mengambil data parameter dan metode uji.'
            });
        }
        catch (error) {
            console.error('getAllParameterMetode error:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil data parameter dan metode uji.' });
        }
    };
    getKategoriParameters = async (req, res) => {
        try {
            const data = await this.adminParameterService.getKategoriParameters();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data kategori parameter.' });
        }
    };
    getParameters = async (req, res) => {
        try {
            const data = await this.adminParameterService.getParameters();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data parameter.' });
        }
    };
    getMethods = async (req, res) => {
        try {
            const data = await this.adminParameterService.getMethods();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data metode.' });
        }
    };
    getKlasifikasi = async (req, res) => {
        try {
            const data = await this.adminParameterService.getAllKlasifikasi();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data klasifikasi.' });
        }
    };
    getSatuan = async (req, res) => {
        try {
            const data = await this.adminParameterService.getAllSatuan();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data satuan.' });
        }
    };
    getJenisSampel = async (req, res) => {
        try {
            const data = await this.adminParameterService.getJenisSampel();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data jenis sampel.' });
        }
    };
    createParameterMetode = async (req, res) => {
        try {
            const data = await this.adminParameterService.createParameterMetode(req.body);
            res.status(201).json({
                success: true,
                data,
                message: 'Berhasil menambahkan parameter dan metode baru.',
            });
        }
        catch (error) {
            console.error('createParameterMetode error:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'ID data sudah ada. Silakan coba simpan ulang.',
                });
            }
            const knownErrors = [
                'Kombinasi Parameter dan Metode ini sudah ada.',
                'Nama parameter baru harus diisi',
                'Nama metode baru harus diisi',
                'Parameter harus dipilih atau dibuat baru',
                'Metode harus dipilih atau dibuat baru',
            ];
            if (knownErrors.includes(error.message)) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                success: false,
                message: error.message || 'Gagal menambahkan data.',
            });
        }
    };
    updateParameterMetode = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.adminParameterService.updateParameterMetode(id, req.body);
            res.json({
                success: true,
                data,
                message: 'Berhasil mengubah data parameter metode.'
            });
        }
        catch (error) {
            console.error('updateParameterMetode error:', error);
            res.status(500).json({ success: false, message: error.message || 'Gagal mengubah data.' });
        }
    };
    deleteParameterMetode = async (req, res) => {
        try {
            const { id } = req.params;
            await this.adminParameterService.deleteParameterMetode(id);
            res.json({
                success: true,
                message: 'Berhasil menghapus data parameter metode.'
            });
        }
        catch (error) {
            console.error('deleteParameterMetode error:', error);
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ success: false, message: 'Data ini tidak dapat dihapus karena masih digunakan di data lain.' });
            }
            res.status(500).json({ success: false, message: error.message || 'Gagal menghapus data.' });
        }
    };
    getAllRegulasi = async (req, res) => {
        try {
            const data = await this.adminParameterService.getAllRegulasi();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data regulasi.' });
        }
    };
    createRegulasi = async (req, res) => {
        try {
            const data = await this.adminParameterService.createRegulasi(req.body);
            res.status(201).json({ success: true, data, message: 'Berhasil menambahkan regulasi.' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal menambahkan regulasi.' });
        }
    };
    updateRegulasi = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.adminParameterService.updateRegulasi(id, req.body);
            res.json({ success: true, data, message: 'Berhasil mengubah regulasi.' });
        }
        catch (error) {
            const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
            res.status(statusCode).json({ success: false, message: error.message || 'Gagal mengubah regulasi.' });
        }
    };
    deleteRegulasi = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.adminParameterService.deleteRegulasi(id);
            res.json({
                success: true,
                data: result,
                message: result?.deactivated
                    ? 'Regulasi sudah dipakai, jadi tidak dihapus permanen. Statusnya dinonaktifkan.'
                    : 'Berhasil menghapus regulasi.',
            });
        }
        catch (error) {
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ success: false, message: 'Regulasi ini tidak dapat dihapus karena masih digunakan.' });
            }
            const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
            res.status(statusCode).json({ success: false, message: error.message || 'Gagal menghapus regulasi.' });
        }
    };
    getAllPaket = async (req, res) => {
        try {
            const data = await this.adminParameterService.getAllPaket();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data paket baku mutu.' });
        }
    };
    updatePaketKelompokStatus = async (req, res) => {
        try {
            const { id_reg_bm, id_jenis_sampel } = req.params;
            const data = await this.adminParameterService.updatePaketKelompokStatus(id_reg_bm, id_jenis_sampel, req.body);
            res.json({
                success: true,
                data,
                message: data?.is_active ? 'Kelompok baku mutu berhasil diaktifkan.' : 'Kelompok baku mutu berhasil dinonaktifkan.',
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || 'Gagal mengubah status kelompok baku mutu.' });
        }
    };
    createPaket = async (req, res) => {
        try {
            const data = await this.adminParameterService.createPaket(req.body);
            const totalCreated = Array.isArray(data) ? data.length : 1;
            res.status(201).json({
                success: true,
                data,
                message: totalCreated > 1
                    ? `Berhasil menambahkan ${totalCreated} klasifikasi paket baku mutu.`
                    : 'Berhasil menambahkan paket baku mutu.',
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message || 'Gagal menambahkan paket baku mutu.' });
        }
    };
    updatePaket = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.adminParameterService.updatePaket(id, req.body);
            res.json({ success: true, data, message: 'Berhasil mengubah paket baku mutu.' });
        }
        catch (error) {
            const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
            res.status(statusCode).json({ success: false, message: error.message || 'Gagal mengubah paket baku mutu.' });
        }
    };
    deletePaket = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.adminParameterService.deletePaket(id);
            res.json({
                success: true,
                data: result,
                message: result?.deactivated
                    ? 'Klasifikasi sudah dipakai pada LHU, sehingga tidak dapat dihapus.'
                    : 'Berhasil menghapus klasifikasi baku mutu.',
            });
        }
        catch (error) {
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ success: false, message: 'Paket ini tidak dapat dihapus karena masih digunakan.' });
            }
            const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
            res.status(statusCode).json({ success: false, message: error.message || 'Gagal menghapus paket baku mutu.' });
        }
    };
    getPaketParameters = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.adminParameterService.getPaketParameters(id);
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('getPaketParameters error:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil detail parameter paket.' });
        }
    };
    addPaketParameter = async (req, res) => {
        try {
            const { id } = req.params; // id_pkt_bm
            const data = await this.adminParameterService.addPaketParameter(id, req.body);
            res.status(201).json({ success: true, data, message: 'Berhasil menambahkan parameter ke paket.' });
        }
        catch (error) {
            console.error('addPaketParameter error:', error);
            const knownError = error.code === 'PROTECTED_MASTER_IN_USE' ||
                error.message === 'Parameter ini sudah ada di paket tersebut.' ||
                error.message === 'Parameter harus dipilih.' ||
                error.message === 'Paket baku mutu tidak ditemukan.' ||
                error.message === 'Parameter tidak ditemukan.' ||
                error.message?.includes('belum memiliki metode') ||
                error.message?.includes('Metode parameter tidak valid') ||
                error.message?.includes('maksimal');
            res.status(knownError ? 400 : 500).json({
                success: false,
                message: error.message || 'Gagal menambahkan parameter ke paket.',
            });
        }
    };
    updatePaketParameter = async (req, res) => {
        try {
            const { id_pkt_bm, id_parameter } = req.params;
            const data = await this.adminParameterService.updatePaketParameter(id_pkt_bm, id_parameter, req.body);
            res.json({ success: true, data, message: 'Berhasil mengubah detail parameter paket.' });
        }
        catch (error) {
            console.error('updatePaketParameter error:', error);
            const knownError = error.code === 'PROTECTED_MASTER_IN_USE' ||
                error.message?.includes('tidak ditemukan') ||
                error.message?.includes('Minimal satu metode') ||
                error.message?.includes('Metode parameter tidak valid') ||
                error.message?.includes('maksimal');
            res.status(knownError ? 400 : 500).json({
                success: false,
                message: error.message || 'Gagal mengubah detail parameter paket.',
            });
        }
    };
    deletePaketParameter = async (req, res) => {
        try {
            const { id_pkt_bm, id_parameter } = req.params;
            await this.adminParameterService.deletePaketParameter(id_pkt_bm, id_parameter);
            res.json({ success: true, message: 'Berhasil menghapus parameter dari paket.' });
        }
        catch (error) {
            console.error('deletePaketParameter error:', error);
            const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' || error.message?.includes('tidak ditemukan') ? 400 : 500;
            res.status(statusCode).json({ success: false, message: error.message || 'Gagal menghapus parameter dari paket.' });
        }
    };
    getAllTarifPengambilan = async (req, res) => {
        try {
            const data = await this.adminParameterService.getAllTarifPengambilan();
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data tarif pengambilan.' });
        }
    };
    createTarifPengambilan = async (req, res) => {
        try {
            const data = await this.adminParameterService.createTarifPengambilan(req.body);
            res.status(201).json({ success: true, data, message: 'Berhasil menambahkan tarif pengambilan.' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal menambahkan tarif pengambilan.' });
        }
    };
    updateTarifPengambilan = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.adminParameterService.updateTarifPengambilan(id, req.body);
            res.json({ success: true, data, message: 'Berhasil mengubah tarif pengambilan.' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || 'Gagal mengubah tarif pengambilan.' });
        }
    };
    deleteTarifPengambilan = async (req, res) => {
        try {
            const { id } = req.params;
            await this.adminParameterService.deleteTarifPengambilan(id);
            res.json({ success: true, message: 'Berhasil menghapus tarif pengambilan.' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || 'Gagal menghapus tarif pengambilan.' });
        }
    };
}
module.exports = new AdminParameterController();
module.exports.AdminParameterController = AdminParameterController;
