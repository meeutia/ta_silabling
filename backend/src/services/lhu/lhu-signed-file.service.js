const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { Lhu, Fppl, Pelanggan } = require('../../models/Associations');
const sequelize = require('../../config/database');
const WorkflowLogService = require('../workflow/workflow-log.service');
const Roles = require('../../constants/roles');

const UPLOAD_ROOT_DIR = path.join(process.cwd(), 'uploads');
const SIGNED_LHU_DIR = path.join(UPLOAD_ROOT_DIR, 'lhu-signed');

// Ensure directory exists
require('fs').mkdirSync(SIGNED_LHU_DIR, { recursive: true });

class LhuSignedFileService {
  async removeFileSafely(filePath) {
    if (!filePath) return;
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  async getLhuWithOwnership(nomorLhu, transaction, lock) {
    const lhu = await Lhu.findOne({
      where: { nomor_lhu: nomorLhu },
      include: [
        {
          model: Fppl,
          as: 'fppl',
          required: true,
          include: [
            {
              model: Pelanggan,
              as: 'pelanggan',
              required: true,
              attributes: ['id_pelanggan', 'nik', 'nama_instansi', 'pic'],
            },
          ],
        },
      ],
      transaction,
      lock,
    });
    return lhu;
  }

  assertSignedLhuAccess({ lhu, userNik, role }) {
    if (role === Roles.ADMIN) {
      return true;
    }

    if (role === Roles.CUSTOMER) {
      const ownerNik = lhu.fppl?.pelanggan?.nik;
      if (String(ownerNik) === String(userNik)) {
        return true;
      }
    }

    const error = new Error('Anda tidak memiliki akses ke dokumen LHU ini.');
    error.code = 'SIGNED_LHU_ACCESS_DENIED';
    error.status = 403;
    throw error;
  }

  async uploadSignedFile({ nomorLhu, uploadedFile, confirmedSignedByKalab, adminNik }) {
    if (!uploadedFile) {
      const error = new Error('File LHU bertanda tangan wajib diunggah.');
      error.code = 'SIGNED_LHU_FILE_REQUIRED';
      error.status = 400;
      throw error;
    }

    if (!confirmedSignedByKalab || confirmedSignedByKalab !== 'true') {
      await this.removeFileSafely(uploadedFile.path);
      const error = new Error('Admin wajib memastikan LHU sudah ditandatangani Kepala Laboratorium.');
      error.code = 'SIGNED_LHU_CONFIRMATION_REQUIRED';
      error.status = 400;
      throw error;
    }

    const transaction = await sequelize.transaction();
    try {
      const lhu = await this.getLhuWithOwnership(nomorLhu, transaction, transaction.LOCK.UPDATE);

      if (!lhu) {
        throw { message: 'LHU tidak ditemukan.', code: 'LHU_NOT_FOUND', status: 404 };
      }

      if (!lhu.canReceiveSignedFile()) {
        throw {
          message: 'LHU bertanda tangan hanya dapat diunggah setelah LHU berstatus Disahkan.',
          code: 'LHU_NOT_FINAL',
          status: 409
        };
      }

      if (lhu.hasSignedFile()) {
        throw {
          message: 'LHU bertanda tangan sudah tersedia. Gunakan fitur ganti file untuk memperbaruinya.',
          code: 'SIGNED_LHU_ALREADY_EXISTS',
          status: 409
        };
      }

      const ext = path.extname(uploadedFile.originalname || '.pdf').toLowerCase();
      const uniqueName = `signed-lhu_${crypto.randomUUID()}${ext}`;
      const finalStoredPath = path.join(SIGNED_LHU_DIR, uniqueName);

      await fs.rename(uploadedFile.path, finalStoredPath);

      await lhu.update({
        file_lhu_signed_path: finalStoredPath,
      }, { transaction });

      await WorkflowLogService.logStatusTransition({
        entityType: 'LHU',
        entityId: nomorLhu,
        action: 'MENGUNGGAH_LHU_BERTANDA_TANGAN',
        statusBefore: lhu.status_lhu,
        statusAfter: lhu.status_lhu,
        source: 'Admin',
        actorNik: adminNik,
        note: 'Dokumen LHU bertanda tangan telah diunggah.',
        transaction,
      });

      await transaction.commit();

      return {
        nomorLhu: lhu.nomor_lhu,
        hasSignedFile: true,
      };

    } catch (error) {
      await transaction.rollback();
      await this.removeFileSafely(uploadedFile.path);

      const err = new Error(error.message);
      err.code = error.code || 'SIGNED_LHU_UPLOAD_FAILED';
      err.status = error.status || 400;
      throw err;
    }
  }

  async replaceSignedFile({ nomorLhu, uploadedFile, confirmedSignedByKalab, adminNik }) {
    if (!uploadedFile) {
      const error = new Error('File LHU bertanda tangan wajib diunggah.');
      error.code = 'SIGNED_LHU_FILE_REQUIRED';
      error.status = 400;
      throw error;
    }

    if (!confirmedSignedByKalab || confirmedSignedByKalab !== 'true') {
      await this.removeFileSafely(uploadedFile.path);
      const error = new Error('Admin wajib memastikan LHU sudah ditandatangani Kepala Laboratorium.');
      error.code = 'SIGNED_LHU_CONFIRMATION_REQUIRED';
      error.status = 400;
      throw error;
    }

    const transaction = await sequelize.transaction();
    try {
      const lhu = await this.getLhuWithOwnership(nomorLhu, transaction, transaction.LOCK.UPDATE);

      if (!lhu) {
        throw { message: 'LHU tidak ditemukan.', code: 'LHU_NOT_FOUND', status: 404 };
      }

      if (!lhu.canReceiveSignedFile()) {
        throw {
          message: 'LHU bertanda tangan hanya dapat diunggah setelah LHU berstatus Disahkan.',
          code: 'LHU_NOT_FINAL',
          status: 409
        };
      }

      if (!lhu.hasSignedFile()) {
        throw {
          message: 'LHU bertanda tangan belum tersedia. Gunakan fitur upload pertama.',
          code: 'SIGNED_LHU_NOT_AVAILABLE',
          status: 404
        };
      }

      const oldFilePath = lhu.file_lhu_signed_path;

      const ext = path.extname(uploadedFile.originalname || '.pdf').toLowerCase();
      const uniqueName = `signed-lhu_${crypto.randomUUID()}${ext}`;
      const newStoredPath = path.join(SIGNED_LHU_DIR, uniqueName);

      await fs.rename(uploadedFile.path, newStoredPath);

      await lhu.update({
        file_lhu_signed_path: newStoredPath,
      }, { transaction });

      await WorkflowLogService.logStatusTransition({
        entityType: 'LHU',
        entityId: nomorLhu,
        action: 'MENGGANTI_LHU_BERTANDA_TANGAN',
        statusBefore: lhu.status_lhu,
        statusAfter: lhu.status_lhu,
        source: 'Admin',
        actorNik: adminNik,
        note: 'Dokumen LHU bertanda tangan diperbarui.',
        transaction,
      });

      await transaction.commit();

      // Only delete old file after successful commit
      if (oldFilePath) {
        await this.removeFileSafely(oldFilePath);
      }

      return {
        nomorLhu: lhu.nomor_lhu,
        hasSignedFile: true,
      };

    } catch (error) {
      await transaction.rollback();
      await this.removeFileSafely(uploadedFile.path);

      const err = new Error(error.message);
      err.code = error.code || 'SIGNED_LHU_REPLACE_FAILED';
      err.status = error.status || 400;
      throw err;
    }
  }

  async resolveSignedFileForAccess(nomorLhu, userNik, role) {
    const lhu = await this.getLhuWithOwnership(nomorLhu, null, null);

    if (!lhu) {
      const error = new Error('LHU tidak ditemukan.');
      error.code = 'LHU_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (!lhu.hasSignedFile()) {
      const error = new Error('LHU bertanda tangan belum tersedia.');
      error.code = 'SIGNED_LHU_NOT_AVAILABLE';
      error.status = 404;
      throw error;
    }

    this.assertSignedLhuAccess({ lhu, userNik, role });

    const absolutePath = path.resolve(lhu.file_lhu_signed_path);
    if (!absolutePath.startsWith(path.resolve(SIGNED_LHU_DIR))) {
      const error = new Error('Akses ke file LHU tidak diizinkan.');
      error.code = 'SIGNED_LHU_ACCESS_DENIED';
      error.status = 403;
      throw error;
    }

    try {
      await fs.access(absolutePath, fs.constants.R_OK);
    } catch {
      const error = new Error('File fisik LHU bertanda tangan tidak tersedia.');
      error.code = 'SIGNED_LHU_NOT_AVAILABLE';
      error.status = 404;
      throw error;
    }

    return {
      absolutePath,
      mimeType: 'application/pdf',
      originalName: `LHU_${nomorLhu.replace(/[^a-zA-Z0-9]/g, '_')}_signed.pdf`,
    };
  }

  buildAdminSignedLhuDocuments(responseData) {
    const documents = [];
    if (!responseData || !responseData.lhus) return documents;

    for (const lhu of responseData.lhus) {
      documents.push({
        nomorLhu: lhu.nomor_lhu,
        hasSignedFile: Boolean(lhu.file_lhu_signed_path),
      });
    }

    return this._deduplicateLhuDocuments(documents);
  }

  buildCustomerSignedLhuDocuments(responseData) {
    const documents = [];
    if (!responseData || !responseData.lhus) return documents;

    for (const lhu of responseData.lhus) {
      const sampleNos = Array.isArray(lhu.sampels) ? lhu.sampels.map(s => s.no_sampel) : [];

      documents.push({
        nomorLhu: lhu.nomor_lhu,
        sampleNos,
        tanggalPenerbitan: lhu.tanggal_penerbitan || null,
        hasSignedFile: Boolean(lhu.file_lhu_signed_path),
      });
    }

    return this._deduplicateLhuDocuments(documents, true);
  }

  _deduplicateLhuDocuments(documents, mergeSamples = false) {
    const lhuMap = new Map();

    for (const doc of documents) {
      if (lhuMap.has(doc.nomorLhu)) {
        if (mergeSamples && Array.isArray(doc.sampleNos)) {
          const existing = lhuMap.get(doc.nomorLhu);
          existing.sampleNos = [...new Set([...existing.sampleNos, ...doc.sampleNos])].sort();
        }
      } else {
        lhuMap.set(doc.nomorLhu, { ...doc });
      }
    }

    const mergedList = Array.from(lhuMap.values());
    mergedList.sort((a, b) => {
      const dateA = a.tanggalPenerbitan ? new Date(a.tanggalPenerbitan) : new Date(0);
      const dateB = b.tanggalPenerbitan ? new Date(b.tanggalPenerbitan) : new Date(0);
      return dateA - dateB;
    });

    return mergedList;
  }
}

module.exports = new LhuSignedFileService();
