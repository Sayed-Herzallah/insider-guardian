import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Monitor,
  ExternalLink,
  X,
  List,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Search as SearchIcon,
  MessageSquare,
  Send
} from 'lucide-react';
import { apiRequest } from '@/lib/apiClient';
import { useData } from '@/context/DataContext';
import { toast } from 'sonner';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'investigating' | 'contained' | 'resolved';
  type: string;
  createdAt: string;
  endpoints: number;
  alerts: number;
  analyst: string;
  description?: string;
  allowedTransitions?: string[];
}

interface Comment {
  id: string;
  content: string;
  is_internal: boolean;
  author_email: string;
  author_name: string;
  created_at: string;
}

const StatCard = ({ title, value, color, icon: Icon }: any) => (
  <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-4 flex-1 min-w-[140px] relative overflow-hidden group">
    <div className={`absolute top-0 left-0 w-1 h-full`} style={{ backgroundColor: color }} />
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[#a6acb8] text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-1">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-bold text-[#f4f6fb]">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${color}10` }}>
        <Icon size={20} style={{ color: color }} />
      </div>
    </div>
  </div>
);

const FilterCheckbox = ({ label, color, checked, onChange }: any) => (
  <div 
    onClick={onChange}
    className="flex items-center gap-3 py-1.5 cursor-pointer group select-none"
  >
    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'border-transparent' : 'border-[#374151]'}`}
      style={{ backgroundColor: checked ? color : 'transparent' }}>
      {checked && <CheckCircle2 size={10} className="text-black" />}
    </div>
    <span className={`text-sm ${checked ? 'text-white' : 'text-[#9ca3af] group-hover:text-white'}`}>{label}</span>
  </div>
);

export default function Incidents() {
  const { user } = useData();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedIncidentDetails, setSelectedIncidentDetails] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [analysts, setAnalysts] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{
    severity: string[];
    status: string[];
    type: string | null;
  }>({
    severity: ['critical', 'high'],
    status: ['investigating', 'new'],
    type: null
  });

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch Incidents
  const loadIncidents = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/incidents/');
      if (res && res.data) {
        const mapped: Incident[] = res.data.map((i: any) => ({
          id: i.incident_id || i.id,
          title: i.title,
          severity: i.severity || 'low',
          status: i.status === 'open' ? 'new' : i.status === 'in_progress' ? 'investigating' : i.status === 'resolved' ? 'resolved' : 'contained',
          createdAt: i.created_at || new Date().toISOString(),
          assignedTo: i.assigned_to_email || 'Unassigned',
          endpoints: i.affected_agent_names?.length || 1,
          alerts: i.alert_count || 1,
          analyst: i.assigned_to_email || 'Unassigned',
          type: i.created_by_email ? 'manual' : 'auto',
          description: i.description
        }));
        if (mapped.length === 0) {
          throw new Error('No incidents found from API');
        }
        setIncidents(mapped);
      }
    } catch (e) {
      console.error('Failed to load incidents, falling back to mock:', e);
      // Fallback mock data
      setIncidents([
        { id: 'INC-2942', title: 'Possible Ransomware Activity on FIN-PC-07', severity: 'critical', status: 'investigating', type: 'auto', createdAt: '2024-02-09T10:00:00Z', endpoints: 3, alerts: 8, analyst: 'A. Sterling' },
        { id: 'INC-2938', title: 'Suspicious Credential Dumping - LSASS Access', severity: 'high', status: 'new', type: 'auto', createdAt: '2024-02-09T09:45:00Z', endpoints: 1, alerts: 3, analyst: 'Unassigned' },
        { id: 'INC-2935', title: 'Unauthorized Registry Modification - Run Keys', severity: 'medium', status: 'contained', type: 'manual', createdAt: '2024-02-09T09:15:00Z', endpoints: 12, alerts: 15, analyst: 'R. Vance' },
        { id: 'INC-2930', title: 'Anomalous Data Exfiltration to Unknown IP', severity: 'critical', status: 'investigating', type: 'auto', createdAt: '2024-02-09T08:30:00Z', endpoints: 2, alerts: 24, analyst: 'A. Sterling' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Load analysts list
  const loadAnalysts = async () => {
    try {
      const res = await apiRequest('/users/');
      if (res && res.data) {
        setAnalysts(res.data);
      }
    } catch (e) {
      console.warn('Failed to load users, using mock analysts');
    }
  };

  useEffect(() => {
    loadIncidents();
    loadAnalysts();
  }, []);

  // Fetch comments (chat) for selected incident
  const fetchComments = async (incId: string) => {
    try {
      const res = await apiRequest(`/incidents/${incId}/comments/`);
      if (res && res.data) {
        setComments(res.data);
      }
    } catch (e) {
      console.warn('Failed to fetch comments, using empty list');
      setComments([]);
    }
  };

  // Select incident detail
  const handleSelectIncident = async (inc: Incident) => {
    setSelectedIncident(inc);
    setSelectedIncidentDetails(null);
    setComments([]);
    
    try {
      const res = await apiRequest(`/incidents/${inc.id}/`);
      if (res && res.data) {
        setSelectedIncidentDetails(res.data);
      }
    } catch (e) {
      console.warn('Incident details API failed, using base incident values');
      setSelectedIncidentDetails({
        ...inc,
        comments: [],
        alerts: [],
        allowed_transitions: ['in_progress', 'contained', 'resolved']
      });
    }

    fetchComments(inc.id);
  };

  // Post Comment (Chat message submit)
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedIncident) return;

    setPostingComment(true);
    try {
      const res = await apiRequest(`/incidents/${selectedIncident.id}/comments/`, {
        method: 'POST',
        body: JSON.stringify({
          content: newComment,
          is_internal: false
        })
      });

      if (res && res.success) {
        setNewComment('');
        fetchComments(selectedIncident.id);
        toast.success('Comment posted successfully');
      }
    } catch (e) {
      toast.error('Failed to post comment. Mocking locally...');
      // Fallback mock comment locally
      const mockComment: Comment = {
        id: `com-${Date.now()}`,
        content: newComment,
        is_internal: false,
        author_email: user?.username || 'analyst@ig.com',
        author_name: user?.name || 'SOC Analyst',
        created_at: new Date().toISOString()
      };
      setComments(prev => [...prev, mockComment]);
      setNewComment('');
    } finally {
      setPostingComment(false);
    }
  };

  // Change status of incident
  const handleUpdateStatus = async (statusVal: string) => {
    if (!selectedIncident) return;
    try {
      const res = await apiRequest(`/incidents/${selectedIncident.id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: statusVal,
          resolution_summary: statusVal === 'resolved' ? 'Resolved via incident view' : ''
        })
      });

      if (res && res.success) {
        toast.success(`Incident status changed to ${statusVal}`);
        loadIncidents();
        // Update local detail status
        setSelectedIncident(prev => prev ? { ...prev, status: statusVal as any } : null);
      }
    } catch (e) {
      toast.error('Status transition failed.');
    }
  };

  // Assign Incident
  const handleAssignIncident = async (analystId: string) => {
    if (!selectedIncident) return;
    try {
      const res = await apiRequest(`/incidents/${selectedIncident.id}/assign/`, {
        method: 'POST',
        body: JSON.stringify({
          analyst_id: analystId || null
        })
      });

      if (res && res.success) {
        toast.success('Incident analyst assigned');
        loadIncidents();
        const assignedName = analysts.find(a => a.id === analystId)?.full_name || 'Unassigned';
        setSelectedIncident(prev => prev ? { ...prev, analyst: assignedName } : null);
      }
    } catch (e) {
      toast.error('Assignment failed.');
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const toggleFilter = (category: 'severity' | 'status', value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const exists = current.includes(value);
      return {
        ...prev,
        [category]: exists 
          ? current.filter(item => item !== value) 
          : [...current, value]
      };
    });
  };

  const filteredData = useMemo(() => {
    return incidents.filter(incident => {
      const matchesSearch = incident.title.toLowerCase().includes(search.toLowerCase()) || 
                            incident.id.toLowerCase().includes(search.toLowerCase());
      
      const matchesSeverity = filters.severity.length === 0 || filters.severity.includes(incident.severity);
      const matchesStatus = filters.status.length === 0 || filters.status.includes(incident.status);
      const matchesType = filters.type === null || filters.type === incident.type;

      return matchesSearch && matchesSeverity && matchesStatus && matchesType;
    });
  }, [search, filters, incidents]);

  const stats = [
    { title: 'Active Incidents', value: filteredData.length, color: '#00d4c3', icon: Activity },
    { title: 'Critical', value: filteredData.filter(i => i.severity === 'critical').length, color: '#ff3b30', icon: AlertOctagon },
    { title: 'High', value: filteredData.filter(i => i.severity === 'high').length, color: '#ff9500', icon: AlertTriangle },
    { title: 'Under Investigation', value: filteredData.filter(i => i.status === 'investigating').length, color: '#3b82f6', icon: SearchIcon },
    { title: 'Contained', value: filteredData.filter(i => i.status === 'contained').length, color: '#10b981', icon: CheckCircle2 },
  ];

  const clearAllFilters = () => {
    setFilters({ severity: [], status: [], type: null });
    setSearch('');
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'critical': return { bg: '#ff3b30', label: 'CRITICAL' };
      case 'high': return { bg: '#ff9500', label: 'HIGH' };
      case 'medium': return { bg: '#a6acb8', label: 'MEDIUM' };
      default: return { bg: '#00d4c3', label: 'LOW' };
    }
  };

  return (
    <div className="bg-black min-h-screen text-[#f4f6fb] font-sans p-4 sm:p-6 overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-medium text-[#f4f6fb]">SOC Dashboard <span className="text-[#52525b]">/</span> Incidents</h1>
        <div className="flex items-center gap-4">
           <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" size={14} />
                <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search incidents..." 
                    className="bg-[#0b0c0f] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-[#00d4c3] w-full sm:w-64 transition-colors placeholder:text-[#52525b]"
                />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Filters Panel */}
        <div className="w-64 flex-shrink-0 hidden md:block overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Filter size={14} />
                    FILTERS
                </div>
                <button onClick={clearAllFilters} className="text-[10px] text-[#00d4c3] hover:underline">Clear All</button>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider mb-2">Severity</h4>
                    <FilterCheckbox label="Critical" color="#ff3b30" checked={filters.severity.includes('critical')} onChange={() => toggleFilter('severity', 'critical')} />
                    <FilterCheckbox label="High" color="#ff9500" checked={filters.severity.includes('high')} onChange={() => toggleFilter('severity', 'high')} />
                    <FilterCheckbox label="Medium" color="#a6acb8" checked={filters.severity.includes('medium')} onChange={() => toggleFilter('severity', 'medium')} />
                </div>

                <div>
                    <h4 className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider mb-2">Status</h4>
                    <FilterCheckbox label="New" color="#3b82f6" checked={filters.status.includes('new')} onChange={() => toggleFilter('status', 'new')} />
                    <FilterCheckbox label="Investigating" color="#3b82f6" checked={filters.status.includes('investigating')} onChange={() => toggleFilter('status', 'investigating')} />
                    <FilterCheckbox label="Contained" color="#10b981" checked={filters.status.includes('contained')} onChange={() => toggleFilter('status', 'contained')} />
                    <FilterCheckbox label="Resolved" color="#00d4c3" checked={filters.status.includes('resolved')} onChange={() => toggleFilter('status', 'resolved')} />
                </div>

                 <div>
                    <h4 className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider mb-2">Incident Type</h4>
                    <div className="flex bg-[#0b0c0f] border border-white/10 rounded p-1">
                        <button 
                          onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'auto' ? null : 'auto' }))}
                          className={`flex-1 text-[10px] font-bold py-1 rounded text-center transition-all ${filters.type === 'auto' ? 'bg-[#00d4c3]/10 text-[#00d4c3]' : 'text-[#52525b] hover:text-white'}`}
                        >
                          AUTO
                        </button>
                        <button 
                           onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'manual' ? null : 'manual' }))}
                           className={`flex-1 text-[10px] font-bold py-1 rounded text-center transition-all ${filters.type === 'manual' ? 'bg-[#00d4c3]/10 text-[#00d4c3]' : 'text-[#52525b] hover:text-white'}`}
                        >
                          MANUAL
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* List of Incidents */}
        <div className="flex-1 flex flex-col min-w-0">
            {(filters.severity.length > 0 || filters.status.length > 0) && (
              <div className="flex items-center gap-3 mb-4 text-xs flex-wrap">
                  <span className="text-[#52525b] font-medium">ACTIVE FILTERS:</span>
                  <div className="flex gap-2 flex-wrap">
                      {filters.severity.map(sev => (
                        <span key={sev} className="px-2 py-1 rounded bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] flex items-center gap-1 capitalize">
                            Severity: {sev} <X size={10} className="cursor-pointer hover:text-white" onClick={() => toggleFilter('severity', sev)} />
                        </span>
                      ))}
                      {filters.status.map(stat => (
                        <span key={stat} className="px-2 py-1 rounded bg-[#00d4c3]/10 border border-[#00d4c3]/20 text-[#00d4c3] flex items-center gap-1 capitalize">
                            Status: {stat} <X size={10} className="cursor-pointer hover:text-white" onClick={() => toggleFilter('status', stat)} />
                        </span>
                      ))}
                  </div>
                  <div className="ml-auto flex gap-2">
                      <button className="p-2 hover:bg-white/5 rounded text-[#52525b]"><List size={14} /></button>
                      <button onClick={clearAllFilters} className="text-[10px] text-[#52525b] hover:text-white border border-white/10 px-3 py-1.5 rounded uppercase font-bold">Clear All</button>
                  </div>
              </div>
            )}

            <div className="overflow-y-auto pr-2 pb-10 flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-[#00d4c3] animate-pulse">
                      <p>Loading EDR incidents...</p>
                    </div>
                ) : filteredData.length > 0 ? (
                    filteredData.map((incident) => {
                      const sevStyle = getSeverityStyle(incident.severity);
                      return (
                        <div 
                          key={incident.id} 
                          onClick={() => handleSelectIncident(incident)}
                          className="bg-[#0b0c0f] border border-white/5 rounded-lg p-4 mb-3 hover:border-white/10 transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 sm:items-center"
                        >
                          <div className="flex-shrink-0 flex flex-row sm:flex-col gap-3 sm:gap-1 sm:w-24">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-black text-center w-fit sm:w-full"
                              style={{ backgroundColor: sevStyle.bg }}>
                              {sevStyle.label}
                            </span>
                            <span className="text-xs text-[#52525b] font-mono">{incident.id}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[#f4f6fb] font-medium text-sm truncate">{incident.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[#a6acb8] mb-2 sm:mb-0">
                              <span className="bg-[#1c1e24] px-1.5 py-0.5 rounded text-[#a6acb8] border border-white/5 uppercase text-[9px] tracking-wide">
                                {incident.type === 'manual' ? 'MANUAL' : 'AUTO-GEN'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 sm:px-4 sm:border-l sm:border-r border-white/5 h-8">
                            <div className="flex items-center gap-2">
                              <Monitor size={14} className="text-[#52525b]" />
                              <span className="text-xs text-[#a6acb8]">{incident.endpoints.toString().padStart(2, '0')} Endpoints</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-[#f4f6fb]">{incident.alerts} Alerts</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:min-w-[200px]">
                            <div className="flex flex-col items-start sm:items-end">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${incident.status === 'investigating' ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`} />
                                <span className={`text-xs font-medium ${incident.status === 'investigating' ? 'text-blue-400' : 'text-[#a6acb8]'}`}>
                                  {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#a6acb8]">{incident.analyst}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                                <button className="text-[#52525b] hover:text-white transition-colors">
                                    <ExternalLink size={14} />
                                </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-[#52525b]">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p>No incidents found</p>
                      <button onClick={clearAllFilters} className="mt-2 text-[#00d4c3] text-sm hover:underline">Clear filters</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Slide-over Incident Details and Chat Room */}
      {selectedIncident && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setSelectedIncident(null)}
          />
          <div className="fixed top-0 right-0 w-full sm:w-[520px] h-full bg-[#0b0c0f] border-l border-white/10 z-50 overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="sticky top-0 bg-[#0b0c0f]/95 backdrop-blur border-b border-white/10 p-5 flex items-center justify-between z-10 flex-shrink-0">
               <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-[#a6acb8]">{selectedIncident.id}</span>
                  <span className="text-xs text-[#52525b]">/</span>
                  <span className="text-xs uppercase tracking-widest text-[#00d4c3] font-bold">{selectedIncident.severity}</span>
               </div>
               <button
                 onClick={() => setSelectedIncident(null)}
                 className="text-[#a6acb8] hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
               >
                 <X size={20} />
               </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-2 leading-snug">{selectedIncident.title}</h2>
                <p className="text-xs text-[#a6acb8] leading-relaxed">
                  {selectedIncidentDetails?.description || 'No description available.'}
                </p>
              </div>

              {/* Status and Assignment Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#111318] border border-white/5">
                <div>
                  <span className="text-[10px] text-[#52525b] uppercase block font-bold mb-1">Status</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#f4f6fb] capitalize font-medium">{selectedIncident.status}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#52525b] uppercase block font-bold mb-1">Assigned Analyst</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-sm text-[#00d4c3] truncate font-medium">{selectedIncident.analyst}</span>
                  </div>
                </div>
              </div>

              {/* Actions Dropdown */}
              <div className="space-y-3">
                 <h4 className="text-xs font-bold text-[#52525b] uppercase tracking-wider">Management Actions</h4>
                 {user?.role === 'user' ? (
                   <div className="py-2.5 px-4 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-xs text-[#ff3b30] font-medium">
                     Read-only Access: You do not have permissions to modify incident status.
                   </div>
                 ) : (
                   <div className="flex flex-wrap gap-2">
                     {selectedIncidentDetails?.allowed_transitions?.map((trans: string) => (
                       <button
                         key={trans}
                         onClick={() => handleUpdateStatus(trans)}
                         className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#00d4c3]/30 text-xs text-[#a6acb8] hover:text-white transition-all capitalize"
                       >
                         Set {trans.replace('_', ' ')}
                       </button>
                     ))}
                     {/* Fallback status button just in case */}
                     {!selectedIncidentDetails?.allowed_transitions && (
                       <>
                         <button onClick={() => handleUpdateStatus('in_progress')} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#00d4c3]/30 text-xs text-[#a6acb8] hover:text-white transition-all">Set In Progress</button>
                         <button onClick={() => handleUpdateStatus('resolved')} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#00d4c3]/30 text-xs text-[#a6acb8] hover:text-white transition-all">Set Resolved</button>
                       </>
                     )}
                   </div>
                 )}
 
                 {/* Analyst Assignment Dropdown */}
                 {user?.role !== 'user' && (
                   <div className="pt-2">
                     <label className="text-xs text-[#52525b] font-bold block mb-1">Assign Analyst</label>
                     <select 
                       onChange={(e) => handleAssignIncident(e.target.value)}
                       className="bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#a6acb8] focus:outline-none focus:border-[#00d4c3]/50 w-full"
                       defaultValue=""
                     >
                       <option value="" disabled>Select Analyst...</option>
                       {analysts.map((a: any) => (
                         <option key={a.id} value={a.id}>{a.full_name} ({a.role})</option>
                       ))}
                     </select>
                   </div>
                 )}
              </div>

              {/* Chat room / comments */}
              <div className="border-t border-white/10 pt-6 flex flex-col flex-1 min-h-[300px]">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare size={16} className="text-[#00d4c3]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Analyst Chat Room</h4>
                </div>

                {/* Messages scroll box */}
                <div className="flex-1 overflow-y-auto space-y-3 bg-[#0a0a0c] border border-white/5 rounded-xl p-4 max-h-[250px] custom-scrollbar">
                  {comments.length > 0 ? (
                    comments.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] rounded-lg p-2.5 text-xs ${
                          msg.author_email === user?.username 
                            ? 'bg-[#00d4c3]/10 border border-[#00d4c3]/20 self-end ml-auto' 
                            : 'bg-white/5 border border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1 text-[9px] text-[#52525b]">
                          <span className="font-bold text-[#a6acb8]">{msg.author_name || msg.author_email}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[#f4f6fb] break-words">{msg.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-[#52525b]">
                      <p>No chat history. Send a message to start collaboration.</p>
                    </div>
                  )}
                  <div ref={commentsEndRef} />
                </div>
              </div>
            </div>

            {/* Chat Send Form */}
            {user?.role === 'user' ? (
              <div className="p-4 border-t border-white/10 bg-[#0a0a0c] text-center text-xs text-[#ff3b30]/80 font-medium flex-shrink-0 z-10">
                Commenting is restricted to SOC Analysts and Administrators.
              </div>
            ) : (
              <form onSubmit={handleSendComment} className="p-4 border-t border-white/10 bg-[#0a0a0c] flex gap-2 flex-shrink-0 z-10">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type a message to other analysts..."
                  className="flex-1 bg-[#111318] border border-white/10 rounded-lg px-4 py-2 text-xs text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
                  disabled={postingComment}
                />
                <button
                  type="submit"
                  className="p-2 bg-[#00d4c3] text-black rounded-lg hover:bg-[#00d4c3]/80 transition-colors flex items-center justify-center disabled:opacity-50"
                  disabled={!newComment.trim() || postingComment}
                >
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}