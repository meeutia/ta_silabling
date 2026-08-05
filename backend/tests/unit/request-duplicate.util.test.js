const {
    normalizeCompanyName,
    normalizeSamplingLocation,
    buildDuplicateFingerprint,
    serializeDuplicateFingerprint,
    isDuplicateRequest,
    normalizeTime,
    normalizeDate
} = require('../../src/services/request/request-duplicate.util');

describe('request-duplicate.util.js', () => {
    describe('normalizeCompanyName', () => {
        it('PT. Sinar Jaya sama dengan PT Sinar Jaya', () => {
            expect(normalizeCompanyName('PT. Sinar Jaya')).toBe('pt sinar jaya');
            expect(normalizeCompanyName('PT Sinar Jaya')).toBe('pt sinar jaya');
        });

        it('PT Sinar Jaya sama dengan pt sinar jaya', () => {
            expect(normalizeCompanyName('PT Sinar Jaya')).toBe('pt sinar jaya');
            expect(normalizeCompanyName('pt sinar jaya')).toBe('pt sinar jaya');
        });

        it('Spasi ganda tidak memengaruhi hasil', () => {
            expect(normalizeCompanyName('PT   SINAR   JAYA')).toBe('pt sinar jaya');
        });

        it('PT Sinar Jaya berbeda dengan CV Sinar Jaya', () => {
            expect(normalizeCompanyName('PT Sinar Jaya')).not.toBe(normalizeCompanyName('CV Sinar Jaya'));
        });

        it('Nilai kosong dinormalisasi dengan aman', () => {
            expect(normalizeCompanyName(null)).toBe('');
            expect(normalizeCompanyName(undefined)).toBe('');
            expect(normalizeCompanyName('')).toBe('');
        });
    });

    describe('normalizeSamplingLocation', () => {
        it('Jl. Sudirman No. 10 sama dengan Jl Sudirman No 10', () => {
            expect(normalizeSamplingLocation('Jl. Sudirman No. 10')).toBe('jl sudirman no 10');
            expect(normalizeSamplingLocation('Jl Sudirman No 10')).toBe('jl sudirman no 10');
        });

        it('Kapitalisasi lokasi tidak memengaruhi hasil', () => {
            expect(normalizeSamplingLocation('JAKARTA')).toBe('jakarta');
            expect(normalizeSamplingLocation('jakarta')).toBe('jakarta');
        });

        it('Lokasi Jakarta berbeda dengan lokasi Bekasi', () => {
            expect(normalizeSamplingLocation('Jakarta')).not.toBe(normalizeSamplingLocation('Bekasi'));
        });
    });

    describe('normalizeTime & normalizeDate', () => {
        it('Jam dinormalisasi menjadi HH:mm', () => {
            expect(normalizeTime('08:30:00')).toBe('08:30');
            expect(normalizeTime('08:30')).toBe('08:30');
            expect(normalizeTime(null)).toBe('');
        });

        it('Tanggal dinormalisasi menjadi YYYY-MM-DD', () => {
            expect(normalizeDate('2026-08-01T10:00:00.000Z')).toBe('2026-08-01');
            expect(normalizeDate(null)).toBe('');
        });
    });

    describe('Fingerprint Generation & Comparison', () => {
        const createDummyData = () => ({
            companyName: 'PT Sinar Jaya',
            fppl: {
                maksud_pengujian: 'Uji Rutin',
                lokasi_pengambilan_sampel: 'Jl. Sudirman',
                jenis_pengambilan_sampel: 'Petugas',
            },
            sampels: [
                { id_jenis_sampel: 'JS1', id_reg_bm: 'BM1', jumlah_sampel: 2 },
                { id_jenis_sampel: 'JS2', id_reg_bm: 'BM2', jumlah_sampel: 1 }
            ],
            params: [
                { id_jenis_sampel: 'JS1', id_reg_bm: 'BM1', id_parameter: 'P1' },
                { id_jenis_sampel: 'JS1', id_reg_bm: 'BM1', id_parameter: 'P2' },
                { id_jenis_sampel: 'JS2', id_reg_bm: 'BM2', id_parameter: 'P3' }
            ]
        });

        it('id_pelanggan berbeda tidak membuat fingerprint berbeda', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            
            data1.fppl.id_pelanggan = 'PL-001';
            data2.fppl.id_pelanggan = 'PL-002';

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Perusahaan berbeda membuat fingerprint berbeda', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            data2.companyName = 'PT Berbeda';

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(false);
        });

        it('Maksud pengujian berbeda tidak mengubah fingerprint (disederhanakan)', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            data2.fppl.maksud_pengujian = 'Uji Kasus';

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Jenis pengambilan berbeda membuat fingerprint berbeda', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            data2.fppl.jenis_pengambilan_sampel = 'Mandiri';

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(false);
        });

        it('Lokasi berbeda membuat fingerprint berbeda', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            data2.fppl.lokasi_pengambilan_sampel = 'Jl. Thamrin';

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(false);
        });

        it('Jenis sampel berbeda tidak mengubah fingerprint (disederhanakan)', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            data2.sampels[0].id_jenis_sampel = 'JS3';
            data2.params[0].id_jenis_sampel = 'JS3';
            data2.params[1].id_jenis_sampel = 'JS3';

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Baku mutu berbeda tidak mengubah fingerprint (disederhanakan)', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            data2.sampels[0].id_reg_bm = 'BM3';
            data2.params[0].id_reg_bm = 'BM3';
            data2.params[1].id_reg_bm = 'BM3';


            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Jumlah sampel berbeda tidak mengubah fingerprint (disederhanakan)', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            data2.sampels[0].jumlah_sampel = 3;

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Parameter berbeda tidak mengubah fingerprint (disederhanakan)', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            data2.params[0].id_parameter = 'P99';

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Urutan sampel berbeda menghasilkan fingerprint yang sama', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            
            // Tukar urutan sampel
            data2.sampels = [data1.sampels[1], data1.sampels[0]];

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Urutan parameter berbeda menghasilkan fingerprint yang sama', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            
            // Tukar urutan parameter
            data2.params = [data1.params[2], data1.params[0], data1.params[1]];

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Parameter identik yang terkirim dua kali ditangani secara deterministik', () => {
            const data1 = createDummyData();
            const data2 = createDummyData();
            
            // Tambah parameter duplikat
            data2.params.push({ id_jenis_sampel: 'JS1', id_reg_bm: 'BM1', id_parameter: 'P1' });

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });

        it('Snake case dan camel case menghasilkan fingerprint yang sama', () => {
            const data1 = createDummyData();
            
            const data2 = {
                companyName: 'PT Sinar Jaya',
                fppl: {
                    maksud_pengujian: 'Uji Rutin',
                    lokasi_pengambilan_sampel: 'Jl. Sudirman',
                    jenis_pengambilan_sampel: 'Petugas',
                },
                sampels: [
                    { idJenisSampel: 'JS1', idRegBm: 'BM1', jumlahSampel: 2 },
                    { idJenisSampel: 'JS2', idRegBm: 'BM2', jumlahSampel: 1 }
                ],
                params: [
                    { idJenisSampel: 'JS1', idRegBm: 'BM1', idParameter: 'P1' },
                    { idJenisSampel: 'JS1', idRegBm: 'BM1', idParameter: 'P2' },
                    { idJenisSampel: 'JS2', idRegBm: 'BM2', idParameter: 'P3' }
                ]
            };

            const fp1 = buildDuplicateFingerprint(data1.companyName, data1.fppl, data1.sampels, data1.params);
            const fp2 = buildDuplicateFingerprint(data2.companyName, data2.fppl, data2.sampels, data2.params);

            expect(isDuplicateRequest(fp1, fp2)).toBe(true);
        });
    });
});
