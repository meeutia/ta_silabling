const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const mammoth = require('mammoth');

let JSZip = null;
try {
  // JSZip is installed as a transitive dependency of ExcelJS. It is used here
  // only as a safe fallback when ExcelJS cannot parse a workbook that Excel/LibreOffice
  // may still be able to repair/open.
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  JSZip = require('jszip');
} catch {
  JSZip = null;
}

const PUBLIC_WORKSHEET_DIR = path.join(process.cwd(), 'public', 'worksheets');
const UPLOAD_WORKSHEET_DIR = path.join(process.cwd(), 'uploads', 'worksheets');

function normalizeRequestPath(rawPath = '') {
  const value = String(rawPath || '').trim();

  if (!value) return '';

  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).pathname;
    }
  } catch {
    return value;
  }

  return value;
}

function cleanRelativePath(rawPath = '') {
  let relativePath = normalizeRequestPath(rawPath)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (relativePath.startsWith('worksheets/')) {
    relativePath = relativePath.replace(/^worksheets\//, '');
  }

  if (relativePath.startsWith('uploads/worksheets/')) {
    relativePath = relativePath.replace(/^uploads\/worksheets\//, '');
  }

  return relativePath
    .split('/')
    .filter(Boolean)
    .join('/');
}

function resolveWorksheetPath(rawPath = '') {
  const relativePath = cleanRelativePath(rawPath);

  if (!relativePath) {
    throw new Error('Path file worksheet wajib dikirim.');
  }

  const publicCandidate = path.resolve(PUBLIC_WORKSHEET_DIR, relativePath);
  const uploadCandidate = path.resolve(UPLOAD_WORKSHEET_DIR, relativePath);

  const publicRoot = path.resolve(PUBLIC_WORKSHEET_DIR);
  const uploadRoot = path.resolve(UPLOAD_WORKSHEET_DIR);

  if (publicCandidate.startsWith(publicRoot) && fs.existsSync(publicCandidate)) {
    return {
      absolutePath: publicCandidate,
      publicUrl: `/worksheets/${relativePath
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
      relativePath,
    };
  }

  if (uploadCandidate.startsWith(uploadRoot) && fs.existsSync(uploadCandidate)) {
    return {
      absolutePath: uploadCandidate,
      publicUrl: `/worksheets/${relativePath
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
      relativePath,
    };
  }

  throw new Error('File worksheet tidak ditemukan.');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeCellValue(value) {
  if (value === null || value === undefined) return '';

  if (value instanceof Date) {
    return value.toLocaleString('id-ID');
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('');
    }

    if (value.hyperlink) {
      return value.text || value.hyperlink;
    }

    if (value.formula !== undefined) {
      return normalizeCellValue(value.result ?? value.formula);
    }

    if (value.text !== undefined) {
      return value.text;
    }

    if (value.result !== undefined) {
      return normalizeCellValue(value.result);
    }
  }

  return String(value);
}

function parseCsvText(content) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  const pushCell = () => {
    currentRow.push(currentCell);
    currentCell = '';
  };

  const pushRow = () => {
    pushCell();
    rows.push(currentRow);
    currentRow = [];
  };

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
      continue;
    }

    if (char === ',') {
      pushCell();
      continue;
    }

    if (char === '\r') {
      continue;
    }

    if (char === '\n') {
      pushRow();
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

function rowsToHtmlTable(rows) {
  if (!rows.length) {
    return '<p>Sheet kosong.</p>';
  }

  const bodyRows = rows
    .map((row) => {
      const cells = row
        .map((cell) => `<td>${escapeHtml(cell)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table><tbody>${bodyRows}</tbody></table>`;
}

function decodeXmlEntity(value = '') {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripXmlTags(value = '') {
  return decodeXmlEntity(String(value).replace(/<[^>]*>/g, ''));
}

function columnLettersToIndex(letters = '') {
  return String(letters || '')
    .toUpperCase()
    .split('')
    .reduce((total, char) => {
      const code = char.charCodeAt(0);
      if (code < 65 || code > 90) return total;
      return total * 26 + (code - 64);
    }, 0) - 1;
}

function parseXmlAttributes(tag = '') {
  const attributes = {};
  const attrRegex = /([A-Za-z_:][\w:.-]*)=(["'])(.*?)\2/g;
  let match;

  while ((match = attrRegex.exec(tag))) {
    attributes[match[1]] = decodeXmlEntity(match[3]);
  }

  return attributes;
}

function parseSharedStringsXml(xml = '') {
  const sharedStrings = [];
  const siRegex = /<(?:\w+:)?si[\s\S]*?<\/(?:\w+:)?si>/g;
  const tRegex = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g;
  let siMatch;

  while ((siMatch = siRegex.exec(xml))) {
    const block = siMatch[0];
    const parts = [];
    let tMatch;

    while ((tMatch = tRegex.exec(block))) {
      parts.push(decodeXmlEntity(tMatch[1]));
    }

    sharedStrings.push(parts.join('') || stripXmlTags(block));
  }

  return sharedStrings;
}

function parseWorkbookRelationshipsXml(xml = '') {
  const relationships = {};
  const relRegex = /<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g;
  let match;

  while ((match = relRegex.exec(xml))) {
    const attrs = parseXmlAttributes(match[1]);
    if (!attrs.Id || !attrs.Target) continue;

    const target = attrs.Target.startsWith('/')
      ? attrs.Target.replace(/^\/+/, '')
      : `xl/${attrs.Target.replace(/^\/+/, '')}`;

    relationships[attrs.Id] = target.replace(/\\/g, '/');
  }

  return relationships;
}

function parseWorkbookSheetsXml(xml = '', relationships = {}) {
  const sheets = [];
  const sheetRegex = /<(?:\w+:)?sheet\b([^>]*)\/?>(?:<\/(?:\w+:)?sheet>)?/g;
  let match;

  while ((match = sheetRegex.exec(xml))) {
    const attrs = parseXmlAttributes(match[1]);
    const relationshipId = attrs['r:id'];
    const sheetId = attrs.sheetId || String(sheets.length + 1);
    const fallbackPath = `xl/worksheets/sheet${sheetId}.xml`;

    sheets.push({
      name: attrs.name || `Sheet ${sheets.length + 1}`,
      path: relationships[relationshipId] || fallbackPath,
    });
  }

  return sheets;
}

function normalizeExcelSerialDate(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;

  // Avoid guessing every numeric value as a date. Serial dates commonly used by
  // modern worksheets are above 20,000. Keep small measurement/result numbers as-is.
  if (numberValue < 20000 || numberValue > 80000) return value;

  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + numberValue * 24 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID');
}

function parseXlsxCellValue(cellXml = '', attrs = {}, sharedStrings = []) {
  const type = attrs.t;

  if (type === 'inlineStr') {
    const inlineMatch = cellXml.match(/<(?:\w+:)?is[\s\S]*?<\/(?:\w+:)?is>/);
    return inlineMatch ? stripXmlTags(inlineMatch[0]) : '';
  }

  const valueMatch = cellXml.match(/<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v>/);
  const rawValue = valueMatch ? decodeXmlEntity(valueMatch[1]) : '';

  if (type === 's') {
    const index = Number(rawValue);
    return Number.isInteger(index) && sharedStrings[index] !== undefined
      ? sharedStrings[index]
      : rawValue;
  }

  if (type === 'b') {
    return rawValue === '1' ? 'TRUE' : 'FALSE';
  }

  if (type === 'str') return rawValue;

  return normalizeExcelSerialDate(rawValue);
}

async function buildXlsxPreviewWithZipFallback(absolutePath, ext, fileName, publicUrl = '') {
  if (!JSZip) {
    return buildSpreadsheetUnsupportedPreview(
      ext,
      fileName,
      publicUrl,
      'File XLSX tidak dapat dipreview karena parser fallback belum tersedia. Silakan download file asli.'
    );
  }

  try {
    const zip = await JSZip.loadAsync(fs.readFileSync(absolutePath));
    const workbookFile = zip.file('xl/workbook.xml');
    const workbookRelsFile = zip.file('xl/_rels/workbook.xml.rels');
    const sharedStringsFile = zip.file('xl/sharedStrings.xml');

    if (!workbookFile) {
      return buildSpreadsheetUnsupportedPreview(
        ext,
        fileName,
        publicUrl,
        'File XLSX tidak dapat dipreview karena struktur workbook tidak ditemukan.'
      );
    }

    const [workbookXml, workbookRelsXml, sharedStringsXml] = await Promise.all([
      workbookFile.async('text'),
      workbookRelsFile ? workbookRelsFile.async('text') : Promise.resolve(''),
      sharedStringsFile ? sharedStringsFile.async('text') : Promise.resolve(''),
    ]);

    const relationships = parseWorkbookRelationshipsXml(workbookRelsXml);
    const sheets = parseWorkbookSheetsXml(workbookXml, relationships);
    const firstSheet = sheets[0];

    if (!firstSheet) {
      return {
        type: 'html',
        ext,
        fileName,
        sheetName: '',
        html: '<p>Workbook kosong.</p>',
        url: publicUrl,
      };
    }

    const sheetFile = zip.file(firstSheet.path);
    if (!sheetFile) {
      return buildSpreadsheetUnsupportedPreview(
        ext,
        fileName,
        publicUrl,
        'File XLSX tidak dapat dipreview karena sheet pertama tidak ditemukan.'
      );
    }

    const [sheetXml] = await Promise.all([sheetFile.async('text')]);
    const sharedStrings = parseSharedStringsXml(sharedStringsXml);
    const rows = [];
    const rowRegex = /<(?:\w+:)?row\b[^>]*>[\s\S]*?<\/(?:\w+:)?row>/g;
    const cellRegex = /<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(sheetXml))) {
      const rowXml = rowMatch[0];
      const rowValues = [];
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowXml))) {
        const attrs = parseXmlAttributes(cellMatch[1]);
        const cellRef = attrs.r || '';
        const colLetters = (cellRef.match(/^[A-Z]+/i) || [''])[0];
        const columnIndex = colLetters ? columnLettersToIndex(colLetters) : rowValues.length;
        rowValues[Math.max(columnIndex, 0)] = parseXlsxCellValue(cellMatch[0], attrs, sharedStrings);
      }

      rows.push(rowValues.map((value) => value ?? ''));

      if (rows.length >= 250) break;
    }

    return {
      type: 'html',
      ext,
      fileName,
      sheetName: firstSheet.name,
      html: `${rowsToHtmlTable(rows)}${rows.length >= 250 ? '<p class="preview-note">Preview dibatasi 250 baris pertama.</p>' : ''}`,
      url: publicUrl,
    };
  } catch {
    return buildSpreadsheetUnsupportedPreview(
      ext,
      fileName,
      publicUrl,
      'File XLSX tidak dapat dipreview sebagai HTML. Silakan download file asli.'
    );
  }
}

function readFileSignature(absolutePath, length = 4) {
  try {
    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(absolutePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
    fs.closeSync(fd);
    return buffer.subarray(0, bytesRead);
  } catch {
    return Buffer.alloc(0);
  }
}

function isZipBasedSpreadsheet(absolutePath) {
  const signature = readFileSignature(absolutePath, 4);
  return signature[0] === 0x50 && signature[1] === 0x4b;
}

function isLikelyValidXlsxPackage(absolutePath) {
  if (!isZipBasedSpreadsheet(absolutePath)) return false;

  try {
    // XLSX is a ZIP/OpenXML package. A renamed ZIP, corrupted XLSX, or partially
    // uploaded file may still begin with PK but lack workbook entries. ExcelJS can
    // throw low-level errors in that condition, so reject it before parsing.
    const content = fs.readFileSync(absolutePath).toString('latin1');
    return (
      content.includes('[Content_Types].xml') &&
      content.includes('xl/workbook.xml')
    );
  } catch {
    return false;
  }
}

function buildSpreadsheetUnsupportedPreview(ext, fileName, publicUrl, detail = '') {
  const lowerExt = String(ext || '').toLowerCase();
  const defaultMessage = lowerExt === 'xlsx'
    ? 'File XLSX tidak dapat dipreview. File kemungkinan rusak, bukan format XLSX asli, atau dibuat dari format Excel lama. Silakan buka/download file asli atau unggah ulang sebagai XLSX/CSV yang valid.'
    : `Preview untuk format .${lowerExt || 'file'} belum tersedia.`;

  return {
    type: 'unsupported',
    ext: lowerExt,
    fileName,
    url: publicUrl,
    message: detail || defaultMessage,
  };
}

async function buildSpreadsheetPreview(absolutePath, ext, fileName, publicUrl = '') {
  if (ext === 'csv') {
    const content = fs.readFileSync(absolutePath, 'utf8');
    const rows = parseCsvText(content);

    return {
      type: 'html',
      ext,
      fileName,
      sheetName: 'CSV',
      html: rowsToHtmlTable(rows),
      url: publicUrl,
    };
  }

  if (!isLikelyValidXlsxPackage(absolutePath)) {
    return buildSpreadsheetUnsupportedPreview(
      ext,
      fileName,
      publicUrl,
      'File XLSX tidak dapat dipreview karena struktur workbook tidak valid. Silakan download file asli, buka di Microsoft Excel/LibreOffice, lalu simpan ulang sebagai .xlsx jika ingin dipreview di sistem.'
    );
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(absolutePath);
  } catch {
    return buildXlsxPreviewWithZipFallback(absolutePath, ext, fileName, publicUrl);
  }

  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return {
      type: 'html',
      ext,
      fileName,
      sheetName: '',
      html: '<p>Sheet kosong.</p>',
    };
  }

  const rows = [];

  sheet.eachRow({ includeEmpty: true }, (row) => {
    const rowValues = [];

    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      rowValues[columnNumber - 1] = normalizeCellValue(cell.value);
    });

    rows.push(rowValues);
  });

  return {
    type: 'html',
    ext,
    fileName,
    sheetName: sheet.name,
    html: rowsToHtmlTable(rows),
  };
}

async function previewWorksheetFile(rawPath = '') {
  const { absolutePath, publicUrl } = resolveWorksheetPath(rawPath);
  const ext = path.extname(absolutePath).replace('.', '').toLowerCase();
  const fileName = path.basename(absolutePath);

  if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return {
      type: 'direct',
      ext,
      fileName,
      url: publicUrl,
    };
  }

  if (['xlsx', 'csv'].includes(ext)) {
    return buildSpreadsheetPreview(absolutePath, ext, fileName, publicUrl);
  }

  if (ext === 'xls') {
    return {
      type: 'unsupported',
      ext,
      fileName,
      url: publicUrl,
      message: 'Preview XLS tidak lagi didukung. Silakan unggah ulang sebagai XLSX atau CSV.',
    };
  }

  if (ext === 'docx') {
    if (!mammoth) {
      return {
        type: 'unsupported',
        ext,
        fileName,
        url: publicUrl,
        message: 'Preview DOCX belum tersedia karena package mammoth belum terinstall.',
      };
    }

    return mammoth
      .convertToHtml({ path: absolutePath })
      .then((result) => ({
        type: 'html',
        ext,
        fileName,
        html: result.value || '<p>Dokumen kosong.</p>',
        url: publicUrl,
      }))
      .catch(() => ({
        type: 'unsupported',
        ext,
        fileName,
        url: publicUrl,
        message: 'File DOCX tidak dapat dipreview sebagai HTML. Silakan download file asli atau simpan ulang sebagai DOCX yang valid.',
      }));
  }

  if (['txt'].includes(ext)) {
    return {
      type: 'text',
      ext,
      fileName,
      content: fs.readFileSync(absolutePath, 'utf8'),
    };
  }

  return {
    type: 'unsupported',
    ext,
    fileName,
    url: publicUrl,
    message: `Preview untuk format .${ext || 'file'} belum didukung.`,
  };
}

module.exports = {
  previewWorksheetFile,
};