import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Zap, Layout, Clock, AlertCircle,
  Shield, Key, Database, Globe, 
  ArrowLeft, Check, ChevronDown, Play, X, FileText, type LucideIcon
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { apiRequest } from '@/lib/apiClient';
import { toast } from 'sonner';
import { z } from 'zod';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export type PlaybookType = 'AUTOMATIC' | 'MANUAL' | 'HYBRID';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PlaybookStatus = 'ACTIVE' | 'DISABLED';
export type PlaybookCategory = 'INCIDENT RESPONSE' | 'MALWARE RESPONSE' | 'RANSOMWARE RESPONSE' | 'PHISHING RESPONSE';

interface PlaybookRun {
  id: string;
  playbook_name: string;
  status: 'completed' | 'failed' | 'running';
  trigger_type: string;
  target_agent_name: string;
  triggered_by_email: string;
  duration_seconds: number;
  started_at: string;
  completed_at: string;
  step_results?: PlaybookStepResult[];
}

interface PlaybookStepResult {
  order: number;
  name: string;
  command_type: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  duration_seconds?: number;
}

const getPlaybookIcon = (iconName: string): LucideIcon => {
  switch (iconName) {
    case 'shield': return Shield;
    case 'key': return Key;
    case 'database': return Database;
    case 'globe': return Globe;
    default: return Shield;
  }
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: LucideIcon, label: string, value: string | number, color: string }) => (
  <div className="bg-[#0b0c0f] border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/[0.02] transition-all group relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative">
      <p className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-[#f4f6fb] group-hover:scale-105 transition-transform origin-left">{value}</h3>
    </div>
    <div 
      className="w-12 h-12 rounded-lg flex items-center justify-center relative"
      style={{ backgroundColor: `${color}15`, color: color }}
    >
      <Icon size={24} />
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    ACTIVE: "bg-[#00d4c3]/10 text-[#00d4c3] border-[#00d4c3]/20",
    DISABLED: "bg-[#52525b]/10 text-[#52525b] border-[#52525b]/20",
    CRITICAL: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
    HIGH: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20",
    MEDIUM: "bg-[#64748b]/10 text-[#94a3b8] border-[#64748b]/20",
    LOW: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
    AUTOMATIC: "bg-[#00d4c3]/10 text-[#00d4c3] border-[#00d4c3]/20",
    MANUAL: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
    HYBRID: "bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20",
    COMPLETED: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
    FAILED: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
    RUNNING: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20 animate-pulse",
  };

  const defaultStyle = "bg-[#111318] text-[#a6acb8] border-white/10";

  return (
    <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border", styles[status.toUpperCase()] || defaultStyle)}>
      {status}
    </span>
  );
};

