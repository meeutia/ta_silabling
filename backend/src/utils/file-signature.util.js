const fs = require('fs/promises');
const path = require('path');

const MAX_SIGNATURE_BYTES = 8192;

function toLowerExtension(filename = '') {
  const value = String(filename || '').trim().toLowerCase();

  if (!value) return '';

  // Support input yang sudah berupa ekstensi, misalnya `.xlsx`.
  // path.extname('.xlsx') menghasilkan string kosong, jadi jangan diproses ulang.
  if (/^\.[a-z0-9]+$/.test(value)) {
    return value;
  }

  return path.extname(value);
}

function hasPrefix(buffer, signature = []) {
  if (!Buffer.isBuffer(buffer) || buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

function looksLikeZip(buffer) {
  return (
    hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
    hasPrefix(buffer, [0x50, 0x4b, 0x05, 0x06]) ||
    hasPrefix(buffer, [0x50, 0x4b, 0x07, 0x08])
  );
}

function looksLikeOle(buffer) {
  return hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
}

function looksLikePdf(buffer) {
  return hasPrefix(buffer, [0x25, 0x50, 0x44, 0x46]); // %PDF
}

function looksLikeText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;

  let printable = 0;
  for (const byte of buffer) {
    if (byte === 0x00) return false;
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte <= 0x7e) || byte >= 0x80) {
      printable += 1;
    }
  }

  return printable / buffer.length >= 0.95;
}

function isAllowedWorksheetSignature(buffer, extension) {
  const ext = toLowerExtension(extension);

  if (ext === '.pdf') return looksLikePdf(buffer);

  // XLSX/DOCX/XLSM adalah file Office berbasis ZIP.
  if (ext === '.xlsx' || ext === '.docx' || ext === '.xlsm') return looksLikeZip(buffer);

  // Di lapangan, file dari WPS/LibreOffice kadang berekstensi .xls/.doc
  // tetapi isinya format Office baru berbasis ZIP. Tetap diterima karena
  // pengguna sering hanya melihatnya sebagai dokumen Excel/Word biasa.
  if (ext === '.xls' || ext === '.doc') return looksLikeOle(buffer) || looksLikeZip(buffer);

  if (ext === '.csv') return looksLikeText(buffer);

  return false;
}

async function readSignature(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(MAX_SIGNATURE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, MAX_SIGNATURE_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function assertWorksheetFileSignature(filePath, originalName = '') {
  const extension = toLowerExtension(originalName || filePath);
  const buffer = await readSignature(filePath);

  if (!isAllowedWorksheetSignature(buffer, extension)) {
    throw new Error('Isi file LKA tidak sesuai dengan format file yang diunggah. Pastikan file tidak rusak dan gunakan PDF, XLS, XLSX, XLSM, CSV, DOC, atau DOCX.');
  }
}

module.exports = {
  assertWorksheetFileSignature,
  isAllowedWorksheetSignature,
};
