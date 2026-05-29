import { getFpplStatusBadgeClass, getFpplStatusDisplayLabel, normalizeFpplStatus } from '../../../utils/fpplStatus';

export const getStatusBadge = (status) => {
  const normalizedStatus = normalizeFpplStatus(status);
  const config = getFpplStatusBadgeClass(normalizedStatus);
  const displayLabel = getFpplStatusDisplayLabel(status);

  return (
    <span
      className={`inline-flex items-center px-4 py-2 rounded-full text-base font-medium ${config.bg} ${config.text}`}
    >
      {displayLabel}
    </span>
  );
};
