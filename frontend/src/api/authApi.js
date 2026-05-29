import { requestJson } from './httpClient';

const jsonHeaders = { 'Content-Type': 'application/json' };
const authRequestConfig = { blocking: false };

function postJson(path, body, config = {}) {
  return requestJson(
    path,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(body || {}),
    },
    {
      ...authRequestConfig,
      ...config,
    }
  );
}

export const authApi = {
  login(identifier, password) {
    return postJson('/auth/login', { identifier, password });
  },

  register(payload) {
    return postJson('/auth/register', payload);
  },

  forgotPassword(email) {
    return postJson('/auth/forgot-password', { email });
  },

  resetPassword(payload) {
    return postJson('/auth/reset-password', payload);
  },

  logout() {
    return postJson('/auth/logout', {}, { retryOnUnauthorized: false });
  },
};
