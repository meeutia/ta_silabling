export const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

export const getActivityLogsFromSource = (source) => {
  const logs =
    source?.aktivitas_sistem_logs ||
    source?.activity_logs ||
    source?.timeline_logs ||
    source?.aktivitasSistemLogs ||
    source?.activityLogs ||
    source?.timelineLogs ||
    [];

  return Array.isArray(logs) ? logs : [];
};

export const getActivityLogDate = (log) => (
  log?.dibuat_pada ||
  log?.dibuatPada ||
  log?.created_at ||
  log?.createdAt ||
  null
);

export const getActivityLogAction = (log) => (
  log?.aksi ||
  log?.action ||
  log?.aksi_log ||
  log?.aksiLog ||
  ''
);

export const getActivityLogEntityType = (log) => (
  log?.entity_type ||
  log?.entityType ||
  ''
);

export const getActivityLogEntityId = (log) => (
  log?.entity_id ||
  log?.entityId ||
  log?.id_entity ||
  log?.idEntity ||
  ''
);

export const getActivityLogStatusAfter = (log) => (
  log?.status_baru ||
  log?.statusBaru ||
  log?.status_after ||
  log?.statusAfter ||
  null
);

export const toActivityTimestamp = (value, fallback = Number.POSITIVE_INFINITY) => {
  if (!value) return fallback;
  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : fallback;
};

export const sortActivityLogsByDate = (logs = [], direction = 'asc') => {
  const sign = direction === 'desc' ? -1 : 1;
  return [...logs].sort((a, b) => (
    toActivityTimestamp(getActivityLogDate(a)) - toActivityTimestamp(getActivityLogDate(b))
  ) * sign);
};

export const findActivityLogByActions = (
  source,
  actionList = [],
  entityTypes = [],
  { latest = true } = {}
) => {
  const actions = new Set(actionList.filter(Boolean));
  const types = new Set(entityTypes.filter(Boolean));

  const rows = sortActivityLogsByDate(
    getActivityLogsFromSource(source).filter((log) => {
      const action = getActivityLogAction(log);
      const entityType = getActivityLogEntityType(log);
      const dateValue = getActivityLogDate(log);
      const matchesAction = actions.size === 0 || actions.has(action);
      const matchesType = types.size === 0 || types.has(entityType);
      return matchesAction && matchesType && dateValue;
    })
  );

  if (!rows.length) return null;
  return latest ? rows[rows.length - 1] : rows[0];
};

export const getActivityRowsByActions = (source, actionList = [], entityTypes = []) => {
  const actions = new Set(actionList.filter(Boolean));
  const types = new Set(entityTypes.filter(Boolean));

  return getActivityLogsFromSource(source).filter((log) => {
    const action = getActivityLogAction(log);
    const entityType = getActivityLogEntityType(log);
    const dateValue = getActivityLogDate(log);
    const matchesAction = actions.size === 0 || actions.has(action);
    const matchesType = types.size === 0 || types.has(entityType);
    return matchesAction && matchesType && dateValue;
  });
};

export const findLatestFpplStatusLog = (source, statusList = [], actionList = []) => {
  const statuses = new Set(statusList.filter(Boolean));
  const actions = new Set(actionList.filter(Boolean));

  return sortActivityLogsByDate(
    getActivityLogsFromSource(source).filter((log) => {
      const entityType = getActivityLogEntityType(log);
      if (entityType && entityType !== 'FPPL') return false;

      const statusAfter = getActivityLogStatusAfter(log);
      const action = getActivityLogAction(log);
      const matchesStatus = statuses.size === 0 || statuses.has(statusAfter);
      const matchesAction = actions.size === 0 || actions.has(action);

      return matchesStatus && matchesAction && getActivityLogDate(log);
    }),
    'desc'
  )[0] || null;
};
