const { buildEmailResponse } = require('../../templates/email/email-layout.template');
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
        return (sample.jenis_sampel ||
            sample.jenisSampel ||
            sample.nama_jenis_sampel ||
            sample.namaJenisSampel ||
            sample.jenis ||
            null);
    };
    formatSampleTypesForDisplay = (samples = [], fallback = '-') => {
        const values = this.dedupeTextValues((Array.isArray(samples) ? samples : []).map(this.getSampleTypeLabel));
        return values.length ? values.join(', ') : fallback;
    };
    buildTestResultRevisionByQcEmail = ({ analis, noSampel, catatanRevisi, items = [], testingLink = null, }) => {
        const namaAnalis = analis?.username || analis?.nama_pegawai || analis?.nik || 'Analis';
        const subject = `Revisi Hasil Pengujian dari QC - ${noSampel}`;
        const daftarParameter = items.length
            ? items
                .map((item, index) => {
                const parameter = item.nama_parameter || item.namaParameter || '-';
                const metode = item.acuan_metode || item.acuanMetode || item.nama_metode || item.namaMetode || '-';
                return `${index + 1}. ${parameter}\n   Metode: ${metode}`;
            })
                .join('\n')
            : '-';
        const body = [
            `Yth. ${namaAnalis},`,
            '',
            `Pengendalian Mutu meminta revisi hasil pengujian untuk sampel ${noSampel}.`,
            '',
            'Parameter/metode yang perlu direvisi:',
            daftarParameter,
            '',
            'Catatan revisi:',
            catatanRevisi || '-',
            '',
            `Link ke halaman pengujian: ${testingLink || '-'}`,
            '',
            'Mohon segera melakukan perbaikan hasil pengujian/LKA pada sistem.',
            '',
            'Terima kasih.',
        ].join('\n');
        return buildEmailResponse({
            subject,
            body,
            title: subject,
            preheader: `Revisi hasil pengujian untuk sampel ${noSampel}.`,
            actionUrl: testingLink,
            actionLabel: 'Buka Tugas Pengujian',
        });
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
    buildKasiReviewApprovedEmail = ({ penerima = {}, context = {} }) => {
        const { sample = {}, fppl = {}, pelanggan = {}, jenis = {}, lhu = {} } = context;
        const nomorSampel = sample.no_sampel || '-';
        const nomorFppl = fppl.nomor_fppl || fppl.id_registrasi || '-';
        const nomorLhu = lhu.nomor_lhu || '-';
        const namaPelanggan = pelanggan.nama_instansi || pelanggan.nama_pelanggan || '-';
        const jenisSampel = jenis.jenis_sampel || '-';
        const namaPenerima = penerima.nama_pegawai || penerima.username || penerima.nik || 'Kepala Laboratorium';
        const detailLink = this.buildKalabApprovalLink(lhu.nomor_lhu || '');
        const subject = `Hasil sampel disetujui Kasi - ${nomorSampel}`;
        const body = [
            `Yth. ${namaPenerima},`,
            '',
            'Hasil pengujian sampel sudah disetujui oleh Kasi Pengujian.',
            '',
            `Nomor sampel: ${nomorSampel}`,
            `Nomor FPPL: ${nomorFppl}`,
            `Jenis sampel: ${jenisSampel}`,
            `Pelanggan: ${namaPelanggan}`,
            nomorLhu !== '-' ? `Nomor LHU: ${nomorLhu}` : null,
            '',
            detailLink ? `Buka halaman Kepala Lab: ${detailLink}` : null,
            'Silakan cek antrean LHU pada sistem.',
            '',
            'Terima kasih.',
        ].filter(Boolean).join('\n');
        return buildEmailResponse({
            subject,
            body,
            title: subject,
            preheader: `Sampel ${nomorSampel} sudah disetujui Kasi Pengujian.`,
            actionUrl: detailLink,
            actionLabel: 'Buka Antrean LHU',
        });
    };
    buildLhuNeedsKalabApprovalEmail = ({ penerima = {}, context = {}, nomorLhu = '', lhus = [] }) => {
        const { sample = {}, fppl = {}, pelanggan = {}, jenis = {} } = context;
        const contextSampleNos = Array.isArray(context.sample_nos || context.sampleNos)
            ? (context.sample_nos || context.sampleNos).filter(Boolean)
            : [];
        const fallbackNomorSampel = sample.no_sampel || sample.noSampel || '-';
        const nomorSampel = contextSampleNos.length ? this.formatSampleNosForDisplay(contextSampleNos) : fallbackNomorSampel;
        const totalSampel = context.total_sampel || context.totalSamples || contextSampleNos.length || (fallbackNomorSampel !== '-' ? 1 : 0);
        const nomorFppl = fppl.nomor_fppl || fppl.nomorFppl || fppl.id_registrasi || context?.lhu?.id_registrasi || '-';
        const namaPelanggan = pelanggan.nama_instansi || pelanggan.nama_pelanggan || pelanggan.nama || '-';
        const jenisSampel = jenis.jenis_sampel || jenis.jenisSampel || this.formatSampleTypesForDisplay(context.samples || [], '-');
        const namaPenerima = penerima.nama_pegawai || penerima.username || penerima.nik || 'Kepala Laboratorium';
        const lhuRows = Array.isArray(lhus) && lhus.length
            ? lhus
            : [{ nomor_lhu: nomorLhu, id_registrasi: context?.lhu?.id_registrasi, sample_nos: contextSampleNos, no_sampel: nomorSampel }];
        const detailLink = this.buildKalabApprovalLink(nomorLhu || lhuRows[0]?.nomor_lhu || '');
        const subject = lhuRows.length > 1
            ? `${lhuRows.length} LHU menunggu persetujuan Kepala Lab`
            : `LHU menunggu persetujuan Kepala Lab - ${nomorLhu || lhuRows[0]?.nomor_lhu || '-'}`;
        const daftarLhu = lhuRows.map((row, index) => {
            const rowNomorLhu = row.nomor_lhu || row.nomorLhu || '-';
            const rowRegistrasi = row.id_registrasi || row.idRegistrasi || '-';
            const rowSampleNoList = Array.isArray(row.sample_nos || row.sampleNos)
                ? (row.sample_nos || row.sampleNos).filter(Boolean)
                : [row.no_sampel || row.noSampel || '-'];
            const rowSampleNos = this.formatSampleNosForDisplay(rowSampleNoList);
            const rowTotalSampel = row.total_sampel || row.totalSamples || this.dedupeSampleNos(rowSampleNoList).length || 0;
            const rowJenisSampel = row.jenis_sampel || row.jenisSampel || this.formatSampleTypesForDisplay(row.samples || [], '');
            const jenisInfo = rowJenisSampel ? ` | Jenis: ${rowJenisSampel}` : '';
            return `${index + 1}. ${rowNomorLhu} | ${rowRegistrasi} | ${rowTotalSampel} sampel: ${rowSampleNos || '-'}${jenisInfo}`;
        });
        const body = [
            `Yth. ${namaPenerima},`,
            '',
            'QC telah menyelesaikan finalisasi LHU dan mengirimkannya ke tahap persetujuan Kepala Laboratorium.',
            '',
            lhuRows.length > 1 ? 'Daftar LHU dalam rentang 20 menit terakhir:' : `Nomor LHU: ${nomorLhu || lhuRows[0]?.nomor_lhu || '-'}`,
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
                : `LHU ${nomorLhu || lhuRows[0]?.nomor_lhu || '-'} dengan ${totalSampel} sampel menunggu persetujuan Kepala Lab.`,
            actionUrl: detailLink,
            actionLabel: 'Review LHU',
        });
    };
    buildRequestLhusCompleteAdminEmail = ({ penerima = {}, context = {} }) => {
        const { fppl = {}, pelanggan = {}, lhuRows = [], totalSamples = 0, idRegistrasi = '', } = context;
        const nomorFppl = fppl.nomor_fppl || fppl.id_registrasi || idRegistrasi || '-';
        const namaPelanggan = pelanggan.nama_instansi || pelanggan.nama_pelanggan || pelanggan.nama || '-';
        const namaPenerima = penerima.nama_pegawai || penerima.username || penerima.nik || 'Admin';
        const detailLink = this.buildAdminLhuPickupScheduleLink(idRegistrasi || fppl.id_registrasi || '');
        const subject = `Semua LHU permohonan sudah disahkan - ${nomorFppl}`;
        const daftarLhu = lhuRows.length
            ? lhuRows.map((row, index) => {
                const nomorLhu = row.nomor_lhu || row.nomorLhu || '-';
                const noSampel = row.no_sampel || row.noSampel || '-';
                return `${index + 1}. ${nomorLhu} (${noSampel})`;
            })
            : ['-'];
        const body = [
            `Yth. ${namaPenerima},`,
            '',
            'Seluruh LHU untuk satu permohonan pelanggan sudah disahkan oleh Kepala Laboratorium.',
            '',
            `Nomor permohonan : ${fppl.id_registrasi || idRegistrasi || '-'}`,
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
        const { sample = {}, fppl = {}, pelanggan = {}, jenis = {}, lhu = {} } = context;
        const nomorSampel = sample.no_sampel || sample.noSampel || '-';
        const nomorFppl = fppl.nomor_fppl || fppl.nomorFppl || fppl.id_registrasi || '-';
        const nomorLhu = lhu.nomor_lhu || lhu.nomorLhu || '-';
        const namaPelanggan = pelanggan.nama_instansi || pelanggan.nama_pelanggan || pelanggan.nama || '-';
        const jenisSampel = jenis.jenis_sampel || jenis.jenisSampel || '-';
        const namaPenerima = penerima.nama_pegawai || penerima.username || penerima.nik || 'Pengendalian Mutu';
        const detailLink = this.buildQcVerificationLink(lhu.nomor_lhu || lhu.nomorLhu || '');
        const subject = `Hasil sampel menunggu verifikasi QC - ${nomorSampel}`;
        const body = [
            `Yth. ${namaPenerima},`,
            '',
            'Kasi Pengujian telah menyetujui hasil pengujian sampel berikut.',
            '',
            `Nomor sampel: ${nomorSampel}`,
            `Nomor FPPL: ${nomorFppl}`,
            `Jenis sampel: ${jenisSampel}`,
            `Pelanggan: ${namaPelanggan}`,
            nomorLhu !== '-' ? `Nomor LHU: ${nomorLhu}` : null,
            '',
            detailLink ? `Buka halaman QC: ${detailLink}` : null,
            'Silakan lakukan verifikasi hasil uji/LHU pada sistem.',
            '',
            'Terima kasih.',
        ].filter(Boolean).join('\n');
        return buildEmailResponse({
            subject,
            body,
            title: subject,
            preheader: `Sampel ${nomorSampel} menunggu verifikasi Pengendalian Mutu.`,
            actionUrl: detailLink,
            actionLabel: 'Buka Verifikasi QC',
        });
    };
}
module.exports = new NotificationFormatUtil();
module.exports.NotificationFormatUtil = NotificationFormatUtil;
