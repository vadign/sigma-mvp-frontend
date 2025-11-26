import { api } from './client';

export async function updateTopologyAdmin(): Promise<void> {
  await api.get('/api/v1/admin/topology/update');
}

export async function clearTopologyAdmin(): Promise<void> {
  await api.delete('/api/v1/admin/topology/clear');
}

export async function updateDeviationsAdmin(): Promise<void> {
  await api.get('/api/v1/admin/deviations/update');
}

export async function clearDeviationsAdmin(): Promise<void> {
  await api.delete('/api/v1/admin/deviations/clear');
}
