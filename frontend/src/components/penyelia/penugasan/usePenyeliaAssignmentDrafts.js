import { useCallback, useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../../api/httpClient';
import { penyeliaPenugasanApi } from '../../../api/penyeliaPenugasanApi';
import { showError, showSuccess, showWarning } from '../../../utils/feedback';
import {
  buildPayloadAssignments,
  getMaxDeadlineForDraft as getMaxDeadlineForDraftRule,
  validateDeadlineForDraft,
} from './penyeliaAssignmentRules';
import {
  buildFilteredPendingItems,
  buildGroupedPendingOptions,
  buildPendingGroupMap,
} from './penyeliaPendingGrouping';
import {
  createDraftItem,
  formatDateOnly,
  isInsituItem,
} from './penyeliaPenugasanUtils';

export function usePenyeliaAssignmentDrafts({
  pendingItems,
  searchQuery,
  holidayDateSet,
  holidayNameByDate,
  fetchPendingItems,
  fetchMonitorRows,
  setActiveTab,
}) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState('');
  const [catatanPenugasan, setCatatanPenugasan] = useState('');
  const [assignmentDrafts, setAssignmentDrafts] = useState([createDraftItem()]);
  const [deadlineErrorByDraft, setDeadlineErrorByDraft] = useState({});
  const [savingAssignment, setSavingAssignment] = useState(false);

  const filteredPendingItems = useMemo(
    () => buildFilteredPendingItems(pendingItems, searchQuery),
    [pendingItems, searchQuery]
  );

  const groupedPendingOptions = useMemo(
    () => buildGroupedPendingOptions(pendingItems, holidayDateSet),
    [pendingItems, holidayDateSet]
  );

  const pendingGroupMap = useMemo(
    () => buildPendingGroupMap(groupedPendingOptions),
    [groupedPendingOptions]
  );

  const resetAssignForm = useCallback(() => {
    setSelectedAnalyst('');
    setCatatanPenugasan('');
    setAssignmentDrafts([createDraftItem()]);
    setDeadlineErrorByDraft({});
  }, []);

  const openAssignModal = () => {
    resetAssignForm();
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    resetAssignForm();
  };

  const getMaxDeadlineForDraft = (draft) => {
    return getMaxDeadlineForDraftRule(draft, pendingGroupMap, holidayDateSet, holidayNameByDate);
  };

  const validateDraftDeadline = (draft, deadlineValue) => {
    return validateDeadlineForDraft({
      draft,
      deadlineValue,
      pendingGroupMap,
      holidayDateSet,
      holidayNameByDate,
    });
  };

  const selectedGroupKeys = useMemo(
    () => assignmentDrafts.map((draft) => draft.selectedGroupKey).filter(Boolean),
    [assignmentDrafts]
  );

  const canAddMoreDrafts = selectedGroupKeys.length < groupedPendingOptions.length;

  const buildAvailableGroupOptions = (draft) => {
    const selectedInOtherDrafts = new Set(
      assignmentDrafts
        .filter((item) => item.key !== draft.key)
        .map((item) => item.selectedGroupKey)
        .filter(Boolean)
    );

    return groupedPendingOptions.filter(
      (group) => group.groupKey === draft.selectedGroupKey || !selectedInOtherDrafts.has(group.groupKey)
    );
  };

  const handleChangeDraftGroup = (draftKey, nextGroupKey) => {
    setAssignmentDrafts((prev) =>
      prev.map((draft) =>
        draft.key === draftKey
          ? {
              ...draft,
              selectedGroupKey: nextGroupKey,
              deadline: '',
              selectedSampleRefs: [],
            }
          : draft
      )
    );

    setDeadlineErrorByDraft((prev) => ({
      ...prev,
      [draftKey]: '',
    }));
  };

  const handleToggleSample = (draftKey, sampleRef) => {
    setAssignmentDrafts((prev) =>
      prev.map((draft) => {
        if (draft.key !== draftKey) return draft;

        const exists = draft.selectedSampleRefs.includes(sampleRef);

        const nextDraft = {
          ...draft,
          selectedSampleRefs: exists
            ? draft.selectedSampleRefs.filter((ref) => ref !== sampleRef)
            : [...draft.selectedSampleRefs, sampleRef],
        };

        if (nextDraft.deadline) {
          const validation = validateDraftDeadline(nextDraft, nextDraft.deadline);

          setDeadlineErrorByDraft((errorPrev) => ({
            ...errorPrev,
            [draftKey]: validation.valid ? '' : validation.reason,
          }));
        }

        return nextDraft;
      })
    );
  };

  const handleChangeDraftDeadline = (draftKey, nextDeadline) => {
    setAssignmentDrafts((prev) =>
      prev.map((draft) => {
        if (draft.key !== draftKey) return draft;

        const nextDraft = {
          ...draft,
          deadline: nextDeadline,
        };

        const validation = validateDraftDeadline(nextDraft, nextDeadline);

        setDeadlineErrorByDraft((errorPrev) => ({
          ...errorPrev,
          [draftKey]: validation.valid ? '' : validation.reason,
        }));

        return nextDraft;
      })
    );
  };

  const handleChangeDraftNote = (draftKey, nextNote) => {
    setAssignmentDrafts((prev) =>
      prev.map((draft) =>
        draft.key === draftKey
          ? {
              ...draft,
              catatanDetail: nextNote,
            }
          : draft
      )
    );
  };

  const addDraftRow = () => {
    setAssignmentDrafts((prev) => [...prev, createDraftItem()]);
  };

  const removeDraftRow = (draftKey) => {
    setAssignmentDrafts((prev) => {
      const next = prev.filter((draft) => draft.key !== draftKey);
      return next.length ? next : [createDraftItem()];
    });
  };

  const handleSaveAssignment = async () => {
    const filledDrafts = assignmentDrafts.filter((draft) => draft.selectedGroupKey);

    if (!selectedAnalyst) {
      showWarning('Pilih analis terlebih dahulu.');
      return;
    }

    if (!filledDrafts.length) {
      showWarning('Pilih minimal satu parameter-metode.');
      return;
    }

    const hasMissingDeadline = filledDrafts.some((draft) => !draft.deadline);
    if (hasMissingDeadline) {
      showWarning('Isi deadline untuk semua parameter-metode yang dipilih.');
      return;
    }

    const invalidDeadline = filledDrafts
      .map((draft) => ({
        draft,
        validation: validateDraftDeadline(draft, draft.deadline),
      }))
      .find((item) => !item.validation.valid);

    if (invalidDeadline) {
      setDeadlineErrorByDraft((prev) => ({
        ...prev,
        [invalidDeadline.draft.key]: invalidDeadline.validation.reason,
      }));

      showWarning(invalidDeadline.validation.reason);
      return;
    }

    const hasMissingSamples = filledDrafts.some((draft) => draft.selectedSampleRefs.length === 0);
    if (hasMissingSamples) {
      showWarning('Pilih minimal satu sampel untuk setiap parameter-metode.');
      return;
    }

    const assignments = buildPayloadAssignments(assignmentDrafts, pendingGroupMap);
    if (!assignments.length) {
      showWarning('Belum ada sampel valid yang dipilih.');
      return;
    }

    setSavingAssignment(true);

    try {
      const data = await penyeliaPenugasanApi.saveAssignments({
        idUserAnalis: selectedAnalyst,
        catatanPenugasan,
        assignments,
      });

      showSuccess(data.message || 'Penugasan berhasil dibuat.');
      closeAssignModal();
      fetchPendingItems();
      fetchMonitorRows();
      setActiveTab('monitor');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Gagal terhubung ke server.'));
    } finally {
      setSavingAssignment(false);
    }
  };

  return {
    filteredPendingItems,
    groupedPendingOptions,
    pendingGroupMap,
    totalPendingItems: groupedPendingOptions.length,
    totalBelumDitugaskan: filteredPendingItems.length,
    showAssignModal,
    openAssignModal,
    closeAssignModal,
    selectedAnalyst,
    setSelectedAnalyst,
    catatanPenugasan,
    setCatatanPenugasan,
    assignmentDrafts,
    buildAvailableGroupOptions,
    handleChangeDraftGroup,
    getMaxDeadlineForDraft,
    handleChangeDraftDeadline,
    handleChangeDraftNote,
    deadlineErrorByDraft,
    removeDraftRow,
    handleToggleSample,
    isInsituItem,
    formatDateOnly,
    addDraftRow,
    canAddMoreDrafts,
    handleSaveAssignment,
    savingAssignment,
  };
}
