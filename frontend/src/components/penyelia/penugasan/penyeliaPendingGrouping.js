import {
  buildGroupKey,
  buildGroupLabel,
  isSubkontrakItem,
} from './penyeliaPenugasanUtils';
import { addBusinessDays, isBusinessDayYmd } from '../../../utils/businessDays';

export function getPendingSortValue(item) {
  const dateCandidates = [
    item?.tanggal_penerimaan,
    item?.tanggal_terima,
    item?.tanggal_pendaftaran,
    item?.updatedAt,
    item?.updated_at,
    item?.createdAt,
    item?.created_at,
  ];

  for (const value of dateCandidates) {
    if (!value) continue;

    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }

  const firstSample = item?.availableSamples?.[0] || '';
  const numericText = String(firstSample || item?.id_fppl_parameter_metode || '')
    .match(/\d+/g)
    ?.join('');

  return Number(numericText || 0);
}

export function buildFilteredPendingItems(pendingItems = [], searchQuery = '') {
  const q = searchQuery.trim().toLowerCase();

  return pendingItems
    .filter((item) => !isSubkontrakItem(item))
    .flatMap((item) => {
      const sampleRows =
        item.availableSampleRows?.length > 0
          ? item.availableSampleRows
          : (item.availableSamples || []).map((noSampel) => ({ no_sampel: noSampel }));

      const assignedNoSet = new Set(
        (item.assignedSamples || [])
          .map((sample) => sample.no_sampel || sample.noSampel)
          .filter(Boolean)
      );

      const availableOnlyRows = sampleRows.filter((sampleRow) => {
        const noSampel = sampleRow.no_sampel || sampleRow.noSampel;
        return noSampel && !assignedNoSet.has(noSampel);
      });

      return availableOnlyRows.map((sampleRow) => {
        const noSampel = sampleRow.no_sampel || sampleRow.noSampel;

        return {
          ...item,
          ...sampleRow,
          noSampel,
          no_sampel: noSampel,
          pelanggan: sampleRow.pelanggan || sampleRow.nama_pelanggan || sampleRow.namaPelanggan || item.pelanggan || '-',
          jenis_sampel: sampleRow.jenis_sampel || sampleRow.jenisSampel || item.jenis_sampel || '-',
          reg_bm: sampleRow.reg_bm || sampleRow.regBm || item.reg_bm || '-',
          rowKey: `${sampleRow.id_fppl_parameter_metode || item.id_fppl_parameter_metode}-${noSampel}`,
        };
      });
    })
    .filter((item) => {
      if (!q) return true;

      const noSampel = String(item.noSampel || '').toLowerCase();
      const pelanggan = String(item.pelanggan || '').toLowerCase();
      const jenis = String(item.jenis_sampel || '').toLowerCase();
      const parameter = String(item.nama_parameter || '').toLowerCase();
      const metode = String(item.nama_metode || '').toLowerCase();

      return (
        noSampel.includes(q) ||
        pelanggan.includes(q) ||
        jenis.includes(q) ||
        parameter.includes(q) ||
        metode.includes(q)
      );
    })
    .sort((a, b) => {
      const dateSort = getPendingSortValue(b) - getPendingSortValue(a);

      if (dateSort !== 0) return dateSort;

      return String(b.noSampel || '').localeCompare(
        String(a.noSampel || ''),
        'id-ID',
        { numeric: true }
      );
    });
}

