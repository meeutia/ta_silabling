import { CheckCircle, ChevronDown, ChevronUp, Loader2, Package } from 'lucide-react';
import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import { showSuccess } from '../../../utils/feedback';
import { WADAH_OPTIONS, PERLAKUAN_PENGAWETAN_OPTIONS } from './adminPermohonanConstants';

function SharedSamplingDateField({
  sampelFormList,
  setSampelFormList,
  setSampleReceiptError,
}) {
  if (sampelFormList.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-emerald-200 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tanggal Pengambilan Sampel <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={sampelFormList[0]?.tanggal_pengambilan_sampel || ''}
          onChange={(e) => {
            const nextDate = e.target.value;
            setSampleReceiptError('');
            const newList = sampelFormList.map((form) => ({
              ...form,
              tanggal_pengambilan_sampel: nextDate
            }));
            setSampelFormList(newList);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
        />
      </div>
    </div>
  );
}

function SampleReceiptFormCard({ sampelForm, idx, sampelFormList, setSampelFormList, setSampleReceiptError }) {
  const updateField = (field, value, aliases = []) => {
    setSampleReceiptError?.('');
    const newList = [...sampelFormList];
    newList[idx] = {
      ...newList[idx],
      [field]: value,
    };

    aliases.forEach((alias) => {
      newList[idx][alias] = value;
    });

    setSampelFormList(newList);
  };

  return (
    <div
      key={`${sampelForm.id_fppl_sampel}-${sampelForm.sample_unit_index}-${idx}`}
      className="border border-gray-200 rounded-lg p-6 bg-gray-50 mb-6"
    >
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900">{sampelForm.sample_label}</h4>
        <p className="text-sm text-gray-600">Jenis: {sampelForm.sample_type_name}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Abnormalitas Sampel
        </label>
        <textarea
          value={sampelForm.catatan}
          onChange={(e) => updateField('catatan', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          placeholder="Abnormalitas sampel bila ada..."
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Acuan Pengambilan Sampel <span className="text-red-500">*</span>
        </label>
        <textarea
          value={sampelForm.acuan_pengambilan_sampel || ''}
          onChange={(e) => updateField('acuan_pengambilan_sampel', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          placeholder="Acuan pengambilan sampel..."
        />
      </div>


      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lokasi Spesifik <span className="text-red-500">*</span>
        </label>
        <textarea
          value={sampelForm.lokasi_spesifik || ''}
          onChange={(e) => updateField('lokasi_spesifik', e.target.value, ['lokasiSpesifik'])}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          placeholder="Contoh: Outlet IPAL belakang gedung produksi..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Koordinat (DMS) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={sampelForm.koordinat}
          onChange={(e) => updateField('koordinat', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          placeholder={`S/N 00°18'48.2" E 100°01'49.3"`}
        />
        <p className="text-xs text-gray-500 mt-1">{`Format: S/N 00°18'48.2" E 100°01'49.3"`}</p>
      </div>

      {sampelForm.parameters?.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
             <h5 className="font-medium text-gray-900 text-sm">Rangkaian Pengamanan Sampel</h5>
             <button
               type="button"
               onClick={() => {
                 setSampleReceiptError?.('');
                 const newList = [...sampelFormList];
                 const currentParams = JSON.parse(JSON.stringify(sampelForm.parameters));
                 newList.forEach((form, fIdx) => {
                   if (fIdx !== idx && form.id_jenis_sampel === sampelForm.id_jenis_sampel) {
                     form.parameters = JSON.parse(JSON.stringify(currentParams));
                   }
                 });
                 setSampelFormList(newList);
                 showSuccess('Konfigurasi pengamanan disalin ke sampel sejenis.');
               }}
               className="text-xs text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 transition-colors"
             >
               Terapkan ke Semua Sampel Sejenis
             </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Parameter</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 w-40">Acuan Metode</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 w-44">Wadah</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 w-32">Volume (mL)</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 w-64">Perlakuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sampelForm.parameters.map((param, pIdx) => (
                  <tr key={param.id_fppl_parameter_metode}>
                    <td className="px-4 py-2 text-gray-900 font-medium">{param.nama_parameter}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-gray-500 font-mono">{param.acuan_metode && param.acuan_metode !== '-' ? param.acuan_metode : ''}</span>
                      {param.nama_metode && param.nama_metode !== '-' && (
                        <p className="text-xs text-gray-400 mt-0.5">{param.nama_metode}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={param.wadah || ''}
                        onChange={(e) => {
                          const newList = [...sampelFormList];
                          newList[idx].parameters[pIdx].wadah = e.target.value;
                          setSampelFormList(newList);
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="" disabled>Pilih wadah</option>
                        {WADAH_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" 
                          min={0}
                          max={65535}
                          value={param.volume_ml || ''}
                          onChange={(e) => {
                            const newList = [...sampelFormList];
                            newList[idx].parameters[pIdx].volume_ml = e.target.value;
                            setSampelFormList(newList);
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-transparent outline-none"
                          placeholder="500"
                        />
                        <span className="text-gray-500 text-sm">mL</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={param.perlakuan_pengawetan || ''}
                        onChange={(e) => {
                          const newList = [...sampelFormList];
                          newList[idx].parameters[pIdx].perlakuan_pengawetan = e.target.value;
                          setSampelFormList(newList);
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="" disabled>Pilih perlakuan</option>
                        {PERLAKUAN_PENGAWETAN_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminPermohonanSampleReceiptSection({
  selectedRequest,
  expandedSection,
  toggleSection,
  sampelRef,
  sampelFormList,
  setSampelFormList,
  setSampleReceiptError,
  sampleReceiptError,
  generateSampleIds,
  saving,
}) {
  const normalizedStatus = normalizeFpplStatus(selectedRequest.status_fppl);
  const canReceiveSample =
    normalizedStatus === FPPL_STATUSES.MENUNGGU_SAMPEL &&
    sampelFormList.length > 0;

  const sampleReceiptInfoMessage = (() => {
    if (
      normalizedStatus === FPPL_STATUSES.MENUNGGU_PEMBAYARAN ||
      normalizedStatus === FPPL_STATUSES.MENUNGGU_VERIFIKASI_PEMBAYARAN
    ) {
      return 'Sampel belum bisa diterima. Jadwal boleh ditetapkan lebih dulu, tetapi penerimaan sampel tetap menunggu pembayaran gateway lunas atau Bayar Nanti dari admin.';
    }

    if (normalizedStatus !== FPPL_STATUSES.MENUNGGU_SAMPEL) {
      return 'Penerimaan sampel hanya tersedia saat status permohonan menunggu pengambilan/pengantaran sampel.';
    }

    if (sampelFormList.length === 0) {
      return 'Tetapkan jadwal pengambilan/pengantaran sampel terlebih dahulu untuk memulai penerimaan sampel.';
    }

    return 'Sampel telah diserahkan ke Penyelia untuk proses pengujian.';
  })();

  return (
    <div ref={sampelRef} className="bg-white rounded-xl mb-4 shadow-sm border border-gray-100 transition-all">
      <button
        onClick={() => toggleSection('sampel')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">Penerimaan Sampel</h2>
        </div>
        {expandedSection === 'sampel' ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expandedSection === 'sampel' && (
        <div className="px-6 pb-6 space-y-6">
          {canReceiveSample ? (
            <>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-800">
                  Isi data acuan, lokasi spesifik, koordinat, dan tanggal pengambilan. Tanggal/jam penerimaan dicatat otomatis saat generate nomor sampel.
                </p>
              </div>

              <SharedSamplingDateField
                sampelFormList={sampelFormList}
                setSampelFormList={setSampelFormList}
                setSampleReceiptError={setSampleReceiptError}
              />

              {sampleReceiptError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{sampleReceiptError}</p>
                </div>
              )}

              <div className="space-y-8">
                {sampelFormList.map((sampelForm, idx) => (
                  <SampleReceiptFormCard
                    key={`${sampelForm.id_fppl_sampel}-${sampelForm.sample_unit_index}-${idx}`}
                    sampelForm={sampelForm}
                    idx={idx}
                    sampelFormList={sampelFormList}
                    setSampelFormList={setSampelFormList}
                    setSampleReceiptError={setSampleReceiptError}
                  />
                ))}
              </div>

              <button
                onClick={generateSampleIds}
                disabled={saving || !!sampleReceiptError}
                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {saving ? 'Generate Nomor Sampel...' : 'Simpan & Generate Nomor Sampel'}
              </button>
            </>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">
                ✓ {sampleReceiptInfoMessage}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
