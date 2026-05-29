import { useEffect, useMemo, useState } from 'react';
import { publicReferenceApi } from '../../api/publicReferenceApi';

function toRows(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  return [
    value.rows,
    value.items,
    value.data,
    value.result,
    value.results,
    value.parameters,
    value.tariffs,
  ].find(Array.isArray) || [];
}

function cleanText(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(row, keys, fallback = '') {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, path) => acc?.[path], row);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
}

function parseCurrencyNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const raw = String(value ?? '')
    .replace(/rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '')
    .trim();

  if (!raw) return null;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let normalized = raw;

  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');

    normalized = lastComma > lastDot
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  } else if (hasDot) {
    normalized = /^-?\d+\.\d{1,2}$/.test(raw)
      ? raw
      : raw.replace(/\./g, '');
  } else if (hasComma) {
    normalized = /^-?\d+,\d{1,2}$/.test(raw)
      ? raw.replace(',', '.')
      : raw.replace(/,/g, '');
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatRawPrice(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const numeric = parseCurrencyNumber(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(numeric));
  }

  return raw.replace(/^Rp\s*/i, '');
}

function normalizeSampleType(row) {
  const id = pick(row, ['id_jenis_sampel', 'idJenisSampel', 'id', 'value']);
  const name = cleanText(pick(row, ['nama_jenis_sampel', 'namaJenisSampel', 'nama', 'label', 'name']));

  if (!id || !name) return null;

  return {
    id: String(id),
    name,
    description: cleanText(pick(row, ['deskripsi', 'description', 'keterangan'], '')),
  };
}

function normalizeStandard(row) {
  const id = pick(row, ['id_reg_bm', 'idRegBm', 'id', 'value']);
  const institution = cleanText(pick(row, ['instansi', 'institution'], ''));
  const reference = cleanText(pick(row, ['ref_reg', 'refReg', 'nama_regulasi', 'namaRegulasi', 'label', 'name'], ''));

  if (!id) return null;

  return {
    id: String(id),
    title: [institution, reference].filter(Boolean).join(' - ') || `Regulasi ${id}`,
    institution,
    reference,
  };
}

function normalizeTariff(row) {
  const idMetodeParameter = pick(row, ['id_metode_parameter', 'idMetodeParameter', 'id']);
  const idParameter = pick(row, ['id_parameter', 'idParameter', 'parameter.id_parameter', 'Parameter.id_parameter']);
  const name = cleanText(pick(row, ['nama_parameter', 'parameter.nama_parameter', 'Parameter.nama_parameter', 'name', 'nama']));
  const category = cleanText(pick(row, ['kategori_parameter', 'parameter.kategori_parameter', 'Parameter.kategori_parameter', 'category'], 'Parameter Uji'));
  const method = cleanText(pick(row, ['nama_metode', 'metode.nama_metode', 'Metode.nama_metode', 'method', 'metode'], '-')) || '-';
  const price = formatRawPrice(pick(row, ['tarif', 'harga', 'price', 'biaya']));

  if (!name && !idParameter) return null;

  return {
    idMetodeParameter: idMetodeParameter ? String(idMetodeParameter) : '',
    idParameter: idParameter ? String(idParameter) : '',
    name,
    category,
    method,
    price: price || '-',
  };
}

function getMethodRows(row) {
  return [
    row?.methods,
    row?.methodRows,
    row?.parameter_metode,
    row?.parameterMetode,
    row?.ParameterMetode,
    row?.pkt_bm_pms,
    row?.pktBmPms,
  ].find(Array.isArray) || [];
}