export function buildGroupedPendingOptions(pendingItems = [], holidayDateSet = new Set()) {
  const map = new Map();
  const isHolidayAwareBusinessDay = (dateStr) => isBusinessDayYmd(dateStr, holidayDateSet);

  pendingItems
    .filter((item) => !isSubkontrakItem(item))
    .forEach((item) => {
      const availableSampleRows =
        item.availableSampleRows?.length > 0
          ? item.availableSampleRows
          : (item.availableSamples || []).map((noSampel) => ({
              no_sampel: noSampel,
              tanggal_penerimaan: item.tanggal_penerimaan || null,
              tanggal_terima: item.tanggal_terima || null,
              created_at: item.created_at || item.createdAt || null,
              id_fppl_parameter_metode: item.id_fppl_parameter_metode,
              pelanggan: item.pelanggan,
              jenis_sampel: item.jenis_sampel,
              reg_bm: item.reg_bm,
            }));

      const assignedNoSet = new Set(
        (item.assignedSamples || [])
          .map((sample) => sample.no_sampel || sample.noSampel)
          .filter(Boolean)
      );

      const availableOnlyRows = availableSampleRows.filter((sampleRow) => {
        const noSampel = sampleRow.no_sampel || sampleRow.noSampel;
        return noSampel && !assignedNoSet.has(noSampel);
      });

      if (availableOnlyRows.length === 0) return;

      const groupKey = buildGroupKey(item);

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupKey,
          label: buildGroupLabel(item),
          parameter: item.nama_parameter,
          metode: item.nama_metode,
          items: [],
          sampleOptions: [],
          optionRefSet: new Set(),
          customerSet: new Set(),
          jenisSet: new Set(),
          latestSortValue: 0,
        });
      }

      const group = map.get(groupKey);
      const sortValue = getPendingSortValue(item);

      group.items.push(item);
      group.latestSortValue = Math.max(group.latestSortValue, sortValue);

      availableOnlyRows.forEach((sampleRow) => {
        const noSampel = sampleRow.no_sampel || sampleRow.noSampel;
        if (!noSampel) return;

        const sampleFpmId =
          sampleRow.id_fppl_parameter_metode ||
          sampleRow.idFpplParameterMetode ||
          item.id_fppl_parameter_metode ||
          item.idFpplParameterMetode ||
          '';

        if (!sampleFpmId) return;

        const samplePelanggan =
          sampleRow.pelanggan ||
          sampleRow.nama_pelanggan ||
          sampleRow.namaPelanggan ||
          item.pelanggan ||
          '-';

        const sampleJenis =
          sampleRow.jenis_sampel ||
          sampleRow.jenisSampel ||
          item.jenis_sampel ||
          '-';

        if (samplePelanggan && samplePelanggan !== '-') {
          group.customerSet.add(samplePelanggan);
        }

        if (sampleJenis && sampleJenis !== '-') {
          group.jenisSet.add(sampleJenis);
        }

        const receiptDate =
          sampleRow.tanggal_penerimaan ||
          sampleRow.tanggal_terima ||
          sampleRow.tanggalPenerimaan ||
          sampleRow.tanggalTerima ||
          sampleRow.created_at ||
          sampleRow.createdAt ||
          null;

        const receiptDateObject = receiptDate ? new Date(receiptDate) : null;

        const maxDeadlineByReceipt =
          receiptDateObject && !Number.isNaN(receiptDateObject.getTime())
            ? addBusinessDays(receiptDate, 8, isHolidayAwareBusinessDay)
            : '';

        const sampleIsInsitu =
          sampleRow.is_insitu ??
          sampleRow.isInsitu ??
          sampleRow.insitu ??
          sampleRow.is_insitu ??
          sampleRow.isInsitu ??
          item.is_insitu ??
          item.isInsitu ??
          item.insitu ??
          item.is_insitu ??
          item.isInsitu ??
          0;

        const ref = `${sampleFpmId}::${noSampel}`;

        if (group.optionRefSet.has(ref)) return;

        group.optionRefSet.add(ref);

        group.sampleOptions.push({
          ref,
          fpmId: sampleFpmId,
          noSampel,
          pelanggan: samplePelanggan,
          jenisSampel: sampleJenis,
          regBm: sampleRow.reg_bm || sampleRow.regBm || item.reg_bm || '-',
          sortValue,
          receiptDate,
          maxDeadlineByReceipt,
          is_insitu: sampleIsInsitu,
          isInsitu: sampleIsInsitu,
        });
      });
    });

  return Array.from(map.values())
    .map((group) => ({
      groupKey: group.groupKey,
      label: group.label,
      parameter: group.parameter,
      metode: group.metode,
      items: group.items,
      sampleOptions: group.sampleOptions.sort((a, b) => b.sortValue - a.sortValue),
      customers: Array.from(group.customerSet),
      jenisSampel: Array.from(group.jenisSet),
      totalAvailableSamples: group.sampleOptions.length,
      latestSortValue: group.latestSortValue,
    }))
    .filter((group) => group.totalAvailableSamples > 0)
    .sort((a, b) => b.latestSortValue - a.latestSortValue);
}

export function buildPendingGroupMap(groupedPendingOptions = []) {
  const map = new Map();

  groupedPendingOptions.forEach((group) => {
    map.set(group.groupKey, group);
  });

  return map;
}
