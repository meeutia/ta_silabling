import { requestData, requestJson } from './httpClient';

export const analisAssignmentApi = {
  getHolidays() {
    return requestData('/references/holidays', {}, { auth: true });
  },

  getMyAssignments() {
    return requestData('/assignments/my', {}, { auth: true });
  },

  getWorkDetail(idPenugasanDetail) {
    return requestJson(`/assignments/work/${idPenugasanDetail}`, {}, { auth: true });
  },

  uploadWorksheetFile(uploadEndpoint, formData) {
    return requestJson(
      uploadEndpoint,
      {
        method: 'POST',
        body: formData,
      },
      { auth: true }
    );
  },

  saveWorksheet(idPenugasanDetail, payload) {
    return requestJson(
      `/assignments/work/${idPenugasanDetail}/worksheet`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  saveResults(idPenugasanDetail, payload) {
    return requestJson(
      `/assignments/work/${idPenugasanDetail}/results`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  submitWorksheet(idPenugasanDetail, payload) {
    return requestJson(
      `/assignments/work/${idPenugasanDetail}/submit`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  previewWorksheet(filePath) {
    const params = new URLSearchParams({ path: filePath });

    return requestJson(
      `/assignments/worksheet-preview?${params.toString()}`,
      {},
      { auth: true }
    );
  },
};
