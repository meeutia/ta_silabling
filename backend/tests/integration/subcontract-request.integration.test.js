'use strict';

require('../fixtures/integration-mocks');

const request = require('supertest');
const app = require('../../src/app');
const SubcontractRequestService = require('../../src/services/request/subcontract-request.service');
const { Roles, authHeader, nikByRole } = require('../fixtures/integration-helpers');

let consoleErrorSpy;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  if (consoleErrorSpy && typeof consoleErrorSpy.mockRestore === 'function') {
    consoleErrorSpy.mockRestore();
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

jest.mock('../../src/services/request/subcontract-request.service', () => {
    return {
        createRequest: jest.fn(),
        listAdminRequests: jest.fn(),
        getAdminRequestDetail: jest.fn(),
        approveRequest: jest.fn(),
        rejectRequest: jest.fn(),
    };
});

describe('Integration Testing - Permintaan Subkontrak', () => {
    
    describe('Kasi Pengendalian Mutu Flow', () => {
        test('POST /requests/:id/subcontract-requests - Kasi membuat permintaan subkontrak', async () => {
            SubcontractRequestService.createRequest.mockResolvedValueOnce({
                id_permintaan_subkontrak: 'SUB-123',
                status: 'MENUNGGU_ADMIN'
            });

            const res = await request(app)
                .post('/requests/REG-001/subcontract-requests')
                .set(authHeader(Roles.KASI))
                .send({ fpmId: 'FPM-123' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(SubcontractRequestService.createRequest).toHaveBeenCalledWith({ fpmId: 'FPM-123' });
        });

        test('POST /requests/:id/subcontract-requests - Ditolak jika validation gagal (fpmId kosong)', async () => {
            const res = await request(app)
                .post('/requests/REG-001/subcontract-requests')
                .set(authHeader(Roles.KASI))
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('fpmId wajib diisi');
        });
    });

    describe('Admin Flow', () => {
        test('GET /admin/parameters/subcontract-requests - Admin melihat daftar', async () => {
            SubcontractRequestService.listAdminRequests.mockResolvedValueOnce([
                { id_permintaan_subkontrak: 'SUB-123' }
            ]);

            const res = await request(app)
                .get('/admin/parameters/subcontract-requests')
                .set(authHeader(Roles.ADMIN));

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(SubcontractRequestService.listAdminRequests).toHaveBeenCalledWith({ status: undefined });
        });

        test('GET /admin/parameters/subcontract-requests/:id - Admin melihat detail', async () => {
            SubcontractRequestService.getAdminRequestDetail.mockResolvedValueOnce({
                id_permintaan_subkontrak: 'SUB-123'
            });

            const res = await request(app)
                .get('/admin/parameters/subcontract-requests/SUB-123')
                .set(authHeader(Roles.ADMIN));

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(SubcontractRequestService.getAdminRequestDetail).toHaveBeenCalledWith('SUB-123');
        });

        test('PUT /admin/parameters/subcontract-requests/:id/approve - Admin menyetujui', async () => {
            SubcontractRequestService.approveRequest.mockResolvedValueOnce({
                id_permintaan_subkontrak: 'SUB-123',
                status: 'SELESAI'
            });

            const res = await request(app)
                .put('/admin/parameters/subcontract-requests/SUB-123/approve')
                .set(authHeader(Roles.ADMIN))
                .send({ existingMethodId: 'METODE-1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(SubcontractRequestService.approveRequest).toHaveBeenCalledWith({
                requestId: 'SUB-123',
                adminNik: nikByRole[Roles.ADMIN],
                createMethodData: undefined,
                existingMethodId: 'METODE-1',
            });
        });

        test('PUT /admin/parameters/subcontract-requests/:id/reject - Admin menolak', async () => {
            SubcontractRequestService.rejectRequest.mockResolvedValueOnce({
                id_permintaan_subkontrak: 'SUB-123',
                status: 'DITOLAK'
            });

            const res = await request(app)
                .put('/admin/parameters/subcontract-requests/SUB-123/reject')
                .set(authHeader(Roles.ADMIN))
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(SubcontractRequestService.rejectRequest).toHaveBeenCalledWith({
                requestId: 'SUB-123',
                adminNik: nikByRole[Roles.ADMIN],
            });
        });
    });
});
