const { sequelize } = require('./src/models/Associations');

async function run() {
  const res = await sequelize.query(
    'SELECT u.nik, u.username, u.id_role, p.id_pelanggan, p.nama_instansi FROM `user` u LEFT JOIN pelanggan p ON u.nik = p.nik WHERE u.id_role = "RL-001" LIMIT 15'
  );
  console.log(res[0]);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