function normalizeParameterRows(row, tariffLookup) {
  const idParameter = pick(row, ['id_parameter', 'idParameter', 'parameter.id_parameter', 'Parameter.id_parameter']);
  const baseName = cleanText(pick(row, ['nama_parameter', 'namaParameter', 'parameter.nama_parameter', 'Parameter.nama_parameter'], ''));
  const baseCategory = cleanText(pick(row, ['kategori_parameter', 'kategoriParameter', 'parameter.kategori_parameter', 'Parameter.kategori_parameter'], 'Parameter Uji'));
  const methodRows = getMethodRows(row);

  if (methodRows.length > 0) {
    return methodRows
      .map((methodRow) => {
        const idMetodeParameter = pick(methodRow, [
          'id_metode_parameter',
          'idMetodeParameter',
          'parameter_metode.id_metode_parameter',
          'parameterMetode.idMetodeParameter',
        ]);
        const tariff = idMetodeParameter ? tariffLookup.byMethod.get(String(idMetodeParameter)) : null;
        const name = baseName || tariff?.name || '';
        if (!name) return null;

        return {
          idParameter: idParameter ? String(idParameter) : tariff?.idParameter || '',
          idMetodeParameter: idMetodeParameter ? String(idMetodeParameter) : tariff?.idMetodeParameter || '',
          category: baseCategory || tariff?.category || 'Parameter Uji',
          name,
          method: cleanText(pick(methodRow, [
            'nama_metode',
            'namaMetode',
            'metode.nama_metode',
            'Metode.nama_metode',
            'parameter_metode.metode.nama_metode',
            'parameterMetode.metode.namaMetode',
          ], tariff?.method || '-')) || '-',
          price: formatRawPrice(pick(methodRow, [
            'tarif',
            'harga',
            'price',
            'biaya',
            'parameter_metode.tarif',
            'parameterMetode.tarif',
          ], tariff?.price || '')) || tariff?.price || '-',
        };
      })
      .filter(Boolean);
  }

  const idMetodeParameter = pick(row, [
    'id_metode_parameter_default',
    'idMetodeParameterDefault',
    'id_metode_parameter',
    'idMetodeParameter',
  ]);

  const tariffByMethod = idMetodeParameter ? tariffLookup.byMethod.get(String(idMetodeParameter)) : null;
  const tariffByParameter = idParameter ? tariffLookup.byParameter.get(String(idParameter)) : null;
  const tariff = tariffByMethod || tariffByParameter || null;
  const name = baseName || tariff?.name || '';

  if (!name) return [];

  return [{
    idParameter: idParameter ? String(idParameter) : tariff?.idParameter || '',
    idMetodeParameter: idMetodeParameter ? String(idMetodeParameter) : tariff?.idMetodeParameter || '',
    category: baseCategory || tariff?.category || 'Parameter Uji',
    name,
    method: tariff?.method || '-',
    price: tariff?.price || '-',
  }];
}

