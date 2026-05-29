import { useMemo } from 'react';
import {
  combineStatusLabel,
  getMonitorAssignedAt,
  getMonitorDetailSortValue,
  getMonitorPriority,
  getNumericIdValue,
} from './penyeliaPenugasanUtils';

export function usePenyeliaMonitorGroups(monitorRows = []) {
  return useMemo(() => {
    const map = new Map();

    monitorRows.forEach((row) => {
      const idPenugasan = row.idPenugasan || row.id_penugasan;
      if (!idPenugasan) return;

      if (!map.has(idPenugasan)) {
        map.set(idPenugasan, {
          idPenugasan,
          analis: row.analis,
          details: [],
          latestSortValue: 0,
        });
      }

      const group = map.get(idPenugasan);
      const sortValue = getMonitorDetailSortValue(row);

      group.details.push(row);
      group.latestSortValue = Math.max(group.latestSortValue, sortValue);
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        statusRingkas: combineStatusLabel(group.details),
        assignedAt: getMonitorAssignedAt(group.details),
      }))
      .sort((a, b) => {
        const priorityDiff =
          getMonitorPriority(a.statusRingkas) - getMonitorPriority(b.statusRingkas);

        if (priorityDiff !== 0) return priorityDiff;

        const latestDiff = b.latestSortValue - a.latestSortValue;
        if (latestDiff !== 0) return latestDiff;

        return getNumericIdValue(b.idPenugasan) - getNumericIdValue(a.idPenugasan);
      });
  }, [monitorRows]);
}
