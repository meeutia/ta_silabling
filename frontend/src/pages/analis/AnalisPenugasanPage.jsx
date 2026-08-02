import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { analisAssignmentApi } from '../../api/analisAssignmentApi';
import { getApiErrorMessage } from '../../api/httpClient';
import { DashboardMetricCard } from '../../components/common/DashboardWidgets';

function formatDateOnly(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}


function firstNonEmptyText(values = []) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }

  return '';
}

function cleanRevisionNoteText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      !/^Respon\s+Penyelia\s*:/i.test(line) &&
      !/^Keputusan\s+Penyelia\s*:/i.test(line) &&
      !/^Catatan\s+Penyelia\s*:/i.test(line)
    )
    .join('\n')
    .trim();
}

function splitSampleNumbers(value) {
  if (Array.isArray(value)) {
    return value.flatMap(splitSampleNumbers);
  }

  if (value === null || value === undefined) return [];

  return String(value)
    .split(/[,;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDetailSampleNumbers(row = {}) {
  const candidates = [
    row.sampleNos,
    row.sample_nos,
    row.noSampelList,
    row.no_sampel_list,
    row.nomorSampelList,
    row.nomor_sampel_list,
    row.noSampel,
    row.no_sampel,
    row.nomorSampel,
    row.nomor_sampel,
  ];

  const sampleNumbers = candidates.flatMap(splitSampleNumbers);

  if (Array.isArray(row.samples)) {
    sampleNumbers.push(
      ...row.samples.flatMap((sample) => splitSampleNumbers(sample.noSampel || sample.no_sampel))
    );
  }

  return Array.from(new Set(sampleNumbers));
}

function getUniqueSampleCount(details = []) {
  const sampleNumberSet = new Set();

  details.forEach((detail) => {
    (detail.sampleNos || []).forEach((noSampel) => {
      const text = String(noSampel || '').trim();
      if (text) sampleNumberSet.add(text);
    });
  });

  if (sampleNumberSet.size > 0) return sampleNumberSet.size;

  return details.reduce((sum, detail) => sum + Number(detail.totalSampel || 0), 0);
}

function formatDetailSampleText(detail = {}) {
  const sampleNos = detail.sampleNos || [];

  if (sampleNos.length > 0) return sampleNos.join(', ');

  return Number(detail.totalSampel || 0) || '-';
}

function stripPenyeliaResponsePrefix(value) {
  return String(value || '')
    .replace(/^Respon\s+Penyelia\s*:/i, '')
    .replace(/^Catatan\s+Penyelia\s*:/i, '')
    .trim();
}

function extractPenyeliaResponseFromText(value) {
  const line = String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => /^Respon\s+Penyelia\s*:/i.test(item) || /^Catatan\s+Penyelia\s*:/i.test(item));

  return stripPenyeliaResponsePrefix(line || '');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getStatusBadge(status) {
  if (status === 'Perlu Revisi') {
    return 'bg-red-100 text-red-700 border border-red-200';
  }

  if (status === 'Worksheet Terkirim' || status === 'Menunggu Review') {
    return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
  }

  if (status === 'Sedang Dikerjakan') {
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  }

  if (status === 'Disetujui' || status === 'Selesai') {
    return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  }

  return 'bg-amber-100 text-amber-700 border border-amber-200';
}

function isDoneStatus(status) {
  return ['Disetujui', 'Selesai'].includes(status);
}

function deriveGroupStatus(details = []) {
  const statuses = details.map((detail) => detail.statusDetail);

  if (statuses.some((status) => status === 'Perlu Revisi')) {
    return 'Perlu Revisi';
  }

  if (statuses.some((status) => status === 'Worksheet Terkirim')) {
    return 'Menunggu Review';
  }

  if (statuses.some((status) => status === 'Sedang Dikerjakan')) {
    return 'Sedang Dikerjakan';
  }

  if (
    statuses.length > 0 &&
    statuses.every((status) => isDoneStatus(status))
  ) {
    return 'Selesai';
  }

  return 'Ditugaskan';
}

function getDetailSortValue(detail) {
  const dateCandidates = [
    detail?.assignedAt,
    detail?.assigned_at,
    detail?.tanggalPenugasan,
    detail?.tanggal_penugasan,
    detail?.createdAt,
    detail?.created_at,
    detail?.updatedAt,
    detail?.updated_at,
    detail?.deadline,
    detail?.tanggalTenggat,
    detail?.tanggal_tenggat,
  ];

  for (const value of dateCandidates) {
    if (!value) continue;

    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }

  const fallbackNumber = String(
    detail?.idPenugasanDetail ||
      detail?.id_penugasan_detail ||
      detail?.idPenugasan ||
      detail?.id_penugasan ||
      ''
  )
    .match(/\d+/g)
    ?.join('');

  return Number(fallbackNumber || 0);
}

function buildDetailSearchText(detail) {
  return [
    detail.idPenugasan,
    detail.idPenugasanDetail,
    detail.parameter,
    detail.metode,
    detail.acuanMetode,
    detail.statusDetail,
    detail.noSampel,
    detail.no_sampel,
    detail.jenisSampel,
    detail.jenis_sampel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function buildGroupSearchText(group) {
  return [
    group.idPenugasan,
    group.statusRingkas,
    group.groupStatus,
    ...group.details.map(buildDetailSearchText),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function AnalisPenugasanPage({
  onViewDetail,
  initialSelectedAssignmentId = null,
  onClearInitialSelectedAssignment = () => {},
  onCloseSelectedAssignment = () => {},
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('saat_ini');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);

  const fetchMyAssignments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');

    try {
      const data = await analisAssignmentApi.getMyAssignments();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) setError(getApiErrorMessage(err, 'Gagal memuat tugas analis.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyAssignments();
  }, [fetchMyAssignments]);

  useAutoRefresh(fetchMyAssignments);

  const groupedAssignments = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      const idPenugasan = row.idPenugasan || row.id_penugasan;

      if (!idPenugasan) return;

      if (!map.has(idPenugasan)) {
        map.set(idPenugasan, {
          idPenugasan,
          catatanPenugasan: '',
          details: [],
          latestSortValue: 0,
        });
      }

      const sortValue = getDetailSortValue(row);
      const group = map.get(idPenugasan);
      const catatanPenugasan =
        row.catatanPenugasan ||
        row.catatan_penugasan ||
        row.penugasan?.catatanPenugasan ||
        row.penugasan?.catatan_penugasan ||
        '';

      if (!group.catatanPenugasan && catatanPenugasan) {
        group.catatanPenugasan = catatanPenugasan;
      }
      const detailKasiRevisionNote = cleanRevisionNoteText(firstNonEmptyText([
        row.catatanRevisiHasilKasiPengujian,
        row.catatan_revisi_hasil_kasi_pengujian,
        row.catatanRevisiKasiPengujian,
        row.catatan_revisi_kasi_pengujian,
        row.catatanRevisiItemKasiPengujian,
        row.catatan_revisi_item_kasi_pengujian,
        row.revisionNoteKasiPengujian,
        row.revision_note_kasi_pengujian,
      ]));
      const detailPenyeliaRevisionNote = cleanRevisionNoteText(firstNonEmptyText([
        row.catatanRevisiHasilPenyelia,
        row.catatan_revisi_hasil_penyelia,
        row.catatanRevisiPenyelia,
        row.catatan_revisi_penyelia,
        row.catatanRevisiItemPenyelia,
        row.catatan_revisi_item_penyelia,
        row.revisionNotePenyelia,
        row.revision_note_penyelia,
        !detailKasiRevisionNote ? row.catatanRevisiHasil : '',
        !detailKasiRevisionNote ? row.catatan_revisi_hasil : '',
        !detailKasiRevisionNote ? row.catatanRevisi : '',
        !detailKasiRevisionNote ? row.catatan_revisi : '',
        !detailKasiRevisionNote ? row.revisionNote : '',
        !detailKasiRevisionNote ? row.revision_note : '',
      ]));
      const detailRevisionNote = firstNonEmptyText([
        detailPenyeliaRevisionNote,
        detailKasiRevisionNote,
        row.catatanRevisiHasil,
        row.catatan_revisi_hasil,
        row.catatanRevisi,
        row.catatan_revisi,
        row.revisionNote,
        row.revision_note,
      ]);
      const detailPenyeliaResponseNote = firstNonEmptyText([
        stripPenyeliaResponsePrefix(row.catatanResponPenyelia),
        stripPenyeliaResponsePrefix(row.catatan_respon_penyelia),
        stripPenyeliaResponsePrefix(row.catatanTinjauanPenyelia),
        stripPenyeliaResponsePrefix(row.catatan_tinjauan_penyelia),
        stripPenyeliaResponsePrefix(row.revisionResponsePenyelia),
        stripPenyeliaResponsePrefix(row.revision_response_penyelia),
        extractPenyeliaResponseFromText(row.catatanRevisiHasil),
        extractPenyeliaResponseFromText(row.catatan_revisi_hasil),
        extractPenyeliaResponseFromText(row.revisionNote),
        extractPenyeliaResponseFromText(row.revision_note),
      ]);
      const detailSampleNos = getDetailSampleNumbers(row);

      group.details.push({
        ...row,
        idPenugasan,
        idPenugasanDetail:
          row.idPenugasanDetail || row.id_penugasan_detail,
        parameter: row.parameter || row.nama_parameter || '-',
        metode: row.metode || row.nama_metode || '-',
        acuanMetode: row.acuanMetode || row.acuan_metode || '-',
        deadline:
          row.deadline ||
          row.tanggalTenggat ||
          row.tanggal_tenggat ||
          null,
        totalSampel: Number(row.totalSampel || row.total_sampel || detailSampleNos.length || 0),
        sampleNos: detailSampleNos,
        sample_nos: detailSampleNos,
        totalHasil: Number(row.totalHasil || row.total_hasil || 0),
        catatanPenugasan,
        catatan_penugasan: catatanPenugasan,
        catatanRevisiHasilPenyelia: detailPenyeliaRevisionNote,
        catatan_revisi_hasil_penyelia: detailPenyeliaRevisionNote,
        catatanRevisiHasilKasiPengujian: detailKasiRevisionNote,
        catatan_revisi_hasil_kasi_pengujian: detailKasiRevisionNote,
        catatanResponPenyelia: detailPenyeliaResponseNote,
        catatan_respon_penyelia: detailPenyeliaResponseNote,
        catatanRevisiHasil: detailRevisionNote,
        catatan_revisi_hasil: detailRevisionNote,
        statusDetail: row.statusDetail || row.status_detail || 'Ditugaskan',
        latestSortValue: sortValue,
      });

      group.latestSortValue = Math.max(group.latestSortValue, sortValue);
    });

    return Array.from(map.values())
      .map((group) => {
        const details = [...group.details].sort(
          (a, b) => b.latestSortValue - a.latestSortValue
        );

        const groupStatus = deriveGroupStatus(details);
        const totalParameterMetode = details.length;
        const totalSampel = getUniqueSampleCount(details);
        const totalHasil = details.reduce(
          (sum, detail) => sum + Number(detail.totalHasil || 0),
          0
        );

        const nearestDeadline = details
          .map((detail) => detail.deadline)
          .filter(Boolean)
          .sort()[0];

        const isHistory = details.every((detail) =>
          isDoneStatus(detail.statusDetail)
        );

        const hasRevision = details.some(
          (detail) => detail.statusDetail === 'Perlu Revisi'
        );

        return {
          ...group,
          details,
          groupStatus,
          totalParameter: totalParameterMetode,
          totalParameterMetode,
          totalSampel,
          totalHasil,
          nearestDeadline,
          isHistory,
          hasRevision,
          statusRingkas: groupStatus,
        };
      })
      .sort((a, b) => b.latestSortValue - a.latestSortValue);
  }, [rows]);

  const counts = useMemo(() => {
    const currentGroups = groupedAssignments.filter((group) => !group.isHistory);
    const historyGroups = groupedAssignments.filter((group) => group.isHistory);
    const revisionGroups = groupedAssignments.filter((group) => group.hasRevision);

    return {
      current: currentGroups.length,
      history: historyGroups.length,
      revision: revisionGroups.length,
      total: groupedAssignments.length,
      detailTotal: rows.length,
    };
  }, [groupedAssignments, rows]);


  const metricCards = [
    {
      label: 'Total Tugas',
      sublabel: `${counts.detailTotal} detail parameter`,
      value: counts.total,
      icon: ClipboardList,
      color: 'bg-blue-100 text-blue-700',
      iconBg: 'bg-blue-50',
      trend: 'Penugasan',
      onClick: () => {
        setActiveTab('saat_ini');
        setSearchQuery('');
      },
    },
    {
      label: 'Penugasan Saat Ini',
      sublabel: 'Belum selesai',
      value: counts.current,
      icon: Loader2,
      color: 'bg-amber-100 text-amber-700',
      iconBg: 'bg-amber-50',
      trend: 'Aktif',
      onClick: () => {
        setActiveTab('saat_ini');
        setSearchQuery('');
      },
    },
    {
      label: 'Perlu Revisi',
      sublabel: 'Perlu ditindaklanjuti',
      value: counts.revision,
      icon: AlertCircle,
      color: 'bg-red-100 text-red-700',
      iconBg: 'bg-red-50',
      trend: 'Prioritas',
      onClick: () => {
        setActiveTab('saat_ini');
        setSearchQuery('revisi');
      },
    },
    {
      label: 'Riwayat',
      sublabel: 'Tugas selesai',
      value: counts.history,
      icon: CheckCircle2,
      color: 'bg-emerald-100 text-emerald-700',
      iconBg: 'bg-emerald-50',
      trend: 'Selesai',
      onClick: () => {
        setActiveTab('riwayat');
        setSearchQuery('');
      },
    },
  ];

  const filteredGroups = useMemo(() => {
    const q = normalizeText(searchQuery);

    return groupedAssignments
      .filter((group) => {
        if (activeTab === 'saat_ini') return !group.isHistory;
        if (activeTab === 'riwayat') return group.isHistory;
        return true;
      })
      .filter((group) => {
        if (!q) return true;
        return buildGroupSearchText(group).includes(q);
      });
  }, [groupedAssignments, activeTab, searchQuery]);

  useEffect(() => {
    if (!initialSelectedAssignmentId) return;

    const group = groupedAssignments.find(
      (item) => String(item.idPenugasan) === String(initialSelectedAssignmentId)
    );

    if (group) {
      setActiveTab(group.isHistory ? 'riwayat' : 'saat_ini');
      setSelectedGroup(group);
      onClearInitialSelectedAssignment();
      return;
    }

    if (!loading) {
      onClearInitialSelectedAssignment();
    }
  }, [groupedAssignments, initialSelectedAssignmentId, loading, onClearInitialSelectedAssignment]);

  const handleOpenGroupDetail = (group) => {
    setSelectedGroup(group);
  };

  const handleCloseGroupDetail = () => {
    setSelectedGroup(null);
    onCloseSelectedAssignment();
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Tugas Pengujian Saya
          </h1>
          <p className="text-gray-600">
            Penugasan aktif dan riwayat worksheet analis berdasarkan data terbaru.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => (
            <DashboardMetricCard key={metric.label} metric={metric} loading={loading} />
          ))}
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari ID tugas, parameter, metode, status, atau nomor sampel..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="mb-6 flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('saat_ini')}
            className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'saat_ini'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Penugasan Saat Ini
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'riwayat'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Riwayat
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    ID Tugas
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Jumlah Parameter Metode
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Total Sampel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Deadline Terdekat
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-600" />
                      Memuat tugas analis...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Tidak ada data pada tab ini.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group) => (
                    <tr key={group.idPenugasan} className="transition-all hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {group.idPenugasan}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {group.totalParameterMetode} parameter metode
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {group.totalSampel} sampel
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDateOnly(group.nearestDeadline)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(group.groupStatus)}`}
                        >
                          {group.statusRingkas}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        <button
                          type="button"
                          onClick={() => handleOpenGroupDetail(group)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium transition-all hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-right text-sm text-gray-400">
          {filteredGroups.length} penugasan •{' '}
          {filteredGroups.reduce((sum, group) => sum + group.details.length, 0)} detail tugas
        </div>

        {selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Detail Tugas Analis
                  </h3>
                  <p className="text-sm text-emerald-100">
                    {selectedGroup.idPenugasan} • {selectedGroup.statusRingkas}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseGroupDetail}
                  className="rounded-lg p-2 text-white transition-all hover:bg-white/20"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      ID Tugas
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedGroup.idPenugasan}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Jumlah Parameter Metode
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedGroup.totalParameterMetode}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total Sampel
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedGroup.totalSampel}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(selectedGroup.groupStatus)}`}
                    >
                      {selectedGroup.statusRingkas}
                    </span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Catatan Penugasan
                    </p>
                    <p className="whitespace-pre-wrap text-sm font-medium text-gray-900">
                      {selectedGroup.catatanPenugasan || '-'}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[980px]">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Parameter
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Metode
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Deadline
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Sampel
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Catatan Revisi Hasil
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {selectedGroup.details.map((detail) => (
                        <tr
                          key={detail.idPenugasanDetail}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {detail.parameter}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div>{detail.metode}</div>
                            {detail.acuanMetode && detail.acuanMetode !== '-' && (
                              <div className="text-xs text-gray-500">
                                {detail.acuanMetode}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDateOnly(detail.deadline)}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="font-medium text-gray-900">
                              {formatDetailSampleText(detail)}
                            </div>
                            {detail.sampleNos?.length > 0 && (
                              <div className="mt-0.5 text-xs text-gray-500">
                                {detail.sampleNos.length} sampel
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadge(detail.statusDetail)}`}
                            >
                              {detail.statusDetail}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            {detail.catatanRevisiHasilPenyelia ||
                            detail.catatanRevisiHasilKasiPengujian ||
                            detail.catatanResponPenyelia ? (
                              <div className="space-y-2">
                                {detail.catatanRevisiHasilPenyelia && (
                                  <div className="max-w-[280px] whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                                    <p className="font-semibold">Catatan Revisi Penyelia</p>
                                    <p className="mt-1 font-normal">{detail.catatanRevisiHasilPenyelia}</p>
                                  </div>
                                )}

                                {detail.catatanRevisiHasilKasiPengujian && (
                                  <div className="max-w-[280px] whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                                    <p className="font-semibold">Catatan Revisi Kasi Pengujian</p>
                                    <p className="mt-1 font-normal">{detail.catatanRevisiHasilKasiPengujian}</p>
                                  </div>
                                )}

                                {detail.catatanResponPenyelia && (
                                  <div className="max-w-[280px] whitespace-pre-wrap rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700">
                                    <p className="font-semibold">Respon Penyelia</p>
                                    <p className="mt-1 font-normal">{detail.catatanResponPenyelia}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => onViewDetail(detail.idPenugasanDetail, selectedGroup.idPenugasan)}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}