import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/apiClient';
import { useData } from '@/context/DataContext';
import {
  Filter,
  Search,
  X,
  Copy,
  Check,
  FileText,
  User,
  Monitor,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  AlertOctagon,
  ArrowUpDown
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types (Backend Contract) ---
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'new' | 'investigating' | 'contained' | 'resolved';

export interface AlertIOC {
  type: string;
  value: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  timestamp: string;
  host: string;
  user?: string;
  threatName: string;
  description?: string;
  status: AlertStatus;
  mitreTactic?: string;
  mitreTechnique?: string;
  iocs?: AlertIOC[];
  evidence?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// --- Mock Data & API Service ---
const MOCK_ALERTS: Alert[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `ALT-${2000 + i}`,
  severity: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)] as AlertSeverity,
  timestamp: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
  host: `FIN-SRV-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`,
  user: Math.random() > 0.5 ? 'j.doe' : 'system',
  threatName: ['Ransomware.LockBit', 'Cobalt Strike Beacon', 'Brute Force RDP', 'Suspicious PowerShell'][Math.floor(Math.random() * 4)],
  description: 'Detected suspicious activity resembling known threat patterns.',
  status: ['new', 'investigating', 'contained', 'resolved'][Math.floor(Math.random() * 4)] as AlertStatus,
  mitreTactic: 'Execution',
  mitreTechnique: 'T1059.001',
  iocs: [{ type: 'ip', value: '192.168.1.105' }, { type: 'hash', value: 'a1b2c3d4e5f6...' }],
  evidence: ['process_creation.log', 'network_connection.pcap']
}));

// EDR Backend Integration
const fetchAlerts = async (
  page: number, 
  limit: number, 
  search: string, 
  severity: string, 
  status: string
): Promise<PaginatedResponse<Alert>> => {
  try {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (search) params.set('search', search);
    if (severity && severity !== 'all') params.set('severity', severity);
    if (status && status !== 'all') {
      const backendStatus = status === 'investigating' ? 'under_review' : status;
      params.set('status', backendStatus);
    }

    const response = await apiRequest(`/alerts/?${params.toString()}`);
    
    // Map backend Alert model to frontend Alert model
    let alertsList: any[] = [];
    if (Array.isArray(response)) {
      alertsList = response;
    } else if (response && Array.isArray(response.data)) {
      alertsList = response.data;
    } else if (response && Array.isArray(response.results)) {
      alertsList = response.results;
    }

    const mappedAlerts: Alert[] = alertsList.map((a: any) => {
      if (!a) return null;
      return {
        id: a.id || `ALT-${Math.floor(Math.random() * 10000)}`,
        severity: a.severity || 'low',
        timestamp: a.detected_at || a.created_at || new Date().toISOString(),
        host: a.agent_hostname || a.agent_name || 'Unknown',
        threatName: a.title || a.alert_type || 'Threat Detected',
        status: a.status === 'under_review' ? 'investigating' : a.status === 'resolved' ? 'resolved' : a.status === 'false_positive' ? 'resolved' : 'new',
        user: a.user_account || 'system',
        description: a.description || '',
        mitreTactic: Array.isArray(a.mitre_tactic_names) ? a.mitre_tactic_names[0] : (typeof a.mitre_tactic_names === 'string' ? a.mitre_tactic_names : undefined),
        mitreTechnique: a.mitre_technique_id ? `${a.mitre_technique_id} - ${a.mitre_technique_name || ''}` : undefined,
        iocs: a.file_hash ? [{ type: 'hash', value: a.file_hash }] : [],
        evidence: a.process_name ? [a.process_name, a.process_path].filter(Boolean) : [],
      };
    }).filter(Boolean) as Alert[];

    if (mappedAlerts.length === 0) {
      throw new Error('No alerts found from API');
    }

    return {
      data: mappedAlerts,
      total: response?.meta?.count || mappedAlerts.length,
      page,
      limit
    };
  } catch (error) {
    console.warn('Alerts API call failed, falling back to mock alerts:', error);
    const searchStr = (search || '').toLowerCase();
    const severityStr = (severity || 'all').toLowerCase();
    const statusStr = (status || 'all').toLowerCase();
    
    let filtered = MOCK_ALERTS.filter(a => {
      const matchesSearch = searchStr === '' || 
        (a.threatName && a.threatName.toLowerCase().includes(searchStr)) || 
        (a.host && a.host.toLowerCase().includes(searchStr));
      const matchesSeverity = severityStr === 'all' || (a.severity && a.severity.toLowerCase() === severityStr);
      const matchesStatus = statusStr === 'all' || (a.status && a.status.toLowerCase() === statusStr);
      return matchesSearch && matchesSeverity && matchesStatus;
    });
    
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit
    };
  }
};

