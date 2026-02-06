import { EventResponse } from '../api/types';
import { isEventAttention, isEventClosed, resolveAgentIdForEvent } from './agents';

export const isVisibleToMayor = (event: EventResponse) => {
  const isHeat = resolveAgentIdForEvent(event) === 'heat';
  if (!isHeat) return false;
  const requiresAttention = event.msg?.requiresAttention;
  const attention = typeof requiresAttention === 'boolean' ? requiresAttention : isEventAttention(event);
  return attention && !isEventClosed(event);
};
