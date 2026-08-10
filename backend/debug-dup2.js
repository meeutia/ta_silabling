const { sequelize } = require('./src/models/Associations');

async function run() {
  // Cek apakah ada log aktivitas untuk REG-005 dan REG-006
  const logs = await sequelize.query(
    'SELECT id_registrasi, aksi, keterangan, dibuat_pada FROM aktivitas_sistem_log WHERE id_registrasi IN ("REG-005","REG-006") ORDER BY dibuat_pada ASC LIMIT 20'
  );
  console.log('Activity logs:', JSON.stringify(logs[0], null, 2));

  // Cek semua data fppl REG-005 dan REG-006 termasuk nama instansi dari form
  const fppl = await sequelize.query(
    'SELECT f.id_registrasi, f.id_pelanggan, f.tanggal_pendaftaran, p.nik, p.nama_instansi FROM fppl f JOIN pelanggan p ON f.id_pelanggan = p.id_pelanggan WHERE f.id_registrasi IN ("REG-005","REG-006")'
  );
  console.log('\nFppl data:', JSON.stringify(fppl[0], null, 2));

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