const updateAlert = async (id: string, updates: Partial<Alert>): Promise<boolean> => {
  try {
    const backendStatus = updates.status === 'investigating' ? 'under_review' : updates.status === 'resolved' ? 'resolved' : updates.status === 'contained' ? 'resolved' : 'new';
    await apiRequest(`/alerts/${id}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: backendStatus,
        analyst_notes: `Status updated to ${updates.status} via EDR Dashboard`,
      }),
    });
    return true;
  } catch (error) {
    console.error('Failed to update alert status via API:', error);
    return false;
  }
};

// --- Components ---

export default function Alerts() {
  const { user } = useData();
  // State
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedIoc, setCopiedIoc] = useState<string | null>(null);
  
  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 150);
    return () => clearTimeout(timer);
  }, [page, searchQuery, severityFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAlerts(page, limit, searchQuery, severityFilter, statusFilter);
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: AlertStatus) => {
    if (!selectedAlert) return;
    
    // Optimistic UI Update
    const updatedAlert = { ...selectedAlert, status: newStatus };
    setSelectedAlert(updatedAlert);
    setData(prev => prev.map(a => a.id === selectedAlert.id ? updatedAlert : a));

    await updateAlert(selectedAlert.id, { status: newStatus });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIoc(text);
    setTimeout(() => setCopiedIoc(null), 2000);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="h-full flex flex-col space-y-4 font-sans text-[#f4f6fb]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-[#a6acb8]">
            {total} security alerts detected across your infrastructure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0b0c0f] border border-white/10 rounded-lg text-sm hover:bg-white/5 transition-colors text-[#a6acb8] hover:text-white">
            <Filter size={16} />
            <span className="hidden sm:inline">Advanced Filters</span>
          </button>
          <button className="px-4 py-2 bg-[#00d4c3] text-black font-semibold rounded-lg text-sm hover:bg-[#00d4c3]/90 transition-colors shadow-[0_0_15px_-3px_#00d4c350]">
            Export Report
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#0b0c0f] border border-white/5 p-3 rounded-xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
          <input
            type="text"
            placeholder="Search by threat name, host, or ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-[#111318] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#a6acb8] focus:outline-none focus:border-[#00d4c3]/50 appearance-none min-w-[140px]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#a6acb8] focus:outline-none focus:border-[#00d4c3]/50 appearance-none min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="contained">Contained</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 bg-[#0b0c0f] border border-white/5 rounded-xl flex flex-col overflow-hidden relative">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-[#52525b] text-xs uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-3 w-12 text-center">
                  <input type="checkbox" className="rounded bg-[#111318] border-white/10 accent-[#00d4c3]" />
                </th>
                <th className="px-6 py-3 font-medium cursor-pointer hover:text-white group">
                  <div className="flex items-center gap-1">Severity <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                </th>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Host</th>
                <th className="px-6 py-3 font-medium">Threat Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                // Skeleton Loader
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-4 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-5 bg-white/5 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="w-32 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-40 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-5 bg-white/5 rounded-full" /></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : data.length > 0 ? (
                data.map((alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={cn(
                      "hover:bg-white/[0.03] transition-colors cursor-pointer group",
                      selectedAlert?.id === alert.id && "bg-white/[0.05]"
                    )}
                  >
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                       <input type="checkbox" className="rounded bg-[#111318] border-white/10 accent-[#00d4c3]" />
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                        alert.severity === 'critical' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        alert.severity === 'high' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                        alert.severity === 'medium' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      )}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#a6acb8] font-mono text-xs">
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-[#f4f6fb]">{alert.host}</td>
                    <td className="px-6 py-4 font-medium text-[#f4f6fb]">{alert.threatName}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded text-xs capitalize",
                        alert.status === 'new' ? "text-blue-400 bg-blue-400/10" :
                        alert.status === 'investigating' ? "text-orange-400 bg-orange-400/10" :
                        alert.status === 'contained' ? "text-yellow-400 bg-yellow-400/10" :
                        "text-emerald-400 bg-emerald-400/10"
                      )}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="p-1.5 hover:bg-white/10 rounded-md text-[#a6acb8] hover:text-white transition-colors">
                          <MoreVertical size={16} />
                       </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-[#52525b]">
                         <AlertOctagon size={48} className="mb-4 opacity-20" />
                         <p className="text-lg font-medium text-[#a6acb8]">No alerts found</p>
                         <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-white/5 p-4 flex items-center justify-between text-xs text-[#a6acb8]">
           <span>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results</span>
           <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-white">Page {page} of {totalPages || 1}</span>
              <button 
                 disabled={page >= totalPages}
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 className="p-1.5 rounded hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* Slide-over Details Panel */}
      {selectedAlert && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setSelectedAlert(null)}
          />
          <div className="fixed top-0 right-0 w-full sm:w-[500px] h-full bg-[#0b0c0f] border-l border-white/10 z-50 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            
            {/* Slide-over Header */}
            <div className="sticky top-0 bg-[#0b0c0f]/95 backdrop-blur border-b border-white/10 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                 <span className={cn(
                    "w-2 h-2 rounded-full",
                    selectedAlert.severity === 'critical' ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : 
                    selectedAlert.severity === 'high' ? "bg-orange-500 shadow-[0_0_8px_#f97316]" : "bg-blue-500"
                 )} />
                 <span className="text-sm font-mono text-[#a6acb8]">{selectedAlert.id}</span>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-[#a6acb8] hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Slide-over Content */}
            <div className="p-6 space-y-6">
              
              {/* Title Section */}
              <div>
                <h2 className="text-xl font-bold text-white mb-2 leading-snug">
                  {selectedAlert.threatName}
                </h2>
                <p className="text-sm text-[#a6acb8] leading-relaxed">
                  {selectedAlert.description || 'No description available for this alert type.'}
                </p>
              </div>

              {/* Key Attributes Grid */}
              <div className="grid grid-cols-2 gap-3">
                <AttributeCard icon={Monitor} label="Affected Host" value={selectedAlert.host} />
                <AttributeCard icon={User} label="User Account" value={selectedAlert.user || 'SYSTEM'} />
                <AttributeCard icon={Clock} label="Detected At" value={new Date(selectedAlert.timestamp).toLocaleString()} />
                <AttributeCard icon={Shield} label="Current Status" value={selectedAlert.status} capitalize />
              </div>

              {/* MITRE Info */}
              {selectedAlert.mitreTactic && (
                <div className="p-4 rounded-xl bg-[#00d4c3]/5 border border-[#00d4c3]/20 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                      <AlertOctagon size={40} className="text-[#00d4c3]" />
                   </div>
                   <h4 className="text-xs font-bold text-[#00d4c3] uppercase tracking-wider mb-1">MITRE ATT&CK Framework</h4>
                   <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{selectedAlert.mitreTactic}</span>
                      <span className="text-[#a6acb8] text-xs px-1.5 py-0.5 bg-white/5 rounded border border-white/5">
                        {selectedAlert.mitreTechnique}
                      </span>
                   </div>
                </div>
              )}

              {/* IOCs Section */}
              {selectedAlert.iocs && selectedAlert.iocs.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#52525b] uppercase tracking-wider mb-3">Indicators of Compromise</h4>
                  <div className="space-y-2">
                    {selectedAlert.iocs.map((ioc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[#111318] border border-white/5 group hover:border-white/10 transition-colors">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-[#a6acb8] uppercase block mb-0.5">{ioc.type}</span>
                          <p className="text-sm text-[#f4f6fb] font-mono truncate">{ioc.value}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(ioc.value)}
                          className="text-[#52525b] hover:text-[#00d4c3] p-2 transition-colors relative"
                        >
                          {copiedIoc === ioc.value ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Section */}
              {selectedAlert.evidence && (
                <div>
                   <h4 className="text-xs font-bold text-[#52525b] uppercase tracking-wider mb-3">Evidence Files</h4>
                   <div className="space-y-2">
                      {selectedAlert.evidence.map((file, i) => (
                         <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#111318] border border-white/5 text-sm text-[#a6acb8]">
                            <FileText size={16} className="text-[#00d4c3]" />
                            <span className="truncate">{file}</span>
                         </div>
                      ))}
                   </div>
                </div>
              )}

              {/* Action Footer (Sticky) */}
              <div className="pt-6 mt-6 border-t border-white/5 flex gap-3">
                 {user?.role === 'user' ? (
                   <div className="flex-1 text-center py-3 px-4 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-xs text-[#ff3b30] font-medium">
                     Read-only Access: You do not have permissions to modify alert status.
                   </div>
                 ) : (
                   <>
                     <button 
                        onClick={() => handleUpdateStatus('investigating')}
                        className="flex-1 bg-[#00d4c3] text-black font-bold text-sm py-3 rounded-lg hover:bg-[#00d4c3]/90 transition-all active:scale-[0.98]"
                     >
                        Acknowledge & Investigate
                     </button>
                     <button className="px-4 py-3 bg-[#111318] border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors">
                        <MoreVertical size={20} />
                     </button>
                   </>
                 )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Helper Component ---
const AttributeCard = ({ icon: Icon, label, value, capitalize = false }: any) => (
  <div className="p-3 rounded-lg bg-[#111318] border border-white/5">
    <div className="flex items-center gap-2 text-[#52525b] mb-1.5">
      <Icon size={14} />
      <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
    </div>
    <p className={cn("text-sm text-[#f4f6fb] font-medium truncate", capitalize && "capitalize")}>
      {value}
    </p>
  </div>
);