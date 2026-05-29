import { requestData, requestJson } from './httpClient';

const authConfig = { auth: true };
const jsonHeaders = { 'Content-Type': 'application/json' };

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.set(key, value);
    }
  });

  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

function putJson(path, body) {
  return requestJson(
    path,
    {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(body || {}),
    },
    authConfig
  );
}

export const kasiRequestApi = {
  getRequests(status = '') {
    return requestData(`/requests${buildQuery({ status })}`, {}, authConfig);
  },

  getMethods(noReg) {
    return requestData(`/requests/${encodeURIComponent(noReg)}/methods`, {}, authConfig);
  },

  saveMethods(noReg, selections) {
    return putJson(`/requests/${encodeURIComponent(noReg)}/methods`, { selections });
  },

  reject(noReg, alasan) {
    return putJson(`/requests/${encodeURIComponent(noReg)}/reject`, { alasan });
  },
};
