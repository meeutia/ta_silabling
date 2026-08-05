const request = require('supertest');
const app = require('../../src/app');
const { Fppl, Pelanggan, User, FpplSampel, FpplParameterMetode, JenisSampel, RegBm, Parameter, sequelize } = require('../../src/models/Associations');
const { makeToken } = require('../fixtures/integration-helpers');
const RequestStatus = require('../../src/constants/request-status');
const Roles = require('../../src/constants/roles');
const { generateId } = require('../../src/utils/id-generator');

describe('Customer Request Duplication Integration', () => {
    let tokenA;
    let tokenB;
    let nikA = '3271000000000001';
    let nikB = '3271000000000002';

    beforeAll(async () => {
        tokenA = makeToken(Roles.CUSTOMER, nikA);
        tokenB = makeToken(Roles.CUSTOMER, nikB);
        
        await User.findOrCreate({ where: { nik: nikA }, defaults: { email: 'a@a.com', username: 'usera', password: 'a', id_role: Roles.CUSTOMER, is_verified: 1 }});
        await User.findOrCreate({ where: { nik: nikB }, defaults: { email: 'b@b.com', username: 'userb', password: 'b', id_role: Roles.CUSTOMER, is_verified: 1 }});
    });

    afterEach(async () => {
        await FpplParameterMetode.destroy({ where: {} });
        await FpplSampel.destroy({ where: {} });
        await Fppl.destroy({ where: {} });
        await Pelanggan.destroy({ where: {} });
    });

    const createPayload = (overrides = {}) => ({
        namaInstansi: 'PT Sinar Jaya',
        pic: 'Budi',
        emailPic: 'budi@sinarjaya.com',
        noTelp: '08123456789',
        alamat: 'Jl. Raya No. 1',
        maksudPengujian: 'Uji Rutin',
        metodePengambilan: 'kirim',
        estimasiDiterima: '2027-01-01',
        lokasiPengambilan: 'Lokasi A',
        sampleEntries: [
            {
                idJenisSampel: 'JS01',
                idRegBm: 'RBM001',
                jumlahSampel: 2,
                parameters: ['PR0001', 'PR0002']
            }
        ],
        ...overrides
    });

    const setupExistingRequest = async (nik = nikA, companyName = 'PT Sinar Jaya', lokasi = 'Lokasi A', parameters = ['PR0001', 'PR0002'], status = RequestStatus.WAITING_VERIFICATION) => {
        const idPelanggan = await generateId(Pelanggan, 'id_pelanggan', 'PL-');
        const pelanggan = await Pelanggan.create({
            id_pelanggan: idPelanggan,
            nik: nik,
            nama_instansi: companyName,
            pic: 'Budi',
            email_kontak: 'budi@test.com',
            no_telp: '0812',
            alamat: 'Jl'
        });

        const idRegistrasi = await generateId(Fppl, 'id_registrasi', 'REG-');
        let fppl;
        try {
            fppl = await Fppl.create({
                id_registrasi: idRegistrasi,
                id_pelanggan: idPelanggan,
                tanggal_pendaftaran: new Date(),
                maksud_pengujian: 'Uji Rutin',
                lokasi_pengambilan_sampel: lokasi,
                jenis_pengambilan_sampel: 'Mandiri',
                tanggal_rencana_pengantaran_sampel: '2027-01-01',
                status_fppl: status
            });
        } catch (err) {
            console.error('Fppl.create error:', err);
            throw err;
        }

        let createdSampel;
        try {
            createdSampel = await FpplSampel.create({
                id_registrasi: idRegistrasi,
                id_jenis_sampel: 'JS01',
                id_reg_bm: 'RBM001',
                jumlah_sampel: 2
            });
        } catch (err) {
            console.error('FpplSampel.create error:', err);
            throw err;
        }

        try {
            for (const param of parameters) {
                const idMetode = param === 'PR0001' ? 'MP0001' : 'MP0046';
                await FpplParameterMetode.create({
                    id_fppl_parameter_metode: `FPM-${Math.random().toString().slice(2, 8)}`,
                    id_registrasi: idRegistrasi,
                    id_jenis_sampel: 'JS01',
                    id_reg_bm: 'RBM001',
                    id_parameter: param,
                    id_metode_parameter: idMetode
                });
            }
        } catch (err) {
            console.error('FpplParameterMetode.create error:', err);
            throw err;
        }

        return { fppl, pelanggan };
    };

    it('Skenario 1 - Akun sama, profil sama, data sama, aktif -> 409 Conflict', async () => {
        await setupExistingRequest(nikA);
        
        const res = await request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(createPayload());

        expect(res.status).toBe(409);
        expect(res.body.errors.duplicateScope).toBe('OWN_ACCOUNT');
        expect(res.body.errors.canViewExisting).toBe(true);
        expect(res.body.errors.existingRequest).toBeDefined();
        expect(res.body.errors.existingRequest.id_registrasi).toBeDefined();
    });

    it('Skenario 3 - Akun berbeda, perusahaan sama, data sama, aktif -> 409 Conflict without details', async () => {
        await setupExistingRequest(nikA);
        
        const res = await request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenB}`)
            .send(createPayload());

        expect(res.status).toBe(409);
        expect(res.body.errors.duplicateScope).toBe('SAME_COMPANY_OTHER_ACCOUNT');
        expect(res.body.errors.canViewExisting).toBe(false);
        expect(res.body.errors.existingRequest).toBeNull();
        expect(res.body.message).toContain('PIC yang memegang permohonan tersebut');
    });

    it('Skenario 4 - Akun berbeda, variasi penulisan perusahaan', async () => {
        await setupExistingRequest(nikA, 'PT. JAYA MAKMUR', 'Lokasi A', ['PR0001', 'PR0002']);
        
        const res = await request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenB}`)
            .send(createPayload({ namaInstansi: 'pt jaya makmur' }));

        expect(res.status).toBe(409);
        expect(res.body.errors.duplicateScope).toBe('SAME_COMPANY_OTHER_ACCOUNT');
    });

    it('Skenario 5 - Perusahaan berbeda -> 201 Created', async () => {
        await setupExistingRequest(nikA, 'PT. JAYA MAKMUR', 'Lokasi A', ['PR0001', 'PR0002']);
        
        const res = await request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(createPayload({ namaInstansi: 'CV Beda' }));

        expect(res.status).toBe(201);
    });

    it('Skenario 6 - Lokasi berbeda -> 201 Created', async () => {
        await setupExistingRequest(nikA, 'PT. JAYA MAKMUR', 'Lokasi A', ['PR0001', 'PR0002']);
        
        const res = await request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(createPayload({ lokasiPengambilan: 'Jl. Berbeda No. 2' }));

        expect(res.status).toBe(201);
    });

    it('Skenario 7 - Jumlah sampel berbeda -> 201 Created', async () => {
        await setupExistingRequest(nikA, 'PT. JAYA MAKMUR', 'Lokasi A', ['PR0001', 'PR0002']);
        
        const payload = createPayload();
        payload.sampleEntries[0].jumlahSampel = 1;

        const res = await request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(payload);

        expect(res.status).toBe(201);
    });

    it('Skenario 12 - Permohonan lama selesai -> 201 Created', async () => {
        await setupExistingRequest(nikA, 'PT. JAYA MAKMUR', 'Lokasi A', ['PR0001', 'PR0002'], RequestStatus.FINISHED);
        
        const res = await request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(createPayload());

        expect(res.status).toBe(201);
    });

    it('Skenario 16 - Urutan parameter berbeda -> 409 Conflict', async () => {
        await setupExistingRequest(nikA);
        
        const payload = createPayload();
        // Tukar urutan PR0001 dan PR0002
        payload.sampleEntries[0].parameters = ['PR0002', 'PR0001'];

        const res = await request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(payload);

        expect(res.status).toBe(409);
    });

    it('Skenario 18 - Keamanan detail permohonan lintas akun -> 403 Forbidden', async () => {
        const existing = await setupExistingRequest(nikA);
        
        const res = await request(app)
            .get(`/requests/${existing.fppl.id_registrasi}`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(res.status).toBe(403);
    });

    it('Skenario 19 - Race condition dua submit bersamaan ditangani', async () => {
        const req1 = request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(createPayload());
            
        const req2 = request(app)
            .post('/requests')
            .set('Authorization', `Bearer ${tokenB}`)
            .send(createPayload());

        const [res1, res2] = await Promise.all([req1, req2]);

        const statuses = [res1.status, res2.status];
        
        expect(statuses).toContain(201); // Satu harus berhasil
        // Yang gagal bisa 409 (duplikasi ditemukan) atau 400 (gagal dapat lock)
        const failedStatus = statuses.find(s => s !== 201);
        expect([409, 400]).toContain(failedStatus);
        
        // Pastikan hanya ada 1 FPPL aktif
        const count = await Fppl.count();
        expect(count).toBe(1);
    });
});
