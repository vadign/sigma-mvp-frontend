import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
});

export async function requestJson<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  return res.data as T;
}