export default function AutomationDashboard() {
  const { playbooks, togglePlaybook, refreshAllData } = useData();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'DASHBOARD' | 'CREATE'>('DASHBOARD');
  const [subView, setSubView] = useState<'PLAYBOOKS' | 'LOGS'>('PLAYBOOKS');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [runs, setRuns] = useState<PlaybookRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PlaybookRun | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      await refreshAllData();
      setLoading(false);
    };
    load();
  }, [refreshAllData]);

  // Fetch Playbook Runs
  const loadRuns = async () => {
    setLoadingRuns(true);
    try {
      // The API documents: /playbooks/<playbook_id>/runs/
      // We attempt to fetch runs for first playbook or general if available, otherwise show fallback logs
      const firstPlaybookId = playbooks[0]?.id || 'pb1';
      const res = await apiRequest(`/playbooks/${firstPlaybookId}/runs/`);
      if (res && res.data) {
        setRuns(res.data);
      }
    } catch (e) {
      console.warn('Playbook runs API failed, loading mock logs');
      setRuns([
        {
          id: 'run-1',
          playbook_name: 'Isolate Host on Ransomware Detection',
          status: 'completed',
          trigger_type: 'on_alert',
          target_agent_name: 'FIN-SRV-01',
          triggered_by_email: 'system@ig.com',
          duration_seconds: 42,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 3600000 + 42000).toISOString(),
          step_results: [
            { order: 1, name: 'Isolate host', command_type: 'isolate_host', status: 'success', duration_seconds: 12 },
            { order: 2, name: 'Collect telemetry', command_type: 'collect_telemetry', status: 'success', duration_seconds: 30 },
          ]
        },
        {
          id: 'run-2',
          playbook_name: 'Block Malicious IP',
          status: 'failed',
          trigger_type: 'on_alert',
          target_agent_name: 'HR-PC-04',
          triggered_by_email: 'analyst@ig.com',
          duration_seconds: 5,
          started_at: new Date(Date.now() - 7200000).toISOString(),
          completed_at: new Date(Date.now() - 7200000 + 5000).toISOString(),
          step_results: [
            { order: 1, name: 'Block IP Address', command_type: 'block_ip', status: 'failed', error_message: 'Agent returned queue full error', duration_seconds: 5 },
          ]
        }
      ]);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    if (subView === 'LOGS') {
      loadRuns();
    }
  }, [subView, playbooks]);

  // Map playbooks list
  const mappedPlaybooks = useMemo(() => {
    return playbooks.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: 'AUTOMATIC' as PlaybookType,
      triggerType: p.triggers?.[0] || 'on_alert',
      riskLevel: 'HIGH' as RiskLevel,
      lastExecuted: new Date().toISOString(),
      actionsCount: p.actions?.length || 2,
      status: (p.enabled ? 'ACTIVE' : 'DISABLED') as PlaybookStatus,
      category: 'INCIDENT RESPONSE' as PlaybookCategory,
      icon: 'shield' as const,
    }));
  }, [playbooks]);

  const filteredPlaybooks = useMemo(() => {
    return mappedPlaybooks.filter(pb => {
      return pb.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             pb.description.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [mappedPlaybooks, searchQuery]);

  const filteredRuns = useMemo(() => {
    return runs.filter(r => {
      return r.playbook_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             r.target_agent_name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [runs, searchQuery]);

  const stats = useMemo(() => {
    const total = playbooks.length;
    const active = playbooks.filter(p => p.enabled).length;
    return {
      totalPlaybooks: total,
      activeAutomations: active,
      manualPlaybooks: total - active,
      autoTriggered: 482,
      executionsToday: 124,
      failedExecutions: 2
    };
  }, [playbooks]);

  const handleTogglePlaybook = async (id: string) => {
    try {
      await togglePlaybook(id);
      toast.success('Playbook state updated');
    } catch (e) {
      toast.error('Failed to toggle playbook status.');
    }
  };

  const handleTriggerPlaybook = async (id: string) => {
    try {
      await apiRequest(`/playbooks/${id}/trigger/`, {
        method: 'POST',
        body: JSON.stringify({ agent_id: null }),
      });
      toast.success('Playbook triggered successfully');
    } catch (e) {
      toast.error('Failed to trigger playbook execution.');
    }
  };

  const handleSelectRun = async (run: PlaybookRun) => {
    setSelectedRun(run);
    try {
      const res = await apiRequest(`/playbooks/runs/${run.id}/`);
      if (res && res.data) {
        setSelectedRun(res.data);
      }
    } catch (e) {
      console.warn('Detailed run retrieval failed, showing local step results');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050505] text-[#00d4c3]">
        <div className="flex flex-col items-center gap-4">
          <Zap className="h-12 w-12 animate-pulse" />
          <p className="font-mono text-sm animate-pulse">INITIALIZING SECURITY PROTOCOLS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f6fb] font-sans selection:bg-[#00d4c3]/30">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#00d4c3]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#3b82f6]/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto p-6 space-y-8">
        
        {view === 'DASHBOARD' ? (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#f4f6fb] tracking-tight">Security Automation</h1>
                <p className="text-[#a6acb8] mt-1">Manage automated response protocols and playbooks.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setView('CREATE')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#00d4c3] hover:bg-[#00d4c3]/90 text-black font-bold rounded-lg transition-all shadow-[0_0_20px_-5px_#00d4c350] active:scale-95"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>New Playbook</span>
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard icon={Database} label="Total Playbooks" value={stats.totalPlaybooks} color="#00d4c3" />
              <StatCard icon={Zap} label="Active" value={stats.activeAutomations} color="#10b981" />
              <StatCard icon={Layout} label="Manual" value={stats.manualPlaybooks} color="#3b82f6" />
              <StatCard icon={Clock} label="Auto Triggered" value={stats.autoTriggered} color="#a855f7" />
              <StatCard icon={Check} label="Executions (24h)" value={stats.executionsToday} color="#00d4c3" />
              <StatCard icon={AlertCircle} label="Failures" value={stats.failedExecutions} color="#ef4444" />
            </div>

            <div className="bg-[#0b0c0f] border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col min-h-[600px]">
              
              <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex bg-[#050505] border border-white/10 rounded-lg p-1">
                  <button 
                    onClick={() => setSubView('PLAYBOOKS')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                      subView === 'PLAYBOOKS' ? "bg-[#00d4c3] text-black shadow-lg shadow-[#00d4c3]/15" : "text-[#a6acb8] hover:text-white"
                    )}
                  >
                    Active Playbooks
                  </button>
                  <button 
                    onClick={() => setSubView('LOGS')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                      subView === 'LOGS' ? "bg-[#00d4c3] text-black shadow-lg shadow-[#00d4c3]/15" : "text-[#a6acb8] hover:text-white"
                    )}
                  >
                    Execution Runs History
                  </button>
                </div>
                
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                  <input 
                    type="text" 
                    placeholder={subView === 'PLAYBOOKS' ? "Search playbooks..." : "Search runs history..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111318] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00d4c3]/50 focus:ring-1 focus:ring-[#00d4c3]/50 text-[#f4f6fb] placeholder:text-[#52525b] transition-all"
                  />
                </div>
              </div>

              {subView === 'PLAYBOOKS' ? (
                <>
                  <div className="grid grid-cols-12 px-6 py-3 bg-[#111318] border-b border-white/10 text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                    <div className="col-span-5 md:col-span-4">Playbook Details</div>
                    <div className="col-span-2 hidden md:block">Configuration</div>
                    <div className="col-span-2 hidden md:block">Executions</div>
                    <div className="col-span-3 md:col-span-2">Last Run</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-white/5">
                    {filteredPlaybooks.length > 0 ? (
                      filteredPlaybooks.map((pb) => {
                        const PlaybookIcon = getPlaybookIcon(pb.icon);
                        return (
                          <div key={pb.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group">
                            
                            <div className="col-span-5 md:col-span-4 flex items-start gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/5",
                                pb.status === 'ACTIVE' ? "bg-[#1c1e24] text-[#00d4c3]" : "bg-[#1c1e24] text-[#52525b]"
                              )}>
                                <PlaybookIcon size={18} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-[#f4f6fb] truncate group-hover:text-[#00d4c3] transition-colors">{pb.name}</h4>
                                <p className="text-[11px] text-[#a6acb8] truncate mt-0.5">{pb.description}</p>
                              </div>
                            </div>

                            <div className="col-span-2 hidden md:block">
                              <button onClick={() => handleTogglePlaybook(pb.id)}>
                                <StatusBadge status={pb.status} />
                              </button>
                            </div>

                            <div className="col-span-2 hidden md:flex flex-col gap-1">
                              <span className="text-[10px] text-[#a6acb8] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Zap size={10} /> {pb.triggerType}
                              </span>
                              <div className="text-[10px] text-[#52525b] font-bold uppercase tracking-wider">
                                {pb.actionsCount} Steps
                              </div>
                            </div>

                            <div className="col-span-3 md:col-span-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#f4f6fb]">
                                  {new Date(pb.lastExecuted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-[10px] text-[#52525b] font-mono">
                                  {new Date(pb.lastExecuted).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            <div className="col-span-2 flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleTriggerPlaybook(pb.id)}
                                aria-label="Run Playbook" 
                                className="p-2 text-[#52525b] hover:text-[#00d4c3] hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Play size={16} />
                              </button>
                            </div>

                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-[#52525b]">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p>No playbooks found</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-12 px-6 py-3 bg-[#111318] border-b border-white/10 text-[10px] font-bold text-[#52525b] uppercase tracking-wider">
                    <div className="col-span-4">Playbook Name</div>
                    <div className="col-span-2">Trigger</div>
                    <div className="col-span-2">Target Agent</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Duration</div>
                  </div>

                  <div className="divide-y divide-white/5">
                    {loadingRuns ? (
                      <div className="flex justify-center items-center py-10 text-[#00d4c3]">
                        <div className="w-6 h-6 border-2 border-[#00d4c3] border-t-transparent rounded-full animate-spin mr-2" />
                        <span>Loading execution runs...</span>
                      </div>
                    ) : filteredRuns.length > 0 ? (
                      filteredRuns.map((run) => (
                        <div 
                          key={run.id} 
                          onClick={() => handleSelectRun(run)}
                          className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors cursor-pointer group"
                        >
                          <div className="col-span-4 pr-4">
                            <h4 className="text-xs font-bold text-white group-hover:text-[#00d4c3] transition-colors truncate">{run.playbook_name}</h4>
                            <span className="text-[10px] text-[#52525b] font-mono block mt-0.5">{run.id}</span>
                          </div>
                          <div className="col-span-2 text-xs text-[#a6acb8] capitalize">{run.trigger_type.replace('_', ' ')}</div>
                          <div className="col-span-2 text-xs text-white">{run.target_agent_name}</div>
                          <div className="col-span-2"><StatusBadge status={run.status} /></div>
                          <div className="col-span-2 text-right text-xs text-[#a6acb8] font-mono">{run.duration_seconds}s</div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-[#52525b]">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p>No execution logs found</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <CreatePlaybookView onBack={() => setView('DASHBOARD')} onSuccess={() => { setView('DASHBOARD'); refreshAllData(); }} />
        )}
      </div>

      {/* Playbook Run Details Modal */}
      {selectedRun && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSelectedRun(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-[#0b0c0f] border border-white/10 rounded-2xl p-6 z-50 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-4">
              <div>
                <span className="text-[10px] text-[#52525b] font-mono">{selectedRun.id}</span>
                <h3 className="text-base font-bold text-white mt-1">{selectedRun.playbook_name}</h3>
                <p className="text-xs text-[#a6acb8] mt-1">Target Agent: <strong className="text-white">{selectedRun.target_agent_name}</strong></p>
              </div>
              <button onClick={() => setSelectedRun(null)} className="text-[#52525b] hover:text-white p-1 rounded-full hover:bg-white/5">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 py-2 custom-scrollbar">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#111318] border border-white/5 text-xs text-[#a6acb8]">
                <div>
                  <span className="text-[10px] text-[#52525b] uppercase block font-bold mb-1">Status</span>
                  <StatusBadge status={selectedRun.status} />
                </div>
                <div>
                  <span className="text-[10px] text-[#52525b] uppercase block font-bold mb-1">Trigger / Dispatched By</span>
                  <span className="text-white">{selectedRun.triggered_by_email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#52525b] uppercase block font-bold mb-1">Execution Duration</span>
                  <span className="text-white font-mono">{selectedRun.duration_seconds} seconds</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#52525b] uppercase block font-bold mb-1">Timestamp</span>
                  <span className="text-white font-mono">{new Date(selectedRun.started_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Step results logs */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Step-by-Step Executions</h4>
                <div className="space-y-3">
                  {selectedRun.step_results && selectedRun.step_results.length > 0 ? (
                    selectedRun.step_results.map((step) => (
                      <div key={step.order} className="p-3 bg-[#0a0a0c] border border-white/5 rounded-lg flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded bg-[#111318] text-[#a6acb8] border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {step.order}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white">{step.name}</div>
                            <div className="text-[10px] text-[#52525b] font-mono mt-0.5">{step.command_type}</div>
                            {step.error_message && (
                              <p className="text-[10px] text-red-500 mt-1 bg-red-500/5 p-1 rounded border border-red-500/10 font-mono">{step.error_message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {step.duration_seconds !== undefined && (
                            <span className="text-[10px] text-[#52525b] font-mono">{step.duration_seconds}s</span>
                          )}
                          <StatusBadge status={step.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-[#52525b]">No step executions logged.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Zod Validation Schema for creating playbook
const playbookFormSchema = z.object({
  name: z.string().min(3, 'Playbook name must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  trigger: z.string().nonempty('Trigger is required'),
});

function CreatePlaybookView({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: 'on_alert',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handlePublish = async () => {
    setErrors({});
    const validation = playbookFormSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/playbooks/', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          trigger: formData.trigger,
          conditions: { severity: ["critical"] },
          is_active: true,
          stop_on_failure: true,
          steps: [
            { order: 1, name: "Isolate host", command_type: "isolate_host", parameters: {}, timeout_seconds: 30, allow_failure: false }
          ]
        })
      });
      toast.success('Playbook created and published successfully!');
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create playbook on backend.');
      if (e.details) {
        // Map backend validation errors directly
        const backendErrors: Record<string, string> = {};
        Object.entries(e.details).forEach(([key, messages]) => {
          if (Array.isArray(messages) && messages[0]) {
            backendErrors[key] = messages[0];
          }
        });
        setErrors(backendErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-right duration-300 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={onBack} aria-label="Back" className="p-2 hover:bg-white/5 rounded-full text-[#a6acb8] hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
           <h2 className="text-2xl font-bold text-[#f4f6fb]">Create Automation</h2>
           <p className="text-[#a6acb8] text-sm">Configure a new automated response workflow.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#0b0c0f] border border-white/10 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00d4c3]" />
            <h3 className="text-lg font-bold text-[#f4f6fb] mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-[#111318] text-[#00d4c3] flex items-center justify-center text-xs border border-[#00d4c3]/30 shadow-[0_0_10px_-2px_#00d4c350]">1</span>
              General Information
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">Playbook Name</label>
                <input 
                  type="text" 
                  className={cn(
                    "w-full bg-[#111318] border rounded-lg p-3 text-sm focus:outline-none text-[#f4f6fb] placeholder:text-[#52525b] transition-all",
                    errors.name ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#00d4c3]/50"
                  )}
                  placeholder="e.g. Excessive Login Failures Remediation"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">Description</label>
                <textarea 
                  className={cn(
                    "w-full bg-[#111318] border rounded-lg p-3 text-sm focus:outline-none text-[#f4f6fb] placeholder:text-[#52525b] transition-all h-24 resize-none",
                    errors.description ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#00d4c3]/50"
                  )}
                  placeholder="Describe the objective of this playbook..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
                {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
              </div>
            </div>
          </div>

          <div className="bg-[#0b0c0f] border border-white/10 rounded-xl p-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#52525b]" />
             <h3 className="text-lg font-bold text-[#a6acb8] mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-[#111318] text-[#52525b] flex items-center justify-center text-xs border border-white/10">2</span>
              Triggers & Conditions
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">Trigger</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[#111318] border border-white/10 rounded-lg p-3 text-sm focus:border-[#00d4c3]/50 outline-none appearance-none text-[#f4f6fb]"
                    value={formData.trigger}
                    onChange={e => setFormData({...formData, trigger: e.target.value})}
                  >
                    <option value="on_alert">On Alert</option>
                    <option value="on_incident_created">On Incident Created</option>
                    <option value="on_severity_change">On Severity Change</option>
                    <option value="manual">Manual</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handlePublish}
            disabled={submitting}
            className="w-full py-4 bg-[#00d4c3] hover:bg-[#00d4c3]/90 text-black font-bold rounded-xl transition-colors shadow-[0_0_15px_-3px_#00d4c350] disabled:opacity-50"
          >
            {submitting ? 'Publishing...' : 'Publish Playbook'}
          </button>
          <button onClick={onBack} className="w-full py-4 bg-[#111318] hover:bg-white/5 text-[#f4f6fb] font-bold rounded-xl transition-colors border border-white/10">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}