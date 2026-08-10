const path = require('path');
const LhuSignedFileService = require('../../../src/services/lhu/lhu-signed-file.service');
const { Lhu } = require('../../../src/models/Associations');
const Roles = require('../../../src/constants/roles');

const SIGNED_LHU_DIR = path.join(process.cwd(), 'uploads', 'lhu-signed');

describe('LhuSignedFileService', () => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('resolveSignedFileForAccess', () => {
        const mockPath = path.join(SIGNED_LHU_DIR, 'signed-lhu_test.pdf');

        it('should throw if customer does not own the document', async () => {
            const mockLhu = {
                nomor_lhu: '123/LHU/2026',
                file_lhu_signed_path: mockPath,
                fppl: { pelanggan: { nik: 'NIK_OTHER' } },
                hasSignedFile: () => true,
            };

            jest.spyOn(Lhu, 'findOne').mockResolvedValue(mockLhu);

            await expect(
                LhuSignedFileService.resolveSignedFileForAccess('123/LHU/2026', 'NIK_CUST', Roles.CUSTOMER)
            ).rejects.toThrow('Anda tidak memiliki akses ke dokumen LHU ini.');
        });

        it('should throw error if LHU not found', async () => {
            jest.spyOn(Lhu, 'findOne').mockResolvedValue(null);

            await expect(
                LhuSignedFileService.resolveSignedFileForAccess('123', 'NIK', Roles.ADMIN)
            ).rejects.toThrow('LHU tidak ditemukan.');
        });

        it('should throw if LHU has no signed file', async () => {
            const mockLhu = {
                nomor_lhu: '123/LHU/2026',
                file_lhu_signed_path: null,
                fppl: { pelanggan: { nik: 'NIK_CUST' } },
                hasSignedFile: () => false,
            };

            jest.spyOn(Lhu, 'findOne').mockResolvedValue(mockLhu);

            await expect(
                LhuSignedFileService.resolveSignedFileForAccess('123/LHU/2026', 'NIK_CUST', Roles.CUSTOMER)
            ).rejects.toThrow('LHU bertanda tangan belum tersedia.');
        });
    });

    describe('buildAdminSignedLhuDocuments', () => {
        it('should build document list with hasSignedFile flag', () => {
            const mockRequestData = {
                fpplSampels: [
                    {
                        sampels: [
                            {
                                lhu: {
                                    nomor_lhu: '123/LHU',
                                    file_lhu_signed_path: 'path/to/file.pdf'
                                }
                            }
                        ]
                    }
                ]
            };

            const result = LhuSignedFileService.buildAdminSignedLhuDocuments(mockRequestData);
            expect(result).toHaveLength(1);
            expect(result[0].nomorLhu).toBe('123/LHU');
            expect(result[0].hasSignedFile).toBe(true);
        });

        it('should return empty array if no lhus in responseData', () => {
            expect(LhuSignedFileService.buildAdminSignedLhuDocuments({})).toEqual([]);
            expect(LhuSignedFileService.buildAdminSignedLhuDocuments(null)).toEqual([]);
        });
    });

    describe('buildCustomerSignedLhuDocuments', () => {
        it('should include sample numbers and not expose file path', () => {
            const mockRequestData = {
                fpplSampels: [
                    {
                        sampels: [
                            {
                                no_sampel: 'SMP-1',
                                lhu: {
                                    nomor_lhu: '123/LHU',
                                    file_lhu_signed_path: 'path/to/file.pdf'
                                }
                            },
                            {
                                no_sampel: 'SMP-2',
                                lhu: {
                                    nomor_lhu: '123/LHU',
                                    file_lhu_signed_path: 'path/to/file.pdf'
                                }
                            }
                        ]
                    }
                ]
            };

            const result = LhuSignedFileService.buildCustomerSignedLhuDocuments(mockRequestData);
            expect(result).toHaveLength(1);
            expect(result[0].nomorLhu).toBe('123/LHU');
            expect(result[0].hasSignedFile).toBe(true);
            expect(result[0].sampleNos).toContain('SMP-1');
            expect(result[0].sampleNos).toContain('SMP-2');
            // Path should not be in the output object
            expect(result[0].file_lhu_signed_path).toBeUndefined();
        });
    });
});
