import { api, requestJson } from './client';
import {
  Network,
  NetworkCreateRequest,
  NetworkUpdateRequest,
  Topology,
  LogEntry,
  Deviation,
} from '../types/api';

export async function getNetworks(): Promise<Network[]> {
  return requestJson<Network[]>(api.get('/api/v1/networks/'));
}

export async function createNetwork(payload: NetworkCreateRequest): Promise<string> {
  return requestJson<string>(api.post('/api/v1/networks/', payload));
}

export async function updateNetwork(
  networkId: string,
  payload: NetworkUpdateRequest,
): Promise<void> {
  await api.put(`/api/v1/networks/${networkId}`, payload);
}

export async function deleteNetwork(networkId: string): Promise<void> {
  await api.delete(`/api/v1/networks/${networkId}`);
}

export async function getTopology(networkId: string): Promise<Topology> {
  return requestJson<Topology>(api.get(`/api/v1/networks/${networkId}/topology`));
}

export async function getLogs(
  networkId: string,
  params?: { date_from?: string; date_to?: string },
): Promise<LogEntry[]> {
  return requestJson<LogEntry[]>(api.get(`/api/v1/networks/${networkId}/logs`, { params }));
}

export async function getDeviations(networkId: string, logId: number): Promise<Deviation[]> {
  return requestJson<Deviation[]>(api.get(`/api/v1/networks/${networkId}/logs/${logId}`));
}