function dedupeTariffRows(rows) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = row.idMetodeParameter || `${row.idParameter}-${row.name}-${row.method}-${row.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => {
    const byName = left.name.localeCompare(right.name, 'id', { sensitivity: 'base' });
    if (byName !== 0) return byName;
    return left.method.localeCompare(right.method, 'id', { sensitivity: 'base' });
  });
}

function normalizePickupTariff(row) {
  const label = cleanText(pick(row, ['label', 'keterangan', 'keterangan_jarak', 'keteranganJarak', 'deskripsi', 'jarak', 'nama_tarif']));
  const price = formatRawPrice(pick(row, ['tarif', 'harga', 'price', 'biaya']));
  if (!label || !price) return null;
  return { label, price };
}

function buildTariffLookup(rows) {
  const byMethod = new Map();
  const byParameter = new Map();

  rows.forEach((row) => {
    if (row.idMetodeParameter) byMethod.set(row.idMetodeParameter, row);
    if (row.idParameter && !byParameter.has(row.idParameter)) byParameter.set(row.idParameter, row);
  });

  return { byMethod, byParameter };
}

export function useLandingTariffs() {
  const [sampleTypes, setSampleTypes] = useState([]);
  const [standardsBySampleType, setStandardsBySampleType] = useState({});
  const [selectedSampleTypeId, setSelectedSampleTypeId] = useState('');
  const [selectedStandardId, setSelectedStandardId] = useState('');
  const [parameterTariffs, setParameterTariffs] = useState([]);
  const [selectedParameters, setSelectedParameters] = useState([]);
  const [pickupTariffs, setPickupTariffs] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingParameters, setLoadingParameters] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [source, setSource] = useState('backend');

  const tariffLookup = useMemo(() => buildTariffLookup(parameterTariffs), [parameterTariffs]);

  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      setLoadingInitial(true);
      setErrorMessage('');

      const [sampleResult, tariffResult, pickupResult] = await Promise.allSettled([
        publicReferenceApi.getSampleTypes(),
        publicReferenceApi.getParameterTariffs(),
        publicReferenceApi.getPickupTariffs(),
      ]);

      if (ignore) return;

      const nextSampleTypes = sampleResult.status === 'fulfilled'
        ? toRows(sampleResult.value).map(normalizeSampleType).filter(Boolean)
        : [];
      const nextTariffs = tariffResult.status === 'fulfilled'
        ? toRows(tariffResult.value).map(normalizeTariff).filter(Boolean)
        : [];
      const nextPickupTariffs = pickupResult.status === 'fulfilled'
        ? toRows(pickupResult.value).map(normalizePickupTariff).filter(Boolean)
        : [];

      setSampleTypes(nextSampleTypes);
      setParameterTariffs(nextTariffs);
      setPickupTariffs(nextPickupTariffs);
      setSource(nextSampleTypes.length && nextTariffs.length ? 'backend' : 'empty');

      if (!nextSampleTypes.length || !nextTariffs.length) {
        setErrorMessage('Data tarif dari backend belum lengkap. Pastikan endpoint referensi tarif dan jenis sampel aktif.');
      }

      const standardsEntries = await Promise.allSettled(
        nextSampleTypes.map(async (sampleType) => {
          const standards = await publicReferenceApi.getBmStandards(sampleType.id);
          return [sampleType.id, toRows(standards).map(normalizeStandard).filter(Boolean)];
        })
      );

      if (ignore) return;

      const standardsMap = {};
      standardsEntries.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [sampleTypeId, standards] = result.value;
          standardsMap[sampleTypeId] = standards;
        }
      });

      setStandardsBySampleType(standardsMap);

      const firstSampleType = nextSampleTypes[0];
      const firstStandard = firstSampleType ? standardsMap[firstSampleType.id]?.[0] : null;
      setSelectedSampleTypeId(firstSampleType?.id || '');
      setSelectedStandardId(firstStandard?.id || '');
      setLoadingInitial(false);
    }

    loadInitial().catch((error) => {
      if (ignore) return;
      setErrorMessage(error?.message || 'Gagal memuat tarif landing page.');
      setLoadingInitial(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const standards = standardsBySampleType[selectedSampleTypeId] || [];
    if (!selectedSampleTypeId) return;

    if (!standards.some((standard) => standard.id === selectedStandardId)) {
      setSelectedStandardId(standards[0]?.id || '');
    }
  }, [selectedSampleTypeId, selectedStandardId, standardsBySampleType]);

  useEffect(() => {
    let ignore = false;

    async function loadParameters() {
      if (!selectedSampleTypeId) {
        setSelectedParameters([]);
        return;
      }

      const standards = standardsBySampleType[selectedSampleTypeId] || [];
      if (!standards.length) {
        setSelectedParameters([]);
        return;
      }

      setLoadingParameters(true);

      try {
        const results = await Promise.allSettled(
          standards.map((standard) => publicReferenceApi.getParametersBySampleTypeAndStandard(selectedSampleTypeId, standard.id))
        );

        if (ignore) return;

        const rows = results.flatMap((result) => (
          result.status === 'fulfilled' ? toRows(result.value) : []
        ));

        setSelectedParameters(
          dedupeTariffRows(
            rows.flatMap((row) => normalizeParameterRows(row, tariffLookup))
          )
        );
      } catch (error) {
        if (ignore) return;
        setSelectedParameters([]);
        setErrorMessage(error?.message || 'Gagal memuat parameter tarif untuk jenis air yang dipilih.');
      } finally {
        if (!ignore) setLoadingParameters(false);
      }
    }

    loadParameters();

    return () => {
      ignore = true;
    };
  }, [selectedSampleTypeId, standardsBySampleType, tariffLookup]);

  const selectedSampleType = useMemo(
    () => sampleTypes.find((item) => item.id === selectedSampleTypeId) || null,
    [sampleTypes, selectedSampleTypeId]
  );

  const selectedStandards = standardsBySampleType[selectedSampleTypeId] || [];
  const selectedStandard = selectedStandards.find((item) => item.id === selectedStandardId) || null;

  const groupedParameters = useMemo(() => {
    const grouped = new Map();

    selectedParameters.forEach((parameter) => {
      const category = parameter.category || 'Parameter Uji';
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(parameter);
    });

    return Array.from(grouped.entries()).map(([title, items]) => ({ title, items }));
  }, [selectedParameters]);

  return {
    loadingInitial,
    loadingParameters,
    errorMessage,
    source,
    sampleTypes,
    selectedSampleType,
    selectedSampleTypeId,
    setSelectedSampleTypeId,
    selectedStandards,
    selectedStandard,
    selectedStandardId,
    setSelectedStandardId,
    selectedParameters,
    groupedParameters,
    pickupTariffs,
  };
}
