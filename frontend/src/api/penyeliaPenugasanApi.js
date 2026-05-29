import { requestData, requestJson } from './httpClient';

export const penyeliaPenugasanApi = {
  getAnalysts() {
    return requestData('/assignments/references/analysts', {}, { auth: true });
  },

  getPendingItems() {
    return requestData('/assignments/pending-items', {}, { auth: true });
  },

  getMonitorRows() {
    return requestData('/assignments/monitor', {}, { auth: true });
  },

  getSubkontrakItems() {
    return requestData('/assignments/subkontrak-items', {}, { auth: true });
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

  getHolidays() {
    return requestData('/references/holidays', {}, { auth: true });
  },

  saveSubkontrakResults(results) {
    return requestJson(
      '/assignments/subkontrak-results',
      {
        method: 'POST',
        body: JSON.stringify({ results }),
      },
      { auth: true }
    );
  },

  saveAssignments(payload) {
    return requestJson(
      '/assignments',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },
};
