import { useSyncExternalStore } from 'react';
import { EventResponse } from '../api/types';
import { createDemoEvents, createEventResponseFromOverride, DemoEventOverride } from '../demo/demoData';
import { AgentId } from '../utils/agents';

const STORAGE_KEY = 'sigma_events_v1';

type EventsListener = () => void;

export type EventsFilter = {
  agentId?: AgentId;
  status?: Array<'New' | 'InProgress' | 'Resolved' | 'Closed'>;
  requiresAttention?: boolean;
};

type EventPatch = Partial<EventResponse> & {
  msg?: Record<string, any>;
};

const readStoredEvents = (): EventResponse[] | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EventResponse[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

const persistEvents = (events: EventResponse[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};

let eventsState: EventResponse[] = readStoredEvents() ?? createDemoEvents(Date.now());
const listeners = new Set<EventsListener>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const listEvents = (filter?: EventsFilter): EventResponse[] => {
  if (!filter) return eventsState;
  return eventsState.filter((event) => {
    if (filter.agentId && event.msg?.subsystem !== filter.agentId) return false;
    if (filter.status && !filter.status.includes(event.msg?.status)) return false;
    if (typeof filter.requiresAttention === 'boolean' && event.msg?.requiresAttention !== filter.requiresAttention) {
      return false;
    }
    return true;
  });
};

export const getEvent = (id: number) => eventsState.find((event) => event.id === id);

export const updateEvent = (id: number, patch: EventPatch): EventResponse => {
  const existing = getEvent(id);
  if (!existing) {
    throw new Error(`Event ${id} not found`);
  }
  const next: EventResponse = {
    ...existing,
    ...patch,
    msg: {
      ...existing.msg,
      ...patch.msg,
    },
  };
  eventsState = eventsState.map((event) => (event.id === id ? next : event));
  persistEvents(eventsState);
  emitChange();
  return next;
};

export const addEvent = (event: EventResponse) => {
  eventsState = [event, ...eventsState];
  persistEvents(eventsState);
  emitChange();
};

export const addEventFromOverride = (definition: DemoEventOverride) => {
  const event = createEventResponseFromOverride(definition, Date.now());
  addEvent(event);
  return event;
};

export const closeEvent = (
  id: number,
  payload: {
    status: 'Resolved' | 'Closed';
    comment: string;
    reason?: string;
    closedBy?: string;
  },
) => {
  const now = new Date().toISOString();
  return updateEvent(id, {
    msg: {
      status: payload.status,
      updated_at: now,
      closedBy: payload.closedBy ?? 'Оператор теплосетей',
      closedAt: now,
      closeComment: payload.comment,
      closeReason: payload.reason,
    },
  });
};

export const subscribe = (listener: EventsListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useEventsStore = () => {
  return useSyncExternalStore(subscribe, () => listEvents());
};

export const resetEventsStore = () => {
  eventsState = createDemoEvents(Date.now());
  persistEvents(eventsState);
  emitChange();
};
