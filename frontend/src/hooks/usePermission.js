import { useMemo } from 'react';

const ROLE_CODE_TO_KEY = Object.freeze({
  'RL-001': 'pelanggan',
  'RL-002': 'admin',
  'RL-003': 'kasi',
  'RL-004': 'penyelia',
  'RL-005': 'analis',
  'RL-006': 'qc',
  'RL-007': 'kalab',
});

export function normalizeRole(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  return ROLE_CODE_TO_KEY[String(value || '').trim()] || text;
}

function normalizeAllowedRoles(allowedRoles) {
  if (!allowedRoles) return [];
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.map(normalizeRole).filter(Boolean);
}

export function hasRolePermission(userRole, allowedRoles = []) {
  const role = normalizeRole(userRole);
  const allowed = normalizeAllowedRoles(allowedRoles);
  if (!allowed.length) return true;
  return allowed.includes(role);
}

export function usePermission(userRole, allowedRoles = []) {
  const dependencyKey = Array.isArray(allowedRoles) ? allowedRoles.join('|') : String(allowedRoles || '');
  return useMemo(
    () => hasRolePermission(userRole, allowedRoles),
    [userRole, dependencyKey]
  );
}

export default usePermission;
