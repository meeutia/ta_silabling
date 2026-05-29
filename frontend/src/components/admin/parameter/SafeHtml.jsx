import { stripHtml } from './parameterFormatters';

export function SafeHtml({ value, fallback = '-' }) {
  if (!value || !stripHtml(value)) {
    return fallback;
  }

  return <span>{stripHtml(value)}</span>;
}
