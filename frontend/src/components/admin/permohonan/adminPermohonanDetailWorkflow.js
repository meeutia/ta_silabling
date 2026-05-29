import {
  getActivityLogAction as getActivityAction,
  getActivityLogDate,
  getActivityLogsFromSource as getActivityLogsFromRequest,
} from '../../../utils/activityLog.util';

export const pickFirstFilledValue = (...values) => {
  for (const value of values.flat()) {
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
};

export const toTimelineArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

export const getTimestamp = (dateValue, timeValue = '') => {
  if (!dateValue) return 0;
  const normalizedDate = String(dateValue).trim();
  const normalizedTime = String(timeValue || '').trim();
  const candidate = normalizedTime && /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)
    ? `${normalizedDate}T${normalizedTime.slice(0, 8)}`
    : normalizedDate;
  const timestamp = new Date(candidate).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const pickLatestDateTime = (items) => {
  const rows = toTimelineArray(items)
    .map((item) => ({
      date: pickFirstFilledValue(item?.date, item?.tanggal, item?.diterima_pada, item?.diterimaPada, item?.tanggal_penerimaan, item?.tanggalPenerimaan, item?.tanggal_terima, item?.tanggalTerima, item?.tanggal_diterima, item?.tanggalDiterima),
      time: pickFirstFilledValue(item?.time, item?.jam, item?.jam_penerimaan, item?.jamPenerimaan, item?.jam_terima, item?.jamTerima),
    }))
    .filter((item) => item.date);

  if (!rows.length) return { date: null, time: null };

  return rows.reduce((latest, current) => {
    const latestTimestamp = getTimestamp(latest.date, latest.time);
    const currentTimestamp = getTimestamp(current.date, current.time);
    return currentTimestamp >= latestTimestamp ? current : latest;
  }, rows[0]);
};

export const getPaymentConfirmedDate = (invoice) => {
  const payment = invoice?.payment || invoice?.Payment || invoice?.pembayaran || invoice?.paymentData || null;
  return pickFirstFilledValue(
    payment?.paid_at,
    payment?.paidAt,
    payment?.tanggal_bayar,
    payment?.tanggalBayar,
    payment?.verified_at,
    payment?.verifiedAt,
    payment?.tanggal_verifikasi,
    payment?.tanggalVerifikasi,
    invoice?.payment?.paid_at,
    invoice?.payment?.paidAt,
    invoice?.payment?.verified_at,
    invoice?.payment?.verifiedAt,
    invoice?.payment_verified_at,
    invoice?.paymentVerifiedAt,
    invoice?.paid_at,
    invoice?.paidAt,
    invoice?.verified_at,
    invoice?.verifiedAt
  );
};

export const getScheduleTargetDate = (schedule) => pickFirstFilledValue(
  schedule?.tanggal_jadwal,
  schedule?.tanggalJadwal,
  schedule?.tanggal_pengambilan,
  schedule?.tanggalPengambilan,
  schedule?.tanggal_pengantaran,
  schedule?.tanggalPengantaran
);

export const getScheduleTargetTime = (schedule) => pickFirstFilledValue(
  schedule?.jam_jadwal,
  schedule?.jamJadwal,
  schedule?.jam_pengambilan,
  schedule?.jamPengambilan,
  schedule?.jam_pengantaran,
  schedule?.jamPengantaran
);

export const getScheduleDecisionDate = (schedule) => pickFirstFilledValue(
  schedule?.dibuat_pada,
  schedule?.dibuatPada,
  schedule?.created_at,
  schedule?.createdAt,
  getScheduleTargetDate(schedule)
);

export const getScheduleOfficerName = (schedule) => {
  const pcc = schedule?.pegawai_pcc || schedule?.PegawaiPcc || schedule?.Pegawai || schedule?.pcc || null;
  return pickFirstFilledValue(schedule?.nama_pegawai_pcc, schedule?.namaPegawaiPcc, pcc?.nama_pegawai, pcc?.namaPegawai);
};


export const getRequestSampleRows = (requestItem) => {
  if (Array.isArray(requestItem?.fppl_sampels)) return requestItem.fppl_sampels;
  if (Array.isArray(requestItem?.FpplSampels)) return requestItem.FpplSampels;
  if (Array.isArray(requestItem?.fpplSampels)) return requestItem.fpplSampels;
  return [];
};

export const getParameterMethodRows = (requestItem) => getRequestSampleRows(requestItem).flatMap((sample) => {
  if (Array.isArray(sample?.fppl_parameter_metodes)) return sample.fppl_parameter_metodes;
  if (Array.isArray(sample?.FpplParameterMetodes)) return sample.FpplParameterMetodes;
  if (Array.isArray(sample?.fpplParameterMetodes)) return sample.fpplParameterMetodes;
  return [];
});

export const getMethodDecisionDate = (requestItem) => {
  const dates = getParameterMethodRows(requestItem)
    .map((row) => pickFirstFilledValue(row?.dipilih_pada, row?.dipilihPada))
    .filter(Boolean);

  if (!dates.length) return null;

  return dates.reduce((latest, current) => (
    getTimestamp(current) >= getTimestamp(latest) ? current : latest
  ), dates[0]);
};

export const getParameterNameFromMethodRow = (row) => {
  const parameter = row?.parameter || row?.Parameter || null;
  return pickFirstFilledValue(
    row?.nama_parameter,
    row?.namaParameter,
    parameter?.nama_parameter,
    parameter?.namaParameter
  );
};

export const buildParameterNameByMethodId = (requestItem) => {
  const map = new Map();

  getParameterMethodRows(requestItem).forEach((row) => {
    const methodId = pickFirstFilledValue(row?.id_metode_parameter, row?.idMetodeParameter);
    const parameterName = getParameterNameFromMethodRow(row);
    if (methodId && parameterName && !map.has(methodId)) {
      map.set(String(methodId), parameterName);
    }
  });

  return map;
};

export const getSampleDisplayLabel = (noSampel, sampleTypeName) => {
  const sampleNo = noSampel || '-';
  return sampleTypeName ? `${sampleNo} • ${sampleTypeName}` : sampleNo;
};

export const joinLabels = (labels) => {
  const cleanLabels = labels.map((label) => String(label || '').trim()).filter(Boolean);
  if (cleanLabels.length <= 1) return cleanLabels[0] || '-';
  if (cleanLabels.length === 2) return `${cleanLabels[0]} dan ${cleanLabels[1]}`;
  return `${cleanLabels.slice(0, -1).join(', ')}, dan ${cleanLabels[cleanLabels.length - 1]}`;
};


export const getLhuNumberValue = (lhu) => pickFirstFilledValue(
  lhu?.nomor_lhu,
  lhu?.nomorLhu,
  lhu?.no_lhu,
  lhu?.noLhu
);

export const getLhuCreatedDateValue = (lhu) => pickFirstFilledValue(
  lhu?.diajukan_ke_kalab_pada,
  lhu?.diajukanKeKalabPada,
  lhu?.qc_approved_at,
  lhu?.qcApprovedAt,
  lhu?.created_at,
  lhu?.createdAt,
  lhu?.tanggal_lhu,
  lhu?.tanggalLhu,
  lhu?.tanggal_penerbitan,
  lhu?.tanggalPenerbitan
);

export const getLhuApprovedDateValue = (lhu) => pickFirstFilledValue(
  lhu?.kalab_at,
  lhu?.kalabAt,
  lhu?.disahkan_pada,
  lhu?.disahkanPada,
  lhu?.disetujui_pada,
  lhu?.disetujuiPada,
  lhu?.tanggal_penerbitan,
  lhu?.tanggalPenerbitan
);

export const getLhuSampleRows = (lhu) => {
  const rows =
    lhu?.lhu_sampels ||
    lhu?.LhuSampels ||
    lhu?.lhuSampels ||
    lhu?.samples ||
    lhu?.sampels ||
    [];

  return Array.isArray(rows)
    ? [...rows].sort((a, b) => Number(a?.urutan_sampel || a?.urutanSampel || 999) - Number(b?.urutan_sampel || b?.urutanSampel || 999))
    : [];
};

export const getSampleNoFromLhuSampleRow = (row) => pickFirstFilledValue(
  row?.no_sampel,
  row?.noSampel,
  row?.Sampel?.no_sampel,
  row?.sampel?.no_sampel,
  row?.Sampel?.noSampel,
  row?.sampel?.noSampel
);

export const getSampleLhuRows = (actualSample = {}, rowLhu = null) => {
  const listCandidate = [
    actualSample?.lhus,
    actualSample?.Lhus,
    actualSample?.lhu_list,
    actualSample?.lhuList,
    actualSample?.lhu_rows,
    actualSample?.lhuRows,
  ].find((value) => Array.isArray(value));

  if (Array.isArray(listCandidate)) return listCandidate.filter(Boolean);

  const singleLhu = rowLhu || actualSample?.lhu || actualSample?.Lhu || actualSample?.LHU || actualSample?.lhu_data || null;
  return singleLhu ? [singleLhu] : [];
};

export const buildLhuTimelineGroupsFromAdminSampleRows = (adminSampleRows = []) => {
  const groups = new Map();

  adminSampleRows.forEach(({ actualSample, sampleTypeName, lhu }) => {
    const sampleNo = actualSample?.no_sampel || actualSample?.noSampel || '';
    const sampleLabel = getSampleDisplayLabel(sampleNo, sampleTypeName);

    getSampleLhuRows(actualSample, lhu).forEach((lhuItem) => {
      const nomorLhu = getLhuNumberValue(lhuItem);
      if (!nomorLhu) return;

      if (!groups.has(nomorLhu)) {
        groups.set(nomorLhu, {
          nomorLhu,
          lhu: lhuItem,
          sampleLabels: [],
          sampleKeySet: new Set(),
        });
      }

      const group = groups.get(nomorLhu);
      getLhuSampleRows(lhuItem).forEach((row) => {
        const noSampel = getSampleNoFromLhuSampleRow(row);
        if (noSampel && !group.sampleKeySet.has(noSampel)) {
          group.sampleLabels.push(noSampel);
          group.sampleKeySet.add(noSampel);
        }
      });

      if (sampleNo && !group.sampleKeySet.has(sampleNo)) {
        group.sampleLabels.push(sampleLabel);
        group.sampleKeySet.add(sampleNo);
      }
    });
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    sampleText: joinLabels(group.sampleLabels),
  }));
};

