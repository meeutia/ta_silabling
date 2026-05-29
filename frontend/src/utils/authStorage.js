const AUTH_STORAGE_KEY = 'silabling_auth_session';

function parseJwtPayload(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function saveAuthSession(tokenOrUser, maybeUser) {
  const user = maybeUser ?? tokenOrUser;
  if (!user) return;

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }));
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.user) {
      clearAuthSession();
      return null;
    }

    return parsed;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function getStoredUser() {
  return getAuthSession()?.user || null;
}


export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}