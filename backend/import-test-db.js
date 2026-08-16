const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function importSql() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'silabling_test',
        multipleStatements: true
    });

    try {
        console.log('Reading SQL file...');
        const sqlPath = path.join(__dirname, 'silabling (30).sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Executing SQL...');
        await connection.query(sql);
        console.log('Database imported successfully.');
    } catch (e) {
        console.error('Error importing:', e);
    } finally {
        await connection.end();
    }
}

importSql();
