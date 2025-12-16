export type SeverityLevel = 1 | 2 | 3 | null | undefined;

export interface SeverityMeta {
  label: string;
  description: string;
  color: string;
  badgeStatus: 'error' | 'warning' | 'processing' | 'default';
  tagText: string;
}

const severityMap: Record<1 | 2 | 3, SeverityMeta> = {
  1: {
    label: 'Критический',
    description: 'Требует немедленного реагирования',
    color: '#ff4d4f',
    badgeStatus: 'error',
    tagText: 'Критический (1)',
  },
  2: {
    label: 'Предупреждение',
    description: 'Нужно внимание и проверка',
    color: '#fa8c16',
    badgeStatus: 'warning',
    tagText: 'Предупреждение (2)',
  },
  3: {
    label: 'Информационный',
    description: 'Для мониторинга без срочных действий',
    color: '#6c7a89',
    badgeStatus: 'processing',
    tagText: 'Информационный (3)',
  },
};

export function getSeverityMeta(level: SeverityLevel): SeverityMeta {
  if (level === 1 || level === 2 || level === 3) {
    return severityMap[level];
  }
  return {
    label: 'Нет данных',
    description: 'Уровень не указан',
    color: '#d9d9d9',
    badgeStatus: 'default',
    tagText: 'Нет данных',
  };
}
