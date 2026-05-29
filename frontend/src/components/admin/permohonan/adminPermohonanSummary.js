import {
  getParameterName,
  getRequestSamples,
  getSampleParameterMethods,
} from './adminPermohonanHelpers';

export function getSampleTypeList(requestItem) {
  const requestSamples = getRequestSamples(requestItem);
  if (requestSamples.length === 0) return '-';

  return requestSamples
    .map((requestSample) => {
      const sampleType = requestSample?.JenisSampel || requestSample?.jenis_sampel || requestSample?.jenisSampel;
      if (!sampleType) return 'Unknown';
      if (typeof sampleType === 'string') return sampleType;
      return sampleType.jenis_sampel || sampleType.jenisSampel || 'Unknown';
    })
    .join(', ');
}

export function getParameterList(requestItem) {
  const parameterNames = [];

  getRequestSamples(requestItem).forEach((requestSample) => {
    getSampleParameterMethods(requestSample).forEach((sampleParameterMethod) => {
      const parameterName = getParameterName(sampleParameterMethod);
      if (parameterName && !parameterNames.includes(parameterName)) {
        parameterNames.push(parameterName);
      }
    });
  });

  return parameterNames;
}
