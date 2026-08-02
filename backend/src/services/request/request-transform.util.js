const RequestStatus = require('../../constants/request-status');
const { LHU_STATUS, normalizeLhuStatus } = require('../../constants/lhu-status.constant');
const { toCamelCaseDeep } = require('../../utils/case-transform.util');

class RequestTransformUtil {
    normalizeRequestData = (data = {}) => {
        return toCamelCaseDeep(data);
    };

    getKasiDecisionStatus = (statusFppl, catatanPenolakan) => {
        const note = catatanPenolakan || '';
        if (statusFppl === RequestStatus.REJECTED_BY_KASI ||
            (statusFppl === RequestStatus.REJECTED && note.startsWith('[Kasi]'))) {
            return 'Ditolak';
        }
        return 'Disetujui';
    };

    resolveSampleQuantity = (entry = {}) => {
        const normalizedEntry = this.normalizeRequestData(entry);
        const rawValue = normalizedEntry.jumlahSampel ??
            normalizedEntry.jumlah ??
            normalizedEntry.totalSampel ??
            normalizedEntry.sampleCount ??
            1;
        const quantity = Number(rawValue);
        return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    };

    toArray = (value) => {
        if (Array.isArray(value)) return value;
        return value ? [value] : [];
    };

    isCancelledOrRejectedStatus = (status) => {
        return [
            RequestStatus.REJECTED,
            RequestStatus.CANCELLED_BY_CUSTOMER,
            RequestStatus.REJECTED_BY_ADMIN,
            RequestStatus.REJECTED_BY_KASI,
            RequestStatus.REJECTED_BY_PENYELIA,
        ].includes(status);
    };

    getRequestLhuRows = (requestData = {}) => {
        const normalizedRequestData = this.normalizeRequestData(requestData);
        return Array.isArray(normalizedRequestData.lhus) ? normalizedRequestData.lhus : [];
    };

    getRequestLhuPickupSchedule = (requestData = {}) => {
        const normalizedRequestData = this.normalizeRequestData(requestData);
        return normalizedRequestData.jadwalPengambilanLhu || null;
    };

    getLhuPickupScheduleStatus = (schedule = {}) => {
        const normalizedSchedule = this.normalizeRequestData(schedule);
        return String(normalizedSchedule.statusPengambilan || '').trim();
    };

    isActiveLhuPickupSchedule = (schedule) => {
        if (!schedule) return false;
        const normalizedSchedule = this.normalizeRequestData(schedule);
        const status = this.getLhuPickupScheduleStatus(normalizedSchedule);
        if (status === 'Dibatalkan') return false;
        return Boolean(
            normalizedSchedule.idJadwalLhu ||
            normalizedSchedule.tanggalPengambilan ||
            normalizedSchedule.dijadwalkanPada
        );
    };

    isCompletedLhuPickupSchedule = (schedule) => {
        if (!schedule) return false;
        return this.getLhuPickupScheduleStatus(schedule) === 'Sudah Diambil';
    };

    isApprovedFinalLhu = (lhu) => {
        if (!lhu) return false;
        const normalizedLhu = this.normalizeRequestData(lhu);
        const normalizedStatus = normalizeLhuStatus(normalizedLhu.statusLhu || normalizedLhu.status || '');
        return normalizedStatus === LHU_STATUS.APPROVED_FINAL || Boolean(normalizedLhu.tanggalPenerbitan || normalizedLhu.qcAt);
    };

    areAllAvailableLhusApproved = (requestData = {}) => {
        const lhuRows = this.getRequestLhuRows(requestData).filter(Boolean);
        return lhuRows.length > 0 && lhuRows.every(this.isApprovedFinalLhu);
    };

    deriveCustomerHistoryStatus = (requestData = {}) => {
        const normalizedRequestData = this.normalizeRequestData(requestData);
        const currentStatus = normalizedRequestData.statusFppl || normalizedRequestData.status || '';
        if (!currentStatus) return currentStatus;
        if (currentStatus === RequestStatus.COMPLETED) return currentStatus;
        if (this.isCancelledOrRejectedStatus(currentStatus)) return currentStatus;
        const pickupSchedule = this.getRequestLhuPickupSchedule(normalizedRequestData);
        if (this.isCompletedLhuPickupSchedule(pickupSchedule)) return RequestStatus.COMPLETED;
        if (this.isActiveLhuPickupSchedule(pickupSchedule)) return RequestStatus.WAITING_LHU_PICKUP;
        if (this.areAllAvailableLhusApproved(normalizedRequestData)) return RequestStatus.WAITING_LHU_SCHEDULING;
        return currentStatus;
    };

