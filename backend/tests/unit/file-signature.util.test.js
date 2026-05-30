const { isAllowedWorksheetSignature } = require('../../src/utils/file-signature.util');

describe('Unit Test - file-signature.util', () => {
  test('menerima PDF berdasarkan magic number %PDF', () => {
    expect(isAllowedWorksheetSignature(Buffer.from('%PDF-1.7'), '.pdf')).toBe(true);
  });

  test('menolak file PDF palsu yang isinya bukan PDF', () => {
    expect(isAllowedWorksheetSignature(Buffer.from('ini bukan pdf'), '.pdf')).toBe(false);
  });

  test('menerima XLSX/DOCX berbasis ZIP', () => {
    const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    expect(isAllowedWorksheetSignature(zipSignature, '.xlsx')).toBe(true);
    expect(isAllowedWorksheetSignature(zipSignature, '.docx')).toBe(true);
  });

  test('menerima XLS/DOC lama berbasis OLE', () => {
    const oleSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(isAllowedWorksheetSignature(oleSignature, '.xls')).toBe(true);
    expect(isAllowedWorksheetSignature(oleSignature, '.doc')).toBe(true);
  });

  test('menerima CSV berbasis teks', () => {
    expect(isAllowedWorksheetSignature(Buffer.from('parameter,hasil\nTDS,10'), '.csv')).toBe(true);
  });

  test('menolak ekstensi yang tidak didukung', () => {
    expect(isAllowedWorksheetSignature(Buffer.from('data'), '.exe')).toBe(false);
  });
});
