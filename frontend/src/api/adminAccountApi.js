import { requestJson } from './httpClient';

const authConfig = { auth: true };
const jsonHeaders = { 'Content-Type': 'application/json' };

const withQuery = (path, query = '') => {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return path;
  return cleanQuery.startsWith('?') ? `${path}${cleanQuery}` : `${path}?${cleanQuery}`;
};

const jsonRequest = (path, method = 'GET', body = undefined) => {
  const options = {
    method,
    headers: jsonHeaders,
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  return requestJson(path, options, authConfig);
};

export const adminAccountApi = {
  getRoles() {
    return jsonRequest('/admin/accounts/roles');
  },

  getStaff(query = '') {
    return jsonRequest(withQuery('/admin/accounts/staff', query));
  },

  getStaffDetail(nik) {
    return jsonRequest(`/admin/accounts/staff/${encodeURIComponent(nik)}`);
  },

  saveStaff(payload) {
    return jsonRequest('/admin/accounts/staff', 'POST', payload);
  },

  toggleStaffStatus(nik, isActive) {
    return jsonRequest(`/admin/accounts/staff/${encodeURIComponent(nik)}/status`, 'PATCH', {
      is_active: isActive,
    });
  },

  resetStaffPassword(nik, payload = {}) {
    return jsonRequest(`/admin/accounts/staff/${encodeURIComponent(nik)}/reset-password`, 'PATCH', payload);
  },

  getCustomers(query = '') {
    return jsonRequest(withQuery('/admin/accounts/customers', query));
  },

  getCustomerDetail(idPelanggan) {
    return jsonRequest(`/admin/accounts/customers/${encodeURIComponent(idPelanggan)}`);
  },

  toggleCustomerStatus(idPelanggan, isActive) {
    return jsonRequest(`/admin/accounts/customers/${encodeURIComponent(idPelanggan)}/status`, 'PATCH', {
      is_active: isActive,
    });
  },

  resetCustomerPassword(idPelanggan, payload = {}) {
    return jsonRequest(`/admin/accounts/customers/${encodeURIComponent(idPelanggan)}/reset-password`, 'PATCH', payload);
  },
};
