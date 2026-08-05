import { requestData, requestJson, requestBlob } from './httpClient';

const authConfig = { auth: true };
const jsonHeaders = { 'Content-Type': 'application/json' };

const asArray = (value) => (Array.isArray(value) ? value : []);

const jsonRequest = (path, method, body) => requestJson(
  path,
  {
    method,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  },
  authConfig
);

export const adminPermohonanApi = {
  async getRequests() {
    const rows = await requestData('/requests', {}, authConfig);
    return asArray(rows);
  },

  async getRequestDetail(idRegistrasi) {
    return requestData(`/requests/${idRegistrasi}`, {}, authConfig);
  },

  async getPickupQueue() {
    const rows = await requestData('/lhu/pickup/queue', {}, authConfig);
    return asArray(rows);
  },

  async getScheduleReferences() {
    const [holidays, pccEmployees, pickupTariffs] = await Promise.all([
      requestData('/requests/schedule/holidays', {}, authConfig),
      requestData('/admin/accounts/pcc-employees', {}, authConfig),
      requestData('/catalog/pickup-tariffs', {}, authConfig),
    ]);

    return {
      holidays: asArray(holidays),
      pccEmployees: asArray(pccEmployees),
      pickupTariffs: asArray(pickupTariffs),
    };
  },

  async getLhuPickupReferences() {
    const holidays = await requestData('/lhu/pickup/holidays', {}, authConfig);

    return {
      holidays: asArray(holidays),
    };
  },

  deferPayment(idRegistrasi, note) {
    return jsonRequest(`/requests/${idRegistrasi}/payment/deferred`, 'POST', { note });
  },

  saveSamplingSchedule(idRegistrasi, isUpdate, body) {
    return jsonRequest(
      `/requests/${idRegistrasi}/sampling-schedule`,
      isUpdate ? 'PUT' : 'POST',
      body
    );
  },

  receiveSamples(idRegistrasi, body) {
    return jsonRequest(`/requests/${idRegistrasi}/samples/receive`, 'POST', body);
  },

  verifyRequest(idRegistrasi, body) {
    return jsonRequest(`/requests/${idRegistrasi}/verify`, 'PUT', body);
  },

  savePickupSchedule(body) {
    return jsonRequest('/lhu/pickup/schedule', 'POST', body);
  },

  completePickup(body) {
    return jsonRequest('/lhu/pickup/complete', 'POST', body);
  },

  getScheduleChangeRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return requestData(`/requests/schedule-changes${query ? `?${query}` : ''}`, {}, authConfig);
  },

  decideScheduleChange(idPengajuan, body) {
    return jsonRequest(`/requests/schedule-changes/${idPengajuan}/decision`, 'POST', body);
  },

  uploadSignedLhu(nomorLhu, body) {
    // Note: body here is FormData
    const encoded = encodeURIComponent(nomorLhu);
    return requestJson(`/lhu/${encoded}/signed-file`, { method: 'POST', body }, authConfig);
  },

  replaceSignedLhu(nomorLhu, body) {
    // Note: body here is FormData
    const encoded = encodeURIComponent(nomorLhu);
    return requestJson(`/lhu/${encoded}/signed-file`, { method: 'PUT', body }, authConfig);
  },

  getSignedLhuBlob(nomorLhu) {
    const encoded = encodeURIComponent(nomorLhu);
    return requestBlob(`/lhu/${encoded}/signed-file`, { method: 'GET' }, authConfig);
  }
};
