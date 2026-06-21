import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/apiClient';
import { useData } from '@/context/DataContext';
import {
  Search,
  Monitor,
  MoreHorizontal,
  Shield,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  CheckSquare,
  Square,
  Activity,
  Globe,
  Clock,
  ShieldCheck,
  Cpu,
  Terminal,
  XCircle,
  Database
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type EndpointStatus = 'online' | 'offline' | 'warning';
export type OS = 'windows' | 'macos' | 'linux';

export interface Endpoint {
  id: string;
  hostname: string;
  ip: string;
  os: OS;
  status: EndpointStatus;
  riskScore: number;
  lastSeen: string;
  agentVersion: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const MOCK_ENDPOINTS: Endpoint[] = Array.from({ length: 100 }).map((_, i) => ({
  id: `EP-${1000 + i}`,
  hostname: `WORKSTATION-${i.toString().padStart(3, '0')}`,
  ip: `192.168.1.${10 + i}`,
  os: ['windows', 'macos', 'linux'][Math.floor(Math.random() * 3)] as OS,
  status: ['online', 'offline', 'warning'][Math.floor(Math.random() * 3)] as EndpointStatus,
  riskScore: Math.floor(Math.random() * 100),
  lastSeen: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
  agentVersion: `v2.4.${Math.floor(Math.random() * 9)}`
}));

const fetchEndpoints = async (
  page: number,
  limit: number,
  search: string,
  status: string,
  os: string,
  sortKey: keyof Endpoint,
  sortDir: 'asc' | 'desc'
): Promise<PaginatedResponse<Endpoint>> => {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);

    const response = await apiRequest(`/agents/?${params.toString()}`);
    
    const mapped: Endpoint[] = (response?.data || []).map((ag: any) => ({
      id: ag.id,
      hostname: ag.hostname || ag.name || 'Unknown',
      ip: ag.ip_address || '0.0.0.0',
      os: ag.os_type?.toLowerCase() || 'windows',
      status: ag.status === 'online' ? 'online' : ag.status === 'offline' ? 'offline' : 'warning',
      riskScore: ag.is_active ? 15 : 85,
      lastSeen: ag.last_seen || new Date().toISOString(),
      agentVersion: ag.os_version || '1.0.0',
    }));

    // Client-side sorting
    mapped.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    if (mapped.length === 0) {
      throw new Error('No agents found from API');
    }

    const start = (page - 1) * limit;

    return {
      data: mapped.slice(start, start + limit),
      total: response?.meta?.count || mapped.length,
      page,
      limit
    };
  } catch (error) {
    console.warn('Agents API failed, using mock agent data:', error);
    let filtered = MOCK_ENDPOINTS.filter(e => {
      const matchesSearch = e.hostname.toLowerCase().includes(search.toLowerCase()) || 
                            e.ip.includes(search);
      const matchesStatus = status === 'all' || e.status === status;
      const matchesOS = os === 'all' || e.os === os;
      return matchesSearch && matchesStatus && matchesOS;
    });

    filtered.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
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

function RiskGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 18; 
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return '#ff3b30';
    if (score >= 50) return '#ff9500'; 
    if (score >= 30) return '#ffcc00'; 
    return '#00d4c3';
  };

  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx="22" cy="22" r="18" fill="none" stroke={getColor()} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

export default function Endpoints() {
  const { user } = useData();
  const [data, setData] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [osFilter, setOsFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Endpoint; dir: 'asc' | 'desc' }>({ key: 'lastSeen', dir: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'console' | 'telemetry'>('details');

  // Console terminal states
  const [selectedCommand, setSelectedCommand] = useState<string>('kill_process');
  const [commandParams, setCommandParams] = useState<Record<string, any>>({});
  const [commandReason, setCommandReason] = useState<string>('Investigating suspicious activity');
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'System shell initiated. Ready for instructions.'
  ]);
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [isCommandLoading, setIsCommandLoading] = useState<boolean>(false);

  // Telemetry states
  const [telemetryType, setTelemetryType] = useState<string>('process_list');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [telemetryStatus, setTelemetryStatus] = useState<string | null>(null);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState<boolean>(false);
  const [telemetryData, setTelemetryData] = useState<any[] | null>(null);
  const [telemetrySearch, setTelemetrySearch] = useState<string>('');
  const [telemetryProgress, setTelemetryProgress] = useState<number>(0);

  // Polling for commands
  useEffect(() => {
    if (!activeCommandId || !selectedEndpoint) return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      try {
        if (activeCommandId.startsWith('CMD-')) {
          pollCount += 1;
          const timestamp = new Date().toLocaleTimeString();
          if (pollCount === 1) {
            setTerminalLines(prev => [
              ...prev,
              `[${timestamp}] [DEMO-MODE] [dispatched] Establishing secure connection to agent daemon...`,
              `[${timestamp}] [DEMO-MODE] [dispatched] Agent acknowledged command execution.`
            ]);
          } else if (pollCount === 2) {
            let outputText = '';
            if (selectedCommand === 'kill_process') outputText = `Executing: taskkill /F /PID ${commandParams.pid || 4772}\n`;
            else if (selectedCommand === 'delete_file') outputText = `Executing: rm -f ${commandParams.path || 'C:\\Users\\Public\\malicious.exe'}\n`;
            else outputText = `Executing: ${selectedCommand} with parameters ${JSON.stringify(commandParams)}\n`;

            setTerminalLines(prev => [
              ...prev,
              `[${timestamp}] [DEMO-MODE] [dispatched] Executing response agent script...`,
              `[${timestamp}] [DEMO-MODE] [dispatched] stdout: ${outputText}`
            ]);
          } else {
            clearInterval(interval);
            let successText = '';
            if (selectedCommand === 'kill_process') successText = `Process ${commandParams.pid || 4772} terminated. Exit code: 0`;
            else if (selectedCommand === 'delete_file') successText = `File at ${commandParams.path || 'C:\\Users\\Public\\malicious.exe'} deleted. Exit code: 0`;
            else if (selectedCommand === 'isolate_host') successText = `Host isolated. Firewall rules modified successfully. Exit code: 0`;
            else successText = `Command ${selectedCommand} completed successfully. Exit code: 0`;

            setTerminalLines(prev => [
              ...prev,
              `[${timestamp}] [DEMO-MODE] [completed] ${successText}`,
              `[${timestamp}] EDR@${selectedEndpoint.hostname}:~$ `
            ]);
            setActiveCommandId(null);
            setCommandStatus('completed');
          }
          return;
        }

        const res = await apiRequest(`/response/commands/${activeCommandId}/`);
        const cmdData = res?.data;
        if (cmdData) {
          const timestamp = new Date().toLocaleTimeString();
          setCommandStatus(cmdData.status);
          if (cmdData.output) {
            setTerminalLines(prev => [
              ...prev,
              `[${timestamp}] [${cmdData.status}] Output: ${cmdData.output}`
            ]);
          }
          if (cmdData.error_message) {
            setTerminalLines(prev => [
              ...prev,
              `[${timestamp}] [${cmdData.status}] Error: ${cmdData.error_message}`
            ]);
          }
          if (cmdData.status === 'completed' || cmdData.status === 'failed' || cmdData.status === 'cancelled') {
            clearInterval(interval);
            setTerminalLines(prev => [
              ...prev,
              `[${timestamp}] Command status: ${cmdData.status}. Exit code: ${cmdData.exit_code ?? 'N/A'}`,
              `[${timestamp}] EDR@${selectedEndpoint.hostname}:~$ `
            ]);
            setActiveCommandId(null);
          }
        }
      } catch (error) {
        console.error("Error polling command output:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeCommandId, selectedCommand, commandParams, selectedEndpoint]);

  // Polling for telemetry
  useEffect(() => {
    if (!activeRequestId || !selectedEndpoint) return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount += 1;
      setTelemetryProgress(prev => Math.min(prev + 25, 95));

      try {
        if (activeRequestId.startsWith('TEL-')) {
          if (pollCount >= 3) {
            clearInterval(interval);
            setTelemetryProgress(100);
            setTelemetryStatus('fulfilled');

            let mockData: any[] = [];
            if (telemetryType === 'process_list') {
              mockData = [
                { pid: 4, name: "System", path: "kernel", cpu_usage: "0.1%", memory_usage: "16 KB", user: "SYSTEM" },
                { pid: 4772, name: "malicious_script.exe", path: "C:\\Users\\Public\\malicious_script.exe", cpu_usage: "14.2%", memory_usage: "45 MB", user: "Sayed Herzallah" },
                { pid: 104, name: "explorer.exe", path: "C:\\Windows\\explorer.exe", cpu_usage: "1.2%", memory_usage: "128 MB", user: "Sayed Herzallah" },
                { pid: 820, name: "chrome.exe", path: "C:\\Program Files\\Google\\Chrome\\chrome.exe", cpu_usage: "3.5%", memory_usage: "412 MB", user: "Sayed Herzallah" },
                { pid: 2190, name: "powershell.exe", path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", cpu_usage: "0.0%", memory_usage: "38 MB", user: "Sayed Herzallah" }
              ];
            } else if (telemetryType === 'network_connections') {
              mockData = [
                { local_ip: "192.168.1.15", local_port: 49283, remote_ip: "185.220.101.4", remote_port: 443, state: "ESTABLISHED", pid: 4772, process: "malicious_script.exe" },
                { local_ip: "192.168.1.15", local_port: 8080, remote_ip: "0.0.0.0", remote_port: 0, state: "LISTENING", pid: 1202, process: "node.exe" },
                { local_ip: "192.168.1.15", local_port: 53210, remote_ip: "8.8.8.8", remote_port: 53, state: "ESTABLISHED", pid: 820, process: "chrome.exe" }
              ];
            } else if (telemetryType === 'open_files') {
              mockData = [
                { pid: 4772, process: "malicious_script.exe", file: "C:\\Windows\\System32\\drivers\\etc\\hosts", mode: "R/W" },
                { pid: 104, process: "explorer.exe", file: "C:\\Users\\Sayed Herzallah\\Desktop", mode: "R" },
                { pid: 2190, process: "powershell.exe", file: "C:\\Users\\Public\\script.ps1", mode: "R" }
              ];
            } else if (telemetryType === 'logged_in_users') {
              mockData = [
                { username: "Sayed Herzallah", session_type: "Console", logon_time: "2026-06-20T00:10:00Z" },
                { username: "SYSTEM", session_type: "Service", logon_time: "2026-06-19T10:00:00Z" }
              ];
            } else if (telemetryType === 'system_info') {
              mockData = [
                { metric: "Hostname", value: selectedEndpoint.hostname },
                { metric: "OS Platform", value: selectedEndpoint.os },
                { metric: "OS Version", value: selectedEndpoint.agentVersion },
                { metric: "Uptime", value: "14d 2h 12m" },
                { metric: "Physical Memory", value: "32 GB DDR4" },
                { metric: "CPU Architecture", value: "x64" }
              ];
            } else if (telemetryType === 'running_services') {
              mockData = [
                { service: "InsiderGuardianAgent", status: "Running", start_type: "Automatic" },
                { service: "WinDefend", status: "Running", start_type: "Automatic" },
                { service: "Spooler", status: "Stopped", start_type: "Manual" },
                { service: "EventLog", status: "Running", start_type: "Automatic" }
              ];
            }

            setTelemetryData(mockData);
            setActiveRequestId(null);
          }
          return;
        }

        const res = await apiRequest(`/telemetry/requests/${activeRequestId}/`);
        const reqData = res?.data;
        if (reqData) {
          setTelemetryStatus(reqData.status);
          if (reqData.status === 'fulfilled') {
            clearInterval(interval);
            setTelemetryProgress(100);
            const snapshot = reqData.snapshot;
            if (snapshot) {
              if (snapshot.data) {
                setTelemetryData(snapshot.data);
              } else if (snapshot.id) {
                const snapRes = await apiRequest(`/telemetry/snapshots/${snapshot.id}/`);
                setTelemetryData(snapRes?.data?.data || []);
              } else {
                setTelemetryData([]);
              }
            } else {
              setTelemetryData([]);
            }
            setActiveRequestId(null);
          } else if (reqData.status === 'failed' || reqData.status === 'timed_out') {
            clearInterval(interval);
            setTelemetryProgress(100);
            setActiveRequestId(null);
          }
        }
      } catch (error) {
        console.error("Error polling telemetry request:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRequestId, telemetryType, selectedEndpoint]);

  const handleDispatchCommand = async () => {
    if (!selectedCommand || !selectedEndpoint) return;
    setIsCommandLoading(true);

    const formattedParams: Record<string, any> = {};
    if (selectedCommand === 'kill_process') formattedParams.pid = Number(commandParams.pid || 0);
    else if (selectedCommand === 'delete_file' || selectedCommand === 'quarantine_file') formattedParams.path = commandParams.path || '';
    else if (selectedCommand === 'block_ip' || selectedCommand === 'unblock_ip' || selectedCommand === 'kill_connections_by_ip') formattedParams.ip = commandParams.ip || '';
    else if (selectedCommand === 'block_domain') formattedParams.domain = commandParams.domain || '';
    else if (selectedCommand === 'reboot_machine') formattedParams.delay_seconds = Number(commandParams.delay_seconds || 0);
    else if (selectedCommand === 'logoff_user') formattedParams.session_id = Number(commandParams.session_id || 0);

    const timestamp = new Date().toLocaleTimeString();
    const cmdStr = `dispatch --type=${selectedCommand} --params=${JSON.stringify(formattedParams)} --reason="${commandReason}"`;
    
    setTerminalLines(prev => [
      ...prev,
      `[${timestamp}] EDR@${selectedEndpoint.hostname}:~$ ${cmdStr}`,
      `[${timestamp}] Sending dispatch request to server...`
    ]);

    try {
      const res = await apiRequest('/response/commands/', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: selectedEndpoint.id,
          command_type: selectedCommand,
          parameters: formattedParams,
          reason: commandReason
        })
      });

      const cmdData = res?.data;
      if (cmdData?.id) {
        setActiveCommandId(cmdData.id);
        setCommandStatus(cmdData.status);
        setTerminalLines(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Command registered with ID: ${cmdData.id}. Status: ${cmdData.status}`
        ]);
      } else {
        throw new Error("No command ID returned");
      }
    } catch (error) {
      console.warn("Failed to dispatch command on backend, falling back to mock:", error);
      const mockId = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
      setActiveCommandId(mockId);
      setCommandStatus('dispatched');
      setTerminalLines(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [DEMO-MODE] Command registered with mock ID: ${mockId}. Status: dispatched`
      ]);
    } finally {
      setIsCommandLoading(false);
    }
  };

  const handleCancelCommand = async () => {
    if (!activeCommandId || !selectedEndpoint) return;
    
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLines(prev => [
      ...prev,
      `[${timestamp}] Sending cancellation request for command ${activeCommandId}...`
    ]);

    try {
      if (activeCommandId.startsWith('CMD-')) {
        setTerminalLines(prev => [
          ...prev,
          `[${timestamp}] [DEMO-MODE] [cancelled] Command cancelled by analyst.`,
          `[${timestamp}] EDR@${selectedEndpoint.hostname}:~$ `
        ]);
        setActiveCommandId(null);
        setCommandStatus('cancelled');
        return;
      }

      const res = await apiRequest(`/response/commands/${activeCommandId}/cancel/`, {
        method: 'POST'
      });
      
      if (res?.success) {
        setTerminalLines(prev => [
          ...prev,
          `[${timestamp}] Cancellation request approved. Status: cancelled`
        ]);
      }
    } catch (error) {
      console.error("Failed to cancel command:", error);
      setTerminalLines(prev => [
        ...prev,
        `[${timestamp}] Error cancelling command: ${error instanceof Error ? error.message : 'Unknown error'}`
      ]);
    }
  };

  const handleRequestTelemetry = async () => {
    if (!selectedEndpoint) return;
    setIsTelemetryLoading(true);
    setTelemetryData(null);
    setTelemetryProgress(10);
    setTelemetryStatus('pending');

    try {
      const res = await apiRequest('/telemetry/requests/', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: selectedEndpoint.id,
          telemetry_type: telemetryType
        })
      });

      const reqData = res?.data;
      if (reqData?.id) {
        setActiveRequestId(reqData.id);
        setTelemetryStatus(reqData.status);
      } else {
        throw new Error("No telemetry request ID returned");
      }
    } catch (error) {
      console.warn("Failed to request telemetry, falling back to mock:", error);
      const mockReqId = `TEL-${Math.floor(1000 + Math.random() * 9000)}`;
      setActiveRequestId(mockReqId);
      setTelemetryStatus('pending');
    } finally {
      setIsTelemetryLoading(false);
    }
  };

  const renderTelemetryTable = () => {
    if (!telemetryData || telemetryData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 border border-white/5 bg-white/[0.01] rounded-xl text-center">
          <p className="text-sm text-[#a6acb8]">No telemetry data returned for this query.</p>
        </div>
      );
    }

    const firstItem = telemetryData[0];
    const keys = Object.keys(firstItem);

    const filteredData = telemetryData.filter(item => {
      return keys.some(key => {
        const val = item[key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(telemetrySearch.toLowerCase());
      });
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
            <input
              type="text"
              placeholder="Search telemetry logs..."
              value={telemetrySearch}
              onChange={(e) => setTelemetrySearch(e.target.value)}
              className="w-full bg-[#111318] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
            />
          </div>
          <div className="text-xs text-[#a6acb8] font-mono">
            Showing {filteredData.length} of {telemetryData.length} records
          </div>
        </div>

        <div className="border border-white/5 bg-[#0b0c0f] rounded-xl overflow-hidden shadow-inner max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-[#a6acb8] text-xs uppercase tracking-wider border-b border-white/5 sticky top-0 backdrop-blur-md">
                {keys.map((key) => (
                  <th key={key} className="px-4 py-3 font-medium capitalize">
                    {key.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                  {keys.map((key) => {
                    const val = row[key];
                    return (
                      <td key={key} className="px-4 py-3 text-[#f4f6fb]">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 150);
    return () => clearTimeout(timer);
  }, [page, search, statusFilter, osFilter, sortConfig]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchEndpoints(page, limit, search, statusFilter, osFilter, sortConfig.key, sortConfig.dir);
      setData(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof Endpoint) => {
    setSortConfig(current => ({
      key,
      dir: current.key === key && current.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length && data.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      online: { bg: 'bg-[#00d4c3]/10', text: 'text-[#00d4c3]', dot: 'bg-[#00d4c3]' },
      offline: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', dot: 'bg-[#ff3b30]' },
      warning: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]', dot: 'bg-[#ff9500]' },
    };
    const s = styles[status as EndpointStatus];
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border border-transparent", s.bg, s.text)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", s.dot, status !== 'offline' && "animate-pulse")} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (selectedEndpoint) {
    return (
      <div className="h-full flex flex-col space-y-6 font-sans text-[#f4f6fb] animate-in slide-in-from-right-4 fade-in duration-300">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => {
              setSelectedEndpoint(null);
              setActiveTab('details');
              setTerminalLines(['System shell initiated. Ready for instructions.']);
              setTelemetryData(null);
            }}
            className="flex items-center gap-2 text-sm text-[#a6acb8] hover:text-white transition-colors group"
          >
            <div className="p-1 rounded bg-white/5 group-hover:bg-white/10 transition-colors">
              <ChevronLeft size={16} />
            </div>
            Back to Endpoints
          </button>
          <div className="flex gap-2">
            {user?.role !== 'user' && (
              <>
                <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors">
                  Isolate Device
                </button>
                <button className="px-3 py-1.5 bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] rounded-lg text-xs font-medium hover:bg-[#ff3b30]/20 transition-colors">
                  Terminate Process
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-white/5 gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              "pb-4 text-sm font-semibold border-b-2 transition-all",
              activeTab === 'details'
                ? "border-[#00d4c3] text-[#00d4c3]"
                : "border-transparent text-[#a6acb8] hover:text-white"
            )}
          >
            Overview & Details
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={cn(
              "pb-4 text-sm font-semibold border-b-2 transition-all",
              activeTab === 'console'
                ? "border-[#00d4c3] text-[#00d4c3]"
                : "border-transparent text-[#a6acb8] hover:text-white"
            )}
          >
            Live Console
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={cn(
              "pb-4 text-sm font-semibold border-b-2 transition-all",
              activeTab === 'telemetry'
                ? "border-[#00d4c3] text-[#00d4c3]"
                : "border-transparent text-[#a6acb8] hover:text-white"
            )}
          >
            Live Telemetry
          </button>
        </div>

        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#0b0c0f] border border-white/5 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Monitor size={120} />
              </div>
              <div className="flex items-start gap-6 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#00d4c3]/10 flex items-center justify-center text-[#00d4c3] flex-shrink-0">
                  <Monitor size={32} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{selectedEndpoint.hostname}</h1>
                    {getStatusBadge(selectedEndpoint.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#a6acb8]">
                    <span className="font-mono">{selectedEndpoint.ip}</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="font-mono">{selectedEndpoint.id}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className="text-right">
                      <div className="text-sm text-[#a6acb8]">Risk Score</div>
                      <div className={cn("text-2xl font-bold", selectedEndpoint.riskScore > 80 ? "text-[#ff3b30]" : selectedEndpoint.riskScore > 50 ? "text-[#ff9500]" : "text-[#00d4c3]")}>
                        {selectedEndpoint.riskScore}/100
                      </div>
                   </div>
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/5">
                <div>
                  <div className="flex items-center gap-2 text-[#52525b] mb-1">
                    <Globe size={14} />
                    <span className="text-[10px] uppercase tracking-wider font-bold">OS Platform</span>
                  </div>
                  <div className="capitalize">{selectedEndpoint.os}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[#52525b] mb-1">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] uppercase tracking-wider font-bold">Agent Version</span>
                  </div>
                  <div>{selectedEndpoint.agentVersion}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[#52525b] mb-1">
                    <Clock size={14} />
                    <span className="text-[10px] uppercase tracking-wider font-bold">Last Seen</span>
                  </div>
                  <div className="text-sm">{new Date(selectedEndpoint.lastSeen).toLocaleTimeString()}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[#52525b] mb-1">
                    <Activity size={14} />
                    <span className="text-[10px] uppercase tracking-wider font-bold">Uptime</span>
                  </div>
                  <div>14d 2h 12m</div>
                </div>
              </div>
            </div>

            <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-6">
              <h3 className="text-sm font-medium text-[#a6acb8] mb-4">System Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5"><Cpu size={12} /> CPU Usage</span>
                    <span className="text-[#00d4c3]">24%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00d4c3] w-[24%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5"><Activity size={12} /> Memory</span>
                    <span className="text-[#ffcc00]">62%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ffcc00] w-[62%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5"><Shield size={12} /> Disk Encrypted</span>
                    <span className="text-[#00d4c3]">Yes</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00d4c3] w-full" />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-sm font-medium text-[#a6acb8] mb-3">Recent Events</h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#52525b] mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="text-[#f4f6fb]">Policy update applied successfully</div>
                        <div className="text-xs text-[#52525b]">Today, {10 + i}:00 AM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'console' && (
          user?.role === 'user' ? (
            <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-10 flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 rounded-full bg-[#ff3b30]/10 border border-[#ff3b30]/20 flex items-center justify-center text-[#ff3b30] mb-4 animate-pulse">
                <Terminal size={28} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Live Console Restricted</h3>
              <p className="text-xs text-[#a6acb8] max-w-sm leading-relaxed">
                Running remote terminal commands and response actions is restricted to SOC Analysts and Administrators.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Command control panel */}
              <div className="lg:col-span-1 bg-[#0b0c0f] border border-white/5 rounded-xl p-6 flex flex-col space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Response Action</h3>
                  <p className="text-xs text-[#a6acb8]">Select a command template to execute on the endpoint agent.</p>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-1">
                  <div>
                    <label className="text-xs text-[#a6acb8] font-medium block mb-2">Command Type</label>
                    <select
                      value={selectedCommand}
                      onChange={(e) => {
                        setSelectedCommand(e.target.value);
                        setCommandParams({});
                      }}
                      className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00d4c3]/50 outline-none font-sans"
                    >
                      <option value="kill_process">Kill Process</option>
                      <option value="delete_file">Delete File</option>
                      <option value="quarantine_file">Quarantine File</option>
                      <option value="block_ip">Block IP Address</option>
                      <option value="unblock_ip">Unblock IP Address</option>
                      <option value="block_domain">Block Domain</option>
                      <option value="kill_connections_by_ip">Kill Connections by IP</option>
                      <option value="isolate_host">Isolate Host</option>
                      <option value="unisolate_host">Unisolate Host</option>
                      <option value="reboot_machine">Reboot Machine</option>
                      <option value="logoff_user">Logoff User</option>
                    </select>
                  </div>

                  {selectedCommand === 'kill_process' && (
                    <div>
                      <label className="text-xs text-[#a6acb8] font-medium block mb-1">Process PID</label>
                      <input
                        type="number"
                        placeholder="e.g. 4772"
                        value={commandParams.pid || ''}
                        onChange={(e) => setCommandParams({ ...commandParams, pid: e.target.value })}
                        className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
                        required
                      />
                    </div>
                  )}

                  {(selectedCommand === 'delete_file' || selectedCommand === 'quarantine_file') && (
                    <div>
                      <label className="text-xs text-[#a6acb8] font-medium block mb-1">File Absolute Path</label>
                      <input
                        type="text"
                        placeholder="e.g. C:\Users\Public\malicious.exe"
                        value={commandParams.path || ''}
                        onChange={(e) => setCommandParams({ ...commandParams, path: e.target.value })}
                        className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
                        required
                      />
                    </div>
                  )}

                  {(selectedCommand === 'block_ip' || selectedCommand === 'unblock_ip' || selectedCommand === 'kill_connections_by_ip') && (
                    <div>
                      <label className="text-xs text-[#a6acb8] font-medium block mb-1">IP Address</label>
                      <input
                        type="text"
                        placeholder="e.g. 185.220.101.4"
                        value={commandParams.ip || ''}
                        onChange={(e) => setCommandParams({ ...commandParams, ip: e.target.value })}
                        className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
                        required
                      />
                    </div>
                  )}

                  {selectedCommand === 'block_domain' && (
                    <div>
                      <label className="text-xs text-[#a6acb8] font-medium block mb-1">Domain Name</label>
                      <input
                        type="text"
                        placeholder="e.g. malicious-c2.com"
                        value={commandParams.domain || ''}
                        onChange={(e) => setCommandParams({ ...commandParams, domain: e.target.value })}
                        className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
                        required
                      />
                    </div>
                  )}

                  {selectedCommand === 'reboot_machine' && (
                    <div>
                      <label className="text-xs text-[#a6acb8] font-medium block mb-1">Delay (Seconds)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10 (optional)"
                        value={commandParams.delay_seconds || ''}
                        onChange={(e) => setCommandParams({ ...commandParams, delay_seconds: e.target.value })}
                        className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
                      />
                    </div>
                  )}

                  {selectedCommand === 'logoff_user' && (
                    <div>
                      <label className="text-xs text-[#a6acb8] font-medium block mb-1">Session ID</label>
                      <input
                        type="number"
                        placeholder="e.g. 1 (optional)"
                        value={commandParams.session_id || ''}
                        onChange={(e) => setCommandParams({ ...commandParams, session_id: e.target.value })}
                        className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-[#a6acb8] font-medium block mb-1">Reason for Dispatch</label>
                    <textarea
                      rows={2}
                      placeholder="Provide incident/alert context..."
                      value={commandReason}
                      onChange={(e) => setCommandReason(e.target.value)}
                      className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors resize-none font-sans"
                      required
                    />
                  </div>
                </div>

                <button
                  onClick={handleDispatchCommand}
                  disabled={isCommandLoading || !!activeCommandId}
                  className="w-full py-2 bg-[#ff3b30] hover:bg-[#ff3b30]/90 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_-3px_#ff3b3050] font-sans mt-auto"
                >
                  <Terminal size={16} />
                  {isCommandLoading ? 'Registering...' : 'Dispatch EDR Command'}
                </button>
              </div>

              {/* Terminal display panel */}
              <div className="lg:col-span-2 bg-[#040507] border border-white/10 rounded-xl p-4 flex flex-col h-[480px] font-mono shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                      <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                      <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    </div>
                    <span className="text-xs text-[#a6acb8] ml-2">EDR Terminal - {selectedEndpoint.hostname}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeCommandId && (
                      <button
                        onClick={handleCancelCommand}
                        className="px-2 py-1 bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/20 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors font-sans"
                      >
                        <XCircle size={10} />
                        Cancel Execution
                      </button>
                    )}
                    <button
                      onClick={() => setTerminalLines(['System shell initiated. Ready for instructions.'])}
                      className="px-2 py-1 hover:bg-white/5 text-[#a6acb8] hover:text-white rounded text-[10px] transition-colors font-sans"
                    >
                      Clear Terminal
                    </button>
                  </div>
                </div>

                {/* Terminal Logs */}
                <div className="flex-1 overflow-y-auto space-y-1.5 p-2 select-text text-[11px] text-green-400">
                  {terminalLines.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                      {line}
                    </div>
                  ))}
                  
                  {/* Active Polling Status */}
                  {activeCommandId && (
                    <div className="flex items-center gap-2 text-yellow-400 mt-2 animate-pulse font-sans">
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Command execution pending (status: {commandStatus || 'dispatched'}). Polling output...</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-2 flex items-center text-[11px] text-[#52525b]">
                  <span>EDR Controller v2.4.0</span>
                  <span className="mx-2">•</span>
                  <span>Agent Status: Online</span>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Live Agent Telemetry</h3>
                <p className="text-xs text-[#a6acb8]">Request dynamic, real-time telemetry snapshots directly from the client EDR agent daemon.</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={telemetryType}
                  onChange={(e) => setTelemetryType(e.target.value)}
                  className="bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00d4c3]/50 outline-none"
                  disabled={!!activeRequestId}
                >
                  <option value="process_list">Process List</option>
                  <option value="network_connections">Network Connections</option>
                  <option value="open_files">Open Files</option>
                  <option value="logged_in_users">Logged-In Users</option>
                  <option value="system_info">System Information</option>
                  <option value="running_services">Running Services</option>
                </select>

                {user?.role === 'user' ? (
                  <div className="text-xs text-[#ff3b30] font-medium bg-[#ff3b30]/10 border border-[#ff3b30]/20 py-2 px-3 rounded-lg">
                    Requesting telemetry is restricted.
                  </div>
                ) : (
                  <button
                    onClick={handleRequestTelemetry}
                    disabled={isTelemetryLoading || !!activeRequestId}
                    className="px-4 py-2 bg-[#00d4c3] text-black font-semibold rounded-lg text-sm hover:bg-[#00d4c3]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_-3px_#00d4c350]"
                  >
                    <Activity size={16} />
                    {isTelemetryLoading ? 'Requesting...' : 'Request Telemetry'}
                  </button>
                )}
              </div>
            </div>

            {/* Polling / Loading Progress bar */}
            {activeRequestId && (
              <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                <div className="flex items-center gap-3 text-sm text-[#00d4c3] font-semibold">
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Polling agent snapshot... Status: {telemetryStatus}</span>
                </div>
                <div className="w-full max-w-md h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#00d4c3] transition-all duration-500 ease-out" 
                    style={{ width: `${telemetryProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[#a6acb8]">This request is dispatched to the host. Standard execution time is 2-6 seconds.</p>
              </div>
            )}

            {/* Snapshot Display Table */}
            {telemetryData && renderTelemetryTable()}

            {/* If no data has been requested yet */}
            {!activeRequestId && !telemetryData && (
              <div className="flex flex-col items-center justify-center p-20 border border-white/5 bg-white/[0.01] rounded-xl text-center space-y-3">
                <div className="p-4 rounded-full bg-[#00d4c3]/5 text-[#00d4c3]">
                  <Database size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-white text-sm">No Telemetry Snapshot Loaded</h4>
                  <p className="text-xs text-[#a6acb8] max-w-md mx-auto">
                    Select a telemetry source from the dropdown and request a fresh snapshot. Telemetries are live, and expire after 1 hour.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 font-sans text-[#f4f6fb]">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Endpoints</h1>
          <p className="text-sm text-[#a6acb8]">
            Managing {total} devices across your network
          </p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => loadData()} className="p-2 text-[#a6acb8] hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
           </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#111318] border border-white/10 rounded-lg text-sm text-[#a6acb8] hover:text-white hover:bg-white/5 transition-colors">
            <Download size={16} />
            Export
          </button>
          <button className="px-4 py-2 bg-[#00d4c3] text-black font-semibold rounded-lg text-sm hover:bg-[#00d4c3]/90 transition-colors shadow-[0_0_15px_-3px_#00d4c350]">
            Deploy Agent
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-[#0b0c0f] border border-white/5 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
          <input
            type="text"
            placeholder="Search hostname, IP, or agent version..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-[#111318] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 transition-colors"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#a6acb8] focus:border-[#00d4c3]/50 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="online">Online</option>
          <option value="warning">Warning</option>
          <option value="offline">Offline</option>
        </select>
        <select 
          value={osFilter}
          onChange={(e) => { setOsFilter(e.target.value); setPage(1); }}
          className="bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#a6acb8] focus:border-[#00d4c3]/50 outline-none"
        >
          <option value="all">All OS</option>
          <option value="windows">Windows</option>
          <option value="macos">macOS</option>
          <option value="linux">Linux</option>
        </select>
      </div>

      <div className="flex-1 bg-[#0b0c0f] border border-white/5 rounded-xl flex flex-col overflow-hidden relative shadow-inner">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-white/[0.02] text-[#a6acb8] text-xs uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-3 w-10">
                  <button onClick={toggleSelectAll} className="flex items-center text-[#a6acb8] hover:text-white">
                    {selectedIds.size === data.length && data.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 font-medium cursor-pointer hover:text-white group" onClick={() => handleSort('hostname')}>
                  <div className="flex items-center gap-1">Hostname <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                </th>
                <th className="px-6 py-3 font-medium">IP Address</th>
                <th className="px-6 py-3 font-medium cursor-pointer hover:text-white group" onClick={() => handleSort('os')}>
                  <div className="flex items-center gap-1">OS <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                </th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium cursor-pointer hover:text-white group" onClick={() => handleSort('riskScore')}>
                   <div className="flex items-center gap-1">Risk <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                </th>
                <th className="px-6 py-3 font-medium cursor-pointer hover:text-white group" onClick={() => handleSort('lastSeen')}>
                   <div className="flex items-center gap-1">Last Seen <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div>
                </th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-4 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-32 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-5 bg-white/5 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="w-10 h-10 bg-white/5 rounded-full" /></td>
                    <td className="px-6 py-4"><div className="w-32 h-4 bg-white/5 rounded" /></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : (
                data.map((ep) => (
                  <tr 
                    key={ep.id} 
                    onClick={() => setSelectedEndpoint(ep)}
                    className={cn(
                      "group hover:bg-white/[0.02] transition-colors cursor-pointer active:bg-white/[0.04]", 
                      selectedIds.has(ep.id) && "bg-white/[0.04]"
                    )}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(ep.id)} className={cn("flex items-center", selectedIds.has(ep.id) ? "text-[#00d4c3]" : "text-[#52525b] hover:text-white")}>
                        {selectedIds.has(ep.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00d4c3]/10 flex items-center justify-center text-[#00d4c3]">
                          <Monitor size={16} />
                        </div>
                        <div>
                          <div className="font-medium text-[#f4f6fb]">{ep.hostname}</div>
                          <div className="text-[10px] text-[#52525b]">{ep.agentVersion}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#a6acb8]">{ep.ip}</td>
                    <td className="px-6 py-4 capitalize text-[#f4f6fb]">{ep.os}</td>
                    <td className="px-6 py-4">{getStatusBadge(ep.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <RiskGauge score={ep.riskScore} />
                        <div>
                           <div className={cn("text-xs font-bold", ep.riskScore > 80 ? "text-[#ff3b30]" : ep.riskScore > 50 ? "text-[#ff9500]" : "text-[#00d4c3]")}>
                             {ep.riskScore > 80 ? 'CRITICAL' : ep.riskScore > 50 ? 'HIGH' : 'LOW'}
                           </div>
                           <div className="text-[10px] text-[#52525b]">Risk Score</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#a6acb8] text-xs">
                       {new Date(ep.lastSeen).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                       <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-white/10 rounded-lg text-[#a6acb8] hover:text-white" title="Security Scan">
                             <Shield size={16} />
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg text-[#a6acb8] hover:text-white">
                             <MoreHorizontal size={16} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-white/5 p-4 flex items-center justify-between text-xs text-[#a6acb8]">
           <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
              {selectedIds.size > 0 && <span className="ml-2 text-[#00d4c3] font-medium">({selectedIds.size} selected)</span>}
           </span>
           <div className="flex items-center gap-2">
             <button 
               disabled={page === 1} 
               onClick={() => setPage(p => p - 1)}
               className="p-1.5 rounded hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-white"
             >
               <ChevronLeft size={16} />
             </button>
             <span className="text-white font-mono">Page {page}</span>
             <button 
               disabled={page * limit >= total} 
               onClick={() => setPage(p => p + 1)}
               className="p-1.5 rounded hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-white"
             >
               <ChevronRight size={16} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}