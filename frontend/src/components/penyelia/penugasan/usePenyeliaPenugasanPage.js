import {
  addCalendarDays,
  formatDateOnly,
  getTodayInputValue,
  isSubkontrakItem,
  normalizeResultExpressionInput,
} from './penyeliaPenugasanUtils';
import { usePenyeliaAssignmentDrafts } from './usePenyeliaAssignmentDrafts';
import { usePenyeliaMonitorGroups } from './usePenyeliaMonitorGroups';
import { usePenyeliaPenugasanData } from './usePenyeliaPenugasanData';
import { usePenyeliaSubkontrakResults } from './usePenyeliaSubkontrakResults';

export function usePenyeliaPenugasanPage() {
  const data = usePenyeliaPenugasanData();
  const monitorRows = data.monitorRows.filter((row) => !isSubkontrakItem(row));
  const groupedMonitorRows = usePenyeliaMonitorGroups(monitorRows);

  const assignment = usePenyeliaAssignmentDrafts({
    pendingItems: data.pendingItems,
    searchQuery: data.searchQuery,
    holidayDateSet: data.holidayDateSet,
    holidayNameByDate: data.holidayNameByDate,
    fetchPendingItems: data.fetchPendingItems,
    fetchMonitorRows: data.fetchMonitorRows,
    setActiveTab: data.setActiveTab,
  });

  const subkontrak = usePenyeliaSubkontrakResults({
    onAfterSave: data.fetchMonitorRows,
  });

  return {
    activeTab: data.activeTab,
    setActiveTab: data.setActiveTab,
    searchQuery: data.searchQuery,
    setSearchQuery: data.setSearchQuery,
    totalPendingItems: assignment.totalPendingItems,
    totalBelumDitugaskan: assignment.totalBelumDitugaskan,
    loadingPending: data.loadingPending,
    errorPending: data.errorPending,
    filteredPendingItems: assignment.filteredPendingItems,
    loadingMonitor: data.loadingMonitor,
    groupedMonitorRows,
    loadingSubkontrak: subkontrak.loadingSubkontrak,
    groupedSubkontrakRows: subkontrak.groupedSubkontrakRows,
    pendingKasiRevisions: data.pendingKasiRevisions,
    loadingKasiRevisions: data.loadingKasiRevisions,
    errorKasiRevisions: data.errorKasiRevisions,
    reviewingKasiRevisionId: data.reviewingKasiRevisionId,
    reviewKasiRevisionRequest: data.reviewKasiRevisionRequest,
    selectedSubkontrakGroup: subkontrak.selectedSubkontrakGroup,
    handleOpenSubkontrakDetail: subkontrak.handleOpenSubkontrakDetail,
    handleCloseSubkontrakDetail: subkontrak.handleCloseSubkontrakDetail,
    getSubkontrakRowKey: subkontrak.getSubkontrakRowKey,
    subkontrakDrafts: subkontrak.subkontrakDrafts,
    handleChangeSubkontrakDraft: subkontrak.handleChangeSubkontrakDraft,
    normalizeResultExpressionInput,
    getTodayInputValue,
    handleSaveSelectedSubkontrakResults: subkontrak.handleSaveSelectedSubkontrakResults,
    saving: subkontrak.savingSubkontrak || assignment.savingAssignment,
    showAssignModal: assignment.showAssignModal,
    openAssignModal: assignment.openAssignModal,
    closeAssignModal: assignment.closeAssignModal,
    analysts: data.analysts,
    selectedAnalyst: assignment.selectedAnalyst,
    setSelectedAnalyst: assignment.setSelectedAnalyst,
    catatanPenugasan: assignment.catatanPenugasan,
    setCatatanPenugasan: assignment.setCatatanPenugasan,
    assignmentDrafts: assignment.assignmentDrafts,
    buildAvailableGroupOptions: assignment.buildAvailableGroupOptions,
    pendingGroupMap: assignment.pendingGroupMap,
    handleChangeDraftGroup: assignment.handleChangeDraftGroup,
    getMaxDeadlineForDraft: assignment.getMaxDeadlineForDraft,
    handleChangeDraftDeadline: assignment.handleChangeDraftDeadline,
    handleChangeDraftNote: assignment.handleChangeDraftNote,
    deadlineErrorByDraft: assignment.deadlineErrorByDraft,
    removeDraftRow: assignment.removeDraftRow,
    handleToggleSample: assignment.handleToggleSample,
    isInsituItem: assignment.isInsituItem,
    formatDateOnly,
    addDraftRow: assignment.addDraftRow,
    canAddMoreDrafts: assignment.canAddMoreDrafts,
    handleSaveAssignment: assignment.handleSaveAssignment,
    addCalendarDays,
  };
}
