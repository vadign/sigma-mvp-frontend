export type EdgeMetricKey = 'd' | 'ksi' | 'H' | 'Q' | 'vel' | 'Tem' | 'Heat' | 'dP';

const edgeMetricLabels: Record<EdgeMetricKey, string> = {
  d: 'Диаметр, м',
  ksi: 'Коэффициент шероховатости',
  H: 'Напор, м',
  Q: 'Расход, м³/ч',
  vel: 'Скорость потока, м/с',
  Tem: 'Температура, °C',
  Heat: 'Тепловая нагрузка, Гкал/ч',
  dP: 'Потери давления, кПа',
};

export const formatEdgeLabel = (edgeId: number) => `Участок трубы №${edgeId}`;
export const formatEdgeShortLabel = (edgeId: number) => `Участок №${edgeId}`;
export const formatNodeLabel = (nodeId: number) => `Узел №${nodeId}`;

export const getEdgeMetricLabel = (key?: EdgeMetricKey | null) => {
  if (!key) return '—';
  return edgeMetricLabels[key] ?? key;
};

export const getDeviationTypeLabel = (key?: EdgeMetricKey | null) => getEdgeMetricLabel(key);
