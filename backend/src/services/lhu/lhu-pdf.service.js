const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const { getLhuPdfData } = require('./lhu-pdf-data.service');
const {
  ensureDir,
  safeFileName,
  formatDateId,
  valueOrDash,
  getDisplayNoSampel,
  normalizeBakuMutuForLhu,
  isBakuMutuNotRequired,
  normalizeSampleTypeForLhu,
  normalizeSampleCollectorForLhu,
  getStatusText,
  calculateAccreditationStats,
  safeDrawImage,
  sortRowsBySampleOrder,
} = require('./lhu-pdf-format.util');

const PUBLIC_DIR = path.join(__dirname, '../../../public');
const LHU_PUBLIC_DIR = path.join(PUBLIC_DIR, 'lhu');

const LOGO_DIR = path.join(PUBLIC_DIR, 'assets', 'logos');
const LOGO_KAN_PATH = path.join(LOGO_DIR, 'KAN-LP.png');
const LOGO_PROV_SUMBAR_PATH = path.join(LOGO_DIR, 'logo-sumbar.jpg');

const FONT_DIR = path.join(PUBLIC_DIR, 'assets', 'fonts');

const PDF_FONT = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
};


const LHU_PDF_OWNER_PASSWORD =
  process.env.LHU_PDF_OWNER_PASSWORD || 'SILABLING-LHU-OWNER-CHANGE-ME';

const LHU_PDF_PRINT_ONLY_OPTIONS = {
  ownerPassword: LHU_PDF_OWNER_PASSWORD,
  permissions: {
    printing: 'highResolution',
    modifying: false,
    copying: false,
    annotating: false,
    fillingForms: false,
    contentAccessibility: false,
    documentAssembly: false,
  },
};

const FONT_CANDIDATES = {
  regular: [
    process.env.LHU_FONT_REGULAR_PATH,
    path.join(FONT_DIR, 'CenturyGothic.ttf'),
    path.join(FONT_DIR, 'Century Gothic.ttf'),
    path.join(__dirname, '../../assets/fonts/CenturyGothic.ttf'),
    path.join(__dirname, '../../assets/fonts/Century Gothic.ttf'),
  ].filter(Boolean),
  bold: [
    process.env.LHU_FONT_BOLD_PATH,
    path.join(FONT_DIR, 'CenturyGothic-Bold.ttf'),
    path.join(FONT_DIR, 'CenturyGothicBold.ttf'),
    path.join(FONT_DIR, 'Century Gothic Bold.ttf'),
    path.join(__dirname, '../../assets/fonts/CenturyGothic-Bold.ttf'),
    path.join(__dirname, '../../assets/fonts/CenturyGothicBold.ttf'),
    path.join(__dirname, '../../assets/fonts/Century Gothic Bold.ttf'),
  ].filter(Boolean),
};

function findExistingFile(paths = []) {
  return paths.find((filePath) => filePath && fs.existsSync(filePath));
}

const PAGE_LEFT = 55;
const PAGE_RIGHT = 555;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT;

const TABLE_LEFT = PAGE_LEFT;
const TABLE_WIDTH = CONTENT_WIDTH;
const TABLE_HEADER_HEIGHT = 34;
const TABLE_LINE_WIDTH = 0.6;
const TABLE_HEADER_COLOR = '#d9ead3';
const TABLE_FONT_SIZE = 7;
const TABLE_CELL_PADDING_X = 5;
const TABLE_CELL_PADDING_Y = 5;
const TABLE_LINE_GAP = 1.1;

const NOTES_FONT_SIZE = 7.2;
const NOTES_LINE_GAP = 1;
const SIGNATURE_GAP = 12;
const SIGNATURE_HEIGHT = 104;
const PAGE_TOP_AFTER_BREAK = 60;
const NORMAL_BOTTOM_MARGIN = 48;
const HARD_BOTTOM_MARGIN = 25;

