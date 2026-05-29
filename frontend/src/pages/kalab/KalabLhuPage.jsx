import { ConfirmActionModal } from '../../components/common/ConfirmActionModal';
import {
  KalabLhuDetailModal,
  KalabLhuHeader,
  KalabLhuMetricCards,
  KalabLhuSearchBox,
  KalabLhuTable,
  KalabLhuTabs,
} from '../../components/kalab/lhu/KalabLhuSections';
import { useKalabLhuPage } from '../../components/kalab/lhu/useKalabLhuPage';

export function KalabLhuPage({ initialLhuNumber = '' }) {
  const page = useKalabLhuPage({ initialLhuNumber });

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-8">
        <KalabLhuHeader />

        <KalabLhuMetricCards metrics={page.dashboardMetrics} />

        <KalabLhuTabs activeTab={page.activeTab} onChange={page.setTab} />

        <KalabLhuSearchBox
          search={page.search}
          onSearchChange={page.setSearch}
        />

        <KalabLhuTable
          activeTab={page.activeTab}
          rows={page.filteredRows}
          loading={page.currentLoading}
          onOpenDetail={page.openDetail}
          onOpenPdf={page.openPdf}
        />
      </div>

      {page.showModal && (
        <KalabLhuDetailModal
          actionLoading={page.actionLoading}
          akreditasi={page.akreditasi}
          canApproveOrRevise={page.canApproveOrRevise}
          detailRows={page.detailRows}
          lhuInfo={page.lhuInfo}
          pelangganInfo={page.pelangganInfo}
          loadingDetail={page.loadingDetail}
          onApprove={page.handleApprove}
          onClose={page.closeModal}
          onOpenPdf={page.openPdf}
          selectedFilePath={page.selectedFilePath}
          selectedNomorLhu={page.selectedNomorLhu}
          selectedPdfUrl={page.selectedPdfUrl}
          selectedRow={page.selectedRow}
        />
      )}

      <ConfirmActionModal
        open={page.confirmApproveModal?.open}
        title="Konfirmasi Pengesahan LHU"
        message={`Setujui dan sahkan LHU ${page.confirmApproveModal?.nomorLhu || page.selectedNomorLhu || '-'}? PDF final akan dibuat ulang.`}
        confirmLabel="Sahkan LHU"
        cancelLabel="Batal"
        loading={page.actionLoading === 'approve'}
        onCancel={page.closeConfirmApproveModal}
        onConfirm={page.confirmApproveLhu}
      />
    </main>
  );
}