    deriveCustomerDecisionStatus = (statusFppl) => {
        if (statusFppl === RequestStatus.CANCELLED_BY_CUSTOMER) return RequestStatus.CANCELLED_BY_CUSTOMER;
        if (statusFppl === RequestStatus.REJECTED_BY_ADMIN) return RequestStatus.REJECTED_BY_ADMIN;
        if (statusFppl === RequestStatus.REJECTED_BY_KASI) return RequestStatus.REJECTED_BY_KASI;
        if (statusFppl === RequestStatus.REJECTED_BY_PENYELIA) return RequestStatus.REJECTED_BY_PENYELIA;
        if (statusFppl === RequestStatus.REJECTED) return 'Dibatalkan';
        if ([RequestStatus.WAITING_PAYMENT, RequestStatus.WAITING_PAYMENT_VERIFICATION].includes(statusFppl)) return 'Menunggu Pembayaran';
        if ([
            RequestStatus.WAITING_SAMPLE,
            RequestStatus.WAITING_SAMPLE_PICKUP,
            RequestStatus.WAITING_SAMPLE_DELIVERY,
            RequestStatus.TESTING_PROCESS,
            RequestStatus.WAITING_LHU_SCHEDULING,
            RequestStatus.WAITING_LHU_PICKUP,
            RequestStatus.COMPLETED,
        ].includes(statusFppl)) return 'Disetujui';
        return 'Menunggu';
    };

    normalizeText = (value) => {
        return String(value || '').trim();
    };

    isOfficerSamplingMethod = (value) => {
        const normalized = this.normalizeText(value).toLowerCase();
        return normalized === 'laboratorium' || normalized === 'petugas';
    };

    resolveSamplingType = (metodePengambilan) => {
        return this.isOfficerSamplingMethod(metodePengambilan) ? 'Petugas' : 'Mandiri';
    };

    buildPenyeliaRequestSummary = (data = {}) => {
        const normalizedData = this.normalizeRequestData(data);
        const fpplSamples = Array.isArray(normalizedData.fpplSampels) ? normalizedData.fpplSampels : [];
        const jenisSet = new Set();
        const parameterSet = new Set();
        let totalSampel = 0;
        let totalPenugasan = 0;

        fpplSamples.forEach((fpplSample) => {
            const jenisNama = fpplSample?.pktBm?.jenisSampel?.jenisSampel ||
                fpplSample?.PktBm?.JenisSampel?.jenisSampel ||
                '-';
            if (jenisNama && jenisNama !== '-') jenisSet.add(jenisNama);

            const sampelRows = Array.isArray(fpplSample?.sampels) ? fpplSample.sampels : [];
            totalSampel += sampelRows.length;

            const parameterRows = Array.isArray(fpplSample?.fpplParameterMetodes)
                ? fpplSample.fpplParameterMetodes
                : [];
            parameterRows.forEach((fpm) => {
                const namaParameter = fpm?.parameter?.namaParameter || fpm?.Parameter?.namaParameter || '-';
                if (namaParameter && namaParameter !== '-') parameterSet.add(namaParameter);
            });

            sampelRows.forEach((sampel) => {
                const penugasanItems = Array.isArray(sampel?.penugasanItems) ? sampel.penugasanItems : [];
                totalPenugasan += penugasanItems.length;
            });
        });

        return {
            ...normalizedData,
            noReg: normalizedData.idRegistrasi,
            tanggal: normalizedData.tanggalPendaftaran,
            pelanggan: normalizedData.pelanggan?.namaInstansi ||
                normalizedData.Pelanggan?.namaInstansi ||
                normalizedData.pelanggan?.pic ||
                normalizedData.Pelanggan?.pic ||
                '-',
            jenisSampel: Array.from(jenisSet).join(', ') || '-',
            parameterPengujian: Array.from(parameterSet),
            jumlahSampel: totalSampel,
            jumlahPenugasan: totalPenugasan,
            status: normalizedData.statusFppl,
        };
    };

    resolveSamplingSchedule = ({ metodePengambilan, tanggalPengambilan, jamPengambilan, estimasiDiterima }) => {
        const isOfficer = this.isOfficerSamplingMethod(metodePengambilan);
        return {
            tanggalRencanaPengambilanSampel: isOfficer ? tanggalPengambilan || null : null,
            jamRencanaPengambilanSampel: isOfficer ? jamPengambilan || null : null,
            tanggalRencanaPengantaranSampel: isOfficer ? null : estimasiDiterima || null,
        };
    };

    resolveSamplingLocation = ({ metodePengambilan, lokasiPengambilan, alamatPengambilan }) => {
        const location = this.normalizeText(lokasiPengambilan || alamatPengambilan);
        if (!location) {
            const samplingType = this.resolveSamplingType(metodePengambilan);
            throw new Error(samplingType === 'Petugas'
                ? 'Lokasi pengambilan sampel wajib diisi.'
                : 'Lokasi asal sampel wajib diisi untuk pengambilan mandiri.');
        }
        return location;
    };
}

module.exports = new RequestTransformUtil();
module.exports.RequestTransformUtil = RequestTransformUtil;
