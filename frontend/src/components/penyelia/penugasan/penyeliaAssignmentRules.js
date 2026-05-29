import {
  formatDateOnly,
  getTodayInputValue,
  parseDateInputValue,
} from './penyeliaPenugasanUtils';
import { addBusinessDays } from '../../../utils/businessDays';

function createBusinessDayChecker(holidayDateSet = new Set(), holidayNameByDate = {}) {
  return (dateStr) => validateBusinessDay(dateStr, holidayDateSet, holidayNameByDate);
}

export function getMaxDeadlineByToday(holidayDateSet = new Set(), holidayNameByDate = {}) {
  return addBusinessDays(getTodayInputValue(), 8, createBusinessDayChecker(holidayDateSet, holidayNameByDate));
}

export function getMaxDeadlineBySelectedSamples(draft, pendingGroupMap, holidayDateSet = new Set(), holidayNameByDate = {}) {
  if (!draft?.selectedGroupKey) return '';

  const group = pendingGroupMap.get(draft.selectedGroupKey);
  if (!group) return '';

  const selectedRefs = new Set(draft.selectedSampleRefs || []);

  const selectedSamples = group.sampleOptions.filter((sample) =>
    selectedRefs.has(sample.ref)
  );

  if (selectedSamples.length === 0) return '';

  const isBusinessDay = createBusinessDayChecker(holidayDateSet, holidayNameByDate);

  const maxDates = selectedSamples
    .map((sample) => {
      if (sample.receiptDate) return addBusinessDays(sample.receiptDate, 8, isBusinessDay);
      return sample.maxDeadlineByReceipt;
    })
    .filter(Boolean)
    .sort();

  return maxDates[0] || '';
}

export function getMaxDeadlineForDraft(draft, pendingGroupMap, holidayDateSet = new Set(), holidayNameByDate = {}) {
  const maxByToday = getMaxDeadlineByToday(holidayDateSet, holidayNameByDate);
  const maxBySamples = getMaxDeadlineBySelectedSamples(draft, pendingGroupMap, holidayDateSet, holidayNameByDate);

  if (!maxBySamples) return maxByToday;

  return maxBySamples < maxByToday ? maxBySamples : maxByToday;
}

export function validateBusinessDay(dateStr, holidayDateSet, holidayNameByDate) {
  if (!dateStr) return { valid: true };

  const date = parseDateInputValue(dateStr);
  if (!date) {
    return {
      valid: false,
      reason: 'Tanggal deadline tidak valid.',
    };
  }

  const weekday = date.getDay();

  if (weekday === 0) {
    return {
      valid: false,
      reason: 'Hari Minggu tidak termasuk hari kerja.',
    };
  }

  if (weekday === 6) {
    return {
      valid: false,
      reason: 'Hari Sabtu tidak termasuk hari kerja.',
    };
  }

  if (holidayDateSet.has(dateStr)) {
    return {
      valid: false,
      reason: holidayNameByDate[dateStr] || 'Tanggal tersebut adalah hari libur nasional.',
    };
  }

  return { valid: true };
}

export function validateDeadlineForDraft({
  draft,
  deadlineValue,
  pendingGroupMap,
  holidayDateSet,
  holidayNameByDate,
}) {
  if (!deadlineValue) {
    return {
      valid: false,
      reason: 'Deadline wajib diisi.',
    };
  }

  const today = getTodayInputValue();

  if (deadlineValue < today) {
    return {
      valid: false,
      reason: 'Deadline tidak boleh sebelum hari ini.',
    };
  }

  const businessCheck = validateBusinessDay(
    deadlineValue,
    holidayDateSet,
    holidayNameByDate
  );

  if (!businessCheck.valid) {
    return businessCheck;
  }

  const maxByToday = getMaxDeadlineByToday(holidayDateSet, holidayNameByDate);

  if (deadlineValue > maxByToday) {
    return {
      valid: false,
      reason: `Deadline maksimal hari kerja ke-9 fase pengujian dari hari ini (${formatDateOnly(maxByToday)}).`,
    };
  }

  const maxBySamples = getMaxDeadlineBySelectedSamples(draft, pendingGroupMap, holidayDateSet, holidayNameByDate);

  if (maxBySamples && deadlineValue > maxBySamples) {
    return {
      valid: false,
      reason: `Deadline maksimal hari kerja ke-9 setelah sampel diterima (${formatDateOnly(maxBySamples)}).`,
    };
  }

  return { valid: true };
}

export function buildPayloadAssignments(assignmentDrafts = [], pendingGroupMap) {
  const assignments = [];

  assignmentDrafts.forEach((draft) => {
    if (!draft.selectedGroupKey) return;

    const group = pendingGroupMap.get(draft.selectedGroupKey);
    if (!group) return;

    const selectedRefs = new Set(draft.selectedSampleRefs || []);

    const selectedSamples = (group.sampleOptions || []).filter((sample) =>
      selectedRefs.has(sample.ref)
    );

    if (selectedSamples.length === 0) return;

    const representativeFpmId =
      selectedSamples[0]?.fpmId ||
      group.items?.[0]?.id_fppl_parameter_metode ||
      group.items?.[0]?.idFpplParameterMetode ||
      '';

    const uniqueSampleNos = Array.from(
      new Set(selectedSamples.map((sample) => sample.noSampel).filter(Boolean))
    );

    const uniquePairs = Array.from(
      new Map(
        selectedSamples
          .filter((sample) => sample.fpmId && sample.noSampel)
          .map((sample) => [
            `${sample.fpmId}::${sample.noSampel}`,
            {
              id_fppl_parameter_metode: sample.fpmId,
              no_sampel: sample.noSampel,
            },
          ])
      ).values()
    );

    assignments.push({
      id_fppl_parameter_metode: representativeFpmId,
      tanggal_tenggat: draft.deadline || null,
      catatan_detail: String(draft.catatanDetail || '').trim() || null,
      no_sampel: uniqueSampleNos,
      pairs: uniquePairs,
    });
  });

  return assignments.filter(
    (item) =>
      item.id_fppl_parameter_metode &&
      item.no_sampel.length > 0 &&
      item.pairs.length > 0
  );
}
