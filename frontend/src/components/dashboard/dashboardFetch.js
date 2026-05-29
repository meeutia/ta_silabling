export async function loadDashboardSources(sources = []) {
  const results = await Promise.allSettled(
    sources.map(({ key, label, fetcher, fallback = [] }) => Promise.resolve(fetcher()).then((data) => ({
      key,
      label,
      data,
      fallback,
    })))
  );

  const payload = results.reduce((acc, result, index) => {
    const source = sources[index];

    if (result.status === 'fulfilled') {
      acc.data[source.key] = result.value.data;
      return acc;
    }

    acc.data[source.key] = source.fallback ?? [];
    acc.errors.push({
      key: source.key,
      label: source.label || source.key,
      message: result.reason?.message || 'Gagal dimuat.',
    });

    return acc;
  }, { data: {}, errors: [] });

  return {
    ...payload,
    failedAll: sources.length > 0 && payload.errors.length === sources.length,
  };
}

export function formatDashboardLoadError(
  errors = [],
  partialMessage = 'Sebagian data dashboard gagal dimuat.',
  failedMessage = 'Gagal memuat dashboard.',
  failedAll = false
) {
  if (!errors.length) return '';

  if (failedAll) {
    return errors[0]?.message || failedMessage;
  }

  const labels = errors
    .map((error) => error.label)
    .filter(Boolean)
    .join(', ');

  return labels ? `${partialMessage} Bagian bermasalah: ${labels}.` : partialMessage;
}
