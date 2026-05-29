import { getStatusBadgeClass, getStatusDisplayLabel } from '../../constants/status';
import { getFpplStatusDisplayLabel } from '../../utils/fpplStatus';

const UPPERCASE_TOKENS = new Set(['LHU', 'QC', 'KASI', 'KALAB', 'FPPL', 'PCC']);

export function formatStatusLabel(status, fallback = '-') {
  if (status === null || status === undefined || status === '') return fallback;

  const raw = String(status).trim();
  if (!raw) return fallback;

  const spaced = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const shouldTitleCase = spaced === spaced.toUpperCase() || spaced === spaced.toLowerCase();

  if (!shouldTitleCase) return spaced;

  return spaced
    .toLowerCase()
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase();
      if (UPPERCASE_TOKENS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function StatusBadge({
  status,
  children,
  className = '',
  size = 'sm',
  normalize = false,
}) {
  const rawLabel = normalize ? getFpplStatusDisplayLabel(status) : (status || '-');
  const label = formatStatusLabel(getStatusDisplayLabel(rawLabel, '-'));

  const sizeClass = size === 'xs'
    ? 'px-2 py-0.5 text-[11px]'
    : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${getStatusBadgeClass(label)} ${className}`}
    >
      {children || label}
    </span>
  );
}

export default StatusBadge;
