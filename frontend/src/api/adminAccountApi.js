import { requestJson } from './httpClient';

const authConfig = { auth: true };
const jsonHeaders = { 'Content-Type': 'application/json' };

function requestAdminJson(path, options = {}) {
  return requestJson(
    path,
    {
      ...options,
      headers: {
        ...jsonHeaders,
        ...(options.headers || {}),
      },
    },
    authConfig
  );
}

export const adminAccountApi = {
  getStaff(query = '') {
    return requestAdminJson(`/admin/accounts/staff${query}`);
  },

  getCustomers(query = '') {
    return requestAdminJson(`/admin/accounts/customers${query}`);
  },

  saveStaff(payload) {
    return requestAdminJson('/admin/accounts/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  resetStaffPassword(nik) {
    return requestAdminJson(`/admin/accounts/staff/${encodeURIComponent(nik)}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  toggleStaffStatus(nik, isActive) {
    return requestAdminJson(`/admin/accounts/staff/${encodeURIComponent(nik)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  resetCustomerPassword(customerId) {
    return requestAdminJson(`/admin/accounts/customers/${encodeURIComponent(customerId)}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  toggleCustomerStatus(customerId, isActive) {
    return requestAdminJson(`/admin/accounts/customers/${encodeURIComponent(customerId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },
};
