import {
  getAbnormalitasSampel,
  getAccreditationBadge,
  getAcuanPengambilanSampel,
  getJamPenerimaanSampel,
  getNilaiBm,
  getSatuanBm,
  getSnapshotInsituLabel as getInsituLabel,
  getSnapshotSubkontrakLabel as getSubkontrakLabel,
  getTanggalPenerimaanSampel,
  getTanggalPengambilanSampel,
  pickRealValue,
  pickValue,
} from '../../lhu/lhuReviewUtils';
import {
  dedupeTextList,
  formatKoordinatLines,
  formatSampleFieldLines,
  formatSampleNoList,
  getDisplayNoSampel,
  getFullNoSampel,
  isRowTerakreditasi,
  joinIndentedLines,
  normalizeBakuMutuDisplay,
  normalizeSampleNoList
} from '../../lhu/lhuSampleDisplayUtils';

function InfoRow({ label, value, children, stacked = false }) {
  const content = children || value || '-';

  if (stacked) {
    return (
      <div className="border-b border-gray-100 py-2.5 last:border-b-0">
        <div
          className="grid items-start"
          style={{ gridTemplateColumns: '150px 12px minmax(0, 1fr)' }}
        >
          <span className="text-sm text-gray-600">{label}</span>
          <span className="text-center text-sm text-gray-500">:</span>
        </div>
        <div className="mt-1 min-w-0 whitespace-pre-wrap break-words text-sm font-medium text-gray-900">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid items-start border-b border-gray-100 py-2.5 last:border-b-0"
      style={{ gridTemplateColumns: '150px 12px minmax(0, 1fr)' }}
    >
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-center text-sm text-gray-500">:</span>
      <span className="min-w-0 whitespace-pre-wrap break-words pl-2 text-sm font-medium text-gray-900">
        {content}
      </span>
    </div>
  );
}

function DetailLhuTable({ details = [], sampleNos = [] }) {
  if (!details.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
        Detail LHU belum tersedia.
      </div>
    );
  }

  const hasValue = (value) =>
    value !== null &&
    value !== undefined &&
    String(value).trim() !== '';

  const orderedSampleNos = Array.isArray(sampleNos) && sampleNos.length
    ? sampleNos.filter(Boolean)
    : Array.from(
        new Set(
          details.flatMap((row) => row.samples || row.sampels || Object.keys(row.hasil_by_sample || row.hasilBySample || {}))
        )
      ).filter(Boolean);

  const displayedSampleNos = orderedSampleNos.length ? orderedSampleNos : ['-'];
  const hasilMinWidth = Math.max(110, displayedSampleNos.length * 92);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-collapse text-sm">
          <thead className="bg-emerald-600 text-white">
            <tr>
              <th rowSpan={2} className="w-[72px] border-r border-emerald-500 px-4 py-3 text-center font-semibold">No</th>
              <th rowSpan={2} className="min-w-[220px] border-r border-emerald-500 px-4 py-3 text-left font-semibold">Parameter</th>
              <th rowSpan={2} className="min-w-[230px] border-r border-emerald-500 px-4 py-3 text-left font-semibold">Metode</th>
              <th
                colSpan={displayedSampleNos.length}
                className="border-r border-emerald-500 px-4 py-2 text-center font-semibold"
                style={{ minWidth: `${hasilMinWidth}px` }}
              >
                Hasil
              </th>
              <th rowSpan={2} className="w-[110px] border-r border-emerald-500 px-4 py-3 text-center font-semibold">Satuan</th>
              <th rowSpan={2} className="w-[130px] border-r border-emerald-500 px-4 py-3 text-center font-semibold">Baku Mutu</th>
              <th rowSpan={2} className="w-[110px] border-r border-emerald-500 px-4 py-3 text-center font-semibold">Insitu</th>
              <th rowSpan={2} className="w-[120px] border-r border-emerald-500 px-4 py-3 text-center font-semibold">Subkontrak</th>
              <th rowSpan={2} className="w-[150px] px-4 py-3 text-center font-semibold">Akreditasi</th>
            </tr>
            <tr>
              {displayedSampleNos.map((sampleNo, sampleIndex) => (
                <th key={sampleNo || sampleIndex} className="min-w-[92px] border-r border-emerald-500 px-3 py-2 text-center font-semibold">
                  {getDisplayNoSampel(sampleNo)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {details.map((row, index) => {
              const parameter =
                row.nama_parameter_snapshot ||
                row.namaParameterSnapshot ||
                row.nama_parameter ||
                row.namaParameter ||
                '-';

              const metode =
                row.metode_snapshot ||
                row.metodeSnapshot ||
                row.nama_metode ||
                row.namaMetode ||
                row.metode ||
                '-';

              const acuan =
                row.acuan_metode_snapshot ||
                row.acuanMetodeSnapshot ||
                row.acuan_metode ||
                row.acuanMetode ||
                '';

              const hasilBySample = row.hasil_by_sample || row.hasilBySample || {};
              const nilaiBm = getNilaiBm(row);
              const satuanBm = getSatuanBm(row);
              const insituLabel = getInsituLabel(row);
              const subkontrakLabel = getSubkontrakLabel(row);
              const isTerakreditasi = isRowTerakreditasi(row) ? 1 : 0;

              return (
                <tr key={`${row.id_fppl_parameter_metode || row.idFpplParameterMetode || row.id_metode_parameter || row.idMetodeParameter || index}-${parameter}`} className="hover:bg-gray-50">
                  <td className="border-r border-gray-200 px-4 py-3 text-center text-gray-500">
                    <span className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                      {index + 1}
                    </span>
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 font-medium text-gray-900">{parameter}</td>
                  <td className="border-r border-gray-200 px-4 py-3 text-gray-700">
                    <p>{metode}</p>
                    {acuan && <p className="mt-1 text-xs text-gray-500">{acuan}</p>}
                  </td>
                  {displayedSampleNos.map((sampleNo) => {
                    const value = sampleNo === '-' ? (row.hasil_snapshot || row.hasilSnapshot || row.hasil) : hasilBySample[sampleNo];
                    return (
                      <td key={sampleNo} className="border-r border-gray-200 px-3 py-3 text-center font-semibold text-gray-900">
                        {hasValue(value) ? value : <span className="text-gray-400">-</span>}
                      </td>
                    );
                  })}
                  <td className="border-r border-gray-200 px-4 py-3 text-center text-gray-700">{satuanBm || '-'}</td>
                  <td className="border-r border-gray-200 px-4 py-3 text-center text-gray-700">
                    <span className="font-semibold">{normalizeBakuMutuDisplay(nilaiBm)}</span>
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 text-center">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{insituLabel}</span>
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${subkontrakLabel === 'Ya' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                      {subkontrakLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAccreditationBadge(isTerakreditasi)}`}>
                      {isTerakreditasi === 1 ? 'Terakreditasi' : 'Tidak'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DetailLhuTable, InfoRow };
