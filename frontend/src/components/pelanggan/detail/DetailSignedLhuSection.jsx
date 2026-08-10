import { FileText, ChevronUp, ChevronDown, Eye } from 'lucide-react';

export function DetailSignedLhuSection({
  expandedSection,
  toggleSection,
  requestData,
  onDownloadSignedLhu,
  getSampleTypeName,
  formatDate,
  requestSamples,
}) {
  const signedDocuments = (requestData?.lhu_signed_documents || []).filter(
    (doc) => doc.hasSignedFile
  );

  if (signedDocuments.length === 0) {
    return null; // Do not render if there are no signed LHUs
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 transition-all mt-4">
      <button
        onClick={() => toggleSection('lhu-signed')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Dokumen LHU Resmi
          </h2>
        </div>

        {expandedSection === 'lhu-signed' ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expandedSection === 'lhu-signed' && (
        <div className="px-6 pb-6">
          <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Dokumen LHU ditampilkan berdasarkan <span className="font-semibold">Nomor LHU</span>. Satu LHU dapat memuat lebih dari satu sampel selama masih dalam permohonan/FPPL yang sama.
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-emerald-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nomor LHU</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">No. Sampel</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Jenis Sampel</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Tanggal Terbit</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Dokumen LHU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {signedDocuments.map((doc, idx) => {
                  const sampleTypes = [];
                  if (requestSamples && doc.sampleNos?.length) {
                    const types = new Set();
                    doc.sampleNos.forEach(no => {
                      let foundJenisFs = null;
                      for (const fs of requestSamples) {
                        const innerSampels = Array.isArray(fs.sampels) ? fs.sampels : (Array.isArray(fs.Sampels) ? fs.Sampels : []);
                        if (innerSampels.some(is => is.no_sampel === no || is.noSampel === no)) {
                          foundJenisFs = fs;
                          break;
                        }
                      }
                      
                      if (foundJenisFs && getSampleTypeName) {
                        types.add(getSampleTypeName(foundJenisFs));
                      }
                    });
                    sampleTypes.push(...types);
                  }
                  if (sampleTypes.length === 0) sampleTypes.push('-');

                  return (
                    <tr key={`${doc.nomorLhu}-${idx}`} className="align-top hover:bg-emerald-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {doc.nomorLhu || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        <div className="space-y-1">
                          {(doc.sampleNos || []).map((no) => (
                            <div key={no} className="font-medium">
                              {no || '-'}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="space-y-1">
                          {sampleTypes.map((jenis) => (
                            <div key={jenis}>
                              {jenis}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {doc.tanggalPenerbitan && formatDate ? formatDate(doc.tanggalPenerbitan) : (doc.tanggalPenerbitan ? new Date(doc.tanggalPenerbitan).toLocaleDateString('id-ID') : '-')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => onDownloadSignedLhu(doc.nomorLhu)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100"
                            title="Lihat Dokumen LHU"
                          >
                            <Eye className="w-4 h-4" /> Lihat
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
