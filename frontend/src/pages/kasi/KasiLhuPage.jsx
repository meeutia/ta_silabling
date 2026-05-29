import {
  KasiApproveConfirmModal,
  KasiLhuHistoryTable,
  KasiLhuQueueSection,
  KasiLhuReviewModal,
  KasiLhuSearchTabs,
  KasiLhuStats,
} from '../../components/kasi/lhu/KasiLhuSections';
import { useKasiLhuReviewPage } from '../../components/kasi/lhu/useKasiLhuReviewPage';

export function KasiLhuPage() {
  const page = useKasiLhuReviewPage();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-8">

        <KasiLhuStats summary={page.summary} onSelectContext={page.selectMetricContext} />

        <KasiLhuSearchTabs
          activeTab={page.activeTab}
          setActiveTab={page.setActiveTab}
          searchQuery={page.searchQuery}
          onSearchChange={page.setSearchQuery}
        />

        {page.activeTab === 'antrean' ? (
          <KasiLhuQueueSection
            filteredRows={page.filteredRows}
            loadingQueue={page.loadingQueue}
            onOpenModal={page.openModal}
          />
        ) : (
          <KasiLhuHistoryTable
            filteredHistoryRows={page.filteredHistoryRows}
            loadingHistory={page.loadingHistory}
            onOpenDetail={page.openHistoryDetail}
          />
        )}
      </div>

      <KasiLhuReviewModal
        showModal={page.showModal}
        selectedSample={page.selectedSample}
        sampleInfo={page.sampleInfo}
        resultRows={page.resultRows}
        loadingDetail={page.loadingDetail}
        revisionOpen={page.revisionOpen}
        revisionNotesById={page.revisionNotesById}
        onRevisionNoteChange={page.updateRevisionNote}
        selectedRevisionIds={page.selectedRevisionIds}
        selectedRevisionRows={page.selectedRevisionRows}
        actionLoading={page.actionLoading}
        selectedNoSampel={page.selectedNoSampel}
        selectedStatus={page.selectedStatus}
        selectedCatatanRevisi={page.selectedCatatanRevisi}
        canReview={page.canReview}
        onClose={page.closeModal}
        onOpenRevision={page.openRevision}
        onCancelRevision={page.cancelRevision}
        onApprove={page.openApproveModal}
        onToggleRevisionResult={page.toggleRevisionResult}
        onSubmitRevision={page.handleSubmitRevision}
      />

      <KasiApproveConfirmModal
        approveModal={page.approveModal}
        actionLoading={page.actionLoading}
        onClose={page.closeApproveModal}
        onSubmit={page.handleApprove}
      />
    </main>
  );
}
