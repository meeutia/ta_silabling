const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Fppl, Pelanggan, FpplSampel, FpplParameterMetode, JenisSampel, RegBm, Parameter, ParameterMetode, Metode, Sampel, Invoice, } = require('../models/Associations');
const { buildInvoiceSummary } = require('./payment/payment-billing.service');
const { toCamelCaseDeep } = require('../utils/case-transform.util');
const Roles = require('../constants/roles');
const LOGO_SUMBAR_CANDIDATES = [
    path.join(__dirname, '../../public/assets/logos/logo-sumbar.jpg'),
];
const LOGO_SUMBAR_PATH = LOGO_SUMBAR_CANDIDATES.find((filePath) => fs.existsSync(filePath)) || null;
const PUBLIC_DIR = path.join(__dirname, '../../public');
const INVOICE_DIR = path.join(PUBLIC_DIR, 'invoices');

const sameFpplSampelComposite = (a = {}, b = {}) => {
    return String(a?.idRegistrasi || '').trim() === String(b?.idRegistrasi || '').trim() &&
        String(a?.idJenisSampel || '').trim() === String(b?.idJenisSampel || '').trim() &&
        String(a?.idRegBm || '').trim() === String(b?.idRegBm || '').trim();
};
const filterFpplSampelCompositeChildren = (row = {}) => {
    if (!row || typeof row !== 'object') {
        return row;
    }
    ['fpplParameterMetodes', 'sampels'].forEach((key) => {
        if (Array.isArray(row[key])) {
            row[key] = row[key].filter((child) => sameFpplSampelComposite(child, row));
        }
    });
    return row;
};
const normalizeRequestFpplSampelGraph = (requestData = {}) => {
    if (Array.isArray(requestData.fpplSampels)) {
        requestData.fpplSampels = requestData.fpplSampels.map(filterFpplSampelCompositeChildren);
    }
    return requestData;
};
class InvoicePdfService {
    constructor({ invoiceSummaryBuilder = buildInvoiceSummary } = {}) {
        this.invoiceSummaryBuilder = invoiceSummaryBuilder;
    }
    safeDrawImage = (doc, imagePath, x, y, options = {}) => {
        if (!imagePath || !fs.existsSync(imagePath))
            return false;
        try {
            doc.image(imagePath, x, y, options);
            return true;
        }
        catch (error) {
            console.warn(`Gagal memuat logo PDF: ${imagePath}`, error.message);
            return false;
        }
    };
    valueOrDash = (value) => {
        if (value === null || value === undefined || String(value).trim() === '') {
            return '-';
        }
        return String(value);
    };
    formatCurrency = (value) => {
        const number = Number(value || 0);
        return `Rp ${number.toLocaleString('id-ID')}`;
    };
    formatDateId = (value = new Date()) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '-';
        }
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };
    formatDateShortId = (value = new Date()) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '-';
        }
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    };
    getInvoiceStatusLabel = (invoice) => {
        const status = String(invoice?.status || invoice?.statusInvoice || '').trim();
        if (status === 'Lunas')
            return 'LUNAS';
        if (status === 'Bayar Nanti')
            return 'BAYAR NANTI';
        if (status === 'Menunggu Verifikasi')
            return 'MENUNGGU VERIFIKASI';
        if (status === 'Dibatalkan')
            return 'DIBATALKAN';
        return 'BELUM DIBAYAR';
    };
    getInvoiceStatusStyle = (label) => {
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
    };
    drawInvoiceStatusBadge = (doc, x, y, invoice) => {
        const label = this.getInvoiceStatusLabel(invoice);
        const style = this.getInvoiceStatusStyle(label);
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
    };
    safeFilename = (value) => {
        return String(value || 'invoice')
            .replace(/[\\/:"*?<>|]+/g, '-')
            .replace(/\s+/g, '-')
            .trim();
    };
    ensureInvoiceDir = () => {
        if (!fs.existsSync(INVOICE_DIR)) {
            fs.mkdirSync(INVOICE_DIR, { recursive: true });
        }
    };
    resolvePublicFilePath = (relativePath) => {
        if (!relativePath)
            return null;
        const normalized = String(relativePath).replace(/^\/+/, '');
        const cleanPath = normalized.replace(/^public[\/]/, '');
        return path.join(PUBLIC_DIR, cleanPath);
    };
    getInvoiceWithAccess = async (idRegistrasi, user = {}) => {
        const invoice = await Invoice.findOne({
            where: { id_registrasi: idRegistrasi },
        });
        if (!invoice) {
            const error = new Error('Invoice belum tersedia.');
            error.statusCode = 404;
            throw error;
        }
        const requestRecord = await Fppl.findByPk(idRegistrasi, {
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    attributes: ['id_pelanggan', 'nik'],
                },
            ],
        });
        if (!requestRecord) {
            const error = new Error('Permohonan tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }
        const requestJson = requestRecord.toJSON();
        const pelanggan = requestJson.pelanggan || requestJson.Pelanggan || null;
        const roleId = user?.id_role || user?.idRole;
        if (roleId === Roles.CUSTOMER && pelanggan?.nik !== user?.nik) {
            const error = new Error('Anda tidak memiliki akses ke invoice ini.');
            error.statusCode = 403;
            throw error;
        }
        return invoice;
    };
    getOrCreateInvoicePdf = async (requestId, user = {}) => {
        const invoice = await this.getInvoiceWithAccess(requestId, user);
        const savedPath = invoice.file_invoice_path;
        const absoluteSavedPath = this.resolvePublicFilePath(savedPath);
        if (absoluteSavedPath && fs.existsSync(absoluteSavedPath)) {
            return {
                buffer: fs.readFileSync(absoluteSavedPath),
                filename: path.basename(absoluteSavedPath),
            };
        }
        const { buffer, filename } = await this.generateInvoicePdf(requestId, user);
        this.ensureInvoiceDir();
        const safeName = this.safeFilename(filename || `invoice-${requestId}.pdf`);
        const finalFilename = safeName.toLowerCase().endsWith('.pdf')
            ? safeName
            : `${safeName}.pdf`;
        const absolutePath = path.join(INVOICE_DIR, finalFilename);
        const relativePath = `/invoices/${finalFilename}`;
        fs.writeFileSync(absolutePath, buffer);
        await invoice.update({
            file_invoice_path: relativePath,
        });
        return {
            buffer,
            filename: finalFilename,
        };
    };
    getChildRows = (parent, lowerKey, upperKey) => {
        return parent?.[lowerKey] || [];
    };
    getSampleType = (sample) => {
        return sample?.jenisSampel?.jenisSampel || sample?.jenisSampel || sample?.idJenisSampel || '-';
    };
    getRegBmLabel = (sample) => {
        const reg = sample?.regBm;
        if (!reg)
            return sample?.idRegBm || '-';
        const instansi = reg.instansi || '';
        const ref = reg.refReg || reg.idRegBm || '';
        return [instansi, ref].filter(Boolean).join(' - ') || '-';
    };
    loadInvoicePdfData = async (requestId, user) => {
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
                        'id_registrasi',
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
                                'id_registrasi',
                                'id_jenis_sampel',
                                'id_reg_bm',
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
                [{ model: FpplSampel, as: 'fppl_sampels' }, 'id_jenis_sampel', 'ASC'],
                [{ model: FpplSampel, as: 'fppl_sampels' }, 'id_reg_bm', 'ASC'],
                [{ model: FpplSampel, as: 'fppl_sampels' }, FpplParameterMetode, 'id_fppl_parameter_metode', 'ASC'],
            ]
        });
        if (!requestRecord) {
            const error = new Error('Permohonan tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }
        const requestJson = normalizeRequestFpplSampelGraph(toCamelCaseDeep(requestRecord.toJSON()));
        const pelanggan = requestJson.pelanggan || null;
        if ((user?.idRole === Roles.CUSTOMER || user?.id_role === Roles.CUSTOMER) && pelanggan?.nik !== user?.nik) {
            const error = new Error('Anda tidak memiliki akses ke invoice ini.');
            error.statusCode = 403;
            throw error;
        }
        const invoiceSummary = await this.invoiceSummaryBuilder(requestId);
        if (!invoiceSummary?.nomorInvoice) {
            const error = new Error('Invoice belum tersedia.');
            error.statusCode = 404;
            throw error;
        }
        const sampleRows = this.getChildRows(requestJson, 'fpplSampels');
        const noSampelList = sampleRows
            .flatMap((sample) => this.getChildRows(sample, 'sampels'))
            .map((sample) => sample.noSampel)
            .filter(Boolean);
        const rows = [];
        sampleRows.forEach((sample) => {
            const sampleType = this.getSampleType(sample);
            const regBmLabel = this.getRegBmLabel(sample);
            const jumlahSampel = Number(sample.jumlahSampel || 1) || 1;
            const fpmRows = this.getChildRows(sample, 'fpplParameterMetodes');
            fpmRows.forEach((fpm) => {
                const parameterName = fpm.parameter?.namaParameter ||
                    '-';
                const methodName = fpm.parameterMetode?.metode?.namaMetode || '-';
                const acuanMetode = fpm.parameterMetode?.acuanMetode || '';
                const parameterMetode = fpm.parameterMetode || null;
                const harga = Number(parameterMetode?.tarif || 0);
                const isSubkontrak = parameterMetode?.isSubkontrak === true ||
                    parameterMetode?.isSubkontrak === 1 ||
                    parameterMetode?.isSubkontrak === '1';
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
                    isInsitu: fpm.isInsitu === true ||
                        fpm.isInsitu === 1 ||
                        fpm.isInsitu === '1',
                    statusKemampuanLab: fpm.statusKemampuanLab || null,
                    catatanKemampuan: fpm.catatanKemampuan || null
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
    };
    drawTextCell = (doc, text, x, y, width, height, options = {}) => {
        doc
            .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(options.fontSize || 8)
            .fillColor(options.color || '#111111')
            .text(this.valueOrDash(text), x + 4, y + 5, {
            width: width - 8,
            height: height - 8,
            align: options.align || 'left',
            lineGap: options.lineGap || 0
        });
    };
    getInvoiceTableColumnWidths = () => {
        return [26, 86, 74, 96, 82, 50, 50, 51];
    };
    measureCellHeight = (doc, text, width, options = {}) => {
        const content = this.valueOrDash(text);
        const fontName = options.bold ? 'Helvetica-Bold' : 'Helvetica';
        const fontSize = options.fontSize || 7.4;
        const lineGap = options.lineGap || 0;
        doc.font(fontName).fontSize(fontSize);
        return Math.ceil(doc.heightOfString(content, {
            width: Math.max(10, width - 8),
            lineGap
        }) + 10);
    };
    drawTableHeader = (doc, x, y, widths) => {
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
            this.drawTextCell(doc, header, currentX, y, widths[idx], height, {
                bold: true,
                fontSize: 7.3,
                align: idx === 0 || idx >= 5 ? 'center' : 'left',
                lineGap: 0
            });
            currentX += widths[idx];
        });
        return height;
    };
    buildInvoiceRowValues = (row, index) => {
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
            noteLines.push(normalizedStatus.includes('TIDAK') || normalizedStatus.includes('SUBKON')
                ? 'Status Lab: Tidak Mampu / Subkontrak'
                : 'Status Lab: Mampu');
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
            this.formatCurrency(row.harga),
            this.formatCurrency(row.subtotal)
        ];
    };
    measureTableRowHeight = (doc, values, widths) => {
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
        const heights = values.map((value, idx) => this.measureCellHeight(doc, value, widths[idx], cellOptions[idx]));
        return Math.max(28, ...heights);
    };
    drawTableValuesRow = (doc, values, x, y, widths, rowHeight) => {
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
            this.drawTextCell(doc, value, currentX, y, widths[idx], rowHeight, cellOptions[idx]);
            currentX += widths[idx];
        });
        return rowHeight;
    };
    drawTableRow = (doc, row, index, x, y, widths) => {
        const values = this.buildInvoiceRowValues(row, index);
        const height = this.measureTableRowHeight(doc, values, widths);
        return this.drawTableValuesRow(doc, values, x, y, widths, height);
    };
    drawSamplingAndTotal = (doc, data, y) => {
        const tableX = 40;
        const labelX = tableX;
        const rightX = 420;
        const rightWidth = 95;
        const totalUji = data.rows.reduce((sum, row) => sum + Number(row.subtotal || 0), 0);
        const sampling = Number(data.invoice?.rincian?.biayaSampling || 0);
        const grandTotal = totalUji + sampling;
        const metodeSampling = this.valueOrDash(data.invoice?.rincian?.metodeSampling);
        const samplingLabel = metodeSampling && metodeSampling !== '-'
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
            .text(this.formatCurrency(totalUji), rightX, y, {
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
            .text(this.formatCurrency(sampling), rightX, y, {
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
            .text(this.formatCurrency(grandTotal), rightX, y, {
            width: rightWidth,
            align: 'right'
        });
        y += 28;
        return y;
    };
    drawFooterPageNumbers = (doc) => {
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
    };
    drawHeader = (doc, data) => {
        const { request, pelanggan, invoice, noSampelList } = data;
        this.safeDrawImage(doc, LOGO_SUMBAR_PATH, 48, 24, {
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
        const noFppl = request.nomorFppl || request.idRegistrasi || '-';
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
        doc.text(pelanggan?.namaInstansi || pelanggan?.pic || '-', valueX, startY + 36, {
            width: 170
        });
        doc.text('No. Invoice', 340, startY);
        doc.text(':', 410, startY);
        doc.text(invoice.nomorInvoice || '-', 420, startY, { width: 120 });
        doc.text('Tanggal', 340, startY + 18);
        doc.text(':', 410, startY + 18);
        doc.text(this.formatDateId(invoice.tanggalTerbit), 420, startY + 18, {
            width: 120
        });
        doc.text('Status', 340, startY + 38);
        doc.text(':', 410, startY + 38);
        this.drawInvoiceStatusBadge(doc, 420, startY + 34, invoice);
        return startY + 82;
    };
    drawSignature = (doc, y) => {
        const signatureY = Math.max(y + 18, 640);
        doc.font('Helvetica').fontSize(9).fillColor('#111111');
        doc.text(`Padang, ${this.formatDateShortId(new Date())}`, 355, signatureY, {
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
    };
    generatePdfBuffer = (data) => {
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
            let y = this.drawHeader(doc, data);
            const tableX = 40;
            const widths = this.getInvoiceTableColumnWidths();
            const tableBottomY = 760;
            y += this.drawTableHeader(doc, tableX, y, widths);
            data.rows.forEach((row, index) => {
                const values = this.buildInvoiceRowValues(row, index);
                const estimatedHeight = this.measureTableRowHeight(doc, values, widths);
                if (y + estimatedHeight > tableBottomY) {
                    doc.addPage();
                    y = 55;
                    y += this.drawTableHeader(doc, tableX, y, widths);
                }
                y += this.drawTableValuesRow(doc, values, tableX, y, widths, estimatedHeight);
            });
            const samplingBlockHeight = 112;
            if (y + samplingBlockHeight > tableBottomY) {
                doc.addPage();
                y = 55;
            }
            y = this.drawSamplingAndTotal(doc, data, y);
            if (y > 610) {
                doc.addPage();
                y = 55;
            }
            this.drawSignature(doc, y);
            this.drawFooterPageNumbers(doc);
            doc.end();
        });
    };
    generateInvoicePdf = async (requestId, user) => {
        const data = await this.loadInvoicePdfData(requestId, user);
        const buffer = await this.generatePdfBuffer(data);
        const filename = `${this.safeFilename(data.invoice.nomorInvoice || requestId)}-rincian-biaya.pdf`;
        return {
            buffer,
            filename
        };
    };
}
module.exports = new InvoicePdfService();
module.exports.InvoicePdfService = InvoicePdfService;
