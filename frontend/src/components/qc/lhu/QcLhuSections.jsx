import { ConfirmActionModal } from '../../common/ConfirmActionModal';
import { QcLhuDetailModal } from './QcLhuDetailModal';
import {
  QcLhuFinalizationTable,
  QcLhuHistoryTable,
  QcLhuSearchTabs,
  QcLhuSummaryCards,
} from './QcLhuListSections';

export function QcLhuSections(page) {
  const {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    loadingQueue,
    loadingHistory,
    filteredQueue,
    filteredHistoryRows,
    summary,
    openFinalizationDetail,
    openHistoryDetail,
    openPdf,
  } = page;

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Finalisasi LHU</h1>
            <p className="text-gray-600">
              Finalisasi laporan hasil uji untuk sampel yang sudah disetujui Kasi Pengujian.
            </p>
          </div>
        </div>

        <QcLhuSummaryCards summary={summary} />

        <QcLhuSearchTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          search={search}
          setSearch={setSearch}
        />

        {activeTab === 'finalisasi' && (
          <QcLhuFinalizationTable
            loadingQueue={loadingQueue}
            filteredQueue={filteredQueue}
            openFinalizationDetail={openFinalizationDetail}
          />
        )}

        {activeTab === 'history' && (
          <QcLhuHistoryTable
            loadingHistory={loadingHistory}
            filteredHistoryRows={filteredHistoryRows}
            openHistoryDetail={openHistoryDetail}
            openPdf={openPdf}
          />
        )}
      </div>

      <QcLhuDetailModal {...page} />

      <ConfirmActionModal
        open={page.confirmFinalizeModal?.open}
        title="Konfirmasi Finalisasi LHU"
        message={`Finalisasi LHU untuk sampel ${page.confirmFinalizeModal?.sampleLabel || '-'} dan kirim ke Kepala Lab?`}
        confirmLabel="Finalisasi & Kirim"
        loading={page.submitting}
        onCancel={page.closeConfirmFinalizeModal}
        onConfirm={page.confirmFinalizeLhu}
      />
    </main>
  );
}
