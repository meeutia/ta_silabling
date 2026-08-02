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
    const normalizedNomorLhu = String(nomorLhu ?? '').trim();
    if (!normalizedNomorLhu || ['undefined', 'null', '-'].includes(normalizedNomorLhu.toLowerCase())) {
      return Promise.reject(new Error('Nomor LHU tidak valid.'));
    }
    return requestData(`/lhu/detail?${buildQuery({ nomorLhu: normalizedNomorLhu })}`, {}, { auth: true });
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

};
