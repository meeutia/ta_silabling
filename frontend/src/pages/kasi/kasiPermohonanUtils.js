const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
};

const getParamMethods = (param) => {
  return toArray(
    param?.methods ||
    param?.availableMethods ||
    param?.available_methods ||
    param?.metodes ||
    param?.metode ||
    param?.parameter_metodes ||
    param?.ParameterMetodes ||
    param?.parameterMetodes ||
    []
  );
};

const getMethodId = (method) => {
  return (
    method?.id_metode_parameter ||
    method?.idMetodeParameter ||
    method?.id ||
    ''
  );
};

const getMethodName = (method) => {
  return (
    method?.nama_metode ||
    method?.namaMetode ||
    method?.name ||
    method?.nama ||
    method?.label ||
    '-'
  );
};

const getMethodAcuan = (method) => {
  return (
    method?.acuan_metode ||
    method?.acuanMetode ||
    method?.acuan ||
    ''
  );
};

const isTruthyFlag = (value) => {
  if (value === true || value === 1) return true;

  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const isMethodSubkontrak = (method) => {
  return (
    isTruthyFlag(method?.is_subkontrak) ||
    isTruthyFlag(method?.isSubkontrak) ||
    isTruthyFlag(method?.subkontrak) ||
    isTruthyFlag(method?.parameter_metode?.is_subkontrak) ||
    isTruthyFlag(method?.ParameterMetode?.is_subkontrak)
  );
};

const getFilteredMethods = (param, capabilityStatus) => {
  const methods = getParamMethods(param);

  if (capabilityStatus === 'MAMPU') {
    return methods.filter((method) => !isMethodSubkontrak(method));
  }

  if (capabilityStatus === 'TIDAK_MAMPU') {
    return methods.filter((method) => isMethodSubkontrak(method));
  }

  return [];
};

const getFpmKey = (param) => {
  return String(
    param?.id_fppl_parameter_metode ||
    param?.fpmId ||
    param?.idFpplParameterMetode ||
    param?.id_fpm ||
    param?.id ||
    ''
  );
};

const normalizeInsituValue = (value) => {
  if (value === true || value === 1 || value === '1') return '1';
  if (value === false || value === 0 || value === '0') return '0';
  return '';
};

const formatInsituLabel = (value) => {
  const normalized = normalizeInsituValue(value);
  if (normalized === '1') return 'Ya, Insitu';
  if (normalized === '0') return 'Tidak, Bukan Insitu';
  return '-';
};

const getParamName = (param) => {
  return (
    param?.nama_parameter ||
    param?.paramName ||
    param?.namaParameter ||
    param?.parameter?.nama_parameter ||
    param?.Parameter?.nama_parameter ||
    param?.nama ||
    '-'
  );
};

export {
  formatInsituLabel,
  getFilteredMethods,
  getFpmKey,
  getMethodAcuan,
  getMethodId,
  getMethodName,
  getParamName,
  isMethodSubkontrak,
  normalizeInsituValue,
};
