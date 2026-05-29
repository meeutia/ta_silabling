import { Loader2 } from 'lucide-react';
import { PenyeliaApproveModal } from '../../components/penyelia/penugasan/detail/PenyeliaApproveModal';
import { PenyeliaDeadlineModal } from '../../components/penyelia/penugasan/detail/PenyeliaDeadlineModal';
import { PenyeliaKasiRevisionReviewModal } from '../../components/penyelia/penugasan/detail/PenyeliaKasiRevisionReviewModal';
import { PenyeliaReviewDetailList } from '../../components/penyelia/penugasan/detail/PenyeliaReviewDetailList';
import { PenyeliaReviewHeader } from '../../components/penyelia/penugasan/detail/PenyeliaReviewHeader';
import { PenyeliaReviewSummary } from '../../components/penyelia/penugasan/detail/PenyeliaReviewSummary';
import { PenyeliaRevisionModal } from '../../components/penyelia/penugasan/detail/PenyeliaRevisionModal';
import { PenyeliaWorksheetPreviewModal } from '../../components/penyelia/penugasan/detail/PenyeliaWorksheetPreviewModal';
import { usePenyeliaPenugasanDetailPage } from '../../components/penyelia/penugasan/detail/usePenyeliaPenugasanDetailPage';

export function PenyeliaPenugasanDetailPage({ idPenugasan, idPenugasanDetail = '', onBack }) {
  const {
    detailData,
    loading,
    summary,
    revisionModal,
    revisionNotes,
    revisionSampleNotes,
    actionLoadingId,
    pendingKasiRevisions,
    reviewingKasiRevisionId,
    kasiRevisionReviewModal,
    kasiRevisionReviewAction,
    kasiRevisionReviewNote,
    worksheetModal,
    worksheetDownloadFile,
    deadlineModal,
    deadlineValue,
    approveModal,
    setRevisionNotes,
    setRevisionSampleNote,
    setKasiRevisionReviewAction,
    setKasiRevisionReviewNote,
    setWorksheetDownloadFile,
    setDeadlineValue,
    openRevisionModal,
    closeRevisionModal,
    setRevisionMode,
    toggleRevisionSample,
    openWorksheetModal,
    closeWorksheetModal,
    openDeadlineModal,
    closeDeadlineModal,
    openApproveModal,
    closeApproveModal,
    openKasiRevisionReviewModal,
    closeKasiRevisionReviewModal,
    handleSubmitApprove,
    handleSubmitRevision,
    handleSubmitDeadline,
    handleSubmitKasiRevisionReview,
    handleReviewKasiRevision,
  } = usePenyeliaPenugasanDetailPage(idPenugasan, idPenugasanDetail);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <PenyeliaReviewHeader onBack={onBack} />

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center text-gray-500 shadow-sm">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-600" />
            Memuat detail review penugasan...
          </div>
        ) : !detailData ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center text-gray-500 shadow-sm">
            Data detail penugasan tidak ditemukan.
          </div>
        ) : (
          <>
            <PenyeliaReviewSummary detailData={detailData} summary={summary} />
            <PenyeliaReviewDetailList
              detailData={detailData}
              actionLoadingId={actionLoadingId}
              pendingKasiRevisions={pendingKasiRevisions}
              reviewingKasiRevisionId={reviewingKasiRevisionId}
              onOpenKasiRevisionReview={openKasiRevisionReviewModal || handleReviewKasiRevision}
              onOpenWorksheet={openWorksheetModal}
              onOpenRevision={openRevisionModal}
              onOpenDeadline={openDeadlineModal}
              onApprove={openApproveModal}
            />
          </>
        )}

        <PenyeliaApproveModal
          approveModal={approveModal}
          actionLoadingId={actionLoadingId}
          onClose={closeApproveModal}
          onSubmit={handleSubmitApprove}
        />

        <PenyeliaDeadlineModal
          deadlineModal={deadlineModal}
          deadlineValue={deadlineValue}
          actionLoadingId={actionLoadingId}
          onClose={closeDeadlineModal}
          onChangeDeadline={setDeadlineValue}
          onSubmit={handleSubmitDeadline}
        />

        <PenyeliaKasiRevisionReviewModal
          modal={kasiRevisionReviewModal}
          action={kasiRevisionReviewAction}
          note={kasiRevisionReviewNote}
          reviewingKasiRevisionId={reviewingKasiRevisionId}
          onClose={closeKasiRevisionReviewModal}
          onActionChange={setKasiRevisionReviewAction}
          onNoteChange={setKasiRevisionReviewNote}
          onSubmit={handleSubmitKasiRevisionReview}
        />

        <PenyeliaWorksheetPreviewModal
          worksheetModal={worksheetModal}
          worksheetDownloadFile={worksheetDownloadFile}
          onClose={closeWorksheetModal}
          onSelectedFileChange={setWorksheetDownloadFile}
        />

        <PenyeliaRevisionModal
          revisionModal={revisionModal}
          revisionNotes={revisionNotes}
          revisionSampleNotes={revisionSampleNotes}
          actionLoadingId={actionLoadingId}
          onClose={closeRevisionModal}
          onModeChange={setRevisionMode}
          onToggleSample={toggleRevisionSample}
          onNotesChange={setRevisionNotes}
          onSampleNotesChange={setRevisionSampleNote}
          onSubmit={handleSubmitRevision}
        />
      </div>
    </main>
  );
}
