const path = require('path');
const { Sequelize } = require('sequelize');

// Safe for normal backend run and for standalone scripts.
// When a script is executed directly with `node src/scripts/...`, app.js may not
// be loaded, so environment variables from .env may still be empty.
try {
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch (error) {
  // dotenv is optional here; if it is not installed, keep using process.env.
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'SILABLING',
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
