require('dotenv').config({ path: '.env.test' });
const { sequelize } = require('./src/models/Associations');

async function setup() {
    try {
        console.log('Syncing database: ', process.env.DB_NAME);
        if (!process.env.DB_NAME.includes('test')) throw new Error('Not test DB');
        await sequelize.sync({ force: true });
        console.log('Database synced');
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

setup();
