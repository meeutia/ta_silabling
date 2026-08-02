jest.mock('../../src/utils/file-access-token.util', () => ({
  createFileAccessToken: jest.fn(() => 'signed-token'),
}));

const {
  buildSignedFileUrl,
  getFileScopeConfig,
  normalizeFilePath,
  secureKnownFileFields,
} = require('../../src/utils/file-url.util');
const {
  cleanScopedRelativePath,
  getFileNameFromPath,
  sendFileResponse,
} = require('../../src/utils/file-security.util');

describe('Unit Test - file-security dan file-url', () => {
  test.each([
    ['lhu/a.pdf', '/lhu/a.pdf'],
    ['/invoices/a.pdf', '/invoices/a.pdf'],
    ['https://api.test/worksheets/a.xlsx?x=1', '/worksheets/a.xlsx'],
  ])('normalizeFilePath mengubah %s menjadi path terstandar', (input, expected) => {
    expect(normalizeFilePath(input)).toBe(expected);
  });

  test('getFileScopeConfig mengenali scope file yang didukung', () => {
    expect(getFileScopeConfig('/lhu/a.pdf')).toMatchObject({ scope: 'lhu', route: '/files/lhu' });
    expect(getFileScopeConfig('/invoices/a.pdf')).toMatchObject({ scope: 'invoice' });
    expect(getFileScopeConfig('/lain/a.pdf')).toBeNull();
  });

  test('buildSignedFileUrl membentuk URL endpoint file dengan token dan download flag', () => {
    expect(buildSignedFileUrl('/worksheets/a.xlsx', { download: true })).toBe('/files/worksheet?token=signed-token&download=1');
  });

  test('buildSignedFileUrl mempertahankan path yang bukan file terkelola', () => {
    expect(buildSignedFileUrl('/public/a.txt')).toBe('/public/a.txt');
    expect(buildSignedFileUrl('')).toBe('');
  });

  test('secureKnownFileFields mengamankan field file secara rekursif tanpa mengubah objek asal', () => {
    const source = { file_lhu_path: '/lhu/a.pdf', child: { fileInvoicePath: '/invoices/i.pdf' } };
    const result = secureKnownFileFields(source);
    expect(result).toMatchObject({
      file_lhu_original_path: '/lhu/a.pdf', file_lhu_path: '/files/lhu?token=signed-token',
      child: { fileInvoiceOriginalPath: '/invoices/i.pdf', fileInvoicePath: '/files/invoice?token=signed-token' },
    });
    expect(source.file_lhu_original_path).toBeUndefined();
  });

  test('cleanScopedRelativePath membuang prefix scope dan menormalkan slash', () => {
    expect(cleanScopedRelativePath('worksheet', '/uploads/worksheets/folder\\hasil.xlsx')).toBe('folder/hasil.xlsx');
    expect(getFileNameFromPath('https://api.test/lhu/final.pdf')).toBe('final.pdf');
  });

  test('cleanScopedRelativePath menolak path kosong dan traversal', () => {
    expect(() => cleanScopedRelativePath('lhu', '')).toThrow('Path file tidak valid.');
    expect(() => cleanScopedRelativePath('lhu', '/lhu/../rahasia.txt')).toThrow('Path file tidak valid.');
  });

  test('sendFileResponse memasang header preview aman lalu mengirim file', () => {
    process.env.FRONTEND_ORIGIN = 'https://frontend.test';
    const res = {
      setHeader: jest.fn(), removeHeader: jest.fn(), sendFile: jest.fn(() => 'sent'),
    };
    const result = sendFileResponse(res, { absolutePath: '/tmp/a.pdf', fileName: 'a.pdf' });
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="a.pdf"');
    expect(res.removeHeader).toHaveBeenCalledWith('X-Frame-Options');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "frame-ancestors 'self' https://frontend.test");
    expect(result).toBe('sent');
  });
});
