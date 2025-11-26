import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://109.202.1.153:8965',
});

export async function requestJson<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  return res.data as T;
}
