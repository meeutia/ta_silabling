import {
  AssignAnalystModal,
  MonitorAssignmentTable,
  PendingAssignmentTable,
  PenyeliaPenugasanHeader,
  PenyeliaPenugasanSearchPanel,
  PenyeliaPenugasanSummary,
  PenyeliaPenugasanTabs,
  SubkontrakAssignmentTable,
  SubkontrakDetailModal,
} from '../../components/penyelia/penugasan/PenyeliaPenugasanSections';
import { getMonitorStatusClass } from '../../components/penyelia/penugasan/penyeliaPenugasanUtils';
import { usePenyeliaPenugasanPage } from '../../components/penyelia/penugasan/usePenyeliaPenugasanPage';

export function PenyeliaPenugasanPage({ onViewDetail }) {
  const page = usePenyeliaPenugasanPage();

  const totalMonitorGroups = Array.isArray(page.groupedMonitorRows)
    ? page.groupedMonitorRows.filter((group) => {
        const status = String(group?.statusRingkas || '').trim().toLowerCase();
        return status !== 'selesai';
      }).length
    : 0;
  const totalSubkontrakGroups = Array.isArray(page.groupedSubkontrakRows)
    ? page.groupedSubkontrakRows.filter((group) => {
        const status = String(group?.statusRingkas || '').trim().toLowerCase();
        return status !== 'selesai';
      }).length
    : 0;

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-8">
        <PenyeliaPenugasanHeader onOpenAssignModal={page.openAssignModal} />

        <PenyeliaPenugasanSummary
          totalPendingItems={page.totalPendingItems}
          totalBelumDitugaskan={page.totalBelumDitugaskan}
          totalMonitorGroups={totalMonitorGroups}
          totalSubkontrakGroups={totalSubkontrakGroups}
          loading={page.loadingPending || page.loadingMonitor || page.loadingSubkontrak}
          onChangeTab={page.setActiveTab}
        />

        <PenyeliaPenugasanSearchPanel
          searchQuery={page.searchQuery}
          onSearchChange={page.setSearchQuery}
        />

        <PenyeliaPenugasanTabs
          activeTab={page.activeTab}
          onChangeTab={page.setActiveTab}
        />

        {page.activeTab === 'buat' && (
          <PendingAssignmentTable
            loadingPending={page.loadingPending}
            errorPending={page.errorPending}
            filteredPendingItems={page.filteredPendingItems}
          />
        )}

        {page.activeTab === 'monitor' && (
          <MonitorAssignmentTable
            loadingMonitor={page.loadingMonitor}
            groupedMonitorRows={page.groupedMonitorRows}
            onViewDetail={onViewDetail}
            formatDateOnly={page.formatDateOnly}
            getMonitorStatusClass={getMonitorStatusClass}
          />
        )}

        {page.activeTab === 'subkontrak' && (
          <SubkontrakAssignmentTable
            loadingSubkontrak={page.loadingSubkontrak}
            groupedSubkontrakRows={page.groupedSubkontrakRows}
            onOpenDetail={page.handleOpenSubkontrakDetail}
            formatDateOnly={page.formatDateOnly}
            getMonitorStatusClass={getMonitorStatusClass}
          />
        )}

      </div>

      <AssignAnalystModal
        show={page.showAssignModal}
        onClose={page.closeAssignModal}
        analysts={page.analysts}
        selectedAnalyst={page.selectedAnalyst}
        onChangeSelectedAnalyst={page.setSelectedAnalyst}
        catatanPenugasan={page.catatanPenugasan}
        onChangeCatatanPenugasan={page.setCatatanPenugasan}
        assignmentDrafts={page.assignmentDrafts}
        buildAvailableGroupOptions={page.buildAvailableGroupOptions}
        pendingGroupMap={page.pendingGroupMap}
        handleChangeDraftGroup={page.handleChangeDraftGroup}
        getTodayInputValue={page.getTodayInputValue}
        getMaxDeadlineForDraft={page.getMaxDeadlineForDraft}
        handleChangeDraftDeadline={page.handleChangeDraftDeadline}
        handleChangeDraftNote={page.handleChangeDraftNote}
        deadlineErrorByDraft={page.deadlineErrorByDraft}
        removeDraftRow={page.removeDraftRow}
        handleToggleSample={page.handleToggleSample}
        isInsituItem={page.isInsituItem}
        formatDateOnly={page.formatDateOnly}
        addDraftRow={page.addDraftRow}
        canAddMoreDrafts={page.canAddMoreDrafts}
        onSave={page.handleSaveAssignment}
        saving={page.saving}
      />

      <SubkontrakDetailModal
        selectedGroup={page.selectedSubkontrakGroup}
        onClose={page.handleCloseSubkontrakDetail}
        formatDateOnly={page.formatDateOnly}
        getMonitorStatusClass={getMonitorStatusClass}
        getSubkontrakRowKey={page.getSubkontrakRowKey}
        subkontrakDrafts={page.subkontrakDrafts}
        onChangeDraft={page.handleChangeSubkontrakDraft}
        normalizeResultExpressionInput={page.normalizeResultExpressionInput}
        getTodayInputValue={page.getTodayInputValue}
        onSave={page.handleSaveSelectedSubkontrakResults}
        saving={page.saving}
      />
    </main>
  );
}
