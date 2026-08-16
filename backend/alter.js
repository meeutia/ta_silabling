const sequelize = require('./src/config/database');
async function alter() {
  try {
    await sequelize.query('ALTER TABLE sampel_parameter ADD COLUMN wadah VARCHAR(30) NULL, ADD COLUMN volume_ml SMALLINT UNSIGNED NULL, ADD COLUMN perlakuan_pengawetan VARCHAR(80) NULL;');
    console.log('success');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
alter();
