import { AlertCircle, CheckCircle, GripVertical } from 'lucide-react';
import {
  getAccreditationBadge,
  getNilaiBm,
  getSatuanBm,
  getInsituLabel,
  getSubkontrakLabel,
} from '../../lhu/lhuReviewUtils';
import {
  getDisplayNoSampel,
  isRowInsitu,
  isRowSubkontrak,
  isRowTerakreditasi,
  normalizeBakuMutuDisplay,
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

function isSampleAlreadyInLhu(sample = {}) {
  return Boolean(sample.nomorLhu || sample.nomor_lhu || sample.idLhu || sample.id_lhu);
}

function isSampleLockedForQc(sample = {}) {
  return isSampleAlreadyInLhu(sample);
}

function ParameterStatusBadges({ row }) {
  const terakreditasi = isRowTerakreditasi(row);
  const insitu = isRowInsitu(row);
  const subkontrak = isRowSubkontrak(row);

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAccreditationBadge(terakreditasi ? 1 : 0)}`}>
        {terakreditasi ? 'Terakreditasi' : 'Belum Terakreditasi'}
      </span>
      {insitu && (
        <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
          In situ
        </span>
      )}
      {subkontrak && (
        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
          Subkontrak
        </span>
      )}
    </div>
  );
}

function DetailLhuTable({
  details = [],
  editableOrder = false,
  onMoveRow,
  sampleNos = [],
  onMoveSample,
}) {
  if (!details.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
        Detail LHU belum tersedia. Pilih sampel dan paket baku mutu untuk menampilkan preview detail LHU.
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
              <th rowSpan={2} className="w-[92px] border-r border-emerald-500 px-4 py-3 text-center font-semibold">Urutan</th>
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
                <th
                  key={sampleNo || sampleIndex}
                  draggable={editableOrder && orderedSampleNos.length > 1}
                  onDragStart={(event) => {
                    if (!editableOrder || orderedSampleNos.length <= 1) return;
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/qc-sample-index', String(sampleIndex));
                  }}
                  onDragOver={(event) => {
                    if (!editableOrder || orderedSampleNos.length <= 1) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    if (!editableOrder || orderedSampleNos.length <= 1) return;
                    event.preventDefault();
                    event.stopPropagation();
                    const fromIndex = Number(event.dataTransfer.getData('text/qc-sample-index'));
                    if (Number.isFinite(fromIndex)) onMoveSample?.(fromIndex, sampleIndex);
                  }}
                  className={`min-w-[92px] border-r border-emerald-500 px-3 py-2 text-center font-semibold ${editableOrder && orderedSampleNos.length > 1 ? 'cursor-move hover:bg-emerald-700' : ''}`}
                  title={editableOrder && orderedSampleNos.length > 1 ? 'Seret untuk mengatur urutan kolom sampel' : undefined}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    {editableOrder && orderedSampleNos.length > 1 && <GripVertical className="h-3.5 w-3.5 text-white" />}
                    {getDisplayNoSampel(sampleNo)}
                  </span>
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
                <tr
                  key={`${row.id_fppl_parameter_metode || row.idFpplParameterMetode || row.id_metode_parameter || row.idMetodeParameter || index}-${parameter}`}
                  draggable={editableOrder}
                  onDragStart={(event) => {
                    if (!editableOrder) return;
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/qc-parameter-index', String(index));
                  }}
                  onDragOver={(event) => {
                    if (!editableOrder) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    if (!editableOrder) return;
                    event.preventDefault();
                    const fromIndex = Number(event.dataTransfer.getData('text/qc-parameter-index'));
                    if (Number.isFinite(fromIndex)) onMoveRow?.(fromIndex, index);
                  }}
                  className={`hover:bg-gray-50 ${editableOrder ? 'cursor-move' : ''}`}
                >
                  <td className="border-r border-gray-200 px-4 py-3 text-center text-gray-500">
                    <span className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                      {editableOrder && <GripVertical className="h-3.5 w-3.5" />}
                      {index + 1}
                    </span>
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 font-medium text-gray-900">{parameter}</td>
                  <td className="border-r border-gray-200 px-4 py-3 text-gray-700">
                    <p>{metode}</p>
                    {acuan && <p className="mt-1 text-xs text-gray-500">{acuan}</p>}
                  </td>
                  {displayedSampleNos.map((sampleNo) => {
                    const value = sampleNo === '-' ? null : hasilBySample[sampleNo];
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
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        subkontrakLabel === 'Ya' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
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

function AccreditationInfo({ akreditasi }) {
  if (!akreditasi) return null;

  const total = akreditasi.totalParameter || akreditasi.total_parameter || 0;
  const totalTerakreditasi = akreditasi.totalTerakreditasi || akreditasi.total_terakreditasi || 0;
  const persentase =
    akreditasi.persentase ||
    akreditasi.persentaseTerakreditasi ||
    akreditasi.persentase_terakreditasi ||
    0;
  const showLogo = Boolean(akreditasi.showLogoKan || akreditasi.show_logo_kan);

  return (
    <div className={`rounded-lg border p-4 ${showLogo ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex gap-3">
        {showLogo ? (
          <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
        )}
        <div>
          <p className={`font-semibold ${showLogo ? 'text-emerald-800' : 'text-amber-800'}`}>Akreditasi Parameter</p>
          <p className={`mt-1 text-sm ${showLogo ? 'text-emerald-700' : 'text-amber-700'}`}>
            {totalTerakreditasi} dari {total} parameter terakreditasi ({persentase}%).
            {showLogo ? ' Logo KAN dapat tampil saat LHU disahkan.' : ' Logo KAN belum tampil karena kurang dari 60%.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export { AccreditationInfo, DetailLhuTable, InfoRow, isSampleAlreadyInLhu, isSampleLockedForQc };