export const buildLhuTimelineGroupsFromActivityLogs = (requestItem) => {
  const groups = new Map();

  getActivityLogsFromRequest(requestItem).forEach((log) => {
    const entityType = log?.entity_type || log?.entityType;
    const action = log?.aksi || log?.action || log?.aksi_log || log?.aksiLog || '';
    const nomorLhu = pickFirstFilledValue(log?.entity_id, log?.entityId);
    const dateValue = getActivityLogDate(log);

    if (entityType !== 'LHU' || !nomorLhu || !dateValue) return;
    if (!['MEMBUAT_LHU', 'QC_MENYETUJUI_LHU', 'KALAB_MENGESAHKAN_LHU'].includes(action)) return;

    if (!groups.has(nomorLhu)) {
      groups.set(nomorLhu, {
        nomorLhu,
        lhu: {
          nomor_lhu: nomorLhu,
          status_lhu: 'Menunggu Persetujuan Kepala Lab',
        },
        sampleLabels: ['permohonan ini'],
        sampleText: 'permohonan ini',
      });
    }

    const group = groups.get(nomorLhu);
    if (action === 'MEMBUAT_LHU' || action === 'QC_MENYETUJUI_LHU') {
      const previousDate = getLhuCreatedDateValue(group.lhu);
      if (!previousDate || getTimestamp(dateValue) >= getTimestamp(previousDate)) {
        group.lhu.created_at = dateValue;
        group.lhu.qc_at = dateValue;
      }
    }

    if (action === 'KALAB_MENGESAHKAN_LHU') {
      const previousApprovedDate = getLhuApprovedDateValue(group.lhu);
      if (!previousApprovedDate || getTimestamp(dateValue) >= getTimestamp(previousApprovedDate)) {
        group.lhu.kalab_at = dateValue;
        group.lhu.status_lhu = 'Disahkan';
      }
    }
  });

  return Array.from(groups.values());
};

