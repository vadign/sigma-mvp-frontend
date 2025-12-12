export interface NetworkResponse {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
}

export interface NodeGetResponse {
  id: number;
  pos_x: number;
  pos_y: number;
  WTK_x?: number | null;
  WTK_y?: number | null;
}

export interface EdgeGetResponse {
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

export interface TopologyGetResponse {
  nodes: NodeGetResponse[];
  edges: EdgeGetResponse[];
}

export interface LogsGetResponse {
  id: number;
  timestamp: string;
}

export interface DeviationGetResponse {
  id: number;
  edge_id: number;
  value: number;
  reference: number;
  type: 'vel' | 'd' | 'ksi' | 'H' | 'Q' | 'Tem' | 'Heat' | 'dP';
  level: 1 | 2 | 3 | null;
  regulation: string | null;
  recommendation: string | null;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface EmailSubscriptionResponse {
  id: number;
  user_id: string;
  network_id: string;
  level: 1 | 2 | 3;
  subject: 'deviations' | 'events';
  created_at: string;
}

export interface EmailSubscriptionCreateRequest {
  network_id: string;
  level: 1 | 2 | 3;
  subject: 'deviations' | 'events';
}

export interface EmailSubscriptionUpdateRequest {
  level?: 1 | 2 | 3 | null;
  subject?: 'deviations' | 'events' | null;
}

export interface EventResponse {
  id: number;
  msg: Record<string, any>;
  created_at: string;
}
