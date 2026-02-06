import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { EventResponse } from '../api/types';
import { AgentId } from '../utils/agents';
import {
  DemoActionLogEntry,
  DemoAgent,
  DemoEventOverride,
  DemoTaskDecision,
  DemoTimeseriesPoint,
  createCriticalHeatEvent,
  createDemoAgents,
  createDemoTasksDecisions,
  createDemoTimeseries,
} from './demoData';
import { addEventFromOverride, useEventsStore } from '../data/eventsStore';
import { useActionLogStore } from '../data/actionLogStore';

interface DemoControls {
  noiseDataMissing: boolean;
  airPaused: boolean;
  setNoiseDataMissing: (value: boolean) => void;
  setAirPaused: (value: boolean) => void;
  addCriticalHeatEvent: () => void;
}

interface DemoDataContextValue {
  now: number;
  agents: DemoAgent[];
  events: EventResponse[];
  actionLog: DemoActionLogEntry[];
  tasksDecisions: DemoTaskDecision[];
  timeseries: Record<AgentId, DemoTimeseriesPoint[]>;
  controls: DemoControls;
}

const DemoDataContext = createContext<DemoDataContextValue | null>(null);

export const DemoDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const now = useMemo(() => Date.now(), []);
  const [pausedAgents, setPausedAgents] = useState<Record<AgentId, boolean>>({
    heat: false,
    air: false,
    noise: false,
  });
  const [staleAgents, setStaleAgents] = useState<Record<AgentId, boolean>>({
    heat: false,
    air: false,
    noise: false,
  });
  const nextEventIdRef = useRef(1000);

  const agents = useMemo(
    () => createDemoAgents({ pausedAgents }),
    [pausedAgents],
  );

  const events = useEventsStore();
  const actionLog = useActionLogStore();
  const tasksDecisions = useMemo(() => createDemoTasksDecisions(now), [now]);
  const timeseries = useMemo(() => createDemoTimeseries(now), [now]);

  const setNoiseDataMissing = useCallback((value: boolean) => {
    setStaleAgents((prev) => ({ ...prev, noise: value }));
  }, []);

  const setAirPaused = useCallback((value: boolean) => {
    setPausedAgents((prev) => ({ ...prev, air: value }));
  }, []);

  const addCriticalHeatEvent = useCallback(() => {
    const id = nextEventIdRef.current;
    nextEventIdRef.current += 1;
    const timestamp = Date.now();
    addEventFromOverride(createCriticalHeatEvent(id, timestamp) as DemoEventOverride);
  }, []);

  const controls = useMemo<DemoControls>(
    () => ({
      noiseDataMissing: staleAgents.noise,
      airPaused: pausedAgents.air,
      setNoiseDataMissing,
      setAirPaused,
      addCriticalHeatEvent,
    }),
    [staleAgents.noise, pausedAgents.air, setNoiseDataMissing, setAirPaused, addCriticalHeatEvent],
  );

  const value = useMemo<DemoDataContextValue>(
    () => ({
      now,
      agents,
      events,
      actionLog,
      tasksDecisions,
      timeseries,
      controls,
    }),
    [now, agents, events, actionLog, tasksDecisions, timeseries, controls],
  );

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
};

export const useDemoData = () => {
  const context = useContext(DemoDataContext);
  if (!context) {
    throw new Error('useDemoData must be used within DemoDataProvider');
  }
  return context;
};
