import { requestData } from './httpClient';

export function getLkaRevisionHistory(kodeLka) {
  if (!kodeLka) return Promise.resolve(null);
  return requestData(`/lka-revisions/lka/${encodeURIComponent(kodeLka)}`, {}, { auth: true });
}

export function getLkaHasilRevisionHistory({ kodeLka, kode_lka, noSampel, no_sampel } = {}) {
  const kode = kodeLka || kode_lka;
  const sample = noSampel || no_sampel;
  if (!kode || !sample) return Promise.resolve(null);
  const params = new URLSearchParams({ kode_lka: kode, no_sampel: sample });
  return requestData(`/lka-revisions/hasil?${params.toString()}`, {}, { auth: true });
}

export const lkaRevisionApi = {
  getLkaRevisionHistory,
  getLkaHasilRevisionHistory,
};
