import dayjs from 'dayjs';
import { EventResponse } from '../api/types';

export type AgentId = 'heat' | 'air' | 'noise';

export interface AgentDefinition {
  id: AgentId;
  title: string;
  responsibility: string;
  keywords: string[];
  paused?: boolean;
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'heat',
    title: 'Цифровой заместитель: Теплосети',
    responsibility:
      'Контроль отклонений параметров теплосетей по цифровому регламенту давления и диаметра, надежность участков',
    keywords: ['тепло', 'теплосеть', 'теплосети', 'heat', 'heating'],
  },
  {
    id: 'air',
    title: 'Цифровой заместитель: Качество воздуха',
    responsibility: 'Мониторинг показателей воздуха, выбросов и нарушений нормативов',
    keywords: ['воздух', 'air', 'air_quality', 'качество воздуха'],
  },
  {
    id: 'noise',
    title: 'Цифровой заместитель: Шум',
    responsibility: 'Контроль шумового фона и реагирование на превышения',
    keywords: ['шум', 'noise', 'sound', 'шумовой'],
  },
];

export const STALE_DATA_THRESHOLD_MINUTES = 15;

const CLOSED_STATUSES = ['closed', 'resolved', 'done', 'устранено', 'закрыто'];

const collectEventText = (event: EventResponse) => {
  const msg = event.msg ?? {};
  const fragments = [
    msg.subsystem,
    msg.system,
    msg.domain,
    msg.category,
    msg.type,
    msg.title,
    msg.description,
    msg.msg,
    msg.network_id,
  ]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toLowerCase());
  return fragments.join(' ');
};

export const resolveAgentIdForEvent = (event: EventResponse): AgentId | null => {
  const text = collectEventText(event);
  if (!text) return null;
  const match = AGENTS.find((agent) => agent.keywords.some((keyword) => text.includes(keyword)));
  return match?.id ?? null;
};

export const filterEventsByAgent = (events: EventResponse[], agentId: AgentId) => {
  return events.filter((event) => resolveAgentIdForEvent(event) === agentId);
};

export const isEventClosed = (event: EventResponse) => {
  const status = event.msg?.status;
  if (!status || typeof status !== 'string') return false;
  const normalized = status.toLowerCase();
  return CLOSED_STATUSES.some((value) => normalized.includes(value));
};

export const isEventAttention = (event: EventResponse) => {
  if (isEventClosed(event)) return false;
  const requiresAttention = event.msg?.requiresAttention;
  if (typeof requiresAttention === 'boolean') {
    return requiresAttention;
  }
  const level = event.msg?.level;
  return level === 1 || level === 2;
};

export const getLastEventAt = (events: EventResponse[]) => {
  if (events.length === 0) return null;
  return events.reduce((latest, event) => {
    const timestamp = event.msg?.updated_at || event.created_at;
    const current = dayjs(timestamp);
    if (!latest || current.isAfter(latest)) return current;
    return latest;
  }, null as dayjs.Dayjs | null);
};
