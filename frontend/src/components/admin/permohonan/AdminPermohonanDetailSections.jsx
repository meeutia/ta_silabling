import { CheckCircle, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';
import {
  formatCurrency,
  getAccreditationLabel,
  getActualSamples,
  getLabCapabilityLabel,
  getMethodName,
  getMethodReference,
  getParameterName,
  getPriceValue,
  getRegBmLabel,
  getRequestSamples,
  getRequestSampleTypeName,
  getSampleParameterMethods,
  renderLabCapabilityCell,
} from './adminPermohonanHelpers';



const pickFirstFilledValue = (...values) => {
  for (const value of values.flat()) {
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
};

const getSampleReceiptDate = (sample = {}) => pickFirstFilledValue(
  sample?.diterima_pada,
  sample?.diterimaPada,
  sample?.tanggal_penerimaan,
  sample?.tanggalPenerimaan,
  sample?.tanggal_terima,
  sample?.tanggalTerima,
  sample?.tanggal_diterima,
  sample?.tanggalDiterima
);

const getSampleReceiptTime = (sample = {}) => pickFirstFilledValue(
  sample?.jam_penerimaan,
  sample?.jamPenerimaan,
  sample?.jam_terima,
  sample?.jamTerima
);

const getSamplePickupDate = (sample = {}) => pickFirstFilledValue(
  sample?.tanggal_pengambilan_sampel,
  sample?.tanggalPengambilanSampel,
  sample?.tanggal_pengambilan,
  sample?.tanggalPengambilan
);

const getRequestLevelSampleDates = (request = {}) => {
  const actualSamples = getRequestSamples(request).flatMap((requestSample) => getActualSamples(requestSample));
  const pickupDate = pickFirstFilledValue(actualSamples.map((sample) => getSamplePickupDate(sample)));
  const receiptSample = actualSamples.find((sample) => getSampleReceiptDate(sample));

  return {
    pickupDate,
    receiptDate: getSampleReceiptDate(receiptSample || {}),
    receiptTime: getSampleReceiptTime(receiptSample || {}),
  };
};

function formatSampleTypeHeading(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text === '-') return 'Sampel';
  const withoutDoubleAir = text.replace(/^air\s+air\s+/i, 'Air ');
  return /^air(\b|\s)/i.test(withoutDoubleAir) ? withoutDoubleAir : `Air ${withoutDoubleAir}`;
}

const getLhuIdentityKey = (lhu = {}) => String(
  lhu?.nomor_lhu ||
  lhu?.nomorLhu ||
  lhu?.no_lhu ||
  lhu?.noLhu ||
  lhu?.id_lhu ||
  lhu?.idLhu ||
  ''
).trim();

const dedupeLhuArray = (items = []) => {
  const map = new Map();
  (Array.isArray(items) ? items : []).filter(Boolean).forEach((item, index) => {
    const key = getLhuIdentityKey(item) || `lhu-index-${index}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
};

const toLhuArray = (value) => {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  return dedupeLhuArray(rows);
};

function getSampleLhus(actualSample = {}, rowLhus = null, rowLhu = null) {
  const fromRow = dedupeLhuArray(Array.isArray(rowLhus) ? rowLhus.filter(Boolean) : []);
  if (fromRow.length > 0) return fromRow;

  const directRows = [
    actualSample?.lhus,
    actualSample?.Lhus,
    actualSample?.LhUs,
    actualSample?.lhu_list,
    actualSample?.lhuList,
  ].find((value) => Array.isArray(value));

  if (directRows) return dedupeLhuArray(directRows.filter(Boolean));

  return toLhuArray(
    rowLhu ||
    actualSample?.lhu ||
    actualSample?.Lhu ||
    actualSample?.LHU ||
    actualSample?.lhu_data ||
    null
  );
}

function buildAdminLhuDocumentRows(adminSampleRows = []) {
  const groupedByLhu = new Map();
  const samplesWithoutLhu = [];

  adminSampleRows.forEach(({ actualSample, sampleTypeName, lhus, lhu, key }) => {
    const sampleNo = actualSample?.no_sampel || '-';
    const sampleItem = {
      key: `${key || sampleNo}-${sampleNo}`,
      no_sampel: sampleNo,
      jenis_sampel: sampleTypeName || '-',
    };

    const sampleLhus = getSampleLhus(actualSample, lhus, lhu);

    if (sampleLhus.length === 0) {
      samplesWithoutLhu.push(sampleItem);
      return;
    }

    sampleLhus.forEach((lhuItem) => {
      const nomorLhu = lhuItem?.nomor_lhu || lhuItem?.nomorLhu;
      if (!nomorLhu) {
        samplesWithoutLhu.push(sampleItem);
        return;
      }

      if (!groupedByLhu.has(nomorLhu)) {
        groupedByLhu.set(nomorLhu, {
          key: `lhu-${nomorLhu}`,
          nomor_lhu: nomorLhu,
          lhu: lhuItem,
          samples: [],
          sampleKeySet: new Set(),
          sampleTypeSet: new Set(),
        });
      }

      const group = groupedByLhu.get(nomorLhu);
      if (!group.sampleKeySet.has(sampleNo)) {
        group.samples.push(sampleItem);
        group.sampleKeySet.add(sampleNo);
      }
      if (sampleItem.jenis_sampel && sampleItem.jenis_sampel !== '-') {
        group.sampleTypeSet.add(sampleItem.jenis_sampel);
      }
    });
  });

  const lhuRows = Array.from(groupedByLhu.values()).map((group) => ({
    ...group,
    sample_types: Array.from(group.sampleTypeSet),
  }));

  if (samplesWithoutLhu.length > 0) {
    lhuRows.push({
      key: 'lhu-belum-ada',
      nomor_lhu: '-',
      lhu: null,
      samples: samplesWithoutLhu,
      sample_types: Array.from(new Set(samplesWithoutLhu.map((sample) => sample.jenis_sampel).filter(Boolean))),
    });
  }

  return lhuRows;
}

export function TimelineStatusSection({ expandedSection, toggleSection, timelineItems }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 transition-all">
      <button
        onClick={() => toggleSection('timeline')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Timeline Status
          </h2>
        </div>

        {expandedSection === 'timeline' ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expandedSection === 'timeline' && (
        <div className="px-6 pb-6">
          {timelineItems.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-center">
              <Clock className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <p className="font-medium text-gray-900">
                Timeline belum tersedia
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Timeline akan muncul setelah permohonan mulai diproses.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {timelineItems.map((item, idx) => (
                <div key={`${item.type}-${item.status}-${idx}`} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />

                    {idx !== timelineItems.length - 1 && (
                      <div className="w-0.5 h-12 bg-emerald-200" />
                    )}
                  </div>

                  <div className="flex-1 pb-4">
                    <p className="font-medium text-gray-900">
                      {item.status}
                    </p>

                    <p className="text-sm text-gray-600 mt-1">
                      {item.note}
                    </p>

                    {item.date ? (
                      <p className="text-xs text-gray-500 mt-1">
                        {item.date}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SampleParameterDetailSection({
  sectionRef,
  selectedRequest,
  expandedSection,
  toggleSection,
  formatDate,
  formatDateTime,
}) {
  const requestSamples = getRequestSamples(selectedRequest);
  const requestSampleDates = getRequestLevelSampleDates(selectedRequest);

  return (
    <div ref={sectionRef} className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 transition-all">
      <button
        onClick={() => toggleSection('info')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">Detail Sampel & Parameter</h2>
        </div>
        {expandedSection === 'info' ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expandedSection === 'info' && (
        <div className="px-6 pb-6">
          {requestSamples.length > 0 ? (
            <div className="space-y-6">
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-900">Tanggal Pengambilan :</span>{' '}
                  {formatDate(requestSampleDates.pickupDate)}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Tanggal Penerimaan :</span>{' '}
                  {formatDateTime(requestSampleDates.receiptDate, requestSampleDates.receiptTime)}
                </p>
              </div>

              {requestSamples.map((requestSample, idx) => {
                const actualSamples = getActualSamples(requestSample);
                const parameterMethods = getSampleParameterMethods(requestSample);
                const sampleTypeName = getRequestSampleTypeName(requestSample);

                return (
                  <div
                    key={requestSample.id_fppl_sampel || idx}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {formatSampleTypeHeading(sampleTypeName)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Standar: {getRegBmLabel(requestSample)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Jumlah sampel: {requestSample.jumlah_sampel || 1}
                        </p>
                      </div>
                    </div>

                    {actualSamples.length > 0 ? (
                      <div className="space-y-5">
                        {actualSamples.map((actualSample, sampleIdx) => (
                          <div
                            key={actualSample.no_sampel || `${requestSample.id_fppl_sampel}-${sampleIdx}`}
                            className="rounded-lg border border-gray-200 bg-white p-4"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {actualSample.no_sampel || `${sampleTypeName} ${sampleIdx + 1}`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Status Sampel: {actualSample.status_sample || '-'}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                              <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-gray-500">Kondisi Sampel</p>
                                <p className="font-medium text-gray-900">
                                  {actualSample.kondisi_sampel || '-'}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-gray-500">Lokasi Spesifik</p>
                                <p className="font-medium text-gray-900 break-words">
                                  {actualSample.lokasi_spesifik || actualSample.lokasiSpesifik || '-'}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-gray-500">Koordinat</p>
                                <p className="font-medium text-gray-900 break-words">
                                  {actualSample.koordinat || '-'}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50 p-3 md:col-span-2">
                                <p className="text-gray-500">Abnormalitas Sampel</p>
                                <p className="font-medium text-gray-900">
                                  {actualSample.abnormalitas_sampel || actualSample.abnormalitasSampel || '-'}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50 p-3 md:col-span-2">
                                <p className="text-gray-500">Acuan Pengambilan Sampel</p>
                                <p className="font-medium text-gray-900">
                                  {actualSample.acuan_pengambilan_sampel || actualSample.acuanPengambilanSampel || '-'}
                                </p>
                              </div>
                            </div>

                            <ParameterMethodTable
                              parameterMethods={parameterMethods}
                              useRenderedLabCapability={false}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-800 mb-3">
                          Sampel aktual belum diterima/generate nomor sampel.
                        </p>

                        <ParameterMethodTable
                          parameterMethods={parameterMethods}
                          useRenderedLabCapability
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Tidak ada data sampel.</p>
          )}
        </div>
      )}
    </div>
  );
}

function hasDeterminedMethod(sampleParameterMethod) {
  const methodName = String(getMethodName(sampleParameterMethod) || '').trim();
  return Boolean(methodName && methodName !== '-' && methodName.toLowerCase() !== 'belum ditentukan');
}

function ParameterMethodTable({ parameterMethods, useRenderedLabCapability = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm border border-gray-200 rounded-lg overflow-hidden bg-white">
        <thead className="bg-emerald-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Parameter</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Metode</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Harga</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Kemampuan Lab</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Acuan</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Akreditasi</th>
          </tr>
        </thead>
        <tbody>
          {parameterMethods.length > 0 ? (
            parameterMethods.map((sampleParameterMethod) => {
              const methodDetermined = hasDeterminedMethod(sampleParameterMethod);

              return (
                <tr
                  key={sampleParameterMethod.id_fppl_parameter_metode}
                  className="border-t border-gray-200"
                >
                  <td className="px-3 py-2 text-gray-900">
                    {getParameterName(sampleParameterMethod)}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {methodDetermined ? getMethodName(sampleParameterMethod) : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {methodDetermined ? formatCurrency(getPriceValue(sampleParameterMethod)) : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {methodDetermined
                      ? (useRenderedLabCapability
                        ? renderLabCapabilityCell(sampleParameterMethod)
                        : getLabCapabilityLabel(sampleParameterMethod))
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {methodDetermined ? getMethodReference(sampleParameterMethod) : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    {methodDetermined ? getAccreditationLabel(sampleParameterMethod) : '-'}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-3 py-3 text-center text-gray-500">
                Belum ada parameter/metode.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function LhuDocumentSection({
  expandedSection,
  toggleSection,
  adminSampleRows,
  getLhuFilePath,
  getLhuStatusBadge,
  formatDate,
  openGeneratedFile,
}) {
  const lhuDocumentRows = buildAdminLhuDocumentRows(adminSampleRows);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 transition-all">
      <button
        onClick={() => toggleSection('dokumen-lhu')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">Dokumen LHU</h2>
        </div>
        {expandedSection === 'dokumen-lhu' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>

      {expandedSection === 'dokumen-lhu' && (
        <div className="px-6 pb-6">
          <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Dokumen LHU ditampilkan berdasarkan <span className="font-semibold">Nomor LHU</span>. Satu LHU dapat memuat lebih dari satu sampel selama masih dalam permohonan/FPPL yang sama.
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-emerald-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nomor LHU</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">No. Sampel</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Jenis Sampel</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status LHU</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Tanggal Terbit</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {adminSampleRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Belum ada sampel aktual.
                    </td>
                  </tr>
                ) : lhuDocumentRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Belum ada data dokumen LHU.
                    </td>
                  </tr>
                ) : (
                  lhuDocumentRows.map((row) => {
                    const filePath = getLhuFilePath(row.lhu);

                    return (
                      <tr key={row.key} className="align-top">
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          {row.nomor_lhu || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          <div className="space-y-1">
                            {row.samples.map((sample) => (
                              <div key={`${row.key}-${sample.no_sampel}`} className="font-medium">
                                {sample.no_sampel || '-'}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="space-y-1">
                            {(row.sample_types?.length ? row.sample_types : ['-']).map((jenisSampel) => (
                              <div key={`${row.key}-${jenisSampel}`}>
                                {jenisSampel || '-'}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getLhuStatusBadge(row.lhu?.status_lhu || row.lhu?.statusLhu || 'Belum Ada LHU')}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatDate(row.lhu?.tanggal_penerbitan || row.lhu?.tanggalPenerbitan || row.lhu?.qc_at || row.lhu?.qcAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {filePath ? (
                            <button
                              type="button"
                              onClick={() => openGeneratedFile(filePath)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700"
                            >
                              <FileText className="h-4 w-4" />
                              Buka PDF
                            </button>
                          ) : (
                            <span className="text-gray-400">Belum tersedia</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function LhuPickupInfoSection({
  expandedSection,
  toggleSection,
  pickupInfo,
  getPickupStatusBadge,
  formatDate,
  formatDateTime,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 transition-all">
      <button
        onClick={() => toggleSection('pengambilan-lhu')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">Pengambilan LHU</h2>
        </div>
        {expandedSection === 'pengambilan-lhu' ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>

      {expandedSection === 'pengambilan-lhu' && (
        <div className="px-6 pb-6">
          {pickupInfo ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Status Pengambilan LHU</h4>
                  <p className="mt-1 text-sm text-gray-600">
                    Informasi jadwal dan riwayat pengambilan LHU untuk permohonan ini.
                  </p>
                </div>
                {getPickupStatusBadge(pickupInfo.status_pengambilan)}
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="rounded-lg bg-white p-4 border border-gray-200">
                  <p className="text-gray-500">Jadwal Pengambilan</p>
                  <p className="font-medium text-gray-900">
                    {formatDateTime(pickupInfo.tanggal_pengambilan, pickupInfo.jam_pengambilan)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-gray-200">
                  <p className="text-gray-500">Dijadwalkan Pada</p>
                  <p className="font-medium text-gray-900">{formatDate(pickupInfo.dijadwalkan_pada)}</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-gray-200">
                  <p className="text-gray-500">Nama Pengambil</p>
                  <p className="font-medium text-gray-900">{pickupInfo.nama_pengambil || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-gray-200">
                  <p className="text-gray-500">Diambil Pada</p>
                  <p className="font-medium text-gray-900">{formatDate(pickupInfo.diambil_pada)}</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-gray-200 md:col-span-2">
                  <p className="text-gray-500">Catatan</p>
                  <p className="font-medium text-gray-900">{pickupInfo.catatan || '-'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Jadwal pengambilan LHU belum dibuat untuk permohonan ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
