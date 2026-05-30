const jwt = require('jsonwebtoken');
const { verifyToken, authorizeRoles } = require('../../src/middlewares/auth');

function createResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Unit Test - auth middleware', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, JWT_SECRET: 'jwt-secret-middleware-minimal-16' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('verifyToken menerima token valid dan mengisi req.user', () => {
    const token = jwt.sign({ nik: '1300000000000001', id_role: 'RL-002' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ nik: '1300000000000001', id_role: 'RL-002' });
    expect(res.status).not.toHaveBeenCalled();
  });

  test('verifyToken menolak request tanpa token', () => {
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Akses ditolak. Access token tidak ditemukan.',
    });
  });

  test('authorizeRoles mengizinkan role yang sesuai', () => {
    const req = { user: { id_role: 'RL-002' } };
    const res = createResponse();
    const next = jest.fn();

    authorizeRoles('RL-002', 'RL-003')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('authorizeRoles menolak role yang tidak sesuai', () => {
    const req = { user: { id_role: 'RL-001' } };
    const res = createResponse();
    const next = jest.fn();

    authorizeRoles('RL-002', 'RL-003')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Anda tidak memiliki akses ke resource ini.',
    });
  });
});
