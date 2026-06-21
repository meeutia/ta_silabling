const { buildEmailResponse } = require('../../templates/email/email-layout.template');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');
class NotificationFormatUtil {
safeString = (value) => {
        if (value === null || value === undefined)
            return '';
        return String(value);
    };
    normalizeFullSampleNo = (noSampel) => {
        return this.safeString(noSampel)
            .trim()
            .replace(/\s*\/\s*/g, '/');
    };
    dedupeSampleNos = (sampleNos = []) => {
        const seen = new Set();
        const result = [];
        (Array.isArray(sampleNos) ? sampleNos : [])
            .flatMap((item) => Array.isArray(item) ? item : this.safeString(item).split(/[\n,]+/))
            .map(this.normalizeFullSampleNo)
            .filter(Boolean)
            .forEach((value) => {
            if (seen.has(value))
                return;
            seen.add(value);
            result.push(value);
        });
        return result;
    };
    parseSampleNoForDisplay = (noSampel) => {
        const value = this.normalizeFullSampleNo(noSampel);
        const match = value.match(/^(\d+)(\/.+)$/);
        if (!match) {
            return { value, number: null, suffix: '' };
        }
        return {
            value,
            number: Number(match[1]),
            suffix: match[2],
        };
    };
    formatSampleNosForDisplay = (sampleNos = []) => {
        const parsed = this.dedupeSampleNos(sampleNos)
            .map(this.parseSampleNoForDisplay)
            .filter((item) => item.value)
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
        if (!parsed.length)
            return '-';
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
    dedupeTextValues = (values = []) => {
        const seen = new Set();
        const result = [];
        (Array.isArray(values) ? values : [])
            .map((item) => this.safeString(item).trim())
            .filter((item) => item && item !== '-')
            .forEach((value) => {
            const key = value.toLowerCase();
            if (seen.has(key))
                return;
            seen.add(key);
            result.push(value);
        });
        return result;
    };
    getSampleTypeLabel = (sample = {}) => {
        const data = toCamelCaseDeep(sample);
        return data.jenisSampel || data.namaJenisSampel || data.jenis || null;
    };
    formatSampleTypesForDisplay = (samples = [], fallback = '-') => {
        const values = this.dedupeTextValues((Array.isArray(samples) ? samples : []).map(this.getSampleTypeLabel));
        return values.length ? values.join(', ') : fallback;
    };
    buildKalabApprovalLink = (nomorLhu = '') => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const lhuNumber = this.safeString(nomorLhu).trim();
        return lhuNumber
            ? `${frontendUrl}/kalab/lhu/${encodeURIComponent(lhuNumber)}`
            : `${frontendUrl}/kalab/lhu`;
    };
    buildLhuNeedsKalabApprovalEmail = ({ penerima = {}, context = {}, nomorLhu = '', lhus = [] }) => {
        const data = toCamelCaseDeep(context);
        const recipient = toCamelCaseDeep(penerima);
        const { sample = {}, fppl = {}, pelanggan = {}, jenis = {} } = data;
        const contextSampleNos = Array.isArray(data.sampleNos) ? data.sampleNos.filter(Boolean) : [];
        const fallbackNomorSampel = sample.noSampel || '-';
        const nomorSampel = contextSampleNos.length ? this.formatSampleNosForDisplay(contextSampleNos) : fallbackNomorSampel;
        const totalSampel = data.totalSamples || contextSampleNos.length || (fallbackNomorSampel !== '-' ? 1 : 0);
        const nomorFppl = fppl.nomorFppl || fppl.idRegistrasi || data?.lhu?.idRegistrasi || '-';
        const namaPelanggan = pelanggan.namaInstansi || pelanggan.namaPelanggan || pelanggan.nama || '-';
        const jenisSampel = jenis.jenisSampel || this.formatSampleTypesForDisplay(data.samples || [], '-');
        const namaPenerima = recipient.namaPegawai || recipient.username || recipient.nik || 'Kepala Laboratorium';
        const lhuRows = Array.isArray(lhus) && lhus.length
            ? toCamelCaseDeep(lhus)
            : [{ nomorLhu, idRegistrasi: data?.lhu?.idRegistrasi, sampleNos: contextSampleNos, noSampel: nomorSampel }];
        const detailLink = this.buildKalabApprovalLink(nomorLhu || lhuRows[0]?.nomorLhu || '');
        const subject = lhuRows.length > 1
            ? `${lhuRows.length} LHU menunggu persetujuan Kepala Lab`
            : `LHU menunggu persetujuan Kepala Lab - ${nomorLhu || lhuRows[0]?.nomorLhu || '-'}`;
        const daftarLhu = lhuRows.map((row, index) => {
            const rowNomorLhu = row.nomorLhu || '-';
            const rowRegistrasi = row.idRegistrasi || '-';
            const rowSampleNoList = Array.isArray(row.sampleNos)
                ? row.sampleNos.filter(Boolean)
                : [row.noSampel || '-'];
            const rowSampleNos = this.formatSampleNosForDisplay(rowSampleNoList);
            const rowTotalSampel = row.totalSamples || this.dedupeSampleNos(rowSampleNoList).length || 0;
            const rowJenisSampel = row.jenisSampel || this.formatSampleTypesForDisplay(row.samples || [], '');
            const jenisInfo = rowJenisSampel ? ` | Jenis: ${rowJenisSampel}` : '';
            return `${index + 1}. ${rowNomorLhu} | ${rowRegistrasi} | ${rowTotalSampel} sampel: ${rowSampleNos || '-'}${jenisInfo}`;
        });
        const body = [
            `Yth. ${namaPenerima},`,
            '',
            'QC telah menyelesaikan finalisasi LHU dan mengirimkannya ke tahap persetujuan Kepala Laboratorium.',
            '',
            lhuRows.length > 1 ? 'Daftar LHU dalam rentang 20 menit terakhir:' : `Nomor LHU: ${nomorLhu || lhuRows[0]?.nomorLhu || '-'}`,
            ...(lhuRows.length > 1 ? daftarLhu : []),
            lhuRows.length > 1 ? null : `Total sampel: ${totalSampel}`,
            lhuRows.length > 1 ? null : `Nomor sampel: ${nomorSampel}`,
            lhuRows.length > 1 ? null : `Nomor FPPL: ${nomorFppl}`,
            lhuRows.length > 1 ? null : `Jenis sampel: ${jenisSampel}`,
            lhuRows.length > 1 ? null : `Pelanggan: ${namaPelanggan}`,
            '',
            detailLink ? `Buka detail: ${detailLink}` : null,
            'Silakan review PDF draft dan detail LHU pada sistem.',
            '',
            'Terima kasih.',
        ].filter(Boolean).join('\n');
        return buildEmailResponse({
            subject,
            body,
            title: subject,
            preheader: lhuRows.length > 1
                ? `${lhuRows.length} LHU menunggu persetujuan Kepala Lab.`
                : `LHU ${nomorLhu || lhuRows[0]?.nomorLhu || '-'} dengan ${totalSampel} sampel menunggu persetujuan Kepala Lab.`,
            actionUrl: detailLink,
            actionLabel: 'Review LHU',
        });
    };
    buildRequestLhusCompleteAdminEmail = ({ penerima = {}, context = {} }) => {
        const data = toCamelCaseDeep(context);
        const recipient = toCamelCaseDeep(penerima);
        const { fppl = {}, pelanggan = {}, lhuRows = [], totalSamples = 0, idRegistrasi = '', } = data;
        const nomorFppl = fppl.nomorFppl || fppl.idRegistrasi || idRegistrasi || '-';
        const namaPelanggan = pelanggan.namaInstansi || pelanggan.namaPelanggan || pelanggan.nama || '-';
        const namaPenerima = recipient.namaPegawai || recipient.username || recipient.nik || 'Admin';
        const detailLink = this.buildAdminLhuPickupScheduleLink(idRegistrasi || fppl.idRegistrasi || '');
        const subject = `Semua LHU permohonan sudah disahkan - ${nomorFppl}`;
        const daftarLhu = lhuRows.length
            ? lhuRows.map((row, index) => {
                const rowData = toCamelCaseDeep(row || {});
                const nomorLhu = rowData.nomorLhu || '-';
                const noSampel = rowData.noSampel || '-';
                return `${index + 1}. ${nomorLhu} (${noSampel})`;
            })
            : ['-'];
        const body = [
            `Yth. ${namaPenerima},`,
            '',
            'Seluruh LHU untuk satu permohonan pelanggan sudah disahkan oleh Kepala Laboratorium.',
            '',
            `Nomor permohonan : ${fppl.idRegistrasi || idRegistrasi || '-'}`,
            `Nomor FPPL       : ${nomorFppl}`,
            `Pelanggan        : ${namaPelanggan}`,
            `Total sampel     : ${totalSamples || lhuRows.length}`,
            `Total LHU        : ${lhuRows.length}`,
            '',
            'Daftar LHU:',
            ...daftarLhu,
            '',
            detailLink ? `Jadwalkan pengambilan LHU: ${detailLink}` : null,
            'Silakan lanjutkan proses administrasi/pengambilan LHU pada sistem.',
            '',
            'Terima kasih.',
        ].filter(Boolean).join('\n');
        return buildEmailResponse({
            subject,
            body,
            title: subject,
            preheader: `Semua LHU untuk ${nomorFppl} sudah disahkan.`,
            actionUrl: detailLink,
            actionLabel: 'Jadwalkan Pengambilan LHU',
        });
    };
    buildPenyeliaReviewLink = (idPenugasan, idPenugasanDetail = null) => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const penugasanId = this.safeString(idPenugasan).trim();
        const detailId = this.safeString(idPenugasanDetail).trim();
        if (!penugasanId) {
            return `${frontendUrl}/penyelia/penugasan`;
        }
        const params = new URLSearchParams({ idPenugasan: penugasanId });
        if (detailId)
            params.set('idPenugasanDetail', detailId);
        return `${frontendUrl}/penyelia/detail-penugasan?${params.toString()}`;
    };
    buildAnalisTestingLink = (idPenugasanDetail, idPenugasan = null) => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const detailId = this.safeString(idPenugasanDetail).trim();
        const penugasanId = this.safeString(idPenugasan).trim();
        if (!detailId) {
            return `${frontendUrl}/analis/sampel`;
        }
        const params = new URLSearchParams({ idPenugasanDetail: detailId });
        if (penugasanId)
            params.set('idPenugasan', penugasanId);
        return `${frontendUrl}/analis/detail_sampel?${params.toString()}`;
    };
    buildRequestDetailLink = (idRegistrasi) => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const registrasiId = this.safeString(idRegistrasi).trim();
        if (!registrasiId) {
            return frontendUrl;
        }
        return `${frontendUrl}/pelanggan/status/${encodeURIComponent(registrasiId)}`;
    };
    buildAdminRequestLink = (idRegistrasi) => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const registrasiId = this.safeString(idRegistrasi).trim();
        return registrasiId
            ? `${frontendUrl}/admin/permohonan/${encodeURIComponent(registrasiId)}`
            : `${frontendUrl}/admin/permohonan`;
    };
    buildAdminLhuPickupScheduleLink = (idRegistrasi) => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const registrasiId = this.safeString(idRegistrasi).trim();
        if (!registrasiId)
            return `${frontendUrl}/admin/permohonan`;
        const params = new URLSearchParams({
            tab: 'pengambilan',
            pickup: registrasiId,
        });
        return `${frontendUrl}/admin/permohonan?${params.toString()}`;
    };
    buildKasiMethodsLink = (idRegistrasi) => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const registrasiId = this.safeString(idRegistrasi).trim();
        return registrasiId
            ? `${frontendUrl}/kasi/permohonan/${encodeURIComponent(registrasiId)}`
            : `${frontendUrl}/kasi/permohonan`;
    };
    buildPenyeliaAssignmentLink = () => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        return frontendUrl ? `${frontendUrl}/penyelia/penugasan` : null;
    };
    buildKasiReviewLink = (noSampel = '') => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const sampleNo = this.safeString(noSampel).trim();
        if (!sampleNo)
            return `${frontendUrl}/kasi/lhu`;
        const params = new URLSearchParams({ noSampel: sampleNo });
        return `${frontendUrl}/kasi/lhu?${params.toString()}`;
    };
    buildQcVerificationLink = (nomorLhu = '') => {
        const frontendUrl = this.safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
            .trim()
            .replace(/\/+$/, '');
        if (!frontendUrl)
            return null;
        const lhuNumber = this.safeString(nomorLhu).trim();
        return lhuNumber
            ? `${frontendUrl}/qc/verifikasi/${encodeURIComponent(lhuNumber)}`
            : `${frontendUrl}/qc/verifikasi`;
    };
    buildKasiReviewApprovedToQcEmail = ({ penerima = {}, context = {} }) => {
        const data = toCamelCaseDeep(context);
        const recipient = toCamelCaseDeep(penerima);
        const { sample = {}, fppl = {}, pelanggan = {}, jenis = {}, lhu = {} } = data;
        const requestId = data.idRegistrasi || fppl.idRegistrasi || '-';
        const nomorFppl = fppl.nomorFppl || fppl.idRegistrasi || requestId;
        const namaPelanggan = pelanggan.namaInstansi || pelanggan.namaPelanggan || pelanggan.nama || '-';
        const namaPenerima = recipient.namaPegawai || recipient.username || recipient.nik || 'Pengendalian Mutu';
        const samples = Array.isArray(data.samples) ? data.samples : [];
        const sampleNos = Array.isArray(data.sampleNos)
            ? data.sampleNos.filter(Boolean)
            : [sample.noSampel].filter(Boolean);
        const nomorSampel = this.formatSampleNosForDisplay(sampleNos);
        const jenisSampel = samples.length
            ? this.formatSampleTypesForDisplay(samples, '-')
            : (jenis.jenisSampel || '-');
        const totalSampel = data.totalSamples || sampleNos.length || 1;
        const totalParameter = data.totalParameter || 0;
        const detailLink = this.buildQcVerificationLink(lhu.nomorLhu || '');
        const daftarSampel = samples.length
            ? samples.map((row, index) => {
                const sampleData = toCamelCaseDeep(row || {});
                const no = sampleData.noSampel || '-';
                const jenisRow = sampleData.jenisSampel || '-';
                const totalParam = sampleData.totalParameter || 0;
                return `${index + 1}. ${no} | ${jenisRow} | ${totalParam} parameter`;
            })
            : [`1. ${nomorSampel}`];
        const subject = `Permohonan menunggu verifikasi QC - ${nomorFppl}`;
        const body = [
            `Yth. ${namaPenerima},`,
            '',
            'Kasi Pengujian telah menyetujui seluruh hasil pengujian pada satu permohonan.',
            '',
            `Nomor permohonan : ${requestId}`,
            `Nomor FPPL       : ${nomorFppl}`,
            `Pelanggan        : ${namaPelanggan}`,
            `Jenis sampel     : ${jenisSampel}`,
            `Total sampel     : ${totalSampel}`,
            totalParameter ? `Total parameter  : ${totalParameter}` : null,
            '',
            'Daftar sampel:',
            ...daftarSampel,
            '',
            detailLink ? `Buka halaman QC: ${detailLink}` : null,
            'Silakan lakukan verifikasi Pengendalian Mutu dan finalisasi LHU pada sistem.',
            '',
            'Terima kasih.',
        ].filter(Boolean).join('\n');
        return buildEmailResponse({
            subject,
            body,
            title: subject,
            preheader: `Seluruh sampel pada permohonan ${nomorFppl} menunggu verifikasi Pengendalian Mutu.`,
            actionUrl: detailLink,
            actionLabel: 'Buka Verifikasi QC',
        });
    };
}
module.exports = new NotificationFormatUtil();
module.exports.NotificationFormatUtil = NotificationFormatUtil;
