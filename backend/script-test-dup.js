const { sequelize, Fppl, FpplSampel, FpplParameterMetode, Pelanggan } = require('./src/models/Associations');
const requestDuplicateUtil = require('./src/services/request/request-duplicate.util');

(async () => {
    try {
        const fppls = await Fppl.findAll({
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        console.log('Total FPPLs:', fppls.length);
        const ptPohon = fppls.filter(f => f.pelanggan && f.pelanggan.nama_instansi === 'PT Pohon Indah Utama');
        console.log('PT Pohon FPPLs:', ptPohon.length);

        for (const f of ptPohon) {
            console.log('\n--- FPPL:', f.id_registrasi, 'Status:', f.status_fppl, 'Pelanggan:', f.id_pelanggan, '---');
            const sampels = await FpplSampel.findAll({ where: { id_registrasi: f.id_registrasi } });
            const params = await FpplParameterMetode.findAll({ where: { id_registrasi: f.id_registrasi } });
            const fp = requestDuplicateUtil.buildDuplicateFingerprint(f.pelanggan.nama_instansi, f.toJSON(), sampels.map(s=>s.toJSON()), params.map(p=>p.toJSON()));
            console.log('Fingerprint serialized:', requestDuplicateUtil.serializeDuplicateFingerprint(fp));
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
