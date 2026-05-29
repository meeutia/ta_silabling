import { requestData, requestJson } from './httpClient';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      qs.set(key, value);
    }
  });

  return qs.toString();
}

export const lhuReviewApi = {
  getKasiReviewQueue() {
    return requestData('/assignments/kasi-review/queue', {}, { auth: true });
  },

  getKasiReviewHistory() {
    return requestData('/assignments/kasi-review/history', {}, { auth: true });
  },

  getKasiReviewDetail(noSampel) {
    return requestData(`/assignments/kasi-review/detail?${buildQuery({ noSampel })}`, {}, { auth: true });
  },

  approveKasiReview(noSampel) {
    return requestJson(
      '/assignments/kasi-review/approve',
      {
        method: 'POST',
        body: JSON.stringify({ noSampel }),
      },
      { auth: true }
    );
  },

  requestKasiReviewRevision({ noSampel, catatanRevisi, revisions }) {
    return requestJson(
      '/assignments/kasi-review/revise',
      {
        method: 'POST',
        body: JSON.stringify({
          noSampel,
          catatanRevisi,
          revisions,
        }),
      },
      { auth: true }
    );
  },

  getQcFinalizationQueue() {
    return requestData('/lhu/finalization-queue', {}, { auth: true });
  },

  getLhuFinalizationHistory() {
    return requestData('/lhu/finalization/history', {}, { auth: true });
  },


  getLhuFinalizationPreview(identifier, idPktBm, sampleNos = []) {
    const key = String(identifier || '').includes('/') ? 'noSampel' : 'idRegistrasi';
    return requestData(`/lhu/finalization/preview?${buildQuery({ [key]: identifier, idPktBm, sampleNos: Array.isArray(sampleNos) ? sampleNos.join(',') : sampleNos })}`, {}, { auth: true });
  },

  getLhuFinalizationDetail(identifier, sampleNos = []) {
    const key = String(identifier || '').includes('/') ? 'noSampel' : 'idRegistrasi';
    return requestData(`/lhu/finalization/detail?${buildQuery({ [key]: identifier, sampleNos: Array.isArray(sampleNos) ? sampleNos.join(',') : sampleNos })}`, {}, { auth: true });
  },

  getLhuDetailByNomor(nomorLhu) {
    return requestData(`/lhu/detail?${buildQuery({ nomorLhu })}`, {}, { auth: true });
  },

  finalizeLhu(payload) {
    return requestJson(
      '/lhu/finalization/finalize',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  getKalabQueue() {
    return requestData('/lhu/kalab/queue', {}, { auth: true });
  },

  approveKalabLhu(nomorLhu) {
    const normalizedNomorLhu = String(nomorLhu || '').trim();

    const query = new URLSearchParams({ nomorLhu: normalizedNomorLhu }).toString();

    return requestJson(
      `/lhu/kalab/approve?${query}`,
      {
        method: 'POST',
        body: JSON.stringify({
          nomorLhu: normalizedNomorLhu,
          nomor_lhu: normalizedNomorLhu,
        }),
      },
      { auth: true }
    );
  },
};
