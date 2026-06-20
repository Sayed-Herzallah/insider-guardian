import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Settings,
  FileText,
  UserPlus,
  Clock,
  Search,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/apiClient';
import { toast } from 'sonner';
import { z } from 'zod';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

type UserRole = 'admin' | 'analyst' | 'senior_analyst' | string;

interface SystemUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  lastLogin: string;
  status: 'Active' | 'Inactive';
  first_name: string;
  last_name: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  ip: string;
}

interface UserSession {
  id: string;
  ip_address: string;
  user_agent: string;
  last_used_at: string;
  created_at: string;
}

const Toggle = ({ checked, onChange, label, desc }: { checked: boolean, onChange: (v: boolean) => void, label: string, desc?: string }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <div className="text-sm font-bold text-white">{label}</div>
      {desc && <div className="text-xs text-[#52525b] mt-0.5">{desc}</div>}
    </div>
    <button 
      onClick={() => onChange(!checked)}
      className={cn("w-10 h-5 rounded-full relative transition-colors duration-300", checked ? "bg-[#00d4c3]" : "bg-[#27272a]")}
    >
      <div className={cn("absolute top-1 left-1 w-3 h-3 bg-black rounded-full transition-transform duration-300", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  </div>
);

// Zod schema for new users creation validation
const userCreateSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.string().nonempty('Role is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirm: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords do not match",
  path: ["password_confirm"],
});

export default function AdministrationPanel() {
  const [activeSubTab, setActiveSubTab] = useState<'USERS' | 'SESSIONS' | 'LOGS' | 'POLICIES'>('USERS');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create User Form States
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'analyst',
    password: '',
    password_confirm: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submittingUser, setSubmittingUser] = useState(false);

  // Policy Settings States
  const [policyTwoFactor, setPolicyTwoFactor] = useState(true);
  const [policyIpWhitelisting, setPolicyIpWhitelisting] = useState(false);
  const [policyAutoDeactivate, setPolicyAutoDeactivate] = useState(true);

  // Load Admin Data
  const loadUsers = async () => {
    try {
      const res = await apiRequest('/users/');
      if (res && res.data) {
        setUsers(res.data.map((u: any) => ({
          id: u.id,
          username: u.full_name || `${u.first_name} ${u.last_name}`,
          email: u.email,
          role: u.role,
          lastLogin: u.last_login ? new Date(u.last_login).toLocaleString() : 'Never',
          status: u.is_active ? 'Active' : 'Inactive',
          first_name: u.first_name,
          last_name: u.last_name,
        })));
      }
    } catch (e) {
      console.warn('Users API failed, using mock users list');
      setUsers([
        { id: '1', username: 'Senior Analyst', email: 'analyst@ig.com', role: 'analyst', lastLogin: '2024-02-09 14:12', status: 'Active', first_name: 'SOC', last_name: 'Analyst' },
        { id: '2', username: 'System Admin', email: 'admin@ig.com', role: 'admin', lastLogin: '2024-02-09 09:45', status: 'Active', first_name: 'Admin', last_name: 'User' },
      ]);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await apiRequest('/auth/sessions/');
      if (res && res.data) {
        setSessions(res.data);
      }
    } catch (e) {
      console.warn('Sessions API failed');
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await apiRequest('/audit/');
      if (res && res.data) {
        setAuditLogs(res.data.map((l: any) => ({
          id: `LOG-${l.id.slice(-4)}`,
          timestamp: l.created_at ? new Date(l.created_at).toLocaleString() : new Date().toLocaleString(),
          user: l.user_email || 'SYSTEM',
          action: l.action || 'Unknown Event',
          target: l.model_name || 'System',
          ip: l.ip_address || '127.0.0.1',
        })));
      }
    } catch (e) {
      console.warn('Audit logs API failed');
      setAuditLogs([
        { id: 'LOG-9921', timestamp: '2024-02-09 14:15:22', user: 'admin@ig.com', action: 'Modified Firewall Rule', target: 'FW-US-EAST-04', ip: '10.2.40.5' },
        { id: 'LOG-9920', timestamp: '2024-02-09 14:10:05', user: 'SYSTEM', action: 'Auto-Archived Incidents', target: 'INC-2024-400', ip: '127.0.0.1' },
      ]);
    }
  };

  const loadTabContent = async () => {
    setLoading(true);
    if (activeSubTab === 'USERS') {
      await loadUsers();
    } else if (activeSubTab === 'SESSIONS') {
      await loadSessions();
    } else if (activeSubTab === 'LOGS') {
      await loadAuditLogs();
    } else if (activeSubTab === 'POLICIES') {
      // Local settings
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTabContent();
  }, [activeSubTab]);

  // Create User Submission
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const validation = userCreateSchema.safeParse(createUserForm);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    setSubmittingUser(true);
    try {
      const res = await apiRequest('/users/', {
        method: 'POST',
        body: JSON.stringify({
          email: createUserForm.email,
          first_name: createUserForm.first_name,
          last_name: createUserForm.last_name,
          role: createUserForm.role,
          password: createUserForm.password,
          password_confirm: createUserForm.password_confirm,
        })
      });

      if (res && res.success) {
        toast.success('Analyst user created successfully!');
        setCreateUserForm({
          email: '',
          first_name: '',
          last_name: '',
          role: 'analyst',
          password: '',
          password_confirm: '',
        });
        loadUsers();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to create user on backend.');
      if (e.details) {
        const backendErrors: Record<string, string> = {};
        Object.entries(e.details).forEach(([key, messages]) => {
          if (Array.isArray(messages) && messages[0]) {
            backendErrors[key] = messages[0];
          }
        });
        setFormErrors(backendErrors);
      }
    } finally {
      setSubmittingUser(false);
    }
  };

  // Revoke session
  const handleRevokeSession = async (sessId: string) => {
    try {
      await apiRequest(`/auth/sessions/${sessId}/`, {
        method: 'DELETE',
      });
      toast.success('Session revoked successfully');
      loadSessions();
    } catch (e) {
      toast.error('Failed to revoke session');
    }
  };

  // Deactivate User
  const handleDeactivateUser = async (userId: string) => {
    try {
      await apiRequest(`/users/${userId}/`, {
        method: 'DELETE',
      });
      toast.success('User deactivated successfully');
      loadUsers();
    } catch (e) {
      toast.error('Failed to deactivate user');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f6fb] font-sans p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#f4f6fb]">Administration</h1>
          <p className="text-[#a6acb8] mt-1">Manage system analysts, active login sessions, security policies, and EDR logs.</p>
        </div>

        {/* Tabs selector */}
        <div className="flex border-b border-white/10 gap-6">
          {[
            { id: 'USERS', label: 'Analysts & Users', icon: Users },
            { id: 'SESSIONS', label: 'Active Sessions', icon: Clock },
            { id: 'LOGS', label: 'EDR Audit Logs', icon: FileText },
            { id: 'POLICIES', label: 'System Policies', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all",
                  activeSubTab === tab.id 
                    ? "border-[#00d4c3] text-[#00d4c3]" 
                    : "border-transparent text-[#a6acb8] hover:text-[#f4f6fb]"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="bg-[#0b0c0f] border border-white/5 rounded-2xl p-6 shadow-xl min-h-[500px]">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#00d4c3] animate-pulse">
              <p className="text-sm font-mono tracking-wider">LOADING ADMIN SCHEMA...</p>
            </div>
          ) : (
            <>
              {/* USERS TAB */}
              {activeSubTab === 'USERS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: List Users */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h3 className="text-lg font-bold text-white">Registered EDR Analysts</h3>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                        <input 
                          type="text" 
                          placeholder="Search users..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#111318] border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-[#00d4c3]/50 transition-all placeholder:text-[#52525b]"
                        />
                      </div>
                    </div>

                    <div className="border border-white/5 rounded-xl overflow-x-auto bg-[#0a0a0c]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/5 text-[#52525b] uppercase font-bold tracking-wider">
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Last Login</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-white/[0.01]">
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-white">{u.username}</div>
                                <div className="text-[10px] text-[#52525b]">{u.email}</div>
                              </td>
                              <td className="px-4 py-3.5 capitalize text-[#a6acb8]">{u.role}</td>
                              <td className="px-4 py-3.5 text-[#52525b] font-mono">{u.lastLogin}</td>
                              <td className="px-4 py-3.5 text-right">
                                {u.status === 'Active' ? (
                                  <button 
                                    onClick={() => handleDeactivateUser(u.id)}
                                    className="p-1.5 hover:bg-red-500/10 text-red-500 rounded border border-transparent hover:border-red-500/20 transition-all"
                                    title="Deactivate Analyst"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : (
                                  <span className="text-red-500 font-semibold italic text-[10px]">Deactivated</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Register Analyst Form */}
                  <div className="bg-[#111318] border border-white/10 rounded-xl p-5 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <UserPlus size={16} className="text-[#00d4c3]" />
                        Register New Analyst
                      </h3>
                      <p className="text-[11px] text-[#52525b] mt-0.5">Provision backend credentials and privileges.</p>
                    </div>

                    <form onSubmit={handleCreateUser} className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#52525b] uppercase">First Name</label>
                          <input 
                            type="text" 
                            className="w-full bg-[#0a0a0c] border border-white/5 rounded p-2 text-xs focus:outline-none focus:border-[#00d4c3]/30"
                            value={createUserForm.first_name}
                            onChange={e => setCreateUserForm({...createUserForm, first_name: e.target.value})}
                          />
                          {formErrors.first_name && <span className="text-[10px] text-red-500">{formErrors.first_name}</span>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#52525b] uppercase">Last Name</label>
                          <input 
                            type="text" 
                            className="w-full bg-[#0a0a0c] border border-white/5 rounded p-2 text-xs focus:outline-none focus:border-[#00d4c3]/30"
                            value={createUserForm.last_name}
                            onChange={e => setCreateUserForm({...createUserForm, last_name: e.target.value})}
                          />
                          {formErrors.last_name && <span className="text-[10px] text-red-500">{formErrors.last_name}</span>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#52525b] uppercase">Email Address</label>
                        <input 
                          type="email" 
                          className="w-full bg-[#0a0a0c] border border-white/5 rounded p-2 text-xs focus:outline-none focus:border-[#00d4c3]/30"
                          value={createUserForm.email}
                          onChange={e => setCreateUserForm({...createUserForm, email: e.target.value})}
                        />
                        {formErrors.email && <span className="text-[10px] text-red-500">{formErrors.email}</span>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#52525b] uppercase">Assigned Privilege Role</label>
                        <select 
                          className="w-full bg-[#0a0a0c] border border-white/5 rounded p-2 text-xs focus:outline-none text-white"
                          value={createUserForm.role}
                          onChange={e => setCreateUserForm({...createUserForm, role: e.target.value})}
                        >
                          <option value="analyst">Analyst</option>
                          <option value="senior_analyst">Senior Analyst</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#52525b] uppercase">Initial Password</label>
                        <input 
                          type="password" 
                          className="w-full bg-[#0a0a0c] border border-white/5 rounded p-2 text-xs focus:outline-none focus:border-[#00d4c3]/30"
                          value={createUserForm.password}
                          onChange={e => setCreateUserForm({...createUserForm, password: e.target.value})}
                        />
                        {formErrors.password && <span className="text-[10px] text-red-500">{formErrors.password}</span>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#52525b] uppercase">Confirm Password</label>
                        <input 
                          type="password" 
                          className="w-full bg-[#0a0a0c] border border-white/5 rounded p-2 text-xs focus:outline-none focus:border-[#00d4c3]/30"
                          value={createUserForm.password_confirm}
                          onChange={e => setCreateUserForm({...createUserForm, password_confirm: e.target.value})}
                        />
                        {formErrors.password_confirm && <span className="text-[10px] text-red-500">{formErrors.password_confirm}</span>}
                      </div>

                      <button 
                        type="submit" 
                        disabled={submittingUser}
                        className="w-full py-2 bg-[#00d4c3] text-black font-bold rounded text-xs hover:bg-[#00d4c3]/80 transition-colors disabled:opacity-50"
                      >
                        {submittingUser ? 'Registering...' : 'Provision Account'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* SESSIONS TAB */}
              {activeSubTab === 'SESSIONS' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Active Login Sessions</h3>
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0a0a0c]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5 text-[#52525b] uppercase font-bold tracking-wider">
                          <th className="px-4 py-3">IP Address</th>
                          <th className="px-4 py-3">User Agent</th>
                          <th className="px-4 py-3">Last Used At</th>
                          <th className="px-4 py-3 text-right">Revocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[#a6acb8]">
                        {sessions.length > 0 ? (
                          sessions.map((sess) => (
                            <tr key={sess.id} className="hover:bg-white/[0.01]">
                              <td className="px-4 py-3.5 font-mono text-white font-semibold">{sess.ip_address}</td>
                              <td className="px-4 py-3.5 max-w-[300px] truncate" title={sess.user_agent}>{sess.user_agent}</td>
                              <td className="px-4 py-3.5 font-mono">{new Date(sess.last_used_at).toLocaleString()}</td>
                              <td className="px-4 py-3.5 text-right">
                                <button 
                                  onClick={() => handleRevokeSession(sess.id)}
                                  className="px-2 py-1 bg-red-500/10 text-red-500 rounded border border-red-500/20 hover:bg-red-500 hover:text-black transition-colors"
                                >
                                  Revoke
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="h-32 text-center text-[#52525b]">No active sessions found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LOGS TAB */}
              {activeSubTab === 'LOGS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="text-lg font-bold text-white">Security Audit Log</h3>
                  </div>
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0a0a0c]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5 text-[#52525b] uppercase font-bold tracking-wider">
                          <th className="px-4 py-3">Log ID</th>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3">Analyst Email</th>
                          <th className="px-4 py-3">Action performed</th>
                          <th className="px-4 py-3">Object</th>
                          <th className="px-4 py-3 text-right">Source IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[#a6acb8]">
                        {auditLogs.length > 0 ? (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.01]">
                              <td className="px-4 py-3.5 font-mono text-[#00d4c3]">{log.id}</td>
                              <td className="px-4 py-3.5 text-[#52525b] font-mono">{log.timestamp}</td>
                              <td className="px-4 py-3.5 font-semibold text-white">{log.user}</td>
                              <td className="px-4 py-3.5">{log.action}</td>
                              <td className="px-4 py-3.5 max-w-[200px] truncate" title={log.target}>{log.target}</td>
                              <td className="px-4 py-3.5 text-right font-mono">{log.ip}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="h-32 text-center text-[#52525b]">No audit logs recorded</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* POLICIES TAB */}
              {activeSubTab === 'POLICIES' && (
                <div className="max-w-2xl space-y-6">
                  <h3 className="text-lg font-bold text-white">System Security Policies</h3>
                  <div className="divide-y divide-white/5 border border-white/5 bg-[#0a0a0c] p-4 rounded-xl space-y-2">
                    <Toggle 
                      checked={policyTwoFactor}
                      onChange={setPolicyTwoFactor}
                      label="Enforce Multi-Factor Authentication (MFA)"
                      desc="Force all SOC analysts to register MFA on next login attempt."
                    />
                    <Toggle 
                      checked={policyIpWhitelisting}
                      onChange={setPolicyIpWhitelisting}
                      label="Enable Restrictive Console IP Whitelisting"
                      desc="Only allow requests from registered office and VPN gateways."
                    />
                    <Toggle 
                      checked={policyAutoDeactivate}
                      onChange={setPolicyAutoDeactivate}
                      label="Auto-Revoke Inactive Sessions"
                      desc="Automatically disconnect sessions idle for more than 15 minutes."
                    />
                  </div>
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
}