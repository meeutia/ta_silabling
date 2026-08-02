jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

const jwt = require('jsonwebtoken');
const { validateRegister, validateLogin } = require('../../src/validators/auth.validator');
const { verifyToken, authorizeRoles } = require('../../src/middlewares/auth');

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('Unit Test - validasi dan otorisasi autentikasi', () => {
  test('validateRegister menormalisasi data valid lalu memanggil next', () => {
    const req = { body: { nik: ' 1301010101010101 ', username: ' user_01 ', email: ' USER@MAIL.COM ', password: 'Abcd1234' } };
    const res = createRes();
    const next = jest.fn();
    validateRegister(req, res, next);
    expect(req.body).toMatchObject({ nik: '1301010101010101', username: 'user_01', email: 'user@mail.com' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('validateRegister menolak field wajib yang kosong', () => {
    const res = createRes();
    validateRegister({ body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: expect.stringContaining('wajib diisi') }));
  });

  test('validateRegister menolak NIK yang bukan 16 digit angka', () => {
    const res = createRes();
    validateRegister({ body: { nik: '123', username: 'user01', email: 'a@b.com', password: 'Abcd1234' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'NIK harus 16 digit angka.' }));
  });

  test('validateRegister menolak username yang tidak sesuai policy', () => {
    const res = createRes();
    validateRegister({ body: { nik: '1301010101010101', username: 'user name', email: 'a@b.com', password: 'Abcd1234' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Username tidak boleh mengandung spasi.' }));
  });

  test('validateRegister menolak format email tidak valid', () => {
    const res = createRes();
    validateRegister({ body: { nik: '1301010101010101', username: 'user01', email: 'email-salah', password: 'Abcd1234' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Format email tidak valid.' }));
  });

  test('validateRegister menolak password yang tidak memenuhi policy', () => {
    const res = createRes();
    validateRegister({ body: { nik: '1301010101010101', username: 'user01', email: 'a@b.com', password: '123' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('minimal 8 karakter') }));
  });

  test('validateLogin menerima kredensial lengkap dan menolak data yang tidak lengkap', () => {
    const next = jest.fn();
    validateLogin({ body: { identifier: 'user01', password: 'Abcd1234' } }, createRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const res = createRes();
    validateLogin({ body: { identifier: 'user01' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('verifyToken memasang decoded user dan memanggil next untuk bearer token valid', () => {
    jwt.verify.mockReturnValue({ nik: '1301', id_role: 'RL-001' });
    const req = { headers: { authorization: 'Bearer token-valid' } };
    const next = jest.fn();
    verifyToken(req, createRes(), next);
    expect(jwt.verify).toHaveBeenCalledWith('token-valid', process.env.JWT_SECRET);
    expect(req.user).toEqual({ nik: '1301', id_role: 'RL-001' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('authorizeRoles mengizinkan role terdaftar dan menolak role lain', () => {
    const next = jest.fn();
    authorizeRoles('RL-001')({ user: { id_role: 'RL-001' } }, createRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const res = createRes();
    authorizeRoles('RL-001')({ user: { id_role: 'RL-009' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
