import {
  combineDateTimeValue,
  getRequestSamples,
  pickFirstDateValue,
  pickLatestDateValue,
  toArray,
} from './detailPermohonanCore';
import {
  getActivityLogDate as getLogDate,
  getActivityLogEntityId as normalizeActivityEntityId,
  getActivityRowsByActions,
} from '../../../utils/activityLog.util';

export const getActualSamplesFromRequest = (request) =>
  getRequestSamples(request).flatMap((requestSample) =>
    toArray(
      requestSample?.SampelAktuals ||
        requestSample?.sampel_aktuals ||
        requestSample?.sampelAktuals ||
        requestSample?.ActualSamples ||
        requestSample?.actualSamples ||
        requestSample?.actual_samples ||
        requestSample?.Sampels ||
        requestSample?.sampels ||
        requestSample?.samples
    )
  );

export const getLhuFromActualSample = (actualSample) =>
  actualSample?.lhu ||
  actualSample?.Lhu ||
  actualSample?.LHU ||
  actualSample?.lhu_data ||
  actualSample?.lhuData ||
  actualSample?.LhuData ||
  null;

const getLhuRowsFromActualSample = (actualSample) => {
  const listCandidate = [
    actualSample?.lhus,
    actualSample?.Lhus,
    actualSample?.lhu_list,
    actualSample?.lhuList,
    actualSample?.lhu_rows,
    actualSample?.lhuRows,
  ].find((value) => Array.isArray(value));

  if (Array.isArray(listCandidate)) return listCandidate.filter(Boolean);

  const singleLhu = getLhuFromActualSample(actualSample);
  return singleLhu ? [singleLhu] : [];
};

const getLhuNumberValue = (lhu) => lhu?.nomor_lhu || lhu?.nomorLhu || lhu?.no_lhu || lhu?.noLhu || '';

export const getLhuCreatedDateValue = (lhu) => pickFirstDateValue(
  lhu?.diajukan_ke_kalab_pada,
  lhu?.diajukanKeKalabPada,
  lhu?.qc_approved_at,
  lhu?.qcApprovedAt,
  lhu?.created_at,
  lhu?.createdAt,
  lhu?.tanggal_lhu,
  lhu?.tanggalLhu
);

export const getLhuApprovedDateValue = (lhu) => pickFirstDateValue(
  lhu?.kalab_at,
  lhu?.kalabAt,
  lhu?.disahkan_pada,
  lhu?.disahkanPada,
  lhu?.disetujui_pada,
  lhu?.disetujuiPada,
  lhu?.tanggal_penerbitan,
  lhu?.tanggalPenerbitan
);

