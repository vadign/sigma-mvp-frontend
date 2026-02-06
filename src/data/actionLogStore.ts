import { useSyncExternalStore } from 'react';
import { DemoActionLogEntry, createDemoActionLog } from '../demo/demoData';

const STORAGE_KEY = 'sigma_action_log_v1';

type ActionLogListener = () => void;

const readStoredActionLog = (): DemoActionLogEntry[] | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DemoActionLogEntry[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

const persistActionLog = (entries: DemoActionLogEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

let actionLogState: DemoActionLogEntry[] = readStoredActionLog() ?? createDemoActionLog(Date.now());
const listeners = new Set<ActionLogListener>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const listActionLog = () => actionLogState;

export const addActionLogEntry = (entry: Omit<DemoActionLogEntry, 'id'> & { id?: string }) => {
  const id = entry.id ?? `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const nextEntry: DemoActionLogEntry = { ...entry, id };
  actionLogState = [nextEntry, ...actionLogState];
  persistActionLog(actionLogState);
  emitChange();
  return nextEntry;
};

export const subscribe = (listener: ActionLogListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useActionLogStore = () => {
  return useSyncExternalStore(subscribe, () => listActionLog());
};

export const resetActionLogStore = () => {
  actionLogState = createDemoActionLog(Date.now());
  persistActionLog(actionLogState);
  emitChange();
};
