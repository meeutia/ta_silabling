'use strict';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'silabling-jest-integration-secret';
process.env.REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const createMockService = () => new Proxy({}, {
  get(target, prop) {
    if (!target[prop]) {
      target[prop] = jest.fn(async (req, res) => {
        if (res && typeof res.status === 'function') {
          return res.status(200).json({ success: true, message: 'Mock handler ok.' });
        }
        return { success: true };
      });
    }
    return target[prop];
  },
});

// External side effects.
jest.mock('../../src/services/notification/notification.service', () => createMockService());

// Domain services are mocked at the controller boundary. These tests verify
// route, validator, auth/role middleware, controller orchestration, response
// contracts, and that the correct current service method receives the data.
jest.mock('../../src/services/auth.service', () => createMockService());
jest.mock('../../src/services/request/request.service', () => createMockService());
jest.mock('../../src/services/request/request-list.service', () => createMockService());
jest.mock('../../src/services/request/request-workflow.service', () => createMockService());
jest.mock('../../src/services/payment/payment.service', () => createMockService());
jest.mock('../../src/services/schedule/schedule-change.service', () => createMockService());

jest.mock('../../src/services/assignment/assignment-read.service', () => createMockService());
jest.mock('../../src/services/assignment/assignment-create.service', () => createMockService());
jest.mock('../../src/services/assignment/assignment-worksheet.service', () => createMockService());
jest.mock('../../src/services/assignment/assignment-penyelia-review.service', () => createMockService());
jest.mock('../../src/services/assignment/assignment-kasi-review.service', () => createMockService());
jest.mock('../../src/services/assignment/assignment-subkontrak.service', () => createMockService());

jest.mock('../../src/services/lhu/lhu.service', () => createMockService());
jest.mock('../../src/services/lhu/lhu-finalization.service', () => createMockService());
jest.mock('../../src/services/lhu/lhu-data.service', () => createMockService());
jest.mock('../../src/services/lhu/lhu-pickup.service', () => createMockService());

jest.mock('../../src/validators/business-day.validator', () => ({
  validateAssignmentBusinessTimeline: (req, res, next) => next(),
  validateSubkontrakBusinessTimeline: (req, res, next) => next(),
  validateWorksheetBusinessTimeline: (req, res, next) => next(),

  validateLhuFinalizationBusinessTimeline: (req, res, next) => next(),
}));
