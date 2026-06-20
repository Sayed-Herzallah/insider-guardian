import type { UserRole, NavItem } from '@/types';

export const navigationItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', path: '/overview', roles: ['admin', 'soc', 'user'] },
  { id: 'alerts', label: 'Alerts', icon: 'Bell', path: '/alerts', roles: ['admin', 'soc', 'user'] },
  { id: 'incidents', label: 'Incidents', icon: 'AlertTriangle', path: '/incidents', roles: ['admin', 'soc', 'user'] },
  { id: 'endpoints', label: 'Endpoints', icon: 'Monitor', path: '/endpoints', roles: ['admin', 'soc', 'user'] },
  { id: 'investigation', label: 'Investigation', icon: 'Search', path: '/investigation', roles: ['admin', 'soc'] },
  { id: 'analytics', label: 'Analytics & Reports', icon: 'BarChart3', path: '/analytics', roles: ['admin'] },
  { id: 'automation', label: 'Automation', icon: 'Zap', path: '/automation', roles: ['admin'] },
  { id: 'administration', label: 'Administration', icon: 'Settings', path: '/administration', roles: ['admin'] },
  { id: 'profile', label: 'My Profile', icon: 'User', path: '/profile', roles: ['admin', 'soc', 'user'] },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navigationItems.filter((item) => item.roles.includes(role));
}