function registerFonts(doc) {
  const regularPath = findExistingFile(FONT_CANDIDATES.regular);
  const boldPath = findExistingFile(FONT_CANDIDATES.bold);

  if (regularPath) {
    doc.registerFont('CenturyGothic', regularPath);
    PDF_FONT.regular = 'CenturyGothic';
  } else {
    console.warn(
      '[LHU PDF] Font Century Gothic regular tidak ditemukan. ' +
        'Letakkan CenturyGothic.ttf di public/assets/fonts atau isi LHU_FONT_REGULAR_PATH.'
    );
  }

  if (boldPath) {
    doc.registerFont('CenturyGothic-Bold', boldPath);
    PDF_FONT.bold = 'CenturyGothic-Bold';
  } else if (regularPath) {
    PDF_FONT.bold = PDF_FONT.regular;
    console.warn(
      '[LHU PDF] Font Century Gothic bold tidak ditemukan. ' +
        'Letakkan CenturyGothic-Bold.ttf di public/assets/fonts atau isi LHU_FONT_BOLD_PATH.'
    );
  }
}

const LHU_FORM_NO = '7.8.2/F/LAB';

function drawHeader(doc, lhu, isFinal, accreditationStats = {}, options = {}) {
  const startY = 28;
  const logoSize = 58;
  const showLogoKan = Boolean(accreditationStats.showLogoKan);
  const includeDocumentHeader = options.includeDocumentHeader !== false;

  doc.fillColor('#111111');

  doc.font(PDF_FONT.regular).fontSize(7.5);
  doc.text(`No.Form ${LHU_FORM_NO}`, 430, startY, {
    width: 125,
    align: 'right',
  });


  safeDrawImage(doc, LOGO_PROV_SUMBAR_PATH, PAGE_LEFT, startY + 25, {
    fit: [logoSize, logoSize],
    align: 'center',
    valign: 'center',
  });

  if (showLogoKan) {
    safeDrawImage(doc, LOGO_KAN_PATH, 500, startY + 25, {
      fit: [logoSize, logoSize],
      align: 'center',
      valign: 'center',
    });
  }

  const headerX = 105;
  const headerY = startY + 25;
  const headerWidth = 385;

  doc.font(PDF_FONT.bold).fontSize(11).text(
    'PEMERINTAH PROVINSI SUMATERA BARAT',
    headerX,
    headerY,
    {
      width: headerWidth,
      align: 'center',
    }
  );

  doc.font(PDF_FONT.bold).fontSize(10.5).text(
    'DINAS LINGKUNGAN HIDUP',
    headerX,
    doc.y + 1,
    {
      width: headerWidth,
      align: 'center',
    }
  );

  doc.font(PDF_FONT.bold).fontSize(10.5).text(
    'UPTD LABORATORIUM LINGKUNGAN',
    headerX,
    doc.y + 1,
    {
      width: headerWidth,
      align: 'center',
    }
  );

  doc.font(PDF_FONT.regular).fontSize(7).text(
    'Registrasi Kompetensi Laboratorium Lingkungan Nomor : 00274/LP/R/ABLING-1/LK/KLH',
    headerX,
    doc.y + 3,
    {
      width: headerWidth,
      align: 'center',
    }
  );

  doc.fontSize(7).text(
    'Jl. Khatib Sulaiman No. 22 Telp. (0751) 7055231 - 446571 - 445154  Fax. (0751) 449232 Padang',
    headerX,
    doc.y + 1,
    {
      width: headerWidth,
      align: 'center',
    }
  );

  doc.fontSize(7).text(
    'Website: http://dlh.sumbarprov.go.id  Email: lablingprovsumabar@gmail.com',
    headerX,
    doc.y + 1,
    {
      width: headerWidth,
      align: 'center',
    }
  );

    const lineY = Math.max(doc.y + 8, startY + 25 + logoSize + 8);

    doc
      .lineWidth(1)
      .moveTo(PAGE_LEFT, lineY)
      .lineTo(PAGE_RIGHT, lineY)
      .stroke('#111111');

  let titleY = lineY + 17;

  doc.font(PDF_FONT.bold).fontSize(11).fillColor('#111111');
  doc.text('LAPORAN HASIL UJI', PAGE_LEFT, titleY, {
    width: CONTENT_WIDTH,
    align: 'center',
  });

  titleY = doc.y + 2;

  doc.font(PDF_FONT.regular).fontSize(9);
  doc.text(`Nomor : ${valueOrDash(lhu.nomor_lhu)}`, PAGE_LEFT, titleY, {
    width: CONTENT_WIDTH,
    align: 'center',
  });

  titleY = doc.y + 3;

  if (!isFinal) {
    doc.font(PDF_FONT.regular).fontSize(7.5).fillColor('#b45309');
    doc.text('DRAFT - BELUM DISAHKAN', PAGE_LEFT, titleY, {
      width: CONTENT_WIDTH,
      align: 'center',
    });
    doc.fillColor('#111111');
  }

  doc.y = doc.y + 10;
}

