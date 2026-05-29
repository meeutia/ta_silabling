import { ROLE_PAGE_CONFIG } from './pageConfig';

export function parseRoute(pathname = '/') {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const parts = cleanPath.split('/').filter(Boolean).map(decodeURIComponent);

  if (cleanPath === '/') return { kind: 'landing' };
  if (parts[0] === 'login') return { kind: 'login' };
  if (parts[0] === 'register') return { kind: 'register' };
  if (parts[0] === 'reset-password') return { kind: 'reset-password' };

  if (parts[0] === 'app' && parts[1]) {
    return {
      kind: 'app',
      role: parts[1] || null,
      page: parts[2] || null,
      extra: parts.slice(3),
    };
  }

  if (parts[0] && ROLE_PAGE_CONFIG[parts[0]]) {
    return {
      kind: 'app',
      role: parts[0],
      page: parts[1] || null,
      extra: parts.slice(2),
    };
  }

  return { kind: 'not-found' };
}

export function buildAppPath(role, page, queryParams = null, pathSegments = []) {
  const normalizedSegments = (Array.isArray(pathSegments) ? pathSegments : [pathSegments])
    .map((segment) => String(segment || '').trim())
    .filter(Boolean)
    .map(encodeURIComponent);

  const extraPath = normalizedSegments.length > 0 ? `/${normalizedSegments.join('/')}` : '';
  const path = `/${encodeURIComponent(role)}/${encodeURIComponent(page)}${extraPath}`;
  const params = new URLSearchParams();

  Object.entries(queryParams || {}).forEach(([key, value]) => {
    const normalizedValue = String(value || '').trim();
    if (normalizedValue) params.set(key, normalizedValue);
  });

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function getRouteStatusRegistrationId(route = null) {
  if (route?.kind !== 'app') return '';
  if (route.role !== 'pelanggan') return '';
  if (route.page !== 'status') return '';
  return String(route.extra?.[0] || '').trim();
}

export function getRouteAdminPermohonanRegistrationId(route = null) {
  if (route?.kind !== 'app') return '';
  if (route.role !== 'admin') return '';
  if (route.page !== 'permohonan') return '';
  return String(route.extra?.[0] || '').trim();
}


export function getRouteKasiPermohonanRegistrationId(route = null) {
  if (route?.kind !== 'app') return '';
  if (route.role !== 'kasi') return '';
  if (route.page !== 'permohonan') return '';
  return String(route.extra?.[0] || '').trim();
}


export function getRouteLhuNumber(route = null, expectedRole = '') {
  if (route?.kind !== 'app') return '';
  if (expectedRole && route.role !== expectedRole) return '';
  if (route.role === 'kalab' && route.page === 'lhu') return String(route.extra?.[0] || '').trim();
  if (route.role === 'qc' && route.page === 'verifikasi') return String(route.extra?.[0] || '').trim();
  return '';
}

export function getRequestRegistrationId(request = null) {
  return String(
    request?.id_registrasi ||
      request?.idRegistrasi ||
      request?.nomorRegistrasi ||
      request?.registrationNumber ||
      request?.id ||
      ''
  ).trim();
}

export function buildDetailRouteParams(link = null) {
  if (!link) return null;

  return {
    idPenugasanDetail: link.idPenugasanDetail || '',
    idPenugasan: link.idPenugasan || '',
  };
}

export function parseDirectAppLink(search = '', route = null) {
  const params = new URLSearchParams(search || '');
  const routeRole = route?.kind === 'app' ? route.role : '';
  const routePage = route?.kind === 'app' ? route.page : '';
  const rawPage = params.get('page') || routePage || '';
  const rawReview = params.get('review') || '';
  const idPenugasanDetail =
    params.get('idPenugasanDetail') ||
    params.get('id_penugasan_detail') ||
    params.get('detail') ||
    '';
  const idPenugasan =
    params.get('idPenugasan') ||
    params.get('id_penugasan') ||
    params.get('assignment') ||
    '';

  const normalizedPage = String(rawPage || '').trim();
  const isAnalisDetailPage = ['detail_sampel', 'detail-sampel'].includes(normalizedPage);
  const isPenyeliaDetailPage = ['detail-penugasan', 'detail_penugasan'].includes(normalizedPage);

  if ((isAnalisDetailPage || routeRole === 'analis') && idPenugasanDetail && routeRole !== 'penyelia') {
    return {
      role: 'analis',
      page: 'detail_sampel',
      idPenugasanDetail,
      idPenugasan,
    };
  }

  if (routeRole === 'analis' && normalizedPage === 'sampel' && idPenugasan) {
    return {
      role: 'analis',
      page: 'sampel',
      idPenugasanDetail: '',
      idPenugasan,
    };
  }

  if ((isPenyeliaDetailPage || rawReview === 'penugasan') && idPenugasan && routeRole !== 'analis') {
    return {
      role: 'penyelia',
      page: 'detail-penugasan',
      idPenugasan,
      idPenugasanDetail,
    };
  }

  if (normalizedPage === 'penugasan' || (rawReview === 'penugasan' && !idPenugasan)) {
    return {
      role: 'penyelia',
      page: 'penugasan',
      idPenugasanDetail,
    };
  }

  return null;
}
