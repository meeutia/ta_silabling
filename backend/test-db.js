const { Pelanggan, User, Role } = require('./src/models/Associations');
const Roles = require('./src/constants/roles');

async function run() {
    try {
        let idPelanggan = 'PLG-DEBUG-99';
        let nikAdmin = '9999888877776666';
        
        await User.findOrCreate({ where: { nik: nikAdmin }, defaults: { email: 'test@t.com', username: 'test1', password: 'a', id_role: Roles.ADMIN }});
        
        await Pelanggan.destroy({ where: { id_pelanggan: idPelanggan } });
        
        await Pelanggan.create({ 
            id_pelanggan: idPelanggan, 
            nik: nikAdmin, 
            nama_instansi: 'PT Test',
            pic: 'Test PIC',
            no_telp: '081234567890',
            alamat: 'Jl. Test No. 1',
            email_kontak: 'test@test.com'
        });
        console.log("SUCCESS");
    } catch (err) {
        console.error("ERROR CREATING PELANGGAN:");
        console.error(err.message);
        console.error(err);
    }
    process.exit(0);
}

run();
