import { requestData, requestJson } from './httpClient';

export const penyeliaPenugasanDetailApi = {
  getReviewDetails(idPenugasan, idPenugasanDetail = '') {
    const query = new URLSearchParams();
    const detailId = String(idPenugasanDetail || '').trim();

    if (detailId) {
      query.set('idPenugasanDetail', detailId);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return requestData(`/assignments/work/${idPenugasan}/details${suffix}`, {}, { auth: true });
  },

  approveDetail(idPenugasanDetail) {
    return requestJson(
      `/assignments/details/${idPenugasanDetail}/approve`,
      { method: 'POST' },
      { auth: true }
    );
  },

  updateDeadline(idPenugasanDetail, payload) {
    return requestJson(
      `/assignments/details/${idPenugasanDetail}/deadline`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  requestRevision(idPenugasanDetail, payload) {
    return requestJson(
      `/assignments/details/${idPenugasanDetail}/revise`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },


  getPendingKasiRevisionRequests() {
    return requestData('/assignments/revisi-kasi/pending', {}, { auth: true });
  },

  reviewKasiRevisionRequest(idRevisiLka, payload) {
    return requestJson(
      `/assignments/revisi-kasi/${encodeURIComponent(idRevisiLka)}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  previewWorksheet(path, signal) {
    return requestData(
      `/assignments/worksheet-preview?path=${encodeURIComponent(path)}`,
      { signal },
      { auth: true }
    );
  },

  getWorksheetAccessUrl(path, options = {}) {
    const query = new URLSearchParams({ path: String(path || '') });

    if (options.download) {
      query.set('download', '1');
    }

    return requestData(
      `/assignments/worksheet-url?${query.toString()}`,
      {},
      { auth: true }
    );
  },
};
