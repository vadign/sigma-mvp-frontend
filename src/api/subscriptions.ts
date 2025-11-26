import { api, requestJson } from './client';
import { Subscription, SubscriptionCreateRequest, SubscriptionUpdateRequest } from '../types/api';

export async function getSubscriptions(userId: string): Promise<Subscription[]> {
  return requestJson<Subscription[]>(api.get(`/api/v1/users/${userId}/subscriptions/`));
}

export async function createSubscription(
  userId: string,
  payload: SubscriptionCreateRequest,
): Promise<number> {
  return requestJson<number>(api.post(`/api/v1/users/${userId}/subscriptions/`, payload));
}

export async function getSubscription(userId: string, subscriptionId: number): Promise<Subscription> {
  return requestJson<Subscription>(
    api.get(`/api/v1/users/${userId}/subscriptions/${subscriptionId}`),
  );
}

export async function updateSubscription(
  userId: string,
  subscriptionId: number,
  payload: SubscriptionUpdateRequest,
): Promise<void> {
  await api.put(`/api/v1/users/${userId}/subscriptions/${subscriptionId}`, payload);
}

export async function deleteSubscription(userId: string, subscriptionId: number): Promise<void> {
  await api.delete(`/api/v1/users/${userId}/subscriptions/${subscriptionId}`);
}
