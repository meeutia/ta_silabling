import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { AnalisAssignmentInfoSection, AnalisReadOnlyNotice } from '../../components/analis/detail/AnalisAssignmentInfoSection';
import { AnalisDetailHeader } from '../../components/analis/detail/AnalisDetailHeader';
import { AnalisWorksheetFileSection } from '../../components/analis/detail/AnalisWorksheetFileSection';
import { AnalisWorksheetPreviewModal } from '../../components/analis/detail/AnalisWorksheetPreviewModal';
import { AnalisResultSection } from '../../components/analis/detail/AnalisResultSection';
import { useAnalisDetailSampel } from '../../components/analis/detail/useAnalisDetailSampel';

export function AnalisDetailSampelPage({ idPenugasanDetail, onBack }) {
  const {
    loading,
    savingResults,
    submitting,
    uploading,
    error,
    detail,
    worksheetForm,
    setWorksheetForm,
    resultRows,
    setResultRows,
    previewFile,
    showDhlScientificHelper,
    setShowDhlScientificHelper,
    previewPayload,
    loadingPreview,
    previewError,
    toast,
    setToast,
    fileInputRef,
    isReadOnly,
    isLhuLocked,
    canEditWorksheetMeta,
    canEditResultRow,
    isRevisionMode,
    hasSpecificRevisionRows,
    progressStats,
    worksheetFiles,
    handleInsertDhlSymbol,
    handleWorksheetFileChange,
    handleRemoveWorksheetFile,
    handleSaveResults,
    handleSubmitWorksheet,
    handleOpenPreview,
    handleClosePreview,
  } = useAnalisDetailSampel({ idPenugasanDetail });

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 md:p-8">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-gray-500">Memuat detail pekerjaan...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4 md:p-8">
          <button
            type="button"
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">Gagal memuat detail pekerjaan</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4 md:p-8">
          <p className="text-gray-500">Detail pekerjaan tidak ditemukan.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      {toast.show && (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={`flex min-w-[320px] items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="mt-0.5 h-5 w-5" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5" />
            )}

            <div className="flex-1">
              <p className="text-sm font-semibold">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setToast((current) => ({ ...current, show: false }))}
              className="rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <AnalisWorksheetPreviewModal
        previewFile={previewFile}
        previewPayload={previewPayload}
        loadingPreview={loadingPreview}
        previewError={previewError}
        onClose={handleClosePreview}
      />

      <div className="p-4 md:p-8">
        <AnalisDetailHeader detail={detail} onBack={onBack} />

        <AnalisAssignmentInfoSection
          detail={detail}
          resultRows={resultRows}
          worksheetForm={worksheetForm}
          setWorksheetForm={setWorksheetForm}
          canEditWorksheetMeta={canEditWorksheetMeta}
          showDhlScientificHelper={showDhlScientificHelper}
          setShowDhlScientificHelper={setShowDhlScientificHelper}
          handleInsertDhlSymbol={handleInsertDhlSymbol}
        />

        <AnalisReadOnlyNotice isReadOnly={isReadOnly} isLhuLocked={isLhuLocked} detail={detail} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.4fr]">
          <AnalisWorksheetFileSection
            fileInputRef={fileInputRef}
            worksheetFiles={worksheetFiles}
            uploading={uploading}
            isReadOnly={isReadOnly}
            onWorksheetFileChange={handleWorksheetFileChange}
            onOpenPreview={handleOpenPreview}
            onRemoveWorksheetFile={handleRemoveWorksheetFile}
          />

          <AnalisResultSection
            detail={detail}
            resultRows={resultRows}
            setResultRows={setResultRows}
            progressStats={progressStats}
            canEditResultRow={canEditResultRow}
            isRevisionMode={isRevisionMode}
            hasSpecificRevisionRows={hasSpecificRevisionRows}
            isReadOnly={isReadOnly}
            isLhuLocked={isLhuLocked}
            savingResults={savingResults}
            submitting={submitting}
            onSaveResults={handleSaveResults}
            onSubmitWorksheet={handleSubmitWorksheet}
          />
        </div>
      </div>
    </main>
  );
}
