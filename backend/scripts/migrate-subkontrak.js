const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Sequelize } = require('sequelize');

const seq = new Sequelize(
  process.env.DB_NAME || 'SILABLING',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  { host: 'localhost', dialect: 'mysql', logging: console.log }
);

async function run() {
  try {
    await seq.query(
      "ALTER TABLE permintaan_subkontrak MODIFY COLUMN status_permintaan ENUM('MENUNGGU_ADMIN','SELESAI','DITOLAK') NOT NULL DEFAULT 'MENUNGGU_ADMIN'"
    );
    console.log('✅ ENUM status updated');

    // Drop columns if they exist (catch error if already removed)
    try {
      await seq.query('ALTER TABLE permintaan_subkontrak DROP COLUMN id_metode_parameter');
      console.log('✅ id_metode_parameter dropped');
    } catch (e) { console.log('⚠️  id_metode_parameter already removed:', e.message); }

    try {
      await seq.query('ALTER TABLE permintaan_subkontrak DROP COLUMN pending_fpm_key');
      console.log('✅ pending_fpm_key dropped');
    } catch (e) { console.log('⚠️  pending_fpm_key already removed:', e.message); }

    try {
      await seq.query('ALTER TABLE permintaan_subkontrak DROP COLUMN catatan_kasi');
      console.log('✅ catatan_kasi dropped');
    } catch (e) { console.log('⚠️  catatan_kasi already removed:', e.message); }

    await seq.close();
    console.log('✅ Migration done!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    await seq.close();
    process.exit(1);
  }
}

run();
