/**
 * Utility untuk memastikan keamanan database saat menjalankan integration test.
 * Digunakan untuk mencegah test menghapus/memodifikasi data di database development.
 */

function assertSafeTestDatabase() {
    const nodeEnv = process.env.NODE_ENV;
    const dbName = process.env.DB_NAME || '';
    const allowDestructive = process.env.ALLOW_DESTRUCTIVE_TEST_DATABASE === 'true';

    if (nodeEnv !== 'test') {
        throw new Error(
            'Destructive database operation hanya boleh dilakukan pada NODE_ENV=test.'
        );
    }

    if (!dbName.toLowerCase().includes('test')) {
        throw new Error(
            `Database "${dbName}" bukan database test. Operasi dibatalkan demi keamanan.`
        );
    }

    if (!allowDestructive) {
        throw new Error(
            'ALLOW_DESTRUCTIVE_TEST_DATABASE belum diaktifkan pada env variables.'
        );
    }
}

module.exports = {
    assertSafeTestDatabase
};
