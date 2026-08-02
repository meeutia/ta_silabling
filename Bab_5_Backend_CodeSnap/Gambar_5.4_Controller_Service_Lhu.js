// Potongan implementasi untuk dokumentasi Bab 5.
// Sumber: backend/src/controllers/lhu.controller.js
//         backend/src/services/lhu/lhu-finalization.service.js
//         backend/src/services/lhu/lhu.service.js
// Source production tidak diubah.

// ─────────────────────────────────────────────────────────────
// LhuController
// ─────────────────────────────────────────────────────────────

class LhuController {
  finalizeLhu = async (req, res) => {
    try {
      const currentNik = this.getCurrentNik(req);
      if (!currentNik) return res.status(401).json({ success: false,
        message: 'User Pengendalian Mutu tidak valid. Silakan login ulang.' });

      const { idRegistrasi, idPktBm, sampleNos, detailOrder } = req.body;

      const data = await this.lhuFinalizationService.finalizeLhu(
        idRegistrasi, { idPktBm, sampleNos, detailOrder }, currentNik
      );

      setImmediate(() => {
        this.notificationService
          .notifyAdminWhenRequestLhusComplete({ nomorLhu: data.nomorLhu })
          .catch(() => {});
      });

      return res.json({ success: true,
        message: 'LHU berhasil difinalisasi, disahkan, dan PDF final berhasil dibuat.',
        data: secureKnownFileFields(data) });
    } catch (error) {
      return this.handleError(res, error, 'Gagal finalisasi LHU.');
    }
  };

// ─────────────────────────────────────────────────────────────
// LhuFinalizationService
// ─────────────────────────────────────────────────────────────

class LhuFinalizationService {
  finalizeLhu = async (idRegistrasi, requestData, currentNik) => {
    const { idPktBm, sampleNos, detailOrder } = requestData;
    if (!idPktBm)    throw new Error('Paket baku mutu wajib dipilih.');
    if (!currentNik) throw new Error('User Pengendalian Mutu tidak valid.');

    return sequelize.transaction(async (transaction) => {
      const sampleInfos = await this.resolveSelectedSampleInfos(idRegistrasi, sampleNos, transaction);
      const bmInfo      = await getBmInfo(idPktBm, transaction);
      this.validateSampleCompatibilityForLhu(sampleInfos, bmInfo);

      const details = applyDetailOrder(
        await this.buildLhuPreviewDetails(sampleInfos, bmInfo, transaction),
        this.normalizeDetailOrderInput(detailOrder)
      );

      const existingRows = await this.findExistingLhuRows(sampleInfos, transaction);
      const locked = existingRows.find(row => !isEditableByQcStatus(row.status_lhu));
      if (locked) throw new Error(`Sampel sudah masuk LHU ${locked.nomor_lhu} yang tidak dapat diubah QC.`);

      const nomorLhu = existingRows[0]?.nomor_lhu || await generateDraftNomorLhu(Lhu, transaction);
      await Lhu.upsert({ nomor_lhu: nomorLhu, id_registrasi: sampleInfos[0].id_registrasi,
        id_pkt_bm: idPktBm, qc_by: currentNik, qc_at: new Date(),
        status_lhu: LHU_NEXT_STATUS.AFTER_QC_FINALIZE }, { transaction });

      await Sampel.update({ nomor_lhu: nomorLhu },
        { where: { no_sampel: { [Op.in]: sampleInfos.map(s => s.no_sampel) } }, transaction });
      await this.saveDetailOrderSnapshot({ nomorLhu, rows: details, currentNik, transaction });

      const pdfResult = await lhuPdfService.generateFinalLhuPdf(nomorLhu, transaction, { detailOrder: details });
      await Lhu.update({ file_lhu_path: pdfResult.filePath }, { where: { nomor_lhu: nomorLhu }, transaction });

      await WorkflowLogService.logStatusTransition({ entityType: 'LHU', entityId: nomorLhu,
        action: 'MEMBUAT_LHU_FINAL', statusAfter: LHU_NEXT_STATUS.AFTER_QC_FINALIZE,
        source: 'QC', actorNik: currentNik, transaction });

      return { nomorLhu, idRegistrasi: sampleInfos[0].id_registrasi,
               statusLhu: LHU_NEXT_STATUS.AFTER_QC_FINALIZE, fileLhuPath: pdfResult.filePath };
    });
  };
}


