import axios from 'axios';
import {
  DeviationGetResponse,
  EdgeGetResponse,
  EmailSubscriptionCreateRequest,
  EmailSubscriptionResponse,
  EmailSubscriptionUpdateRequest,
  EventResponse,
  LogsGetResponse,
  NetworkResponse,
  NodeGetResponse,
  TopologyGetResponse,
  UserResponse,
} from './types';

const api = axios.create({
  baseURL: 'http://109.202.1.153:8965',
});

export const fetchNetworks = async (): Promise<NetworkResponse[]> => {
  const { data } = await api.get<NetworkResponse[]>('/api/v1/networks/');
  return data;
};

export const fetchTopology = async (networkId: string): Promise<TopologyGetResponse> => {
  const { data } = await api.get<TopologyGetResponse>(`/api/v1/networks/${networkId}/topology`);
  return data;
};

export const fetchLogs = async (networkId: string): Promise<LogsGetResponse[]> => {
  const { data } = await api.get<LogsGetResponse[]>(`/api/v1/networks/${networkId}/logs`, {
    params: { date_from: '', date_to: '' },
  });
  return data;
};

export const fetchDeviations = async (
  networkId: string,
  logId: number,
): Promise<DeviationGetResponse[]> => {
  const { data } = await api.get<DeviationGetResponse[]>(
    `/api/v1/networks/${networkId}/logs/${logId}`,
  );
  return data;
};

export const updateTopology = () => api.get('/api/v1/admin/topology/update');
export const clearTopology = () => api.delete('/api/v1/admin/topology/clear');
export const updateDeviations = () => api.get('/api/v1/admin/deviations/update');
export const clearDeviations = () => api.delete('/api/v1/admin/deviations/clear');

export const fetchRegulationsData = async (): Promise<string> => {
  const { data } = await api.get<string>('/api/v1/regulations/data', { responseType: 'text' });
  return data;
};

export const fetchRegulationsShapes = async (): Promise<string> => {
  const { data } = await api.get<string>('/api/v1/regulations/shapes', { responseType: 'text' });
  return data;
};

export const saveRegulationsData = (body: string) => api.put('/api/v1/regulations/data', body);
export const saveRegulationsShapes = (body: string) => api.put('/api/v1/regulations/shapes', body);
export const clearRegulationsData = () => api.delete('/api/v1/regulations/data');
export const clearRegulationsShapes = () => api.delete('/api/v1/regulations/shapes');

export const fetchEvents = async (params: {
  date_from?: string | null;
  date_to?: string | null;
  order?: 'asc' | 'desc';
  level?: 1 | 2 | 3 | null;
  limit?: number;
  skip?: number;
}): Promise<EventResponse[]> => {
  const { data } = await api.get<EventResponse[]>('/api/v1/events', { params });
  return data;
};

export const fetchUsers = async (): Promise<UserResponse[]> => {
  const { data } = await api.get<UserResponse[]>('/api/v1/users/');
  return data;
};

export const createUser = async (name: string, email: string): Promise<string> => {
  const { data } = await api.post<string>('/api/v1/users/', { name, email });
  return data;
};

export const fetchUser = async (userId: string): Promise<UserResponse> => {
  const { data } = await api.get<UserResponse>(`/api/v1/users/${userId}`);
  return data;
};

export const updateUser = (userId: string, payload: Partial<UserResponse>) =>
  api.put(`/api/v1/users/${userId}`, payload);

export const deleteUser = (userId: string) => api.delete(`/api/v1/users/${userId}`);

export const fetchSubscriptions = async (userId: string): Promise<EmailSubscriptionResponse[]> => {
  const { data } = await api.get<EmailSubscriptionResponse[]>(
    `/api/v1/users/${userId}/subscriptions/`,
  );
  return data;
};

export const createSubscription = async (
  userId: string,
  payload: EmailSubscriptionCreateRequest,
): Promise<number> => {
  const { data } = await api.post<number>(`/api/v1/users/${userId}/subscriptions/`, payload);
  return data;
};

export const updateSubscription = (userId: string, subscriptionId: number, payload: EmailSubscriptionUpdateRequest) =>
  api.put(`/api/v1/users/${userId}/subscriptions/${subscriptionId}`, payload);

export const deleteSubscription = (userId: string, subscriptionId: number) =>
  api.delete(`/api/v1/users/${userId}/subscriptions/${subscriptionId}`);

export const clearTelegramSubscriptions = () => api.delete('/api/v1/admin/telegram_subscriptions/clear');

export default api;

