import { api, requestJson } from './client';
import { User, UserCreateRequest, UserUpdateRequest } from '../types/api';

export async function getUsers(): Promise<User[]> {
  return requestJson<User[]>(api.get('/api/v1/users/'));
}

export async function createUser(payload: UserCreateRequest): Promise<string> {
  return requestJson<string>(api.post('/api/v1/users/', payload));
}

export async function getUser(userId: string): Promise<User> {
  return requestJson<User>(api.get(`/api/v1/users/${userId}`));
}

export async function updateUser(userId: string, payload: UserUpdateRequest): Promise<void> {
  await api.put(`/api/v1/users/${userId}`, payload);
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/api/v1/users/${userId}`);
}