export const mergeLhuTimelineGroups = (...groupLists) => {
  const merged = new Map();

  groupLists.flat().filter(Boolean).forEach((group) => {
    const nomorLhu = group.nomorLhu || getLhuNumberValue(group.lhu);
    if (!nomorLhu) return;

    if (!merged.has(nomorLhu)) {
      merged.set(nomorLhu, group);
      return;
    }

    const existing = merged.get(nomorLhu);
    merged.set(nomorLhu, {
      ...group,
      ...existing,
      lhu: {
        ...(group.lhu || {}),
        ...(existing.lhu || {}),
      },
      sampleText: existing.sampleText && existing.sampleText !== 'permohonan ini'
        ? existing.sampleText
        : group.sampleText || existing.sampleText,
    });
  });

  return Array.from(merged.values());
};

export const removeTrailingPeriod = (value) => String(value || '').trim().replace(/[.\s]+$/g, '');
export const withOnePeriod = (value) => {
  const text = removeTrailingPeriod(value);
  return text ? `${text}.` : '';
};
export const stripRevisionPrefix = (value) => String(value || '').replace(/^\[[^\]]+\]\s*/, '').trim();

export const getKasiRevisionReviewStatusLabel = (log) => {
  const decisionText = String(
    log?.status_baru ||
      log?.statusBaru ||
      log?.status_after ||
      log?.statusAfter ||
      log?.catatan ||
      log?.note ||
      ''
  ).toLowerCase();

  if (decisionText.includes('tolak')) return 'Revisi Kasi ditolak Penyelia';
  if (decisionText.includes('setuju') || decisionText.includes('analis')) return 'Revisi Kasi disetujui Penyelia';

  return 'Revisi Kasi disetujui/ditolak Penyelia';
};

