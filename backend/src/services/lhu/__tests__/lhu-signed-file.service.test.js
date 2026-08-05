const LhuSignedFileService = require('../lhu-signed-file.service');
const { Lhu, Fppl } = require('../../../models/Associations');
const Roles = require('../../../constants/roles');

describe('LhuSignedFileService', () => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('resolveSignedFileForAccess', () => {
        it('should throw FORBIDDEN if customer does not own the document', async () => {
            const mockLhu = {
                nomor_lhu: '123/LHU/2026',
                file_lhu_signed_path: 'path/to/file.pdf',
                id_registrasi: 'REG-001'
            };

            const mockFppl = {
                id_registrasi: 'REG-001',
                pelanggan: { nik: 'NIK_OTHER' }
            };

            jest.spyOn(Lhu, 'findOne').mockResolvedValue(mockLhu);
            jest.spyOn(Fppl, 'findByPk').mockResolvedValue(mockFppl);

            await expect(LhuSignedFileService.resolveSignedFileForAccess('123/LHU/2026', 'NIK_CUST', Roles.CUSTOMER))
                .rejects.toThrow('FORBIDDEN');
        });

        it('should resolve the file if customer owns the document', async () => {
            const mockLhu = {
                nomor_lhu: '123/LHU/2026',
                file_lhu_signed_path: 'path/to/file.pdf',
                id_registrasi: 'REG-001'
            };

            const mockFppl = {
                id_registrasi: 'REG-001',
                pelanggan: { nik: 'NIK_CUST' }
            };

            jest.spyOn(Lhu, 'findOne').mockResolvedValue(mockLhu);
            jest.spyOn(Fppl, 'findByPk').mockResolvedValue(mockFppl);

            const result = await LhuSignedFileService.resolveSignedFileForAccess('123/LHU/2026', 'NIK_CUST', Roles.CUSTOMER);
            expect(result).toBe(mockLhu);
        });

        it('should resolve the file for ADMIN without ownership check', async () => {
            const mockLhu = {
                nomor_lhu: '123/LHU/2026',
                file_lhu_signed_path: 'path/to/file.pdf',
                id_registrasi: 'REG-001'
            };

            jest.spyOn(Lhu, 'findOne').mockResolvedValue(mockLhu);

            const result = await LhuSignedFileService.resolveSignedFileForAccess('123/LHU/2026', 'ADMIN_NIK', Roles.ADMIN);
            expect(result).toBe(mockLhu);
        });

        it('should throw error if LHU not found or not signed', async () => {
            jest.spyOn(Lhu, 'findOne').mockResolvedValue(null);

            await expect(LhuSignedFileService.resolveSignedFileForAccess('123', 'NIK', Roles.ADMIN))
                .rejects.toThrow('LHU tidak ditemukan atau belum ada file yang ditandatangani.');
        });
    });

    describe('buildAdminSignedLhuDocuments', () => {
        it('should build document list from requestData', () => {
            const mockRequestData = {
                fpplSampels: [
                    {
                        sampels: [
                            {
                                no_sampel: 'SMP-1',
                                lhu: {
                                    nomor_lhu: '123/LHU',
                                    file_lhu_signed_path: 'path',
                                    file_lhu_signed_version: 2
                                }
                            }
                        ]
                    }
                ]
            };

            const result = LhuSignedFileService.buildAdminSignedLhuDocuments(mockRequestData);
            expect(result).toHaveLength(1);
            expect(result[0].nomor_lhu).toBe('123/LHU');
            expect(result[0].file_lhu_signed_version).toBe(2);
            expect(result[0].samples).toHaveLength(1);
            expect(result[0].samples[0].no_sampel).toBe('SMP-1');
        });
    });

    describe('buildCustomerSignedLhuDocuments', () => {
        it('should filter out sensitive info for customer documents', () => {
            const mockRequestData = {
                fpplSampels: [
                    {
                        sampels: [
                            {
                                no_sampel: 'SMP-1',
                                Lhu: {
                                    nomor_lhu: '123/LHU',
                                    file_lhu_signed_path: 'path',
                                    file_lhu_signed_uploaded_by: 'ADMIN',
                                    file_lhu_signed_version: 1,
                                    file_lhu_signed_uploaded_at: '2026-08-01'
                                }
                            }
                        ]
                    }
                ]
            };

            const result = LhuSignedFileService.buildCustomerSignedLhuDocuments(mockRequestData);
            expect(result).toHaveLength(1);
            expect(result[0].nomor_lhu).toBe('123/LHU');
            expect(result[0].file_lhu_signed_version).toBe(1);
            expect(result[0].file_lhu_signed_uploaded_at).toBe('2026-08-01');
            expect(result[0].file_lhu_signed_path).toBeUndefined();
            expect(result[0].file_lhu_signed_uploaded_by).toBeUndefined();
        });
    });
});
