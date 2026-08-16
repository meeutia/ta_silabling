const request = require('supertest');
const app = require('../../src/app');
const { Fppl, Pelanggan, User, FpplSampel, FpplParameterMetode, JadwalSampel, Sampel, SampelParameter, Invoice } = require('../../src/models/Associations');
const { makeToken } = require('../fixtures/integration-helpers');
const RequestStatus = require('../../src/constants/request-status');
const Roles = require('../../src/constants/roles');
const { generateId } = require('../../src/utils/id-generator');
const { assertSafeTestDatabase } = require('../../src/utils/test-db-safety.util');

describe('Penerimaan Sampel - Pengamanan Parameter', () => {
    let tokenAdmin;
    let nikAdmin = '9999888877776666';
    let idRegistrasi = 'REG-PNGMN';
    let idPelanggan = 'PL-PNGMN';
    let idFpplParameterMetode = 'FPM-PNGMN';
    let idFpplSampel = 'FSM-PNGMN';

    beforeAll(async () => {
        tokenAdmin = makeToken(Roles.ADMIN, nikAdmin);
        await User.findOrCreate({ where: { nik: nikAdmin }, defaults: { email: 'adminp@p.com', username: 'adminp', password: 'a', id_role: Roles.ADMIN, is_verified: 1 }});

        await Pelanggan.destroy({ where: { id_pelanggan: idPelanggan } });
        try {
            await Pelanggan.create({ 
                id_pelanggan: idPelanggan, 
                nik: nikAdmin, 
                nama_instansi: 'PT Test',
                pic: 'Test PIC',
                no_telp: '081234567890',
                alamat: 'Jl. Test No. 1',
                email_kontak: 'test@test.com'
            });
        } catch(e) {
            console.error('PELANGGAN CREATE ERROR:', e);
            throw e;
        }
        await Fppl.destroy({ where: { id_registrasi: idRegistrasi } });
        await Fppl.create({
            id_registrasi: idRegistrasi,
            id_pelanggan: idPelanggan,
            status_fppl: RequestStatus.WAITING_SAMPLE_DELIVERY,
            tanggal_registrasi: new Date(),
            tanggal_pendaftaran: new Date(),
            jenis_pengambilan_sampel: 'Mandiri'
        });
        await JadwalSampel.destroy({ where: { id_jadwal: 'JDW-PNGMN' } });
        await JadwalSampel.create({
            id_jadwal: 'JDW-PNGMN',
            id_registrasi: idRegistrasi,
            tanggal_jadwal: '2026-01-01',
            jam_jadwal: '10:00:00',
            status_jadwal: 'Disetujui Pelanggan'
        });
        await SampelParameter.destroy({ where: {} }); // We can just clean all for this test or be specific
        await Sampel.destroy({ where: { id_registrasi: idRegistrasi } });
        await FpplSampel.destroy({ where: { id_registrasi: idRegistrasi } });
        await FpplSampel.create({
            id_registrasi: idRegistrasi,
            id_jenis_sampel: 'JS01',
            id_reg_bm: 'RBM001',
            jumlah_sampel: 1
        });
        await FpplParameterMetode.destroy({ where: { id_fppl_parameter_metode: idFpplParameterMetode } });
        await FpplParameterMetode.findOrCreate({
            where: { id_fppl_parameter_metode: idFpplParameterMetode },
            defaults: {
                id_registrasi: idRegistrasi,
                id_jenis_sampel: 'JS01',
                id_reg_bm: 'RBM001',
                id_parameter: 'PR0001',
                id_metode_parameter: 'MP0001'
            }
        });
        
        await Invoice.destroy({ where: { id_registrasi: idRegistrasi } });
        await Invoice.create({
            id_invoice: 'INV-PNGMN',
            id_registrasi: idRegistrasi,
            tanggal_invoice: new Date(),
            status_invoice: 'Lunas'
        });
    });

    beforeEach(async () => {
        // Reset state for each test
        await SampelParameter.destroy({ where: {} });
        await Sampel.destroy({ where: { id_registrasi: idRegistrasi } });
        await Fppl.update({ status_fppl: RequestStatus.WAITING_SAMPLE_DELIVERY }, { where: { id_registrasi: idRegistrasi } });
    });

    afterAll(async () => {
        assertSafeTestDatabase();
        await SampelParameter.destroy({ where: {} });
        await Sampel.destroy({ where: {} });
        await Invoice.destroy({ where: { id_registrasi: idRegistrasi } });
        await FpplParameterMetode.destroy({ where: { id_registrasi: idRegistrasi } });
        await FpplSampel.destroy({ where: { id_registrasi: idRegistrasi } });
        await JadwalSampel.destroy({ where: { id_registrasi: idRegistrasi } });
        await Fppl.destroy({ where: { id_registrasi: idRegistrasi } });
        await Pelanggan.destroy({ where: { id_pelanggan: idPelanggan } });
        await User.destroy({ where: { nik: nikAdmin } });
    });

    beforeEach(async () => {
        assertSafeTestDatabase();
    });

    afterEach(async () => {
        assertSafeTestDatabase();
        await SampelParameter.destroy({ where: {} });
        await Sampel.destroy({ where: {} });
        await Fppl.update({ status_fppl: RequestStatus.MENUNGGU_SAMPEL }, { where: { id_registrasi: idRegistrasi } });
    });

    const createPayload = (parameters = []) => ({
        sampels: [
            {
                id_registrasi: idRegistrasi,
                id_jenis_sampel: 'JS01',
                id_reg_bm: 'BM01',
                sample_group_index: 0,
                sample_unit_index: 1,
                tanggal_pengambilan_sampel: '2026-01-01',

                acuan_pengambilan_sampel: 'SNI',
                lokasi_spesifik: 'Gudang A',
                koordinat: 'S 00 E 100',
                parameters
            }
        ]
    });

    test('1. Berhasil menyimpan pengamanan parameter (wadah, volume_ml, perlakuan_pengawetan)', async () => {
        const payload = createPayload([
            {
                id_fppl_parameter_metode: idFpplParameterMetode,
                wadah: 'HDPE',
                volume_ml: 500,
                perlakuan_pengawetan: 'Didinginkan < 6°C'
            }
        ]);

        const res = await request(app)
            .post(`/requests/${idRegistrasi}/samples/receive`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(200);
        
        const sp = await SampelParameter.findOne({ where: { id_fppl_parameter_metode: idFpplParameterMetode } });
        expect(sp).not.toBeNull();
        expect(sp.wadah).toBe('HDPE');
        expect(sp.volume_ml).toBe(500);
        expect(sp.perlakuan_pengawetan).toBe('Didinginkan < 6°C');
    });

    test('2. Berhasil menyimpan meski pengamanan parameter dikosongkan', async () => {
        const payload = createPayload([
            {
                id_fppl_parameter_metode: idFpplParameterMetode,
                wadah: null,
                volume_ml: null,
                perlakuan_pengawetan: ''
            }
        ]);

        const res = await request(app)
            .post(`/requests/${idRegistrasi}/samples/receive`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(200);
        
        const sp = await SampelParameter.findOne({ where: { id_fppl_parameter_metode: idFpplParameterMetode } });
        expect(sp.wadah).toBeNull();
        expect(sp.volume_ml).toBeNull();
        expect(sp.perlakuan_pengawetan).toBeNull(); // it becomes null because we didn't send it or sent empty
    });

    test('3. Menolak parameter yang tidak terdaftar pada kelompok jenis sampel', async () => {
        const payload = createPayload([
            {
                id_fppl_parameter_metode: 'FPM-TIDAK-ADA',
                wadah: 'HDPE',
            }
        ]);

        const res = await request(app)
            .post(`/requests/${idRegistrasi}/samples/receive`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('tidak terdaftar pada jenis sampel');
    });

    test('4. Menolak jika wadah tidak ada dalam daftar ENUM', async () => {
        const payload = createPayload([
            {
                id_fppl_parameter_metode: idFpplParameterMetode,
                wadah: 'Wadah ini tidak ada',
            }
        ]);

        const res = await request(app)
            .post(`/requests/${idRegistrasi}/samples/receive`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('tidak valid');
    });

    test('5. Menolak jika volume_ml bukan angka bulat', async () => {
        const payload = createPayload([
            {
                id_fppl_parameter_metode: idFpplParameterMetode,
                volume_ml: 12.5,
            }
        ]);

        const res = await request(app)
            .post(`/requests/${idRegistrasi}/samples/receive`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('bilangan bulat');
    });

    test('6. Menolak jika volume_ml < 0', async () => {
        const payload = createPayload([
            {
                id_fppl_parameter_metode: idFpplParameterMetode,
                volume_ml: -10,
            }
        ]);

        const res = await request(app)
            .post(`/requests/${idRegistrasi}/samples/receive`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('antara 0 dan 65535');
    });

    test('7. Menolak jika perlakuan_pengawetan tidak ada dalam daftar', async () => {
        const payload = createPayload([
            {
                id_fppl_parameter_metode: idFpplParameterMetode,
                perlakuan_pengawetan: 'Perlakuan ini tidak ada',
            }
        ]);

        const res = await request(app)
            .post(`/requests/${idRegistrasi}/samples/receive`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('tidak valid');
    });

    test('8. Menolak jika parameters bukan array', async () => {
        const payload = createPayload({}); // not array

        const res = await request(app)
            .post(`/requests/${idRegistrasi}/samples/receive`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('harus berupa array');
    });
});
