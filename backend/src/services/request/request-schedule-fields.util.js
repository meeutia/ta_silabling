const { toCamelCaseDeep } = require('../../utils/case-transform.util');

class RequestScheduleFieldsUtil {
    extractTimeFromDateTimeValue = (value) => {
        if (!value) return null;
        const text = String(value).trim();
        const textMatch = text.match(/(?:^|[T\s])(\d{2}:\d{2}(?::\d{2})?)/);
        if (textMatch) return textMatch[1].length === 5 ? `${textMatch[1]}:00` : textMatch[1];
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        const pad = (number) => String(number).padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    normalizeRequestData = (requestData = {}) => {
        return toCamelCaseDeep(requestData);
    };

    decorateSampleReceiptFields = (requestData = {}) => {
        const normalizedRequestData = this.normalizeRequestData(requestData);
        const fpplSamples = Array.isArray(normalizedRequestData.fpplSampels)
            ? normalizedRequestData.fpplSampels
            : [];

        fpplSamples.forEach((group) => {
            const samples = Array.isArray(group?.sampels) ? group.sampels : [];
            samples.forEach((sample) => {
                if (!sample || typeof sample !== 'object') return;
                const receivedAt = sample.diterimaPada || sample.tanggalPenerimaan || null;
                if (!receivedAt) return;
                const receivedTime = sample.jamPenerimaan || this.extractTimeFromDateTimeValue(receivedAt);
                sample.diterimaPada = receivedAt;
                sample.tanggalPenerimaan = receivedAt;
                sample.jamPenerimaan = receivedTime;
            });
        });

        return normalizedRequestData;
    };

    getActiveScheduleFromRequestData = (requestData = {}) => {
        const normalizedRequestData = this.normalizeRequestData(requestData);
        const scheduleRows = Array.isArray(normalizedRequestData.jadwalSampels)
            ? normalizedRequestData.jadwalSampels
            : [];

        const activeRows = scheduleRows
            .filter((row) => String(row?.statusJadwal || '').trim() !== 'Dibatalkan')
            .sort((a, b) => {
                const aCreated = new Date(a?.dibuatPada || a?.createdAt || 0).getTime();
                const bCreated = new Date(b?.dibuatPada || b?.createdAt || 0).getTime();
                return bCreated - aCreated;
            });

        const activeSchedule = activeRows[0] || null;
        if (!activeSchedule) return null;

        const pegawaiPcc = activeSchedule.pegawaiPcc || activeSchedule.Pegawai || null;
        return {
            ...activeSchedule,
            namaPegawaiPcc: activeSchedule.namaPegawaiPcc || pegawaiPcc?.namaPegawai || null,
            noWaPcc: activeSchedule.noWaPcc || pegawaiPcc?.noWa || null,
        };
    };

    isValidDateOnlyValue = (value) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
    };

    buildScheduleDateTimeValue = (schedule) => {
        if (!schedule || !this.isValidDateOnlyValue(schedule.tanggalJadwal)) return null;
        const dateText = String(schedule.tanggalJadwal).trim();
        const timeText = String(schedule.jamJadwal || '').trim().slice(0, 8);
        if (!timeText || !/^\d{2}:\d{2}/.test(timeText)) return dateText;
        return `${dateText}T${timeText}`;
    };

    stripCustomerSensitiveLhuData = (requestData = {}) => {
        const normalizedRequestData = this.normalizeRequestData(requestData);
        const fpplSamples = Array.isArray(normalizedRequestData.fpplSampels)
            ? normalizedRequestData.fpplSampels
            : [];

        fpplSamples.forEach((fpplSample) => {
            const samples = Array.isArray(fpplSample?.sampels) ? fpplSample.sampels : [];
            samples.forEach((sample) => {
                if (!sample || typeof sample !== 'object') return;
                delete sample.lhu;
                delete sample.Lhu;
                delete sample.LHU;
                delete sample.lhus;
                delete sample.Lhus;
                delete sample.LhUs;
                delete sample.lhuData;
                delete sample.lkaHasil;
                delete sample.LkaHasil;
            });
        });

        delete normalizedRequestData.hasilUji;
        delete normalizedRequestData.lhu;
        delete normalizedRequestData.Lhu;
        delete normalizedRequestData.lhus;
        return normalizedRequestData;
    };

    stripSignedLhuStorageFields = (requestData = {}) => {
        const normalizedRequestData = this.normalizeRequestData(requestData);
        const lhus = Array.isArray(normalizedRequestData.lhus) ? normalizedRequestData.lhus : [];
        lhus.forEach((lhu) => {
            if (!lhu || typeof lhu !== 'object') return;
            delete lhu.file_lhu_signed_path;
            delete lhu.fileLhuSignedPath;
        });

        return normalizedRequestData;
    };


    decorateScheduleFields = (requestData = {}) => {
        const normalizedRequestData = this.normalizeRequestData(requestData);
        const activeSchedule = this.getActiveScheduleFromRequestData(normalizedRequestData);
        return {
            ...normalizedRequestData,
            jadwalSampel: activeSchedule,
            jadwalSampelDibuatPada: activeSchedule?.dibuatPada || null,
            jadwalSampling: this.buildScheduleDateTimeValue(activeSchedule),
        };
    };
}

module.exports = new RequestScheduleFieldsUtil();
module.exports.RequestScheduleFieldsUtil = RequestScheduleFieldsUtil;
