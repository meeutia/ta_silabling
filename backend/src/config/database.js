const path = require('path');
const { Sequelize } = require('sequelize');

const nodeEnv = process.env.NODE_ENV || 'development';

// Safe for normal backend run and for standalone scripts.
// When a script is executed directly with `node src/scripts/...`, app.js may not
// be loaded, so environment variables from .env may still be empty.
try {
  // eslint-disable-next-line global-require
  const dotenv = require('dotenv');
  if (nodeEnv === 'test') {
      dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
  } else {
      dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  }
} catch (error) {
  // dotenv is optional here; if it is not installed, keep using process.env.
}

const dbName = process.env.DB_NAME || 'SILABLING';

if (nodeEnv === 'test' && !dbName.toLowerCase().includes('test')) {
    throw new Error(
        `TEST DIBATALKAN: Database "${dbName}" bukan database khusus test. Konfigurasi tidak aman.`
    );
}

// Log database info (excluding passwords)
console.log(`[Database] Environment : ${nodeEnv}`);
console.log(`[Database] Host        : ${process.env.DB_HOST || 'localhost'}`);
console.log(`[Database] Database    : ${dbName}`);

if (nodeEnv === 'test') {
    console.log('[TEST DATABASE CONFIRMED]');
}

const sequelize = new Sequelize(
  dbName,
  process.env.DB_USER || process.env.DB_USERNAME || 'root',
  process.env.DB_PASS ?? process.env.DB_PASSWORD ?? '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    timezone: '+07:00',
    define: {
      timestamps: false,
      freezeTableName: true
    }
  }
);

module.exports = sequelize;
