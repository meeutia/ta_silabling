const fs = require('fs');
const OFFICIAL_SAMPLE_COLLECTOR_TEXT = 'Petugas Pengambil Sampel UPTD Labling DLH Provinsi Sumbar';
class LhuPdfFormatUtil {
ensureDir = (dirPath) => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    };
    safeFileName = (value) => {
        return String(value || '')
            .replace(/[\\/:"*?<>|]+/g, '-')
            .replace(/\s+/g, '-')
            .trim();
    };
    formatDateId = (value) => {
        if (!value)
            return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return '-';
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }).format(date);
    };
    valueOrDash = (value) => {
        if (value === null || value === undefined || String(value).trim() === '') {
            return '-';
        }
        return String(value);
    };
    getDisplayNoSampel = (noSampel) => {
        const value = String(noSampel || '').trim();
        if (!value)
            return '-';
        return value.split('/')[0] || value;
    };
    getFullNoSampel = (noSampel) => {
        const value = String(noSampel || '')
            .trim()
            .replace(/\s*\/\s*/g, '/');
        return value || '-';
    };
    cleanInlineText = (value) => {
        const text = String(value ?? '')
            .replace(/\r/g, '\n')
            .replace(/[^\S\n]+/g, ' ')
            .replace(/\n{2,}/g, '\n')
            .trim();
        if (!text || text === '-')
            return '';
        return text;
    };
    dedupeValues = (values = []) => {
        const seen = new Set();
        const result = [];
        (Array.isArray(values) ? values : []).forEach((value) => {
            const text = this.cleanInlineText(value);
            if (!text || seen.has(text))
                return;
            seen.add(text);
            result.push(text);
        });
        return result;
    };
    joinAlignedLines = (lines = []) => {
        const filtered = this.dedupeValues(lines);
        if (!filtered.length)
            return '-';
        return filtered.join('\n');
    };
    getSampleFieldNo = (row = {}) => {
        return this.getDisplayNoSampel(row.no_sampel || row.noSampel || row.noSampelLhu);
    };
    getSampleOrderValue = (row = {}, fallbackIndex = 0) => {
        const raw = row.urutan_sampel ?? row.urutanSampel ?? row.urutan_sample ?? row.urutanSample;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? value : fallbackIndex + 1;
    };
    sortRowsBySampleOrder = (rows = []) => {
        return (Array.isArray(rows) ? [...rows] : []).sort((a, b) => {
            const orderA = this.getSampleOrderValue(a, 0);
            const orderB = this.getSampleOrderValue(b, 0);
            if (orderA !== orderB)
                return orderA - orderB;
            return String(a.no_sampel || a.noSampel || '').localeCompare(String(b.no_sampel || b.noSampel || ''));
        });
    };
    parseSampleNumber = (noSampel) => {
        const value = this.getFullNoSampel(noSampel);
        if (!value || value === '-')
            return null;
        const match = value.match(/^(\d+)(\/.+)$/);
        if (!match) {
            return {
                value,
                number: null,
                suffix: '',
            };
        }
        return {
            value,
            number: Number(match[1]),
            suffix: match[2],
        };
    };
    sortSampleNumbers = (sampleNos = []) => {
        return this.dedupeValues(sampleNos)
            .map(this.parseSampleNumber)
            .filter(Boolean)
            .sort((a, b) => {
            if (a.suffix !== b.suffix)
                return a.suffix.localeCompare(b.suffix);
            if (Number.isFinite(a.number) && Number.isFinite(b.number))
                return a.number - b.number;
            if (Number.isFinite(a.number))
                return -1;
            if (Number.isFinite(b.number))
                return 1;
            return a.value.localeCompare(b.value);
        });
    };
    formatCompressedSampleNoList = (sampleNos = []) => {
        const parsed = this.sortSampleNumbers((Array.isArray(sampleNos) ? sampleNos : [])
            .map(this.getFullNoSampel)
            .filter((value) => value && value !== '-'));
        if (!parsed.length)
            return null;
        const grouped = new Map();
        const looseValues = [];
        parsed.forEach((item) => {
            if (!Number.isFinite(item.number) || !item.suffix) {
                looseValues.push(item.value);
                return;
            }
            const rows = grouped.get(item.suffix) || [];
            rows.push(item);
            grouped.set(item.suffix, rows);
        });
        const compressedGroups = Array.from(grouped.entries()).map(([suffix, rows]) => {
            const sortedRows = [...rows].sort((a, b) => a.number - b.number);
            const first = sortedRows[0];
            const last = sortedRows[sortedRows.length - 1];
            return sortedRows.length > 1
                ? `${first.number}-${last.number}${suffix}`
                : first.value;
        });
        return [...compressedGroups, ...looseValues].join(', ');
    };
    formatSampleNoList = (sampleRows = []) => {
        const sampleNos = this.sortRowsBySampleOrder(sampleRows)
            .map((row) => this.getFullNoSampel(row.no_sampel || row.noSampel))
            .filter((value) => value && value !== '-');
        return this.formatCompressedSampleNoList(sampleNos);
    };
    formatSampleFieldLines = (sampleRows = [], getter, fallbackValue = null, options = {}) => {
        const rows = Array.isArray(sampleRows) ? sampleRows : [];
        const { alwaysPrefix = false, repeatShared = false, assignFallbackByOrder = true } = options;
        const rowLines = rows
            .map((row) => {
            const sampleNo = this.getSampleFieldNo(row);
            const value = this.cleanInlineText(typeof getter === 'function' ? getter(row) : row?.[getter]);
            return value && value !== '-' && sampleNo !== '-' ? { sampleNo, value } : null;
        })
            .filter(Boolean);
        if (rowLines.length) {
            const uniqueValues = this.dedupeValues(rowLines.map((item) => item.value));
            const hasDifferentValues = uniqueValues.length > 1;
            if (alwaysPrefix || (rowLines.length > 1 && hasDifferentValues)) {
                return this.joinAlignedLines(rowLines.map((item) => `${item.sampleNo} : ${item.value}`));
            }
            return uniqueValues[0] || '-';
        }
        const fallbackRows = rows.length
            ? rows
            : this.dedupeValues(rows.map((row) => row.no_sampel || row.noSampel)).map((noSampel) => ({ no_sampel: noSampel }));
        const fallbackLines = String(fallbackValue || '')
            .replace(/\r/g, '\n')
            .split(/\n+|;+/)
            .map((line) => this.cleanInlineText(line))
            .filter(Boolean);
        if (!fallbackLines.length)
            return '-';
        if (fallbackRows.length > 1 && repeatShared && fallbackLines.length === 1) {
            return this.joinAlignedLines(fallbackRows.map((row) => `${this.getSampleFieldNo(row)} : ${fallbackLines[0]}`));
        }
        if (fallbackRows.length > 1 && assignFallbackByOrder && fallbackLines.length === fallbackRows.length) {
            return this.joinAlignedLines(fallbackRows.map((row, index) => `${this.getSampleFieldNo(row)} : ${fallbackLines[index]}`));
        }
        const uniqueFallbackLines = this.dedupeValues(fallbackLines);
        return uniqueFallbackLines.length > 1 ? this.joinAlignedLines(uniqueFallbackLines) : uniqueFallbackLines[0];
    };
    formatParameterDisplayName = (value) => {
        const raw = String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (!raw || raw === '-')
            return '-';
        const subscriptMap = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
        const normalized = raw.toUpperCase().replace(/[₀-₉]/g, (char) => subscriptMap[char] || char);
        if (/\bBOD\s*5\b/.test(normalized) || /BOD₅/i.test(raw))
            return 'BOD5';
        if (/\(\s*BOD\s*\)/i.test(raw) || /KEBUTUHAN OKSIGEN BIOKIMIAWI|BIOCHEMICAL OXYGEN DEMAND/.test(normalized))
            return 'BOD';
        if (/\(\s*COD\s*\)/i.test(raw) || /KEBUTUHAN OKSIGEN KIMIAWI|CHEMICAL OXYGEN DEMAND/.test(normalized))
            return 'COD';
        if (/\(\s*TSS\s*\)/i.test(raw) || /PADATAN TERSUSPENSI TOTAL|TOTAL SUSPENDED SOLID/.test(normalized))
            return 'TSS';
        if (/\(\s*TDS\s*\)/i.test(raw) || /PADATAN TERLARUT TOTAL|TOTAL DISSOLVED SOLID|TOTAL DISOLVE SOLID/.test(normalized))
            return 'TDS';
        if (/\(\s*DO\s*\)/i.test(raw) || /OKSIGEN TERLARUT|DISSOLVED OXYGEN/.test(normalized))
            return 'DO';
        if (/DERAJAT KEASAMAN|\(\s*PH\s*\)/i.test(raw))
            return 'pH';
        return raw;
    };
    normalizeBakuMutuForLhu = (value) => {
        const text = String(value ?? '').trim();
        if (!text || text === '-' || text === '(-)')
            return '(-)';
        return text;
    };
    isBakuMutuNotRequired = (value) => {
        return this.normalizeBakuMutuForLhu(value) === '(-)';
    };
    normalizeSampleTypeForLhu = (value) => {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text || text === '-')
            return null;
        const withoutDoubleAir = text.replace(/^air\s+air\s+/i, 'Air ');
        return /^air(\b|\s)/i.test(withoutDoubleAir) ? withoutDoubleAir : `Air ${withoutDoubleAir}`;
    };
    normalizeSampleCollectorForLhu = (value) => {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text || text === '-')
            return null;
        if (/^petugas$/i.test(text) || /petugas/i.test(text)) {
            return OFFICIAL_SAMPLE_COLLECTOR_TEXT;
        }
        return text;
    };
    getStatusText = (isFinal) => {
        return isFinal ? 'FINAL' : 'DRAFT - BELUM DISAHKAN';
    };
    calculateAccreditationStats = (details = []) => {
        const uniqueMap = new Map();
        (Array.isArray(details) ? details : []).forEach((row, index) => {
            const key = [
                row.id_fppl_parameter_metode,
                row.nama_parameter_snapshot,
                row.metode_snapshot,
                row.acuan_metode_snapshot,
            ].map((value) => String(value || '').trim()).join('|') || `row-${index}`;
            if (!uniqueMap.has(key))
                uniqueMap.set(key, row);
        });
        const uniqueRows = Array.from(uniqueMap.values());
        const totalParameter = uniqueRows.length;
        const totalTerakreditasi = uniqueRows.filter((row) => {
            const statusAkreditasi = String(row.status_akreditasi || '').toLowerCase();
            return (Number(row.is_terakreditasi || 0) === 1 ||
                Number(row.terakreditasi || 0) === 1 ||
                Number(row.is_metode_terakreditasi || 0) === 1 ||
                statusAkreditasi === 'terakreditasi');
        }).length;
        const persentase = totalParameter > 0
            ? Number(((totalTerakreditasi / totalParameter) * 100).toFixed(2))
            : 0;
        return {
            totalParameter,
            totalTerakreditasi,
            persentase,
            showLogoKan: persentase >= 60,
        };
    };
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
}
module.exports = new LhuPdfFormatUtil();
module.exports.LhuPdfFormatUtil = LhuPdfFormatUtil;
