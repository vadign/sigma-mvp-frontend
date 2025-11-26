export interface Network {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
}

export interface NetworkCreateRequest {
  workspace_id: string;
  name: string;
  description: string;
}

export interface NetworkUpdateRequest {
  workspace_id?: string | null;
  name?: string | null;
  description?: string | null;
}

export interface Node {
  id: number;
  pos_x: number;
  pos_y: number;
  WTK_x: number | null;
  WTK_y: number | null;
}

export interface Edge {
  id: number;
  id_in: number;
  id_out: number;
  d?: number | null;
  ksi?: number | null;
  H?: number | null;
  Q?: number | null;
  vel?: number | null;
  Tem?: number | null;
  Heat?: number | null;
  dP?: number | null;
}

export interface Topology {
  nodes: Node[];
  edges: Edge[];
}

export interface LogEntry {
  id: number;
  timestamp: string;
}

export type DeviationType = 'vel' | 'd' | 'ksi' | 'H' | 'Q' | 'Tem' | 'Heat' | 'dP';
export type DeviationLevel = 1 | 2 | 3;

export interface Deviation {
  id: number;
  edge_id: number;
  value: number;
  reference: number;
  type: DeviationType;
  level: DeviationLevel | null;
  regulation: string | null;
  recommendation: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserCreateRequest {
  name: string;
  email: string;
}

export interface UserUpdateRequest {
  name?: string | null;
  email?: string | null;
}

export interface Subscription {
  id: number;
  user_id: string;
  network_id: string;
  level: DeviationLevel;
}

export interface SubscriptionCreateRequest {
  network_id: string;
  level: DeviationLevel;
}

export interface SubscriptionUpdateRequest {
  level?: DeviationLevel | null;
}
