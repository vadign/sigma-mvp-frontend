import { api } from './client';

export async function getRegulationsData(): Promise<string> {
  const res = await api.get('/api/v1/regulations/data', { responseType: 'text' });
  return res.data as string;
}

export async function createRegulationsData(data: string): Promise<void> {
  await api.post('/api/v1/regulations/data', data, {
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function updateRegulationsData(data: string): Promise<void> {
  await api.put('/api/v1/regulations/data', data, {
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function deleteRegulationsData(): Promise<void> {
  await api.delete('/api/v1/regulations/data');
}

export async function getShapesData(): Promise<string> {
  const res = await api.get('/api/v1/regulations/shapes', { responseType: 'text' });
  return res.data as string;
}

export async function createShapesData(data: string): Promise<void> {
  await api.post('/api/v1/regulations/shapes', data, {
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function updateShapesData(data: string): Promise<void> {
  await api.put('/api/v1/regulations/shapes', data, {
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function deleteShapesData(): Promise<void> {
  await api.delete('/api/v1/regulations/shapes');
}
