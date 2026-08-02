'use strict';

require('../fixtures/integration-mocks');

const request = require('supertest');
const app = require('../../src/app');
const RequestWorkflowService = require('../../src/services/request/request-workflow.service');
const assignmentCreateService = require('../../src/services/assignment/assignment-create.service');
const {
  Roles,
  authHeader,
  validAssignmentPayload,
  validFinalizeLhuPayload,
  validPickupSchedulePayload,
  validReceiveSamplesPayload,
} = require('../fixtures/integration-helpers');

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

describe('Integration Testing - Workflow Guard', () => {
  test('IT-069 Sistem menolak penerimaan sampel jika pembayaran belum sukses', async () => {
    RequestWorkflowService.receiveSamplesAndGenerateCodes.mockRejectedValueOnce(
      new Error('Pembayaran belum sukses. Sampel belum dapat diterima.')
    );

    const response = await request(app)
      .post('/requests/REG-001/samples/receive')
      .set(authHeader(Roles.ADMIN))
      .send(validReceiveSamplesPayload())
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Pembayaran belum sukses');
  });

  test('IT-070 Sistem menolak penugasan jika sampel belum diterima', async () => {
    assignmentCreateService.createAssignment.mockRejectedValueOnce(
      new Error('Sampel belum diterima. Penugasan analis belum dapat dibuat.')
    );

    const response = await request(app)
      .post('/assignments')
      .set(authHeader(Roles.PENYELIA))
      .send(validAssignmentPayload())
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Sampel belum diterima');
  });

});
