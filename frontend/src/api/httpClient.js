import { apiFetch } from '../utils/api';
import { addSnakeCaseAliasesDeep } from '../utils/caseTransform';


let blockingRequestCount = 0;

function emitBlockingRequestChange() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('silabling:blocking-request-change', {
      detail: {
        active: blockingRequestCount > 0,
        count: blockingRequestCount,
      },
    })
  );
}

function beginBlockingRequest() {
  blockingRequestCount += 1;
  emitBlockingRequestChange();

  return () => {
    blockingRequestCount = Math.max(0, blockingRequestCount - 1);
    emitBlockingRequestChange();
  };
}

function shouldBlockRequest(options = {}, config = {}) {
  if (config.blocking === false) return false;
  if (config.blocking === true) return true;

  const method = String(options.method || 'GET').toUpperCase();
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

export function subscribeBlockingRequests(callback) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event) => callback(event.detail || { active: false, count: 0 });
  window.addEventListener('silabling:blocking-request-change', handler);
  callback({ active: blockingRequestCount > 0, count: blockingRequestCount });

  return () => window.removeEventListener('silabling:blocking-request-change', handler);
}

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    let responseText = '';

    try {
      responseText = await response.text();
    } catch {
      responseText = '';
    }

    throw new Error(responseText || 'Respons server tidak valid.');
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Respons server tidak valid.');
  }
}

export function getApiErrorMessage(error, fallback = 'Terjadi kesalahan.') {
  return error?.message || fallback;
}

export async function requestJson(path, options = {}, config = {}) {
  const headers = new Headers(options.headers || {});
  const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (options.body && !isFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const releaseBlock = shouldBlockRequest(options, config) ? beginBlockingRequest() : null;

  try {
    const response = await apiFetch(path, {
      ...options,
      headers,
    }, config);
    const json = addSnakeCaseAliasesDeep(await readJsonResponse(response));

    if (!response.ok || json?.success === false) {
      throw new ApiError(json?.message || 'Permintaan gagal diproses.', {
        status: response.status,
        data: json,
      });
    }

    return json;
  } finally {
    if (releaseBlock) releaseBlock();
  }
}

export async function requestData(path, options = {}, config = {}) {
  const json = await requestJson(path, options, config);
  return json?.data ?? json;
}


export async function requestBlob(path, options = {}, config = {}) {
  const releaseBlock = shouldBlockRequest(options, config) ? beginBlockingRequest() : null;

  try {
    const response = await apiFetch(path, options, config);

    if (!response.ok) {
      let message = 'Permintaan gagal diproses.';

      try {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const data = await response.json();
          message = data?.message || message;
        } else {
          const responseText = await response.text();
          message = responseText || message;
        }
      } catch {
        // Gunakan fallback message.
      }

      throw new ApiError(message, { status: response.status });
    }

    return response.blob();
  } finally {
    if (releaseBlock) releaseBlock();
  }
}
