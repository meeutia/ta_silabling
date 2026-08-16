const { Pelanggan, User, Role, Fppl } = require('./src/models/Associations');
const Roles = require('./src/constants/roles');
const RequestStatus = require('./src/constants/request-status');

async function run() {
    try {
        let idPelanggan = 'PL-PNGMN';
        let nikAdmin = '9999888877776666';
        let idRegistrasi = 'REG-PNGMN';
        
        await Fppl.destroy({ where: { id_registrasi: idRegistrasi } });
        
        await Fppl.create({
            id_registrasi: idRegistrasi,
            id_pelanggan: idPelanggan,
            status_fppl: RequestStatus.MENUNGGU_SAMPEL,
            tanggal_registrasi: new Date(),
            tanggal_pendaftaran: new Date(),
            jenis_pengambilan_sampel: 'Bawa Sendiri'
        });
        console.log("SUCCESS");
    } catch (err) {
        console.error("ERROR CREATING FPPL:");
        console.error(err.message);
        console.error(err);
    }
    process.exit(0);
}

run();
