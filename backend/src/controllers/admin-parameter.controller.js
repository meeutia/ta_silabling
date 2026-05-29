const AdminParameterService = require('../services/admin-parameter.service');

class AdminParameterController {
  // ==========================================
  // 1. Parameter & Metode Uji
  // ==========================================

  static async getAllParameterMetode(req, res) {
    try {
      const data = await AdminParameterService.getAllParameterMetode();
      res.json({
        success: true,
        data,
        message: 'Berhasil mengambil data parameter dan metode uji.'
      });
    } catch (error) {
      console.error('getAllParameterMetode error:', error);
      res.status(500).json({ success: false, message: 'Gagal mengambil data parameter dan metode uji.' });
    }
  }

  static async getKategoriParameters(req, res) {
    try {
      const data = await AdminParameterService.getKategoriParameters();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data kategori parameter.' });
    }
  }

  static async getParameters(req, res) {
    try {
      const data = await AdminParameterService.getParameters();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data parameter.' });
    }
  }

  static async getMethods(req, res) {
    try {
      const data = await AdminParameterService.getMethods();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data metode.' });
    }
  }

  static async getJenisSampel(req, res) {
    try {
      const data = await AdminParameterService.getJenisSampel();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data jenis sampel.' });
    }
  }

  static async createParameterMetode(req, res) {
    try {
      const data = await AdminParameterService.createParameterMetode(req.body);

      res.status(201).json({
        success: true,
        data,
        message: 'Berhasil menambahkan parameter dan metode baru.',
      });
    } catch (error) {
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
  }

  static async updateParameterMetode(req, res) {
    try {
      const { id } = req.params;
      const data = await AdminParameterService.updateParameterMetode(id, req.body);
      res.json({
        success: true,
        data,
        message: 'Berhasil mengubah data parameter metode.'
      });
    } catch (error) {
      console.error('updateParameterMetode error:', error);
      res.status(500).json({ success: false, message: error.message || 'Gagal mengubah data.' });
    }
  }

  static async deleteParameterMetode(req, res) {
    try {
      const { id } = req.params;
      await AdminParameterService.deleteParameterMetode(id);
      res.json({
        success: true,
        message: 'Berhasil menghapus data parameter metode.'
      });
    } catch (error) {
      console.error('deleteParameterMetode error:', error);
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ success: false, message: 'Data ini tidak dapat dihapus karena masih digunakan di data lain.' });
      }
      res.status(500).json({ success: false, message: error.message || 'Gagal menghapus data.' });
    }
  }

  // ==========================================
  // 2. Regulasi (reg_bm)
  // ==========================================

  static async getAllRegulasi(req, res) {
    try {
      const data = await AdminParameterService.getAllRegulasi();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data regulasi.' });
    }
  }

  static async createRegulasi(req, res) {
    try {
      const data = await AdminParameterService.createRegulasi(req.body);
      res.status(201).json({ success: true, data, message: 'Berhasil menambahkan regulasi.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal menambahkan regulasi.' });
    }
  }

  static async updateRegulasi(req, res) {
    try {
      const { id } = req.params;
      const data = await AdminParameterService.updateRegulasi(id, req.body);
      res.json({ success: true, data, message: 'Berhasil mengubah regulasi.' });
    } catch (error) {
      const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
      res.status(statusCode).json({ success: false, message: error.message || 'Gagal mengubah regulasi.' });
    }
  }

  static async deleteRegulasi(req, res) {
    try {
      const { id } = req.params;
      const result = await AdminParameterService.deleteRegulasi(id);
      res.json({
        success: true,
        data: result,
        message: result?.deactivated
          ? 'Regulasi sudah dipakai, jadi tidak dihapus permanen. Statusnya dinonaktifkan.'
          : 'Berhasil menghapus regulasi.',
      });
    } catch (error) {
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ success: false, message: 'Regulasi ini tidak dapat dihapus karena masih digunakan.' });
      }
      const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
      res.status(statusCode).json({ success: false, message: error.message || 'Gagal menghapus regulasi.' });
    }
  }

  // ==========================================
  // 3. Paket Baku Mutu (pkt_bm)
  // ==========================================

  static async getAllPaket(req, res) {
    try {
      const data = await AdminParameterService.getAllPaket();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data paket baku mutu.' });
    }
  }

  static async createPaket(req, res) {
    try {
      const data = await AdminParameterService.createPaket(req.body);
      res.status(201).json({ success: true, data, message: 'Berhasil menambahkan paket baku mutu.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal menambahkan paket baku mutu.' });
    }
  }

  static async updatePaket(req, res) {
    try {
      const { id } = req.params;
      const data = await AdminParameterService.updatePaket(id, req.body);
      res.json({ success: true, data, message: 'Berhasil mengubah paket baku mutu.' });
    } catch (error) {
      const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
      res.status(statusCode).json({ success: false, message: error.message || 'Gagal mengubah paket baku mutu.' });
    }
  }

  static async deletePaket(req, res) {
    try {
      const { id } = req.params;
      const result = await AdminParameterService.deletePaket(id);
      res.json({
        success: true,
        data: result,
        message: result?.deactivated
          ? 'Paket sudah dipakai pada LHU, jadi tidak dihapus permanen. Statusnya dinonaktifkan.'
          : 'Berhasil menghapus paket baku mutu.',
      });
    } catch (error) {
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ success: false, message: 'Paket ini tidak dapat dihapus karena masih digunakan.' });
      }
      const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
      res.status(statusCode).json({ success: false, message: error.message || 'Gagal menghapus paket baku mutu.' });
    }
  }

  // ==========================================
  // 4. Detail Paket Baku Mutu
  // ==========================================

  static async getPaketParameters(req, res) {
    try {
      const { id } = req.params;
      const data = await AdminParameterService.getPaketParameters(id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil detail parameter paket.' });
    }
  }

  static async addPaketParameter(req, res) {
    try {
      const { id } = req.params; // id_pkt_bm
      const data = await AdminParameterService.addPaketParameter(id, req.body);
      res.status(201).json({ success: true, data, message: 'Berhasil menambahkan parameter ke paket.' });
    } catch (error) {
      const knownError =
        error.code === 'PROTECTED_MASTER_IN_USE' ||
        error.message === 'Parameter ini sudah ada di paket tersebut.' ||
        error.message?.includes('belum memiliki metode') ||
        error.message?.includes('Metode parameter tidak valid');

      res.status(knownError ? 400 : 500).json({
        success: false,
        message: error.message || 'Gagal menambahkan parameter ke paket.',
      });
    }
  }

  static async updatePaketParameter(req, res) {
    try {
      const { id_pkt_bm_param } = req.params;
      const data = await AdminParameterService.updatePaketParameter(id_pkt_bm_param, req.body);
      res.json({ success: true, data, message: 'Berhasil mengubah detail parameter paket.' });
    } catch (error) {
      const knownError =
        error.code === 'PROTECTED_MASTER_IN_USE' ||
        error.message?.includes('tidak ditemukan') ||
        error.message?.includes('Minimal satu metode') ||
        error.message?.includes('Metode parameter tidak valid');

      res.status(knownError ? 400 : 500).json({
        success: false,
        message: error.message || 'Gagal mengubah detail parameter paket.',
      });
    }
  }

  static async deletePaketParameter(req, res) {
    try {
      const { id_pkt_bm_param } = req.params;
      await AdminParameterService.deletePaketParameter(id_pkt_bm_param);
      res.json({ success: true, message: 'Berhasil menghapus parameter dari paket.' });
    } catch (error) {
      const statusCode = error.code === 'PROTECTED_MASTER_IN_USE' ? 400 : 500;
      res.status(statusCode).json({ success: false, message: error.message || 'Gagal menghapus parameter dari paket.' });
    }
  }
  // ==========================================
  // 5. Tarif Pengambilan
  // ==========================================

  static async getAllTarifPengambilan(req, res) {
    try {
      const data = await AdminParameterService.getAllTarifPengambilan();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data tarif pengambilan.' });
    }
  }

  static async createTarifPengambilan(req, res) {
    try {
      const data = await AdminParameterService.createTarifPengambilan(req.body);
      res.status(201).json({ success: true, data, message: 'Berhasil menambahkan tarif pengambilan.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal menambahkan tarif pengambilan.' });
    }
  }

  static async updateTarifPengambilan(req, res) {
    try {
      const { id } = req.params;
      const data = await AdminParameterService.updateTarifPengambilan(id, req.body);
      res.json({ success: true, data, message: 'Berhasil mengubah tarif pengambilan.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message || 'Gagal mengubah tarif pengambilan.' });
    }
  }

  static async deleteTarifPengambilan(req, res) {
    try {
      const { id } = req.params;
      await AdminParameterService.deleteTarifPengambilan(id);
      res.json({ success: true, message: 'Berhasil menghapus tarif pengambilan.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message || 'Gagal menghapus tarif pengambilan.' });
    }
  }
}

module.exports = AdminParameterController;
