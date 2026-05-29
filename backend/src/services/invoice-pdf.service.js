const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const {
  Fppl,
  Pelanggan,
  FpplSampel,
  FpplParameterMetode,
  JenisSampel,
  RegBm,
  Parameter,
  ParameterMetode,
  Metode,
  Sampel,
  
} = require('../models/Associations');

const PaymentService = require('./payment/payment.service');

const LOGO_SUMBAR_CANDIDATES = [
  path.join(__dirname, '../../public/assets/logos/logo-sumbar.jpg'),
];

const LOGO_SUMBAR_PATH =
  LOGO_SUMBAR_CANDIDATES.find((filePath) => fs.existsSync(filePath)) || null;

function safeDrawImage(doc, imagePath, x, y, options = {}) {
  if (!imagePath || !fs.existsSync(imagePath)) return false;

  try {
    doc.image(imagePath, x, y, options);
    return true;
  } catch (error) {
    console.warn(`Gagal memuat logo PDF: ${imagePath}`, error.message);
    return false;
  }
}
function valueOrDash(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '-';
  }

  return String(value);
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return `Rp ${number.toLocaleString('id-ID')}`;
}

function formatDateId(value = new Date()) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatDateShortId(value = new Date()) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function getInvoiceStatusLabel(invoice) {
  const status = String(invoice?.status || invoice?.status_invoice || '').trim();

  if (status === 'Lunas') return 'LUNAS';
  if (status === 'Bayar Nanti') return 'BAYAR NANTI';
  if (status === 'Menunggu Verifikasi') return 'MENUNGGU VERIFIKASI';
  if (status === 'Dibatalkan') return 'DIBATALKAN';

  return 'BELUM DIBAYAR';
}

function getInvoiceStatusStyle(label) {
  if (label === 'LUNAS') {
    return {
      bg: '#DCFCE7',
      border: '#16A34A',
      text: '#166534',
    };
  }

  if (label === 'BAYAR NANTI') {
    return {
      bg: '#F3E8FF',
      border: '#9333EA',
      text: '#6B21A8',
    };
  }

  if (label === 'MENUNGGU VERIFIKASI') {
    return {
      bg: '#FEF9C3',
      border: '#CA8A04',
      text: '#854D0E',
    };
  }

  if (label === 'DIBATALKAN') {
    return {
      bg: '#FEE2E2',
      border: '#DC2626',
      text: '#991B1B',
    };
  }

  return {
    bg: '#E0F2FE',
    border: '#0284C7',
    text: '#075985',
  };
}

function drawInvoiceStatusBadge(doc, x, y, invoice) {
  const label = getInvoiceStatusLabel(invoice);
  const style = getInvoiceStatusStyle(label);

  const width = label.length > 14 ? 126 : 88;
  const height = 20;

  doc
    .save()
    .roundedRect(x, y, width, height, 5)
    .fillAndStroke(style.bg, style.border)
    .restore();

  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(style.text)
    .text(label, x, y + 6, {
      width,
      align: 'center',
    });

  doc.fillColor('#111111');
}

function safeFilename(value) {
  return String(value || 'invoice')
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .trim();
}

function getChildRows(parent, lowerKey, upperKey) {
  return parent?.[lowerKey] || parent?.[upperKey] || [];
}

function getSampleType(sample) {
  return (
    sample?.jenis_sampel?.jenis_sampel ||
    sample?.JenisSampel?.jenis_sampel ||
    sample?.jenisSampel ||
    sample?.id_jenis_sampel ||
    '-'
  );
}

function getRegBmLabel(sample) {
  const reg = sample?.reg_bm || sample?.RegBm;

  if (!reg) return sample?.id_reg_bm || '-';

  const instansi = reg.instansi || '';
  const ref = reg.ref_reg || reg.refReg || reg.id_reg_bm || '';

  return [instansi, ref].filter(Boolean).join(' - ') || '-';
}

