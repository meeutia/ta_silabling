const sequelize = require('./src/config/database');

async function check() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query('SHOW TABLES');
    const tableKey = Object.keys(results[0])[0];
    
    console.log('Tables and row counts:');
    for (const row of results) {
      const tableName = row[tableKey];
      const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      console.log(`- ${tableName}: ${countResult[0].count} rows`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

check();
