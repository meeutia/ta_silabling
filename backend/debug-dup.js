const { sequelize, Fppl, FpplSampel, FpplParameterMetode, Pelanggan } = require('./src/models/Associations');
const { buildDuplicateFingerprint, isDuplicateRequest, normalizeCompanyName } = require('./src/services/request/request-duplicate.util');

async function run() {
  try {
    // Ambil data REG-005 dan REG-006
    const fppls = await Fppl.findAll({
      where: { id_registrasi: ['REG-005', 'REG-006'] },
      include: [{ model: Pelanggan, as: 'pelanggan' }]
    });

    const sampels = await FpplSampel.findAll({
      where: { id_registrasi: ['REG-005', 'REG-006'] }
    });

    const params = await FpplParameterMetode.findAll({
      where: { id_registrasi: ['REG-005', 'REG-006'] }
    });

    for (const fppl of fppls) {
      const j = fppl.toJSON();
      const regId = j.id_registrasi;
      const pelanggan = j.pelanggan || j.Pelanggan;
      const myS = sampels.filter(s => s.id_registrasi === regId).map(s => s.toJSON());
      const myP = params.filter(p => p.id_registrasi === regId).map(p => p.toJSON());

      console.log(`\n=== ${regId} ===`);
      console.log('  nama_instansi:', pelanggan?.nama_instansi);
      console.log('  companyKey:', normalizeCompanyName(pelanggan?.nama_instansi));
      console.log('  lokasi:', j.lokasi_pengambilan_sampel);
      console.log('  jenis:', j.jenis_pengambilan_sampel);
      console.log('  tgl_pengantaran:', j.tanggal_rencana_pengantaran_sampel);
      console.log('  tgl_pengambilan:', j.tanggal_rencana_pengambilan_sampel);
      console.log('  jam_pengambilan:', j.jam_rencana_pengambilan_sampel);
      console.log('  sampels:', myS.map(s => `${s.id_jenis_sampel}|${s.id_reg_bm}|${s.jumlah_sampel}`));
      console.log('  params:', myP.map(p => `${p.id_jenis_sampel}|${p.id_reg_bm}|${p.id_parameter}`));

      const fp = buildDuplicateFingerprint(pelanggan?.nama_instansi, j, myS, myP);
      console.log('  fingerprint.sampelKeys:', fp.sampelKeys);
      console.log('  fingerprint.parameterKeys:', fp.parameterKeys);
    }

    if (fppls.length === 2) {
      const j0 = fppls[0].toJSON();
      const j1 = fppls[1].toJSON();
      const p0 = fppls[0].toJSON().pelanggan || fppls[0].toJSON().Pelanggan;
      const p1 = fppls[1].toJSON().pelanggan || fppls[1].toJSON().Pelanggan;
      const s0 = sampels.filter(s => s.id_registrasi === j0.id_registrasi).map(s => s.toJSON());
      const s1 = sampels.filter(s => s.id_registrasi === j1.id_registrasi).map(s => s.toJSON());
      const pm0 = params.filter(p => p.id_registrasi === j0.id_registrasi).map(p => p.toJSON());
      const pm1 = params.filter(p => p.id_registrasi === j1.id_registrasi).map(p => p.toJSON());

      const fp0 = buildDuplicateFingerprint(p0?.nama_instansi, j0, s0, pm0);
      const fp1 = buildDuplicateFingerprint(p1?.nama_instansi, j1, s1, pm1);

      console.log('\n--- Perbandingan ---');
      console.log('companyKey sama?', fp0.companyKey === fp1.companyKey, '|', fp0.companyKey, 'vs', fp1.companyKey);
      console.log('lokasi sama?', fp0.lokasiPengambilan === fp1.lokasiPengambilan, '|', fp0.lokasiPengambilan, 'vs', fp1.lokasiPengambilan);
      console.log('jenis sama?', fp0.jenisPengambilan === fp1.jenisPengambilan, '|', fp0.jenisPengambilan, 'vs', fp1.jenisPengambilan);
      console.log('schedule sama?', JSON.stringify(fp0.schedule) === JSON.stringify(fp1.schedule));
      console.log('sampelKeys sama?', JSON.stringify(fp0.sampelKeys) === JSON.stringify(fp1.sampelKeys));
      console.log('paramKeys sama?', JSON.stringify(fp0.parameterKeys) === JSON.stringify(fp1.parameterKeys));
      console.log('isDuplicate?', isDuplicateRequest(fp0, fp1));
    }

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
