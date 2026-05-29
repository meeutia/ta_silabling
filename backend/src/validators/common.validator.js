const { errorResponse } = require('../utils/response');

const asTrimmedText = (value) => String(value ?? '').trim();

const isBlank = (value) => asTrimmedText(value) === '';

const fail = (res, message, status = 400) => errorResponse(res, message, status);

const isYmd = (value) => /^\d{4}-\d{2}-\d{2}$/.test(asTrimmedText(value));

const getTodayYmd = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isBeforeToday = (value) => {
  const text = asTrimmedText(value);
  return isYmd(text) && text < getTodayYmd();
};


const isSafeIdentifier = (value, max = 40) => {
  const text = asTrimmedText(value);
  return text.length > 0 && text.length <= max && /^[A-Za-z0-9_-]+$/.test(text);
};

const isPositiveIntegerLike = (value) => {
  const text = asTrimmedText(value);
  if (!/^\d+$/.test(text)) return false;
  return Number(text) > 0;
};

const isSafeTextLength = (value, max = 1000) => asTrimmedText(value).length <= max;

const normalizeTextField = (target, field, max = 1000) => {
  if (!target || target[field] === undefined || target[field] === null) return null;

  const value = asTrimmedText(target[field]);
  target[field] = value;

  if (value.length > max) {
    return `${field} maksimal ${max} karakter.`;
  }

  return null;
};


const validateStringParamId = (paramName = 'id', label = 'ID', max = 40) => (req, res, next) => {
  const value = req.params[paramName];

  if (!isSafeIdentifier(value, max)) {
    return fail(res, `${label} tidak valid.`);
  }

  next();
};

const validateParamId = (paramName = 'id', label = 'ID') => (req, res, next) => {
  const value = req.params[paramName];

  if (!isPositiveIntegerLike(value)) {
    return fail(res, `${label} tidak valid.`);
  }

  next();
};

const validateYmdField = ({ value, label, required = true, notBeforeToday = false }) => {
  if (isBlank(value)) return required ? `${label} wajib diisi.` : '';
  if (!isYmd(value)) return `${label} harus berformat YYYY-MM-DD.`;
  if (notBeforeToday && isBeforeToday(value)) return `${label} tidak boleh sebelum hari ini.`;
  return '';
};

const validateTimeField = ({ value, label, required = true }) => {
  const text = asTrimmedText(value);
  if (!text) return required ? `${label} wajib diisi.` : '';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) return `${label} harus berformat HH:mm.`;
  return '';
};

module.exports = {
  asTrimmedText,
  fail,
  getTodayYmd,
  isBlank,
  isBeforeToday,
  isPositiveIntegerLike,
  isSafeIdentifier,
  isSafeTextLength,
  isYmd,
  normalizeTextField,
  validateParamId,
  validateStringParamId,
  validateTimeField,
  validateYmdField,
};