export const buildKasiRevisionReviewTimelineItems = (requestItem, makeTimelineItem) => {
  const seen = new Set();

  return getActivityLogsFromRequest(requestItem)
    .map((log, index) => {
      if (getActivityAction(log) !== 'REVISI_LKA_DITINJAU_PENYELIA') return null;

      const dateValue = getActivityLogDate(log);
      if (!dateValue) return null;

      const dedupeKey = `${getActivityAction(log)}-${log?.entity_id || log?.entityId || index}-${dateValue}`;
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);

      return makeTimelineItem({
        status: getKasiRevisionReviewStatusLabel(log),
        note: log?.catatan || log?.note || 'Penyelia telah meninjau permintaan revisi dari Kasi Pengujian.',
        dateValue,
        type: 'Sampel',
        sortOrder: 91,
      });
    })
    .filter(Boolean);
};

export const getAssignmentItems = (actualSample) => toTimelineArray(
  actualSample?.penugasan_items ||
    actualSample?.penugasanItems ||
    actualSample?.PenugasanItems ||
    actualSample?.assignments
);

export const getPenugasanDetail = (item) => (
  item?.penugasan_detail ||
  item?.penugasanDetail ||
  item?.PenugasanDetail ||
  item?.detail ||
  null
);

export const getLkaFromDetail = (detail) => detail?.lka || detail?.Lka || detail?.LKA || null;

export const getLkaHasilRows = (lka) => toTimelineArray(
  lka?.lka_hasils ||
    lka?.LkaHasils ||
    lka?.lkaHasil ||
    lka?.LkaHasil ||
    lka?.hasil
);

export const collectLkaHasilTimelineRows = (actualSample, parameterNameByMethodId) => {
  const noSampel = actualSample?.no_sampel || actualSample?.noSampel || null;

  return getAssignmentItems(actualSample).flatMap((item) => {
    const detail = getPenugasanDetail(item);
    const lka = getLkaFromDetail(detail);
    const methodId = pickFirstFilledValue(detail?.id_metode_parameter, detail?.idMetodeParameter);
    const parameterName = methodId ? parameterNameByMethodId.get(String(methodId)) : null;

    return getLkaHasilRows(lka)
      .filter((row) => {
        const rowNoSampel = row?.no_sampel || row?.noSampel;
        return !rowNoSampel || !noSampel || rowNoSampel === noSampel;
      })
      .map((row) => ({ row, parameterName }));
  });
};

export const hasTestingFlow = (actualSample, lhu) => {
  const sampleStatus = String(actualSample?.status_sample || '').toLowerCase();
  return (
    sampleStatus.includes('pengujian') ||
    sampleStatus.includes('selesai') ||
    Boolean(lhu?.nomor_lhu) ||
    getAssignmentItems(actualSample).length > 0
  );
};

