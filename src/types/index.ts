export type UserRole = 'admin' | 'soc' | 'user' | string;

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  permissions?: string[];
  lastLogin?: string;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  host: string;
  threatName: string;
  status: 'new' | 'investigating' | 'contained' | 'resolved';
  user?: string;
  description?: string;
  evidence?: string[];
  iocs?: IOC[];
  mitreTactic?: string;
  mitreTechnique?: string;
}

export interface IOC {
  type: 'ip' | 'domain' | 'hash';
  value: string;
}

export interface Incident {
  type: string;
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'investigating' | 'contained' | 'resolved';
  createdAt: string;
  assignedTo?: string;
  alerts: string[];
  timeline?: TimelineEvent[];
  processTree?: ProcessNode[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  event: string;
  description: string;
}

export interface ProcessNode {
  id: string;
  name: string;
  pid: number;
  parentId?: string;
  children?: ProcessNode[];
}

export interface Endpoint {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  status: 'online' | 'offline' | 'warning';
  riskScore: number;
  lastSeen: string;
  user?: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: string[];
  actions: string[];
}

export interface Report {
  id: string;
  name: string;
  generatedAt: string;
  status: 'ready' | 'generating';
  size?: string;
}

export interface NetworkConnection {
  id: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: string;
  timestamp: string;
  bytes: number;
}

export interface ProcessActivity {
  id: string;
  pid: number;
  name: string;
  path: string;
  user: string;
  cpu: number;
  memory: number;
  timestamp: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  roles: UserRole[];
}
