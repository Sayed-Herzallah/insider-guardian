import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Alert, Incident, Endpoint, Playbook, Report, User } from '@/types';
import { apiRequest, saveTokens, clearTokens, getTokens } from '@/lib/apiClient';
import { wsClient } from '@/lib/wsClient';



interface DataContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  alerts: Alert[];
  incidents: Incident[];
  endpoints: Endpoint[];
  playbooks: Playbook[];
  reports: Report[];
  addAlert: (alert: Alert) => void;
  updateAlertStatus: (id: string, status: Alert['status']) => Promise<void>;
  updateIncidentStatus: (id: string, status: Incident['status']) => Promise<void>;
  togglePlaybook: (id: string) => Promise<void>;
  getAlertsBySeverity: () => { critical: number; high: number; medium: number; low: number };
  getEndpointStats: () => { online: number; offline: number; warning: number };
  refreshAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const refreshAllData = useCallback(async () => {
    const withTimeout = (promise: Promise<any>, ms: number) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
      ]);
    };

    const fetchAlerts = async () => {
      try {
        const alertsRes = await withTimeout(apiRequest('/alerts/'), 1500);
        if (alertsRes && alertsRes.data) {
          const mappedAlerts: Alert[] = alertsRes.data.map((a: any) => ({
            id: a.id,
            severity: a.severity || 'low',
            timestamp: a.detected_at || a.created_at || new Date().toISOString(),
            host: a.agent_hostname || a.agent_name || 'Unknown',
            threatName: a.title || a.alert_type || 'Unknown Threat',
            status: a.status === 'under_review' ? 'investigating' : a.status === 'escalated' ? 'investigating' : a.status === 'resolved' ? 'resolved' : 'new',
            user: a.user_account || 'system',
            description: a.description,
            evidence: a.process_name ? [a.process_name, a.process_path].filter(Boolean) : [],
            iocs: a.file_hash ? [{ type: 'hash', value: a.file_hash }] : [],
            mitreTactic: a.mitre_tactic_names ? a.mitre_tactic_names[0] : undefined,
            mitreTechnique: a.mitre_technique_id ? `${a.mitre_technique_id} - ${a.mitre_technique_name}` : undefined,
          }));
          setAlerts(mappedAlerts);
        } else {
          setAlerts([]);
        }
      } catch (e) {
        console.warn('Alerts API failed:', e);
        setAlerts([]);
      }
    };

    const fetchIncidents = async () => {
      try {
        const incidentsRes = await withTimeout(apiRequest('/incidents/'), 1500);
        if (incidentsRes && incidentsRes.data) {
          const mappedIncidents: Incident[] = incidentsRes.data.map((i: any) => ({
            id: i.incident_id || i.id,
            title: i.title,
            severity: i.severity || 'low',
            status: i.status === 'open' ? 'new' : i.status === 'in_progress' ? 'investigating' : i.status === 'resolved' ? 'resolved' : 'contained',
            createdAt: i.created_at || new Date().toISOString(),
            assignedTo: i.assigned_to_email || 'Unassigned',
            alerts: i.mitre_technique_ids || [],
            type: i.created_by_email ? 'manual' : 'auto',
          }));
          setIncidents(mappedIncidents);
        } else {
          setIncidents([]);
        }
      } catch (e) {
        console.warn('Incidents API failed:', e);
        setIncidents([]);
      }
    };

    const fetchAgents = async () => {
      try {
        const agentsRes = await withTimeout(apiRequest('/agents/'), 1500);
        if (agentsRes && agentsRes.data) {
          const mappedEndpoints: Endpoint[] = agentsRes.data.map((ag: any) => ({
            id: ag.id,
            hostname: ag.hostname || ag.name,
            ip: ag.ip_address || '0.0.0.0',
            os: ag.os_type?.toLowerCase() || 'windows',
            status: ag.status === 'online' ? 'online' : ag.status === 'offline' ? 'offline' : 'warning',
            riskScore: ag.is_active ? 10 : 90,
            lastSeen: ag.last_seen || new Date().toISOString(),
            agentVersion: ag.os_version || '1.0.0',
          }));
          setEndpoints(mappedEndpoints);
        } else {
          setEndpoints([]);
        }
      } catch (e) {
        console.warn('Agents API failed:', e);
        setEndpoints([]);
      }
    };

    const fetchPlaybooks = async () => {
      try {
        const playbooksRes = await withTimeout(apiRequest('/playbooks/'), 1500);
        if (playbooksRes && playbooksRes.data) {
          const mappedPlaybooks: Playbook[] = playbooksRes.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            enabled: p.is_active || false,
            triggers: p.trigger ? [p.trigger] : [],
            actions: p.step_count ? [`${p.step_count} steps`] : [],
          }));
          setPlaybooks(mappedPlaybooks);
        } else {
          setPlaybooks([]);
        }
      } catch (e) {
        console.warn('Playbooks API failed:', e);
        setPlaybooks([]);
      }
    };

    await Promise.all([
      fetchAlerts(),
      fetchIncidents(),
      fetchAgents(),
      fetchPlaybooks()
    ]);

    setReports([
      { id: 'RPT-001', name: 'Monthly Threat Intelligence Report', generatedAt: '2024-01-01T00:00:00Z', status: 'ready', size: '2.4 MB' },
      { id: 'RPT-002', name: 'Q4 Security Posture Assessment', generatedAt: '2024-01-05T00:00:00Z', status: 'ready', size: '5.1 MB' },
      { id: 'RPT-003', name: 'Incident Response Summary', generatedAt: '2024-01-10T00:00:00Z', status: 'ready', size: '1.8 MB' },
      { id: 'RPT-004', name: 'Compliance Audit Report', generatedAt: '2024-01-15T00:00:00Z', status: 'generating' },
    ]);
  }, []);

  // Restore session
  useEffect(() => {
    const initAuth = async () => {
      const { access } = getTokens();
      if (access) {
        try {
          const withTimeout = (promise: Promise<any>, ms: number) => {
            return Promise.race([
              promise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
            ]);
          };
          const profile = await withTimeout(apiRequest('/auth/profile/'), 1500);
          if (profile && profile.data) {
            setUser({
              id: profile.data.id,
              username: profile.data.email,
              role: profile.data.role || 'user',
              name: profile.data.full_name || `${profile.data.first_name} ${profile.data.last_name}`.trim() || 'User',
              permissions: profile.data.permissions || [],
            });
          }
        } catch (e) {
          console.error('Invalid token or backend offline:', e);
          clearTokens();
        }
      }
      setIsLoadingAuth(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      clearTokens();
      wsClient.disconnect();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  // Websocket listeners for real-time events
  useEffect(() => {
    if (user) {
      wsClient.connect();

      const unsubscribeAlert = wsClient.subscribe('dashboard.alert', (payload) => {
        if (payload.update_type === 'status_change') {
          setAlerts((prev) =>
            prev.map((alert) =>
              alert.id === payload.alert_id
                ? {
                    ...alert,
                    status:
                      payload.status === 'under_review'
                        ? 'investigating'
                        : payload.status === 'resolved'
                        ? 'resolved'
                        : payload.status === 'false_positive'
                        ? 'resolved'
                        : 'new',
                  }
                : alert
            )
          );
        } else {
          const newAlert: Alert = {
            id: payload.id,
            severity: payload.severity || 'low',
            timestamp: payload.detected_at || payload.created_at || new Date().toISOString(),
            host: payload.agent_name || 'Unknown',
            threatName: payload.title || payload.alert_type || 'Malware detected',
            status: 'new',
            description: payload.title,
          };
          setAlerts((prev) => [newAlert, ...prev]);
        }
      });

      const unsubscribeAgent = wsClient.subscribe('dashboard.agent_status', (payload) => {
        setEndpoints((prev) =>
          prev.map((ep) =>
            ep.id === payload.agent_id
              ? {
                  ...ep,
                  status: payload.status === 'online' ? 'online' : payload.status === 'offline' ? 'offline' : 'warning',
                }
              : ep
          )
        );
      });

      const unsubscribeIncident = wsClient.subscribe('dashboard.incident_update', (payload) => {
        if (payload.event_type === 'created') {
          const newIncident: Incident = {
            id: payload.incident_ref || payload.incident_id,
            title: payload.title,
            severity: payload.severity || 'low',
            status: payload.status === 'open' ? 'new' : payload.status === 'in_progress' ? 'investigating' : 'resolved',
            createdAt: new Date().toISOString(),
            assignedTo: payload.assigned_to || 'Unassigned',
            alerts: [],
            type: 'auto',
          };
          setIncidents((prev) => [newIncident, ...prev]);
        } else {
          setIncidents((prev) =>
            prev.map((inc) =>
              inc.id === (payload.incident_ref || payload.incident_id || payload.incident_ref)
                ? {
                    ...inc,
                    status:
                      payload.status === 'open'
                        ? 'new'
                        : payload.status === 'in_progress'
                        ? 'investigating'
                        : 'resolved',
                    severity: payload.severity || inc.severity,
                    assignedTo: payload.assigned_to || inc.assignedTo,
                  }
                : inc
            )
          );
        }
      });

      refreshAllData();

      return () => {
        unsubscribeAlert();
        unsubscribeAgent();
        unsubscribeIncident();
        wsClient.disconnect();
      };
    }
  }, [user, refreshAllData]);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    try {
      const response = await apiRequest('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response && response.data) {
        saveTokens(response.data.access, response.data.refresh);
        const profile = await apiRequest('/auth/profile/');
        const userData: User = {
          id: profile.data.id,
          username: profile.data.email,
          role: profile.data.role || 'user',
          name: profile.data.full_name || `${profile.data.first_name} ${profile.data.last_name}`.trim() || 'User',
          permissions: profile.data.permissions || [],
        };
        setUser(userData);
        return userData;
      }
      return null;
    } catch (e) {
      console.error('Login API failed:', e);
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    const { refresh } = getTokens();
    if (refresh) {
      apiRequest('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      }).catch(() => {});
    }
    clearTokens();
    setUser(null);
    setAlerts([]);
    setIncidents([]);
    setEndpoints([]);
    setPlaybooks([]);
    wsClient.disconnect();
  }, []);

  const addAlert = useCallback((alert: Alert) => {
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  const updateAlertStatus = useCallback(async (id: string, status: Alert['status']) => {
    const backendStatus =
      status === 'investigating'
        ? 'under_review'
        : status === 'resolved'
        ? 'resolved'
        : status === 'contained'
        ? 'resolved'
        : 'new';

    try {
      await apiRequest(`/alerts/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: backendStatus,
          analyst_notes: `Status updated to ${status} via EDR Dashboard`,
        }),
      });

      setAlerts((prev) =>
        prev.map((alert) => (alert.id === id ? { ...alert, status } : alert))
      );
    } catch (e) {
      console.error(`Failed to update alert ${id} status:`, e);
      throw e;
    }
  }, []);

  const updateIncidentStatus = useCallback(async (id: string, status: Incident['status']) => {
    const backendStatus =
      status === 'new' ? 'open' : status === 'investigating' ? 'in_progress' : 'resolved';

    try {
      await apiRequest(`/incidents/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: backendStatus,
          resolution_summary: status === 'resolved' ? 'Resolved via EDR Dashboard' : '',
        }),
      });

      setIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? { ...inc, status } : inc))
      );
    } catch (e) {
      console.error(`Failed to update incident ${id} status:`, e);
      throw e;
    }
  }, []);

  const togglePlaybook = useCallback(async (id: string) => {
    const playbook = playbooks.find((p) => p.id === id);
    if (!playbook) return;

    try {
      await apiRequest(`/playbooks/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_active: !playbook.enabled,
        }),
      });

      setPlaybooks((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
      );
    } catch (e) {
      console.error(`Failed to toggle playbook ${id}:`, e);
      throw e;
    }
  }, [playbooks]);

  const getAlertsBySeverity = useCallback(() => {
    return alerts.reduce(
      (acc, alert) => {
        if (alert.severity in acc) {
          acc[alert.severity as keyof typeof acc]++;
        }
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );
  }, [alerts]);

  const getEndpointStats = useCallback(() => {
    return endpoints.reduce(
      (acc, ep) => {
        if (ep.status in acc) {
          acc[ep.status as keyof typeof acc]++;
        }
        return acc;
      },
      { online: 0, offline: 0, warning: 0 }
    );
  }, [endpoints]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#00d4c3]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00d4c3] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wider uppercase">Loading Security Context...</p>
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider
      value={{
        user,
        login,
        logout,
        alerts,
        incidents,
        endpoints,
        playbooks,
        reports,
        addAlert,
        updateAlertStatus,
        updateIncidentStatus,
        togglePlaybook,
        getAlertsBySeverity,
        getEndpointStats,
        refreshAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
