import { useSyncExternalStore } from 'react';

export type DevRequestDomain = 'heat' | 'air' | 'noise' | 'other';
export type DevRequestPriority = 'low' | 'medium' | 'high';
export type DevRequestStatus = 'new' | 'in_progress' | 'needs_info' | 'done';

export interface DevRequest {
  id: string;
  createdAt: string;
  createdBy: string;
  domain: DevRequestDomain;
  assistantName: string;
  responsibilityZone: string;
  description: string;
  priority: DevRequestPriority;
  status: DevRequestStatus;
  contact?: string;
}

export interface CreateDevRequestPayload {
  createdBy: string;
  domain: DevRequestDomain;
  assistantName: string;
  responsibilityZone: string;
  description: string;
  priority: DevRequestPriority;
  contact?: string;
}

const STORAGE_KEY = 'sigma_dev_requests_v1';

const listeners = new Set<() => void>();
let requestCounter = 0;

const createSeedRequests = (): DevRequest[] => {
  const now = Date.now();
  return [
    {
      id: 'seed-1',
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
      createdBy: 'Управленец',
      domain: 'heat',
      assistantName: 'Заместитель по авариям на магистралях',
      responsibilityZone: 'Центральный и Северный районы',
      description: 'Нужен контроль аварийных отключений и прогноз времени восстановления.',
      priority: 'high',
      status: 'in_progress',
      contact: 'mayor.office@sigma.demo',
    },
    {
      id: 'seed-2',
      createdAt: new Date(now - 1000 * 60 * 40).toISOString(),
      createdBy: 'Управленец',
      domain: 'air',
      assistantName: 'Заместитель по мониторингу качества воздуха',
      responsibilityZone: 'Промышленный контур №2',
      description: 'Требуется агрегировать превышения ПДК и формировать ежедневные рекомендации.',
      priority: 'medium',
      status: 'needs_info',
    },
    {
      id: 'seed-3',
      createdAt: new Date(now - 1000 * 60 * 15).toISOString(),
      createdBy: 'Управленец',
      domain: 'noise',
      assistantName: 'Заместитель по ночному шуму',
      responsibilityZone: 'Спальные микрорайоны у магистралей',
      description: 'Нужна аналитика пиков шумовой нагрузки ночью и приоритизация точек контроля.',
      priority: 'low',
      status: 'new',
      contact: '+7 (900) 000-00-00',
    },
  ];
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const persistRequests = (data: DevRequest[]) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage write errors in demo mode
  }
};

const loadRequests = (): DevRequest[] => {
  if (canUseStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DevRequest[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage read/parse errors in demo mode
    }
  }

  const seeded = createSeedRequests();
  persistRequests(seeded);
  return seeded;
};

let requestsState: DevRequest[] = loadRequests();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const generateId = () => {
  requestCounter += 1;
  return `request-${Date.now()}-${requestCounter}`;
};

const setRequests = (nextState: DevRequest[]) => {
  requestsState = nextState;
  persistRequests(nextState);
  emitChange();
};

export const getRequests = (): DevRequest[] => requestsState;

export const createRequest = (payload: CreateDevRequestPayload): DevRequest => {
  const request: DevRequest = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    createdBy: payload.createdBy,
    domain: payload.domain,
    assistantName: payload.assistantName.trim(),
    responsibilityZone: payload.responsibilityZone.trim(),
    description: payload.description.trim(),
    priority: payload.priority,
    status: 'new',
    contact: payload.contact?.trim() || undefined,
  };

  setRequests([request, ...requestsState]);
  return request;
};

export const updateRequest = (id: string, patch: Partial<Pick<DevRequest, 'status'>>): DevRequest => {
  let updatedRequest: DevRequest | null = null;
  const nextState = requestsState.map((request) => {
    if (request.id !== id) return request;
    updatedRequest = { ...request, ...patch };
    return updatedRequest;
  });

  if (!updatedRequest) {
    throw new Error(`Request ${id} not found`);
  }

  setRequests(nextState);
  return updatedRequest;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useDevRequests = (): DevRequest[] =>
  useSyncExternalStore(subscribe, getRequests, getRequests);