async function loadInvoicePdfData(requestId, user) {
  const requestRecord = await Fppl.findByPk(requestId, {
    include: [
      {
        model: Pelanggan,
        as: 'pelanggan',
        attributes: [
          'id_pelanggan',
          'nik',
          'nama_instansi',
          'pic',
          'no_telp',
          'alamat'
        ]
      },
      {
        model: FpplSampel,
        as: 'fppl_sampels',
        attributes: [
          'id_fppl_sampel',
          'id_jenis_sampel',
          'id_reg_bm',
          'jumlah_sampel'
        ],
        include: [
          {
            model: JenisSampel,
            attributes: ['id_jenis_sampel', 'jenis_sampel']
          },
          {
            model: RegBm,
            attributes: ['id_reg_bm', 'instansi', 'ref_reg']
          },
          {
            model: Sampel,
            as: 'sampels',
            attributes: ['no_sampel'],
            required: false
          },
          {
            model: FpplParameterMetode,
            attributes: [
              'id_fppl_parameter_metode',
              'id_parameter',
              'id_metode_parameter',
              'status_kemampuan_lab',
              'catatan_kemampuan',
              'is_insitu'
            ],
            include: [
              {
                model: Parameter,
                attributes: ['id_parameter', 'nama_parameter']
              },
              {
                model: ParameterMetode,
                required: false,
                attributes: [
                  'id_metode_parameter',
                  'tarif',
                  'acuan_metode',
                  'is_subkontrak'
                ],
                include: [
                  {
                    model: Metode,
                    attributes: ['id_metode', 'nama_metode']
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    order: [
      [{ model: FpplSampel, as: 'fppl_sampels' }, 'id_fppl_sampel', 'ASC'],
      [{ model: FpplSampel, as: 'fppl_sampels' }, FpplParameterMetode, 'id_fppl_parameter_metode', 'ASC'],
    ]
  });

  if (!requestRecord) {
    const error = new Error('Permohonan tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const requestJson = requestRecord.toJSON();
  const pelanggan = requestJson.pelanggan || requestJson.Pelanggan || null;

  if (user?.id_role === 'RL-001' && pelanggan?.nik !== user?.nik) {
    const error = new Error('Anda tidak memiliki akses ke invoice ini.');
    error.statusCode = 403;
    throw error;
  }

  const invoiceSummary = await PaymentService.buildInvoiceSummary(requestId);

  if (!invoiceSummary?.nomorInvoice) {
    const error = new Error('Invoice belum tersedia.');
    error.statusCode = 404;
    throw error;
  }

  const sampleRows = getChildRows(requestJson, 'fppl_sampels', 'FpplSampels');

  const noSampelList = sampleRows
    .flatMap((sample) => getChildRows(sample, 'sampels', 'sampels'))
    .map((sample) => sample.no_sampel)
    .filter(Boolean);

  const rows = [];

  sampleRows.forEach((sample) => {
    const sampleType = getSampleType(sample);
    const regBmLabel = getRegBmLabel(sample);
    const jumlahSampel = Number(sample.jumlah_sampel || 1) || 1;

    const fpmRows = getChildRows(
      sample,
      'fppl_parameter_metodes',
      'FpplParameterMetodes'
    );

    fpmRows.forEach((fpm) => {
      const parameterName =
        fpm.parameter?.nama_parameter ||
        fpm.Parameter?.nama_parameter ||
        '-';

      const methodName =
        fpm.parameter_metode?.metode?.nama_metode ||
        fpm.parameter_metode?.Metode?.nama_metode ||
        fpm.ParameterMetode?.metode?.nama_metode ||
        fpm.ParameterMetode?.Metode?.nama_metode ||
        '-';

      const acuanMetode =
        fpm.parameter_metode?.acuan_metode ||
        fpm.ParameterMetode?.acuan_metode ||
        '';

      const parameterMetode = fpm.parameter_metode || fpm.ParameterMetode || null;
      const harga = Number(parameterMetode?.tarif || 0);

      const isSubkontrak =
        parameterMetode?.is_subkontrak === true ||
        parameterMetode?.is_subkontrak === 1 ||
        parameterMetode?.is_subkontrak === '1';

      rows.push({
        sampleType,
        regBmLabel,
        parameterName,
        methodName,
        acuanMetode,
        jumlahSampel,
        harga,
        subtotal: harga * jumlahSampel,
        isSubkontrak,
        isInsitu:
          fpm.is_insitu === true ||
          fpm.is_insitu === 1 ||
          fpm.is_insitu === '1',
        statusKemampuanLab: fpm.status_kemampuan_lab || null,
        catatanKemampuan: fpm.catatan_kemampuan || null
      });
    });
  });

  return {
    request: requestJson,
    pelanggan,
    invoice: invoiceSummary,
    sampleRows,
    noSampelList,
    rows
  };
}

function drawTextCell(doc, text, x, y, width, height, options = {}) {
  doc
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.fontSize || 8)
    .fillColor(options.color || '#111111')
    .text(valueOrDash(text), x + 4, y + 5, {
      width: width - 8,
      height: height - 8,
      align: options.align || 'left',
      lineGap: options.lineGap || 0
    });
}

function getInvoiceTableColumnWidths() {
  return [26, 86, 74, 96, 82, 50, 50, 51];
}

function measureCellHeight(doc, text, width, options = {}) {
  const content = valueOrDash(text);
  const fontName = options.bold ? 'Helvetica-Bold' : 'Helvetica';
  const fontSize = options.fontSize || 7.4;
  const lineGap = options.lineGap || 0;

  doc.font(fontName).fontSize(fontSize);

  return Math.ceil(
    doc.heightOfString(content, {
      width: Math.max(10, width - 8),
      lineGap
    }) + 10
  );
}

function drawTableHeader(doc, x, y, widths) {
  const headers = [
    'No',
    'Jenis Matrik',
    'Parameter',
    'Metode',
    'Catatan',
    'Jumlah\nSampel',
    'Biaya',
    'Jumlah\nBiaya'
  ];

  let currentX = x;
  const height = 30;

  headers.forEach((header, idx) => {
    doc.rect(currentX, y, widths[idx], height).stroke();
    drawTextCell(doc, header, currentX, y, widths[idx], height, {
      bold: true,
      fontSize: 7.3,
      align: idx === 0 || idx >= 5 ? 'center' : 'left',
      lineGap: 0
    });
    currentX += widths[idx];
  });

  return height;
}

function buildInvoiceRowValues(row, index) {
  const methodLines = [];

  if (row.methodName && row.methodName !== '-') {
    methodLines.push(row.methodName);
  }

  if (row.acuanMetode) {
    methodLines.push(`Acuan: ${row.acuanMetode}`);
  }

  const noteLines = [];

  if (row.isSubkontrak) {
    noteLines.push('Subkontrak');
  }

  if (row.isInsitu) {
    noteLines.push('Insitu');
  }

  if (row.statusKemampuanLab) {
    const normalizedStatus = String(row.statusKemampuanLab).toUpperCase();
    noteLines.push(
      normalizedStatus.includes('TIDAK') || normalizedStatus.includes('SUBKON')
        ? 'Status Lab: Tidak Mampu / Subkontrak'
        : 'Status Lab: Mampu'
    );
  }

  if (row.catatanKemampuan) {
    noteLines.push(row.catatanKemampuan);
  }

  return [
    String(index + 1),
    row.sampleType,
    row.parameterName,
    methodLines.join('\n') || '-',
    noteLines.join('\n') || '-',
    String(row.jumlahSampel),
    formatCurrency(row.harga),
    formatCurrency(row.subtotal)
  ];
}

function measureTableRowHeight(doc, values, widths) {
  const cellOptions = [
    { fontSize: 7.2, align: 'center' },
    { fontSize: 7.1 },
    { fontSize: 7.3 },
    { fontSize: 6.8, lineGap: 0.4 },
    { fontSize: 6.8, lineGap: 0.4 },
    { fontSize: 7.2, align: 'center' },
    { fontSize: 7.1, align: 'right' },
    { fontSize: 7.1, align: 'right' }
  ];

  const heights = values.map((value, idx) =>
    measureCellHeight(doc, value, widths[idx], cellOptions[idx])
  );

  return Math.max(28, ...heights);
}

function drawTableValuesRow(doc, values, x, y, widths, rowHeight) {
  const cellOptions = [
    { fontSize: 7.2, align: 'center' },
    { fontSize: 7.1 },
    { fontSize: 7.3 },
    { fontSize: 6.8, lineGap: 0.4 },
    { fontSize: 6.8, lineGap: 0.4 },
    { fontSize: 7.2, align: 'center' },
    { fontSize: 7.1, align: 'right' },
    { fontSize: 7.1, align: 'right' }
  ];

  let currentX = x;

  values.forEach((value, idx) => {
    doc.rect(currentX, y, widths[idx], rowHeight).stroke();

    drawTextCell(doc, value, currentX, y, widths[idx], rowHeight, cellOptions[idx]);

    currentX += widths[idx];
  });

  return rowHeight;
}

function drawTableRow(doc, row, index, x, y, widths) {
  const values = buildInvoiceRowValues(row, index);
  const height = measureTableRowHeight(doc, values, widths);
  return drawTableValuesRow(doc, values, x, y, widths, height);
}


function drawSamplingAndTotal(doc, data, y) {
  const tableX = 40;
  const labelX = tableX;
  const rightX = 420;
  const rightWidth = 95;
  const totalUji = data.rows.reduce(
    (sum, row) => sum + Number(row.subtotal || 0),
    0
  );
  const sampling = Number(data.invoice?.rincian?.biayaSampling || 0);
  const grandTotal = totalUji + sampling;
  const metodeSampling = valueOrDash(data.invoice?.rincian?.metodeSampling);
  const samplingLabel =
    metodeSampling && metodeSampling !== '-'
      ? `Biaya Pengambilan Sampel ${metodeSampling}`
      : 'Biaya Pengambilan Sampel';

  y += 14;

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#111111')
    .text('Subtotal :', labelX, y);

  y += 18;

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#111111')
    .text('Biaya Pengujian', labelX, y, { width: 340 });

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(formatCurrency(totalUji), rightX, y, {
      width: rightWidth,
      align: 'right'
    });

  y += 18;

  const samplingTextHeight = doc
    .font('Helvetica')
    .fontSize(9)
    .heightOfString(samplingLabel, {
      width: 340,
      lineGap: 0
    });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#111111')
    .text(samplingLabel, labelX, y, { width: 340 });

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(formatCurrency(sampling), rightX, y, {
      width: rightWidth,
      align: 'right'
    });

  y += Math.max(18, Math.ceil(samplingTextHeight) + 4);

  y += 8;

  doc.moveTo(tableX, y).lineTo(555, y).stroke();

  y += 14;

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Total Tagihan', labelX, y);

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(formatCurrency(grandTotal), rightX, y, {
      width: rightWidth,
      align: 'right'
    });

  y += 28;

  return y;
}

function drawFooterPageNumbers(doc) {
  const pageRange = doc.bufferedPageRange();
  const pageCount = pageRange.count;

  for (let i = 0; i < pageCount; i += 1) {
    doc.switchToPage(pageRange.start + i);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#666666')
      .text(`Halaman ${i + 1} dari ${pageCount}`, 40, 790, {
        width: 515,
        align: 'right',
        lineBreak: false
      });

    doc.fillColor('#111111');
  }
}

function drawHeader(doc, data) {
  const { request, pelanggan, invoice, noSampelList } = data;

  safeDrawImage(doc, LOGO_SUMBAR_PATH, 48, 24, {
    width: 54,
  });

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#111111')
    .text('PEMERINTAH PROVINSI SUMATERA BARAT', 105, 30, {
      width: 430,
      align: 'center'
    });

  doc.fontSize(11).text('DINAS LINGKUNGAN HIDUP', 105, 46, {
    width: 430,
    align: 'center'
  });

  doc.fontSize(11).text('UPTD LABORATORIUM LINGKUNGAN', 105, 62, {
    width: 430,
    align: 'center'
  });

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .text('Regional Komplek Laboratorium Lingkungan Nomor 1 Padang', 105, 80, {
      width: 430,
      align: 'center'
    });

  doc.moveTo(40, 104).lineTo(555, 104).lineWidth(1).stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('Rincian Biaya Pengujian Laboratorium', 40, 122, {
      width: 515,
      align: 'center',
      underline: true
    });

  const startY = 156;
  const labelX = 55;
  const valueX = 150;

  const noFppl = request.nomor_fppl || request.id_registrasi || '-';
  const noSampelText = noSampelList.length > 0 ? noSampelList.join(', ') : '-';

  doc.font('Helvetica').fontSize(9);

  doc.text('No. FPPL', labelX, startY);
  doc.text(':', valueX - 10, startY);
  doc.text(noFppl, valueX, startY, { width: 170 });

  doc.text('No. Sampel', labelX, startY + 18);
  doc.text(':', valueX - 10, startY + 18);
  doc.text(noSampelText, valueX, startY + 18, { width: 170 });

  doc.text('Pelanggan', labelX, startY + 36);
  doc.text(':', valueX - 10, startY + 36);
  doc.text(pelanggan?.nama_instansi || pelanggan?.pic || '-', valueX, startY + 36, {
    width: 170
  });

  doc.text('No. Invoice', 340, startY);
  doc.text(':', 410, startY);
  doc.text(invoice.nomorInvoice || '-', 420, startY, { width: 120 });

  doc.text('Tanggal', 340, startY + 18);
  doc.text(':', 410, startY + 18);
  doc.text(formatDateId(invoice.tanggalTerbit), 420, startY + 18, {
    width: 120
  });

doc.text('Status', 340, startY + 38);
doc.text(':', 410, startY + 38);
drawInvoiceStatusBadge(doc, 420, startY + 34, invoice);

  return startY + 82;
}

function drawSignature(doc, y) {
  const signatureY = Math.max(y + 18, 640);

  doc.font('Helvetica').fontSize(9).fillColor('#111111');

  doc.text(`Padang, ${formatDateShortId(new Date())}`, 355, signatureY, {
    width: 170,
    align: 'center'
  });

  doc.text('Kepala Sub Bagian Tata Usaha', 55, signatureY + 28, {
    width: 190,
    align: 'center'
  });

  doc.text('Pengelola Sampel Pengujian', 340, signatureY + 28, {
    width: 190,
    align: 'center'
  });

  doc.text('(…………………………………)', 55, signatureY + 112, {
    width: 190,
    align: 'center'
  });

  doc.text('(…………………………………)', 340, signatureY + 112, {
    width: 190,
    align: 'center'
  });
}

function generatePdfBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true
    });

    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    let y = drawHeader(doc, data);

    const tableX = 40;
    const widths = getInvoiceTableColumnWidths();
    const tableBottomY = 760;

    y += drawTableHeader(doc, tableX, y, widths);

    data.rows.forEach((row, index) => {
      const values = buildInvoiceRowValues(row, index);
      const estimatedHeight = measureTableRowHeight(doc, values, widths);

      if (y + estimatedHeight > tableBottomY) {
        doc.addPage();
        y = 55;
        y += drawTableHeader(doc, tableX, y, widths);
      }

      y += drawTableValuesRow(doc, values, tableX, y, widths, estimatedHeight);
    });

    const samplingBlockHeight = 112;

    if (y + samplingBlockHeight > tableBottomY) {
      doc.addPage();
      y = 55;
    }

    y = drawSamplingAndTotal(doc, data, y);

    if (y > 610) {
      doc.addPage();
      y = 55;
    }

    drawSignature(doc, y);

    drawFooterPageNumbers(doc);

    doc.end();
  });
}

async function generateInvoicePdf(requestId, user) {
  const data = await loadInvoicePdfData(requestId, user);
  const buffer = await generatePdfBuffer(data);

  const filename = `${safeFilename(
    data.invoice.nomorInvoice || requestId
  )}-rincian-biaya.pdf`;

  return {
    buffer,
    filename
  };
}

module.exports = {
  generateInvoicePdf
};