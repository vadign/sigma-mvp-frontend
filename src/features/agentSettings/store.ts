import { useSyncExternalStore } from 'react';
import { AgentId } from '../../utils/agents';

export type DecisionMode = 'recommend' | 'confirm' | 'auto';
export type SeverityKey = 'low' | 'medium' | 'high' | 'critical';

export interface RegulationOverride {
  enabled?: boolean;
  threshold?: number;
}

export interface AgentSettings {
  agentId: AgentId;
  isPaused: boolean;
  decisionMode: DecisionMode;
  decisionModesBySeverity: Record<SeverityKey, DecisionMode>;
  notificationsEnabled: boolean;
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  notificationRecipients?: string[];
  noDataThresholdMinutes: number;
  regulationsOverrides?: Record<string, RegulationOverride>;
  owner?: string;
  comment?: string;
  updatedAt: string;
}

export interface AgentSettingsPatch extends Omit<Partial<AgentSettings>, 'notificationChannels' | 'decisionModesBySeverity'> {
  notificationChannels?: Partial<AgentSettings['notificationChannels']>;
  decisionModesBySeverity?: Partial<Record<SeverityKey, DecisionMode>>;
}

const STORAGE_KEY = 'sigma_agent_settings_v1';

const listeners = new Set<() => void>();

const DEFAULT_DECISION_BY_SEVERITY: Record<SeverityKey, DecisionMode> = {
  low: 'auto',
  medium: 'confirm',
  high: 'recommend',
  critical: 'recommend',
};

const createDefaultSettings = (agentId: AgentId): AgentSettings => ({
  agentId,
  isPaused: false,
  decisionMode: 'confirm',
  decisionModesBySeverity: DEFAULT_DECISION_BY_SEVERITY,
  notificationsEnabled: true,
  notificationChannels: {
    inApp: true,
    email: false,
    sms: false,
  },
  notificationRecipients: [],
  noDataThresholdMinutes: 15,
  regulationsOverrides: {},
  owner: '',
  comment: '',
  updatedAt: new Date().toISOString(),
});

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const getSeedState = (): Record<AgentId, AgentSettings> => ({
  heat: createDefaultSettings('heat'),
  air: createDefaultSettings('air'),
  noise: createDefaultSettings('noise'),
});

const mergeWithDefaults = (data?: Partial<Record<AgentId, AgentSettings>>): Record<AgentId, AgentSettings> => {
  const seed = getSeedState();
  if (!data) return seed;

  return {
    heat: { ...seed.heat, ...data.heat, notificationChannels: { ...seed.heat.notificationChannels, ...data.heat?.notificationChannels } },
    air: { ...seed.air, ...data.air, notificationChannels: { ...seed.air.notificationChannels, ...data.air?.notificationChannels } },
    noise: { ...seed.noise, ...data.noise, notificationChannels: { ...seed.noise.notificationChannels, ...data.noise?.notificationChannels } },
  };
};

const persistState = (store: Record<AgentId, AgentSettings>) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore local storage write errors in demo mode
  }
};

const loadState = (): Record<AgentId, AgentSettings> => {
  if (canUseStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<AgentId, AgentSettings>>;
        const merged = mergeWithDefaults(parsed);
        persistState(merged);
        return merged;
      }
    } catch {
      // ignore local storage parse errors in demo mode
    }
  }

  const seeded = getSeedState();
  persistState(seeded);
  return seeded;
};

let state: Record<AgentId, AgentSettings> = loadState();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setState = (nextState: Record<AgentId, AgentSettings>) => {
  state = nextState;
  persistState(nextState);
  emit();
};

export const getAgentSettings = (agentId: AgentId): AgentSettings => {
  return state[agentId] ?? createDefaultSettings(agentId);
};

export const getAllAgentSettings = (): Record<AgentId, AgentSettings> => state;

export const updateAgentSettings = (agentId: AgentId, patch: AgentSettingsPatch): AgentSettings => {
  const current = getAgentSettings(agentId);
  const next: AgentSettings = {
    ...current,
    ...patch,
    notificationChannels: {
      ...current.notificationChannels,
      ...(patch.notificationChannels ?? {}),
    },
    regulationsOverrides: {
      ...(current.regulationsOverrides ?? {}),
      ...(patch.regulationsOverrides ?? {}),
    },
    decisionModesBySeverity: {
      ...(current.decisionModesBySeverity ?? DEFAULT_DECISION_BY_SEVERITY),
      ...(patch.decisionModesBySeverity ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };

  setState({
    ...state,
    [agentId]: next,
  });

  return next;
};

export const resetAgentSettings = (agentId: AgentId): AgentSettings => {
  const next = createDefaultSettings(agentId);
  setState({
    ...state,
    [agentId]: next,
  });
  return next;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAgentSettings = () => useSyncExternalStore(subscribe, getAllAgentSettings, getAllAgentSettings);
