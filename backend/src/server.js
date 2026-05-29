const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function validateRequiredEnv() {
  const requiredKeys = [
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'FILE_ACCESS_TOKEN_SECRET',
  ];

  const missing = requiredKeys.filter((key) => !String(process.env[key] || '').trim());

  if (missing.length > 0) {
    throw new Error(`Konfigurasi .env belum lengkap. Isi nilai berikut sebelum server dijalankan: ${missing.join(', ')}`);
  }
}

validateRequiredEnv();

const app = require('./app');
const { sequelize } = require('./models/Associations');
const { startDeadlineAnalisJob } = require('./jobs/deadline-analis.job');
const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      startDeadlineAnalisJob();
    });
  })
  .catch((err) => {
    console.error('Unable to connect to DB:', err);
    process.exit(1);
  });