function drawDraftWatermark(doc, isFinal) {
  if (isFinal) return;

  doc.save();

  doc.rotate(-35, {
    origin: [300, 420],
  });

  doc
    .font(PDF_FONT.bold)
    .fontSize(54)
    .fillColor('#e5e7eb')
    .opacity(0.35)
    .text('DRAFT', 95, 390, {
      width: 420,
      align: 'center',
    });

  doc.restore();
  doc.opacity(1).fillColor('#111111');
}

function chunkArray(items = [], size = 4) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows.length ? rows : [[]];
}

function normalizeSampleKey(value) {
  return String(value || '').trim();
}

function buildParameterGroupKey(row = {}) {
  return [
    row.nama_parameter_snapshot,
    row.metode_snapshot,
    row.acuan_metode_snapshot,
    row.satuan_bm_snapshot,
    row.bm_snapshot,
  ].map((value) => String(value || '').trim()).join('|');
}

function buildParameterGroups(details = []) {
  const map = new Map();

  details.forEach((row) => {
    const key = buildParameterGroupKey(row);
    if (!map.has(key)) {
      map.set(key, {
        ...row,
        hasil_by_sample: {},
        samples: [],
      });
    }

    const group = map.get(key);
    const sampleNo = normalizeSampleKey(row.no_sampel);
    if (sampleNo) {
      group.hasil_by_sample[sampleNo] = row.hasil_snapshot;
      if (!group.samples.includes(sampleNo)) group.samples.push(sampleNo);
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    Number(a.urutan_lhu || 0) - Number(b.urutan_lhu || 0) ||
    String(a.nama_parameter_snapshot || '').localeCompare(String(b.nama_parameter_snapshot || ''))
  );
}

function getTableColumns(sampleChunk = []) {
  const sampleCount = Math.max(1, sampleChunk.length);
  const noWidth = 25;
  const parameterWidth = sampleCount >= 4 ? 105 : 125;
  const satuanWidth = 43;
  const bakuMutuWidth = 58;
  const acuanWidth = sampleCount >= 4 ? 112 : 130;
  const resultAreaWidth = TABLE_WIDTH - noWidth - parameterWidth - satuanWidth - bakuMutuWidth - acuanWidth;
  const hasilWidth = Math.floor(resultAreaWidth / sampleCount);

  let x = TABLE_LEFT;
  const columns = [
    { label: 'No', x, width: noWidth, align: 'center', type: 'no' },
  ];
  x += noWidth;
  columns.push({ label: 'Parameter', x, width: parameterWidth, align: 'left', type: 'parameter' });
  x += parameterWidth;

  sampleChunk.forEach((sampleNo) => {
    columns.push({ label: String(sampleNo), x, width: hasilWidth, align: 'center', type: 'hasil', sampleNo: String(sampleNo) });
    x += hasilWidth;
  });

  columns.push({ label: 'Satuan', x, width: satuanWidth, align: 'center', type: 'satuan' });
  x += satuanWidth;
  columns.push({ label: 'Baku Mutu', x, width: bakuMutuWidth, align: 'center', type: 'bakuMutu' });
  x += bakuMutuWidth;
  columns.push({ label: 'Acuan Metode', x, width: TABLE_LEFT + TABLE_WIDTH - x, align: 'center', type: 'acuan' });

  return columns;
}

function drawTableHeader(doc, y, sampleChunk = []) {
  const columns = getTableColumns(sampleChunk);
  const topHeight = 17;
  const bottomHeight = TABLE_HEADER_HEIGHT - topHeight;
  const resultColumns = columns.filter((col) => col.type === 'hasil');
  const firstResult = resultColumns[0];
  const resultWidth = resultColumns.reduce((total, col) => total + col.width, 0);

  doc.save();
  doc.lineWidth(TABLE_LINE_WIDTH).rect(TABLE_LEFT, y, TABLE_WIDTH, TABLE_HEADER_HEIGHT).fillAndStroke(TABLE_HEADER_COLOR, '#111111');
  doc.fillColor('#111111').font(PDF_FONT.bold).fontSize(7.1);

  columns.forEach((col) => {
    if (col.type === 'hasil') return;

    doc.text(col.label, col.x + 3, y + 11, {
      width: col.width - 6,
      align: col.align,
    });

    if (col.x > TABLE_LEFT) {
      doc.lineWidth(TABLE_LINE_WIDTH).moveTo(col.x, y).lineTo(col.x, y + TABLE_HEADER_HEIGHT).stroke('#111111');
    }
  });

  if (firstResult) {
    doc.lineWidth(TABLE_LINE_WIDTH).moveTo(firstResult.x, y).lineTo(firstResult.x, y + TABLE_HEADER_HEIGHT).stroke('#111111');
    doc.lineWidth(TABLE_LINE_WIDTH).moveTo(firstResult.x + resultWidth, y).lineTo(firstResult.x + resultWidth, y + TABLE_HEADER_HEIGHT).stroke('#111111');
    doc.lineWidth(TABLE_LINE_WIDTH).moveTo(firstResult.x, y + topHeight).lineTo(firstResult.x + resultWidth, y + topHeight).stroke('#111111');

    doc.text('Hasil', firstResult.x + 3, y + 4, {
      width: resultWidth - 6,
      align: 'center',
    });

    resultColumns.forEach((col, index) => {
      if (index > 0) {
        doc.lineWidth(TABLE_LINE_WIDTH).moveTo(col.x, y + topHeight).lineTo(col.x, y + TABLE_HEADER_HEIGHT).stroke('#111111');
      }

      doc.text(getDisplayNoSampel(col.label), col.x + 3, y + topHeight + 4, {
        width: col.width - 6,
        align: 'center',
      });
    });
  }

  doc.restore();
}

function getCellTextHeight(doc, text, width, align = 'left') {
  return doc.heightOfString(valueOrDash(text), {
    width: Math.max(10, width - TABLE_CELL_PADDING_X * 2),
    align,
    lineGap: TABLE_LINE_GAP,
  });
}

function getRowHeight(doc, row, sampleChunk = []) {
  const columns = getTableColumns(sampleChunk);
  doc.font(PDF_FONT.regular).fontSize(TABLE_FONT_SIZE);

  const values = columns.map((col) => {
    if (col.type === 'no') return { ...col, text: '' };
    if (col.type === 'parameter') return { ...col, text: buildParameterName(row) };
    if (col.type === 'hasil') return { ...col, text: valueOrDash(row.hasil_by_sample?.[col.sampleNo]) };
    if (col.type === 'satuan') return { ...col, text: valueOrDash(row.satuan_bm_snapshot) };
    if (col.type === 'bakuMutu') return { ...col, text: normalizeBakuMutuForLhu(row.bm_snapshot) };
    return { ...col, text: valueOrDash(row.acuan_metode_snapshot || row.metode_snapshot), align: 'left' };
  });

  const maxTextHeight = values.reduce((maxHeight, col) => Math.max(maxHeight, getCellTextHeight(doc, col.text, col.width, col.align)), 0);
  return Math.ceil(Math.max(22, maxTextHeight + TABLE_CELL_PADDING_Y * 2));
}

function buildParameterName(row = {}) {
  const nama = valueOrDash(row.nama_parameter_snapshot);
  const isTerakreditasi = Number(row.is_terakreditasi || row.isTerakreditasi || 0) === 1;
  const isInsitu = Number(row.is_insitu_snapshot || row.isInsituSnapshot || row.is_insitu || row.isInsitu || 0) === 1;
  const isSubkontrak = Number(row.is_subkontrak_snapshot || row.isSubkontrakSnapshot || row.is_subkontrak || row.isSubkontrak || 0) === 1;

  const symbols = [];
  if (isInsitu) symbols.push('√');
  if (!isTerakreditasi) symbols.push('*');
  if (isSubkontrak) symbols.push('**');

  return `${nama}${symbols.length ? ` ${symbols.join(' ')}` : ''}`;
}

function startContinuationPage(doc, lhu, isFinal, accreditationStats = {}) {
  doc.addPage();
  drawDraftWatermark(doc, isFinal);
  drawHeader(doc, lhu, isFinal, accreditationStats, { includeDocumentHeader: false });
}

function drawDetailTable(doc, details, isFinal, lhu = {}, accreditationStats = {}) {
  const sampleNos = (Array.isArray(lhu.sampleRows) && lhu.sampleRows.length)
    ? sortRowsBySampleOrder(lhu.sampleRows).map((row) => normalizeSampleKey(row.no_sampel)).filter(Boolean)
    : [...new Set(
        [...details]
          .sort((a, b) =>
            Number(a.urutan_sampel || 0) - Number(b.urutan_sampel || 0) ||
            String(a.no_sampel || '').localeCompare(String(b.no_sampel || ''))
          )
          .map((row) => normalizeSampleKey(row.no_sampel))
          .filter(Boolean)
      )];

  const sampleChunks = chunkArray(sampleNos, 4);
  const parameterGroups = buildParameterGroups(details);

  sampleChunks.forEach((sampleChunk, chunkIndex) => {
    let globalIndex = 1;
    if (chunkIndex > 0) {
      startContinuationPage(doc, lhu, isFinal, accreditationStats);
    }

    let y = doc.y;
    drawTableHeader(doc, y, sampleChunk);
    y += TABLE_HEADER_HEIGHT;
    doc.font(PDF_FONT.regular).fontSize(TABLE_FONT_SIZE);

    parameterGroups.forEach((row) => {
      const rowHeight = getRowHeight(doc, row, sampleChunk);
      if (y + rowHeight > 735) {
        startContinuationPage(doc, lhu, isFinal, accreditationStats);
        y = doc.y;
        drawTableHeader(doc, y, sampleChunk);
        y += TABLE_HEADER_HEIGHT;
      }

      const columns = getTableColumns(sampleChunk);
      const values = columns.map((col) => {
        if (col.type === 'no') return { ...col, text: String(globalIndex) };
        if (col.type === 'parameter') return { ...col, text: buildParameterName(row) };
        if (col.type === 'hasil') return { ...col, text: valueOrDash(row.hasil_by_sample?.[col.sampleNo]) };
        if (col.type === 'satuan') return { ...col, text: valueOrDash(row.satuan_bm_snapshot) };
        if (col.type === 'bakuMutu') return { ...col, text: normalizeBakuMutuForLhu(row.bm_snapshot) };
        return { ...col, text: valueOrDash(row.acuan_metode_snapshot || row.metode_snapshot), align: 'left' };
      });

      doc.lineWidth(TABLE_LINE_WIDTH).rect(TABLE_LEFT, y, TABLE_WIDTH, rowHeight).stroke('#111111');
      values.forEach((col) => {
        if (col.x > TABLE_LEFT) doc.lineWidth(TABLE_LINE_WIDTH).moveTo(col.x, y).lineTo(col.x, y + rowHeight).stroke('#111111');
        doc.fillColor('#111111').font(PDF_FONT.regular).fontSize(TABLE_FONT_SIZE).text(col.text, col.x + TABLE_CELL_PADDING_X, y + TABLE_CELL_PADDING_Y, {
          width: col.width - TABLE_CELL_PADDING_X * 2,
          align: col.align,
          lineGap: TABLE_LINE_GAP,
        });
      });

      y += rowHeight;
      globalIndex += 1;
    });

    doc.y = y + 10;
  });
}

function buildLhuNotes(lhu, details = [], isFinal, totalPages) {
  const bakuMutuText =
    lhu.standar_lhu ||
    lhu.teks_lhu ||
    [lhu.reg_bm_instansi, lhu.ref_reg].filter(Boolean).join(' - ') ||
    'paket baku mutu yang dipilih pada sistem';

  const hasNotRequiredBakuMutu = details.some((row) => isBakuMutuNotRequired(row.bm_snapshot));

  const hasBelumTerakreditasi = details.some(
    (row) => Number(row.is_terakreditasi || row.isTerakreditasi || 0) !== 1
  );

  const hasInsitu = details.some(
    (row) => Number(row.is_insitu_snapshot || row.isInsituSnapshot || row.is_insitu || row.isInsitu || 0) === 1
  );

  const hasSubkontrak = details.some(
    (row) => Number(row.is_subkontrak_snapshot || row.isSubkontrakSnapshot || row.is_subkontrak || row.isSubkontrak || 0) === 1
  );

  const notes = [
    `Baku Mutu berdasarkan ${bakuMutuText}.`,
    `LHU ini terdiri dari ${totalPages} (${numberToIndonesianText(totalPages)}) halaman;`,
  ];

  if (hasNotRequiredBakuMutu) {
    notes.push('Arti (-) pada kolom Baku Mutu di atas menyatakan bahwa, parameter tersebut tidak dipersyaratkan.');
  }

  if (hasInsitu) {
    notes.push('Arti √ menyatakan pengujian parameter tersebut dilakukan di lapangan (insitu);');
  }

  if (hasBelumTerakreditasi) {
    notes.push('Arti * menyatakan bahwa parameter belum terakreditasi;');
  }

  if (hasSubkontrak) {
    notes.push('Arti ** menyatakan bahwa pengujian parameter tersebut dilakukan di laboratorium Subkontraktor;');
  }

  notes.push(
    'Laboratorium melayani pengaduan maksimum 1 (satu) minggu terhitung dari tanggal penyerahan LHU;',
    'Keabsahan data pada laporan hasil penggandaan berada di luar tanggung jawab laboratorium.'
  );

  if (!isFinal) {
    notes.push('Dokumen ini adalah draft dan belum disahkan Kepala Lab.');
  }

  if (lhu.catatan_tambahan_lhu) {
    notes.push(lhu.catatan_tambahan_lhu);
  }

  return notes;
}

function numberToIndonesianText(value) {
  const number = Number(value || 0);

  const words = {
    1: 'satu',
    2: 'dua',
    3: 'tiga',
    4: 'empat',
    5: 'lima',
    6: 'enam',
    7: 'tujuh',
    8: 'delapan',
    9: 'sembilan',
    10: 'sepuluh',
  };

  return words[number] || String(number);
}

function getNormalBottomY(doc) {
  return doc.page.height - NORMAL_BOTTOM_MARGIN;
}

function getHardBottomY(doc) {
  return doc.page.height - HARD_BOTTOM_MARGIN;
}

function measureTextHeight(doc, text, width, fontSize = NOTES_FONT_SIZE, lineGap = NOTES_LINE_GAP) {
  doc.font(PDF_FONT.regular).fontSize(fontSize);

  return doc.heightOfString(valueOrDash(text), {
    width,
    lineGap,
  });
}

function measureNotesHeight(doc, lhu, details = [], isFinal, totalPages = 1) {
  const notes = buildLhuNotes(lhu, details, isFinal, totalPages);
  const sectionColonX = PAGE_LEFT + 92;
  const coordinateLabelX = PAGE_LEFT + 22;
  const coordinateColonX = sectionColonX;
  const coordinateValueX = coordinateColonX + 12;
  const coordinateValueWidth = PAGE_RIGHT - coordinateValueX;
  const coordinateText = valueOrDash(lhu.koordinat);

  let height = 0;

  // Keterangan Sampel intentionally only acts as a section header here.
  height += 12;
  height += Math.max(
    12,
    measureTextHeight(doc, coordinateText, coordinateValueWidth, 7.5, NOTES_LINE_GAP)
  );
  height += 6;
  height += 11;

  notes.forEach((note) => {
    height += Math.max(
      measureTextHeight(doc, note, CONTENT_WIDTH - 28),
      measureTextHeight(doc, '1.', 18)
    ) + 2;
  });

  return Math.ceil(height + 4);
}

function drawNotes(doc, lhu, details = [], isFinal, totalPages = 1) {
  let y = doc.y;
  const sectionColonX = PAGE_LEFT + 92;
  const coordinateLabelX = PAGE_LEFT + 22;
  const coordinateColonX = sectionColonX;
  const coordinateValueX = coordinateColonX + 12;
  const coordinateValueWidth = PAGE_RIGHT - coordinateValueX;
  const coordinateText = valueOrDash(lhu.koordinat);

  doc.font(PDF_FONT.regular).fontSize(7.5).fillColor('#111111');
  doc.text('Keterangan Sampel', PAGE_LEFT, y);
  doc.text(':', sectionColonX, y);
  y += 12;

  const coordinateHeight = Math.max(
    12,
    doc.heightOfString(coordinateText, {
      width: coordinateValueWidth,
      lineGap: NOTES_LINE_GAP,
    })
  );

  doc.text('Titik Koordinat', coordinateLabelX, y, { width: coordinateColonX - coordinateLabelX - 4 });
  doc.text(':', coordinateColonX, y, { width: 8, align: 'center' });
  doc.text(coordinateText, coordinateValueX, y, {
    width: coordinateValueWidth,
    lineGap: NOTES_LINE_GAP,
  });

  y += coordinateHeight + 6;

  doc.font(PDF_FONT.bold).fontSize(7.5).fillColor('#111111').text('Catatan:', PAGE_LEFT, y);
  y += 11;

  const notes = buildLhuNotes(lhu, details, isFinal, totalPages);
  doc.font(PDF_FONT.regular).fontSize(NOTES_FONT_SIZE);

  notes.forEach((note, index) => {
    const noteHeight = Math.max(
      doc.heightOfString(`${index + 1}.`, { width: 18, lineGap: NOTES_LINE_GAP }),
      doc.heightOfString(note, { width: CONTENT_WIDTH - 28, align: 'left', lineGap: NOTES_LINE_GAP })
    );

    doc.text(`${index + 1}.`, PAGE_LEFT + 8, y, { width: 18, lineGap: NOTES_LINE_GAP });
    doc.text(note, PAGE_LEFT + 28, y, { width: CONTENT_WIDTH - 28, align: 'left', lineGap: NOTES_LINE_GAP });
    y += noteHeight + 2;
  });

  doc.y = y + 4;
}

function drawSignature(doc, lhu, isFinal, y) {
  const x = 360;

  doc.font(PDF_FONT.regular).fontSize(8).fillColor('#111111');
  doc.text(`Padang, ${isFinal ? formatDateId(lhu.tanggal_penerbitan || lhu.kalab_at) : '-'}`, x, y, {
    width: 180,
    align: 'center',
  });

  doc.text('Kepala UPTD Laboratorium Lingkungan,', x, y + 14, {
    width: 180,
    align: 'center',
  });

  doc.font(PDF_FONT.regular).fontSize(7).fillColor(isFinal ? '#111111' : '#b45309');
  doc.text(isFinal ? '' : '(Draft belum disahkan)', x, y + 52, {
    width: 180,
    align: 'center',
  });

  doc.fillColor('#111111');
  doc.font(PDF_FONT.bold).fontSize(8);
  doc.text(valueOrDash(lhu.kalab_nama || '-'), x, y + 75, {
    width: 180,
    align: 'center',
  });

  doc.font(PDF_FONT.regular).fontSize(7.5);
  doc.text(`NIP.${valueOrDash(lhu.kalab_nip)}`, x, y + 87, {
    width: 180,
    align: 'center',
  });

  doc.y = y + SIGNATURE_HEIGHT;
}

function drawClosingSection(doc, lhu, details = [], isFinal) {
  const pageCountBeforeClosing = doc.bufferedPageRange().count;
  let totalPages = pageCountBeforeClosing;
  let notesHeight = measureNotesHeight(doc, lhu, details, isFinal, totalPages);
  let requiredHeight = notesHeight + SIGNATURE_GAP + SIGNATURE_HEIGHT + 8;

  if (doc.y + requiredHeight > getHardBottomY(doc)) {
    doc.addPage();
    drawDraftWatermark(doc, isFinal);
    drawHeader(doc, lhu, isFinal, calculateAccreditationStats(details), { includeDocumentHeader: false });

    totalPages = pageCountBeforeClosing + 1;
    notesHeight = measureNotesHeight(doc, lhu, details, isFinal, totalPages);
    requiredHeight = notesHeight + SIGNATURE_GAP + SIGNATURE_HEIGHT + 8;
  }

  drawNotes(doc, lhu, details, isFinal, totalPages);

  let signatureY = doc.y + SIGNATURE_GAP;

  if (signatureY + SIGNATURE_HEIGHT > getNormalBottomY(doc)) {
    signatureY = Math.max(doc.y + 6, getHardBottomY(doc) - SIGNATURE_HEIGHT);
  }

  if (signatureY + SIGNATURE_HEIGHT > getHardBottomY(doc)) {
    signatureY = doc.y + 6;
  }

  drawSignature(doc, lhu, isFinal, signatureY);
}

function drawInfoSection(doc, lhu) {
  const rows = [
    { label: 'Nama Pelanggan', value: lhu.nama_pelanggan },
    { label: 'Alamat', value: lhu.alamat_pelanggan },
    { label: 'Tlp/Fax', value: lhu.telp_pelanggan },
    { label: 'Personal yang dihubungi', value: lhu.pic_pelanggan },
    { label: 'Jenis Sampel', value: normalizeSampleTypeForLhu(lhu.jenis_sampel) },
    { label: 'Pengambil Sampel', value: normalizeSampleCollectorForLhu(lhu.jenis_pengambilan_sampel) },
    { label: 'No. FPPL', value: lhu.nomor_fppl },
    { label: 'No. Sampel', value: lhu.no_sampel },
    { label: 'Tanggal Pengambilan Sampel', value: formatDateId(lhu.tanggal_pengambilan_sampel) },
    { label: 'Tanggal Penerimaan Sampel', value: formatDateId(lhu.tanggal_penerimaan) },
    { label: 'Abnormalitas Sampel', value: lhu.abnormalitas_sampel },
    { label: 'Lokasi Pengambilan Sampel', value: lhu.lokasi_pengambilan_sampel },
    { label: 'Acuan SNI Sampel', value: lhu.acuan_pengambilan_sampel },
  ];

  let y = doc.y;
  const startX = PAGE_LEFT;
  const noX = startX;
  const labelX = startX + 22;
  const colonX = startX + 178;
  const valueX = startX + 191;
  const valueWidth = PAGE_RIGHT - valueX;
  const lineGap = 1.2;
  const minRowHeight = 11.5;

  doc.font(PDF_FONT.regular).fontSize(8).fillColor('#111111');

  rows.forEach(({ label, value }, index) => {
    const textValue = valueOrDash(value);
    const valueOptions = {
      width: valueWidth,
      lineGap,
    };
    const valueHeight = Math.max(minRowHeight, doc.heightOfString(textValue, valueOptions));

    doc.font(PDF_FONT.regular).fontSize(8).text(`${index + 1}.`, noX, y, { width: 18 });
    doc.text(label, labelX, y, { width: colonX - labelX - 4 });
    doc.text(':', colonX, y, { width: 8, align: 'center' });
    doc.text(textValue, valueX, y, valueOptions);

    y += Math.max(minRowHeight, valueHeight + 1.2);
  });

  doc.y = y + 6;
}


async function generateLhuPdf(nomorLhu, options = {}) {
  const { mode = 'draft', transaction = null } = options;
  const isFinal = mode === 'final';

  const { lhu, details } = await getLhuPdfData(nomorLhu, transaction);
  const accreditationStats = calculateAccreditationStats(details);

  const targetFolder = isFinal ? 'final' : 'draft';
  const outputDir = path.join(LHU_PUBLIC_DIR, targetFolder);
  ensureDir(outputDir);

  const fileName = `${safeFileName(nomorLhu)}-${targetFolder}.pdf`;
  const absolutePath = path.join(outputDir, fileName);
  const publicPath = `/lhu/${targetFolder}/${fileName}`;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      ...LHU_PDF_PRINT_ONLY_OPTIONS,
      info: {
        Title: `LHU ${nomorLhu}`,
        Author: 'SILABLING',
        Subject: isFinal ? 'LHU Final' : 'Draft LHU',
      },
    });
    registerFonts(doc);

    const stream = fs.createWriteStream(absolutePath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(stream);

    drawDraftWatermark(doc, isFinal);
    drawHeader(doc, lhu, isFinal, accreditationStats, { includeDocumentHeader: false });
    drawInfoSection(doc, lhu);
    drawDetailTable(doc, details, isFinal, lhu, accreditationStats);

    drawClosingSection(doc, lhu, details, isFinal);

    doc.end();
  });

  return {
    filePath: publicPath,
    absolutePath,
  };
}

async function generateDraftLhuPdf(nomorLhu, transaction = null) {
  return generateLhuPdf(nomorLhu, {
    mode: 'draft',
    transaction,
  });
}

async function generateFinalLhuPdf(nomorLhu, transaction = null) {
  return generateLhuPdf(nomorLhu, {
    mode: 'final',
    transaction,
  });
}

module.exports = {
  generateDraftLhuPdf,
  generateFinalLhuPdf,
};
