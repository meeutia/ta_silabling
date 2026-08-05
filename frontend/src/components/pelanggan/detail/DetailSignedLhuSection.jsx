import { FileText, ChevronUp, ChevronDown, Download } from 'lucide-react';

export function DetailSignedLhuSection({
  expandedSection,
  toggleSection,
  requestData,
  onDownloadSignedLhu,
}) {
  const signedDocuments = (requestData?.lhu_signed_documents || []).filter(
    (doc) => doc.hasSignedFile
  );

  if (signedDocuments.length === 0) {
    return null; // Do not render if there are no signed LHUs
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden mt-4">
      <button
        onClick={() => toggleSection('lhu-signed')}
        className="w-full flex items-center justify-between p-6 text-left bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Dokumen LHU Resmi
            </h2>
            <p className="text-sm text-emerald-700 mt-1">
              File Laporan Hasil Uji (LHU) yang telah ditandatangani oleh Kepala Laboratorium.
            </p>
          </div>
        </div>

        {expandedSection === 'lhu-signed' ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expandedSection === 'lhu-signed' && (
        <div className="p-6 border-t border-emerald-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signedDocuments.map((doc, idx) => (
              <div
                key={`${doc.nomorLhu}-${idx}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {doc.nomorLhu || '-'}
                    </h3>
                    <p className="text-xs text-emerald-600 font-medium">
                      Dokumen resmi tersedia
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDownloadSignedLhu(doc.nomorLhu)}
                    className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors flex-shrink-0"
                    title="Unduh LHU Resmi"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                {doc.sampleNos && doc.sampleNos.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Sampel yang Dicakup:</p>
                    <ul className="space-y-1.5">
                      {doc.sampleNos.map((no, sIdx) => (
                        <li key={sIdx} className="text-sm text-gray-700 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="font-medium">{no}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
