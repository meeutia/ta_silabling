const { isAllowedWorksheetSignature } = require('../../src/utils/file-signature.util');

describe('Unit Test - file-signature.util', () => {
  test('menerima signature PDF untuk ekstensi PDF', () => {
    expect(isAllowedWorksheetSignature(Buffer.from('%PDF-1.7'), '.pdf')).toBe(true);
  });

  test('menerima signature ZIP untuk XLSX dan DOCX', () => {
    expect(isAllowedWorksheetSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04]), 'hasil.xlsx')).toBe(true);
    expect(isAllowedWorksheetSignature(Buffer.from([0x50, 0x4b, 0x05, 0x06]), 'dokumen.docx')).toBe(true);
  });

  test('menerima OLE atau ZIP untuk format XLS lama', () => {
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const zip = Buffer.from([0x50, 0x4b, 0x07, 0x08]);
    expect(isAllowedWorksheetSignature(ole, '.xls')).toBe(true);
    expect(isAllowedWorksheetSignature(zip, '.xls')).toBe(true);
  });

  test('menerima CSV yang berisi teks printable', () => {
    expect(isAllowedWorksheetSignature(Buffer.from('parameter,hasil\npH,7'), '.csv')).toBe(true);
  });

  test('menolak signature yang tidak sesuai dengan ekstensi', () => {
    expect(isAllowedWorksheetSignature(Buffer.from('bukan pdf'), '.pdf')).toBe(false);
    expect(isAllowedWorksheetSignature(Buffer.from([0x00, 0x01, 0x02]), '.csv')).toBe(false);
    expect(isAllowedWorksheetSignature(Buffer.from('data'), '.exe')).toBe(false);
  });
});
