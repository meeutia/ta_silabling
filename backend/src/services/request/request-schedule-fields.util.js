class RequestScheduleFieldsUtil {
extractTimeFromDateTimeValue = (value) => {
        if (!value)
            return null;
        const text = String(value).trim();
        const textMatch = text.match(/(?:^|[T\s])(\d{2}:\d{2}(?::\d{2})?)/);
        if (textMatch)
            return textMatch[1].length === 5 ? `${textMatch[1]}:00` : textMatch[1];
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return null;
        const pad = (number) => String(number).padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };
    decorateSampleReceiptFields = (requestJson = {}) => {
        const fpplSampleGroups = [
            requestJson.fppl_sampels,
            requestJson.FpplSampels,
            requestJson.fpplSampels,
        ].filter(Array.isArray);
        fpplSampleGroups.forEach((groups) => {
            groups.forEach((group) => {
                const sampleGroups = [
                    group?.sampels,
                    group?.Sampels,
                    group?.Sampel,
                    group?.sampel,
                ].filter(Array.isArray);
                sampleGroups.forEach((samples) => {
                    samples.forEach((sample) => {
                        if (!sample || typeof sample !== 'object')
                            return;
                        const receivedAt = sample.diterima_pada || sample.diterimaPada || sample.tanggal_penerimaan || sample.tanggalPenerimaan || null;
                        if (!receivedAt)
                            return;
                        const receivedTime = sample.jam_penerimaan || sample.jamPenerimaan || this.extractTimeFromDateTimeValue(receivedAt);
                        sample.diterima_pada = sample.diterima_pada || receivedAt;
                        sample.diterimaPada = sample.diterimaPada || receivedAt;
                        sample.tanggal_penerimaan = sample.tanggal_penerimaan || receivedAt;
                        sample.tanggalPenerimaan = sample.tanggalPenerimaan || receivedAt;
                        sample.jam_penerimaan = sample.jam_penerimaan || receivedTime;
                        sample.jamPenerimaan = sample.jamPenerimaan || receivedTime;
                    });
                });
            });
        });
        return requestJson;
    };
    getActiveScheduleFromPayload = (requestPayload) => {
        const scheduleRows = requestPayload?.jadwal_sampels ||
            requestPayload?.JadwalSampels ||
            [];
        const activeRows = scheduleRows
            .filter((row) => (row?.status_jadwal || '').trim() !== 'Dibatalkan')
            .sort((a, b) => {
            const aCreated = new Date(a?.dibuat_pada || a?.createdAt || 0).getTime();
            const bCreated = new Date(b?.dibuat_pada || b?.createdAt || 0).getTime();
            return bCreated - aCreated;
        });
        const activeSchedule = activeRows[0] || null;
        if (!activeSchedule)
            return null;
        const pegawaiPcc = activeSchedule?.pegawai_pcc ||
            activeSchedule?.Pegawai ||
            null;
        return {
            ...activeSchedule,
            nama_pegawai_pcc: activeSchedule?.nama_pegawai_pcc ||
                pegawaiPcc?.nama_pegawai ||
                null,
            no_wa_pcc: activeSchedule?.no_wa_pcc ||
                pegawaiPcc?.no_wa ||
                null
        };
    };
    isValidDateOnlyValue = (value) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
    };
    buildScheduleDateTimeValue = (schedule) => {
        if (!schedule || !this.isValidDateOnlyValue(schedule.tanggal_jadwal))
            return null;
        const dateText = String(schedule.tanggal_jadwal).trim();
        const timeText = String(schedule.jam_jadwal || '').trim().slice(0, 8);
        if (!timeText || !/^\d{2}:\d{2}/.test(timeText))
            return dateText;
        return `${dateText}T${timeText}`;
    };
    stripCustomerSensitiveLhuData = (payload) => {
        const fpplSamples = payload?.fppl_sampels || payload?.FpplSampels || [];
        fpplSamples.forEach((fpplSample) => {
            const samples = fpplSample?.sampels || fpplSample?.Sampels || [];
            samples.forEach((sample) => {
                if (sample?.lhu)
                    delete sample.lhu;
                if (sample?.Lhu)
                    delete sample.Lhu;
                if (sample?.LHU)
                    delete sample.LHU;
                if (sample?.lhus)
                    delete sample.lhus;
                if (sample?.Lhus)
                    delete sample.Lhus;
                if (sample?.LhUs)
                    delete sample.LhUs;
                if (sample?.lhu_data)
                    delete sample.lhu_data;
                if (sample?.lka_hasil)
                    delete sample.lka_hasil;
                if (sample?.LkaHasil)
                    delete sample.LkaHasil;
            });
        });
        payload.hasil_uji = undefined;
        payload.hasilUji = undefined;
        payload.lhu = undefined;
        payload.Lhu = undefined;
        return payload;
    };
    decorateScheduleFields = (requestPayload) => {
        const activeSchedule = this.getActiveScheduleFromPayload(requestPayload);
        return {
            ...requestPayload,
            jadwal_sampel: activeSchedule,
            jadwalSampel: activeSchedule,
            jadwal_sampel_dibuat_pada: activeSchedule?.dibuat_pada || null,
            jadwalSampelDibuatPada: activeSchedule?.dibuat_pada || null,
            jadwal_sampling: this.buildScheduleDateTimeValue(activeSchedule)
        };
    };
}
module.exports = new RequestScheduleFieldsUtil();
module.exports.RequestScheduleFieldsUtil = RequestScheduleFieldsUtil;
