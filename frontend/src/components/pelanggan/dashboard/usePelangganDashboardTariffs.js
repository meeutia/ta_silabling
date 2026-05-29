import { useEffect, useMemo, useState } from 'react';
import { dashboardApi } from '../../../api/dashboardApi';
import { PARAMETER_CATEGORIES, SAMPLING_TARIFFS } from './pelangganDashboardTariffs';

function cleanText(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(row, paths, fallback = '') {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc?.[key], row);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }

  return fallback;
}


function toRows(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const candidates = [
    value.rows,
    value.items,
    value.data,
    value.result,
    value.results,
    value.parameterTariffs,
    value.pickupTariffs,
    value.tariffs,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function formatPrice(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const numeric = Number(raw.replace(/[^\d,-]/g, '').replace(/,/g, '.'));
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(numeric);
  }

  return raw.replace(/^Rp\s*/i, '');
}

function normalizeParameterItem(row, fallbackCategory = 'Parameter Uji') {
  const name = cleanText(pick(row, [
    'name',
    'nama',
    'nama_parameter',
    'parameter_name',
    'parameter.nama_parameter',
    'Parameter.nama_parameter',
  ]));

  if (!name) return null;

  const metode = cleanText(pick(row, [
    'metode',
    'nama_metode',
    'metode.nama_metode',
    'Metode.nama_metode',
    'method',
  ], '-')) || '-';

  const price = formatPrice(pick(row, [
    'price',
    'harga',
    'tarif',
    'biaya',
    'tarif_pengujian',
    'harga_parameter',
  ]));

  return {
    name,
    metode,
    price: price || '-',
    category: cleanText(pick(row, [
      'category',
      'kategori',
      'kategori_parameter',
      'parameter.kategori_parameter',
      'Parameter.kategori_parameter',
    ], fallbackCategory), fallbackCategory),
  };
}

function normalizeParameterCategories(value) {
  const rows = toRows(value);
  if (rows.length === 0) return [];

  const flattened = rows.flatMap((row) => {
    const categoryTitle = cleanText(pick(row, ['title', 'kategori', 'kategori_parameter'], 'Parameter Uji'));

    if (Array.isArray(row?.items)) {
      return row.items
        .map((item) => normalizeParameterItem(item, categoryTitle))
        .filter(Boolean);
    }

    return [normalizeParameterItem(row, categoryTitle)].filter(Boolean);
  });

  const grouped = new Map();
  flattened.forEach((item) => {
    const category = item.category || 'Parameter Uji';
    if (!grouped.has(category)) {
      grouped.set(category, {
        id: category.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, ''),
        title: category,
        items: [],
      });
    }

    grouped.get(category).items.push({
      name: item.name,
      price: item.price,
      metode: item.metode,
    });
  });

  return Array.from(grouped.values()).filter((category) => category.items.length > 0);
}

function normalizeSamplingTariffs(value) {
  const rows = toRows(value);
  if (rows.length === 0) return [];

  return rows
    .map((row) => {
      const label = cleanText(pick(row, [
        'label',
        'keterangan',
        'keterangan_jarak',
        'keteranganJarak',
        'deskripsi',
        'jarak',
        'zona',
        'nama_tarif',
      ]));
      const price = formatPrice(pick(row, ['price', 'harga', 'tarif', 'biaya']));

      if (!label || !price) return null;
      return { label, price };
    })
    .filter(Boolean);
}

export function usePelangganDashboardTariffs() {
  const [parameterCategories, setParameterCategories] = useState(PARAMETER_CATEGORIES);
  const [samplingTariffs, setSamplingTariffs] = useState(SAMPLING_TARIFFS);
  const [loadingTariffs, setLoadingTariffs] = useState(false);
  const [tariffSource, setTariffSource] = useState('static');

  useEffect(() => {
    let ignore = false;

    const loadTariffs = async () => {
      setLoadingTariffs(true);

      const [parameterResult, samplingResult] = await Promise.allSettled([
        dashboardApi.getParameterTariffs(),
        dashboardApi.getPickupTariffs(),
      ]);

      if (ignore) return;

      const nextParameterCategories = parameterResult.status === 'fulfilled'
        ? normalizeParameterCategories(parameterResult.value)
        : [];
      const nextSamplingTariffs = samplingResult.status === 'fulfilled'
        ? normalizeSamplingTariffs(samplingResult.value)
        : [];

      if (nextParameterCategories.length > 0) {
        setParameterCategories(nextParameterCategories);
        setTariffSource('backend');
      }

      if (nextSamplingTariffs.length > 0) {
        setSamplingTariffs(nextSamplingTariffs);
        setTariffSource('backend');
      }

      setLoadingTariffs(false);
    };

    loadTariffs();

    return () => {
      ignore = true;
    };
  }, []);

  return useMemo(() => ({
    parameterCategories,
    samplingTariffs,
    loadingTariffs,
    tariffSource,
  }), [loadingTariffs, parameterCategories, samplingTariffs, tariffSource]);
}
