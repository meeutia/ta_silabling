// Potongan implementasi untuk dokumentasi Bab 5.
// Sumber: backend/src/controllers/customer-request.controller.js
//         backend/src/services/request/request.service.js
// Source production tidak diubah.

// ─────────────────────────────────────────────────────────────
// CustomerRequestController
// ─────────────────────────────────────────────────────────────

class CustomerRequestController {
  constructor({ requestService, notificationService }) {
    this.requestService      = requestService;
    this.notificationService = notificationService;
  }

  createRequest = async (req, res) => {
    try {
      const command = {
        idPelanggan:       req.body.idPelanggan,
        namaInstansi:      req.body.namaInstansi,
        pic:               req.body.pic,
        emailPic:          req.body.emailPic,
        noTelp:            req.body.noTelp,
        alamat:            req.body.alamat,
        maksudPengujian:   req.body.maksudPengujian,
        metodePengambilan: req.body.metodePengambilan,
        sampleEntries:     req.body.sampleEntries,
      };

      const data = await this.requestService.createRequest(req.user.nik, command);

      setImmediate(() => {
        this.notificationService.notifyAdminPermohonanBaru({
          idRegistrasi: data.idRegistrasi,
        }).catch(() => {});
      });

      return successResponse(res, 'Permohonan pengujian berhasil dibuat.', data, 201);
    } catch (error) {
      return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
    }
  };
}

// ─────────────────────────────────────────────────────────────
// RequestService
// ─────────────────────────────────────────────────────────────

class RequestService {
  createRequest = async (userNik, command) => {
    const t = await sequelize.transaction();
    try {
      const {
        idPelanggan, namaInstansi, pic, emailPic, noTelp, alamat,
        maksudPengujian, maksudLainnya, metodePengambilan,
        tanggalPengambilan, jamPengambilan, estimasiDiterima,
        sampleEntries,
      } = command;

      let pelanggan;
      if (idPelanggan) {
        pelanggan = await Pelanggan.findOne({ where: { id_pelanggan: idPelanggan, nik: userNik } });
        await pelanggan.update({ nama_instansi: namaInstansi, pic, email_kontak: emailPic,
                                 no_telp: noTelp, alamat }, { transaction: t });
      } else {
        const newIdPelanggan = await generateId(Pelanggan, 'id_pelanggan', 'PL-');
        pelanggan = await Pelanggan.create({ id_pelanggan: newIdPelanggan, nik: userNik,
                                             nama_instansi: namaInstansi, pic, email_kontak: emailPic,
                                             no_telp: noTelp, alamat }, { transaction: t });
      }


      const idRegistrasi  = await generateId(Fppl, 'id_registrasi', 'REG-');
      const samplingType  = resolveSamplingType(metodePengambilan);
      const samplingSchedule = resolveSamplingSchedule({
        metodePengambilan, tanggalPengambilan, jamPengambilan, estimasiDiterima,
      });

      await Fppl.create({
        id_registrasi:    idRegistrasi,
        id_pelanggan:     pelanggan.id_pelanggan,
        maksud_pengujian: finalTestPurpose,
        jenis_pengambilan_sampel:          samplingType,
        tanggal_rencana_pengambilan_sampel: samplingSchedule.tanggalRencanaPengambilanSampel,
        status_fppl: RequestStatus.WAITING_VERIFICATION,
      }, { transaction: t });

      for (const entry of sampleEntries) {
        const { idJenisSampel, idRegBm, jumlahSampel, parameters } = entry;
        await FpplSampel.create({ id_registrasi: idRegistrasi, id_jenis_sampel: idJenisSampel,
                                  id_reg_bm: idRegBm, jumlah_sampel: jumlahSampel }, { transaction: t });
        for (const idParameter of parameters) {
          await FpplParameterMetode.create({ id_registrasi: idRegistrasi, id_jenis_sampel: idJenisSampel,
                                             id_reg_bm: idRegBm, id_parameter: idParameter }, { transaction: t });
        }
      }

      await WorkflowLogService.logStatusTransition({
        entityType: 'FPPL', entityId: idRegistrasi,
        action: 'MEMBUAT_PERMOHONAN', statusBefore: null,
        statusAfter: RequestStatus.WAITING_VERIFICATION, transaction: t,
      });

      await t.commit();
      return { idRegistrasi, status: RequestStatus.WAITING_VERIFICATION };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  };
}