const getLhuSampleRows = (lhu) => {
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

const getSampleNoFromLhuSampleRow = (row) => (
  row?.no_sampel ||
  row?.noSampel ||
  row?.Sampel?.no_sampel ||
  row?.sampel?.no_sampel ||
  row?.Sampel?.noSampel ||
  row?.sampel?.noSampel ||
  ''
);

const getActualSampleRowsFromRequest = (request) =>
  getRequestSamples(request).flatMap((requestSample) => {
    return toArray(
      requestSample?.SampelAktuals ||
        requestSample?.sampel_aktuals ||
        requestSample?.sampelAktuals ||
        requestSample?.ActualSamples ||
        requestSample?.actualSamples ||
        requestSample?.actual_samples ||
        requestSample?.Sampels ||
        requestSample?.sampels ||
        requestSample?.samples
      ).map((actualSample) => ({ actualSample }));
  });

export const joinTimelineLabels = (labels = []) => {
  const cleanLabels = labels.map((label) => String(label || '').trim()).filter(Boolean);
  if (cleanLabels.length <= 1) return cleanLabels[0] || '-';
  if (cleanLabels.length === 2) return `${cleanLabels[0]} dan ${cleanLabels[1]}`;
  return `${cleanLabels.slice(0, -1).join(', ')}, dan ${cleanLabels[cleanLabels.length - 1]}`;
};

export const buildLhuTimelineGroupsFromRequest = (request) => {
  const groups = new Map();

  getActualSampleRowsFromRequest(request).forEach(({ actualSample }) => {
    const sampleNo = actualSample?.no_sampel || actualSample?.noSampel || '';
    const sampleLabel = sampleNo || '-';

    getLhuRowsFromActualSample(actualSample).forEach((lhu) => {
      const nomorLhu = getLhuNumberValue(lhu);
      if (!nomorLhu) return;

      if (!groups.has(nomorLhu)) {
        groups.set(nomorLhu, {
          nomorLhu,
          lhu,
          sampleLabels: [],
          sampleKeySet: new Set(),
        });
      }

      const group = groups.get(nomorLhu);
      getLhuSampleRows(lhu).forEach((row) => {
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
    sampleText: joinTimelineLabels(group.sampleLabels),
  }));
};

export const getSampleReceivedDateFromRequest = (request) =>
  pickLatestDateValue(
    getActualSamplesFromRequest(request).map((sample) => {
      const dateValue = pickFirstDateValue(
        sample?.tanggal_penerimaan,
        sample?.tanggalPenerimaan,
        sample?.tanggal_terima,
        sample?.tanggalTerima,
        sample?.tanggal_diterima,
        sample?.tanggalDiterima
      );
      const timeValue = sample?.jam_penerimaan || sample?.jamPenerimaan || sample?.jam_terima || sample?.jamTerima || '';

      return dateValue ? combineDateTimeValue(dateValue, timeValue) : null;
    })
  );

const getActualSampleCount = (request) => getActualSamplesFromRequest(request).filter((sample) => sample?.no_sampel || sample?.noSampel).length;

export const getCustomerSampleCountText = (request) => {
  const count = getActualSampleCount(request);
  if (count > 0) return `${count} sampel`;
  return 'Sampel';
};

export const getTestingFinishedDate = (request) => {
  const actualSamples = getActualSamplesFromRequest(request);
  const lhuRows = actualSamples.map(getLhuFromActualSample).filter(Boolean);

  return pickLatestDateValue(
    lhuRows.map((lhu) =>
      pickFirstDateValue(
        lhu?.created_at,
        lhu?.createdAt
      )
    )
  );
};

export const getLhuApprovalDate = (request) => {
  const actualSamples = getActualSamplesFromRequest(request);
  const lhuRows = actualSamples.map(getLhuFromActualSample).filter(Boolean);

  return pickLatestDateValue(
    lhuRows.map((lhu) =>
      pickFirstDateValue(
        lhu?.kalab_at,
        lhu?.kalabAt,
        lhu?.disahkan_pada,
        lhu?.disahkanPada,
        lhu?.disetujui_pada,
        lhu?.disetujuiPada
      )
    )
  );
};

const getUniqueEntityIds = (rows = []) => {
  const ids = new Set();
  rows.forEach((row, index) => {
    const id = String(normalizeActivityEntityId(row) || `row-${index}`).trim();
    if (id) ids.add(id);
  });
  return ids;
};

export const getLhuActivityFacts = (requestData) => {
  const lhuCreatedRows = getActivityRowsByActions(
    requestData,
    ['MEMBUAT_LHU', 'QC_MENYETUJUI_LHU'],
    ['LHU']
  );
  const lhuApprovalRows = getActivityRowsByActions(
    requestData,
    ['KALAB_MENGESAHKAN_LHU'],
    ['LHU']
  );
  const lhuPickupScheduleRows = getActivityRowsByActions(
    requestData,
    ['MENJADWALKAN_PENGAMBILAN_LHU'],
    ['JADWAL_LHU', 'LHU']
  );
  const lhuPickupDoneRows = getActivityRowsByActions(
    requestData,
    ['LHU_DIAMBIL_PELANGGAN'],
    ['JADWAL_LHU', 'LHU', 'FPPL']
  );

  const createdIds = getUniqueEntityIds(lhuCreatedRows);
  const approvedIds = getUniqueEntityIds(lhuApprovalRows);
  const hasLhuActivity = lhuCreatedRows.length > 0 || lhuApprovalRows.length > 0;
  const allLhuApprovedFromLogs =
    lhuApprovalRows.length > 0 &&
    (createdIds.size === 0 || Array.from(createdIds).every((id) => approvedIds.has(id)));

  return {
    hasLhuActivity,
    hasAnyApprovedLhu: lhuApprovalRows.length > 0,
    allLhuApprovedFromLogs,
    hasLhuInApprovalFlow: hasLhuActivity,
    hasLhuPickupScheduleActivity: lhuPickupScheduleRows.length > 0,
    hasLhuPickupDoneActivity: lhuPickupDoneRows.length > 0,
    latestCreatedDate: pickLatestDateValue(lhuCreatedRows.map(getLogDate)),
    latestApprovedDate: pickLatestDateValue(lhuApprovalRows.map(getLogDate)),
    latestPickupScheduleDate: pickLatestDateValue(lhuPickupScheduleRows.map(getLogDate)),
    latestPickupDoneDate: pickLatestDateValue(lhuPickupDoneRows.map(getLogDate)),
  };
};

const getLhuStatusValue = (lhu) => String(lhu?.status_lhu || lhu?.statusLhu || '').trim();

export const isLhuApprovedForProgress = (lhu) => (
  getLhuStatusValue(lhu) === 'Disahkan' ||
  Boolean(getLhuApprovedDateValue(lhu))
);
