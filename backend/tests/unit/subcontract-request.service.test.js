jest.mock('../../src/models/Associations', () => ({}));
jest.mock('../../src/services/admin-parameter.service', () => {
  const mockClass = jest.fn().mockImplementation(() => ({
    createParameterMethodWithinTransaction: jest.fn().mockResolvedValue({ id_metode_parameter: 'mp-1' }),
  }));
  mockClass.generateNextCode = jest.fn().mockResolvedValue('req-2');
  return mockClass;
});

const subcontractService = require('../../src/services/request/subcontract-request.service');
const PermintaanSubkontrak = require('../../src/models/PermintaanSubkontrak');
const FpplParameterMetode = require('../../src/models/FpplParameterMetode');
const ParameterMetode = require('../../src/models/ParameterMetode');

jest.mock('../../src/models/PermintaanSubkontrak', () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock('../../src/models/FpplParameterMetode', () => ({
  findByPk: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../src/models/ParameterMetode', () => ({
  create: jest.fn(),
}));

jest.mock('../../src/services/workflow/workflow-log.service', () => ({
  logStatusTransition: jest.fn(),
  log: jest.fn()
}));

jest.mock('../../src/services/notification/web-notification.service', () => {
  return jest.fn().mockImplementation(() => ({
    notifyAdmin: jest.fn(),
    notifyKasiFromAdmin: jest.fn(),
    notifyRole: jest.fn(),
  }));
});

jest.mock('../../src/services/notification/notification-query.service', () => ({
  getActiveUsersByRole: jest.fn().mockResolvedValue([{ nik: 'mock-nik-1' }])
}));

jest.mock('../../src/services/notification/notification-core.service', () => ({
  createEmailLog: jest.fn().mockResolvedValue(true)
}));

describe('Unit Test - subcontract-request.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    test('should throw error if fpm not found', async () => {
      FpplParameterMetode.findByPk.mockResolvedValue(null);
      await expect(subcontractService.createRequest({ registrasiId: 'REG-001', fpmId: 'fpm-123', catatanKasi: 'catatan', kasiNik: 'kasi-1' })).rejects.toThrow('Parameter permohonan tidak ditemukan.');
    });

    test('should throw error if request already exists', async () => {
      FpplParameterMetode.findByPk.mockResolvedValue({ id_fppl_parameter_metode: 'fpm-123', id_parameter: 'p-1', fppl: { status_fppl: 'Menunggu Penentuan Metode' } });
      PermintaanSubkontrak.findOne.mockResolvedValue({ id_permintaan_subkontrak: 'req-1' });
      await expect(subcontractService.createRequest({ registrasiId: 'REG-001', fpmId: 'fpm-123', catatanKasi: 'catatan', kasiNik: 'kasi-1' })).rejects.toThrow('Sudah ada permintaan subkontrak yang menunggu diproses admin untuk parameter ini.');
    });

    test('should create request successfully', async () => {
      FpplParameterMetode.findByPk.mockResolvedValue({ id_fppl_parameter_metode: 'fpm-123', id_parameter: 'p-1', id_registrasi: 'REG-001', fppl: { status_fppl: 'Menunggu Penentuan Metode' }, parameter: { nama_parameter: 'Param 1' } });
      PermintaanSubkontrak.findOne.mockResolvedValue(null);
      PermintaanSubkontrak.create.mockResolvedValue({ id_permintaan_subkontrak: 'req-2' });

      const result = await subcontractService.createRequest({ registrasiId: 'REG-001', fpmId: 'fpm-123', catatanKasi: 'catatan', kasiNik: 'kasi-1' });
      expect(PermintaanSubkontrak.create.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          id_registrasi: 'REG-001',
          id_fppl_parameter_metode: 'fpm-123',
          id_parameter: 'p-1',
          status_permintaan: 'MENUNGGU_ADMIN',
          pending_fpm_key: 'fpm-123',
        })
      );
    });
  });


  describe('approveRequest', () => {
    test('should approve request and create new method', async () => {
      const mockRequest = {
        id_permintaan_subkontrak: 'req-1',
        id_parameter: 'p-1',
        id_fppl_parameter_metode: 'fpm-1',
        isPending: () => true,
        update: jest.fn(),
        fppl_parameter_metode: { fppl: { status_fppl: 'Menunggu Penentuan Metode' }, parameter: { nama_parameter: 'Param 1' } }
      };
      PermintaanSubkontrak.findByPk.mockResolvedValue(mockRequest);
      
      const payload = { createMethodData: { nama_metode: 'Metode Baru', tarif: 100000 } };
      await subcontractService.approveRequest({ requestId: 'req-1', ...payload });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status_permintaan: 'SELESAI'
        }),
        expect.anything()
      );
    });
  });

  describe('rejectRequest', () => {
    test('should reject request successfully', async () => {
      const mockRequest = {
        id_permintaan_subkontrak: 'req-1',
        id_fppl_parameter_metode: 'fpm-1',
        isPending: () => true,
        update: jest.fn(),
        fppl_parameter_metode: { fppl: { status_fppl: 'Menunggu Penentuan Metode' }, parameter: { nama_parameter: 'Param 1' } }
      };
      PermintaanSubkontrak.findByPk.mockResolvedValue(mockRequest);

      await subcontractService.rejectRequest({ requestId: 'req-1', catatanAdmin: 'Tolak' });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status_permintaan: 'DITOLAK'
        }),
        expect.anything()
      );
    });
  });
});
