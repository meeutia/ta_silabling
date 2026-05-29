export const ROLE_CODE_TO_KEY = {
  'RL-001': 'pelanggan',
  'RL-002': 'admin',
  'RL-003': 'kasi',
  'RL-004': 'penyelia',
  'RL-005': 'analis',
  'RL-006': 'qc',
  'RL-007': 'kalab',
};

export function resolveUserRole(user = {}) {
  return ROLE_CODE_TO_KEY[user.idRole || user.id_role] || 'pelanggan';
}

export function resolveUserDisplayName(user = {}) {
  return (
    user.username ||
    user.namaUser ||
    user.nama_user ||
    user.pic ||
    user.email?.split('@')[0] ||
    'User'
  );
}
