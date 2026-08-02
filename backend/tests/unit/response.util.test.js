jest.mock('../../src/utils/case-transform.util', () => ({
  toCamelCaseDeep: jest.fn((value) => ({ transformed: value })),
}));

const { toCamelCaseDeep } = require('../../src/utils/case-transform.util');
const { successResponse, errorResponse } = require('../../src/utils/response');

function createRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('Unit Test - response util', () => {
  const OLD_ENV = process.env;
  afterEach(() => { process.env = OLD_ENV; });

  test('successResponse mengirim kontrak sukses tanpa data ketika data null', () => {
    const res = createRes();
    successResponse(res, 'Berhasil');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Berhasil' });
  });

  test('successResponse mentransformasi data sebelum dikirim', () => {
    const res = createRes();
    const data = { id_registrasi: 'REG-1' };
    successResponse(res, 'Berhasil', data);
    expect(toCamelCaseDeep).toHaveBeenCalledWith(data);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Berhasil', data: { transformed: data } });
  });

  test('successResponse menghormati status code kustom', () => {
    const res = createRes();
    successResponse(res, 'Dibuat', {}, 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('errorResponse memakai status 500 dan fallback message', () => {
    const res = createRes();
    errorResponse(res, '');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Terjadi kesalahan pada server.' });
  });

  test('errorResponse menyertakan errors tertransformasi untuk client error', () => {
    const res = createRes();
    const errors = [{ field_name: 'email' }];
    errorResponse(res, 'Validasi gagal', 422, errors);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Validasi gagal', errors: { transformed: errors } });
  });

  test('errorResponse menyamarkan server error di production dan tidak membocorkan errors', () => {
    process.env = { ...OLD_ENV, NODE_ENV: 'production' };
    const res = createRes();
    errorResponse(res, 'SQL connection failed', 500, [{ detail: 'rahasia' }]);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Terjadi kesalahan pada server.' });
  });
});
