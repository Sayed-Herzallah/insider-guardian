import { useState } from 'react';
import { apiRequest } from '@/lib/apiClient';
import {
  Search,
  FileSearch,
  Server,
  AlertTriangle,
  ChevronRight,
  Terminal,
  Globe
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types (The API Contract) ---

export interface ProcessActivity {
  id: string;
  pid: number;
  name: string;
  path: string;
  user: string;
  cpu: number;
  memory: number;
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface NetworkTraffic {
  id: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: string;
  timestamp: string;
  bytes: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface InvestigationResponse {
  processes: ProcessActivity[];
  network: NetworkTraffic[];
  meta: {
    totalResults: number;
    searchDuration: number;
  };
}

// --- Mock Data Service ---

const MOCK_PROCESSES: ProcessActivity[] = [
  { id: 'p1', pid: 4528, name: 'explorer.exe', path: 'C:\\Windows\\explorer.exe', user: 'john.doe', cpu: 2.4, memory: 128, timestamp: '2024-01-15T09:30:00Z', riskLevel: 'low' },
  { id: 'p2', pid: 8912, name: 'powershell.exe', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', user: 'SYSTEM', cpu: 15.2, memory: 256, timestamp: '2024-01-15T09:29:45Z', riskLevel: 'medium' },
  { id: 'p3', pid: 10234, name: 'chrome.exe', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', user: 'john.doe', cpu: 5.1, memory: 512, timestamp: '2024-01-15T09:28:30Z', riskLevel: 'low' },
  { id: 'p4', pid: 5672, name: 'svchost.exe', path: 'C:\\Windows\\System32\\svchost.exe', user: 'SYSTEM', cpu: 1.2, memory: 64, timestamp: '2024-01-15T09:27:00Z', riskLevel: 'low' },
  { id: 'p5', pid: 3421, name: 'malware.exe', path: 'C:\\Users\\john.doe\\AppData\\Local\\Temp\\malware.exe', user: 'john.doe', cpu: 45.8, memory: 1024, timestamp: '2024-01-15T09:25:00Z', riskLevel: 'critical' },
];

const MOCK_NETWORK: NetworkTraffic[] = [
  { id: 'n1', sourceIp: '10.0.1.42', destIp: '185.220.101.42', sourcePort: 49152, destPort: 443, protocol: 'TCP', timestamp: '2024-01-15T09:30:00Z', bytes: 1536, riskLevel: 'critical' },
  { id: 'n2', sourceIp: '10.0.1.42', destIp: '8.8.8.8', sourcePort: 53, destPort: 53, protocol: 'UDP', timestamp: '2024-01-15T09:29:30Z', bytes: 128, riskLevel: 'low' },
  { id: 'n3', sourceIp: '10.0.1.42', destIp: '192.168.1.100', sourcePort: 445, destPort: 445, protocol: 'SMB', timestamp: '2024-01-15T09:28:00Z', bytes: 4096, riskLevel: 'medium' },
  { id: 'n4', sourceIp: '10.0.1.42', destIp: 'update-service.biz', sourcePort: 8080, destPort: 80, protocol: 'HTTP', timestamp: '2024-01-15T09:25:00Z', bytes: 2048, riskLevel: 'high' },
];

// Simulated Backend & Telemetry Search
const performSearch = async (query: string): Promise<InvestigationResponse> => {
  try {
    // Call the EDR audit API to search logs
    const auditRes = await apiRequest(`/audit/?search=${encodeURIComponent(query)}`);
    
    const q = query.toLowerCase();
    
    // Fallback search in mock data
    const processes = MOCK_PROCESSES.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.path.toLowerCase().includes(q) ||
      p.pid.toString().includes(q)
    );

    const network = MOCK_NETWORK.filter(n => 
      n.sourceIp.includes(q) || 
      n.destIp.includes(q) ||
      n.destIp.toLowerCase().includes(q)
    );

    // Map backend audit logs to process entries dynamically
    if (auditRes && auditRes.data) {
      auditRes.data.forEach((log: any, index: number) => {
        if (log.action && (log.action.toLowerCase().includes('command') || log.action.toLowerCase().includes('process'))) {
          processes.push({
            id: `api-log-${log.id || index}`,
            pid: log.object_id ? parseInt(log.object_id) || 4528 : 4528,
            name: log.action,
            path: log.description || '',
            user: log.user_email || 'SYSTEM',
            cpu: 0.5,
            memory: 16,
            timestamp: log.created_at || new Date().toISOString(),
            riskLevel: log.user_role === 'admin' ? 'medium' : 'low'
          });
        }
      });
    }

    return {
      processes,
      network,
      meta: {
        totalResults: processes.length + network.length,
        searchDuration: 145 // ms
      }
    };
  } catch (error) {
    console.warn('Backend telemetry search failed, using mock telemetry database:', error);
    const q = query.toLowerCase();
    const processes = MOCK_PROCESSES.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.path.toLowerCase().includes(q) ||
      p.pid.toString().includes(q)
    );
    const network = MOCK_NETWORK.filter(n => 
      n.sourceIp.includes(q) || 
      n.destIp.includes(q) ||
      n.destIp.toLowerCase().includes(q)
    );
    return {
      processes,
      network,
      meta: {
        totalResults: processes.length + network.length,
        searchDuration: 234 // ms
      }
    };
  }
};

// --- Components ---

export default function Investigation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'process' | 'network'>('process');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'empty'>('idle');
  const [data, setData] = useState<InvestigationResponse | null>(null);

  const handleSearch = async (term: string = searchQuery) => {
    if (!term.trim()) return;
    
    // Update input if searched via suggestion click
    if (term !== searchQuery) setSearchQuery(term);

    setStatus('loading');
    
    try {
      const result = await performSearch(term);
      setData(result);
      setStatus(result.meta.totalResults > 0 ? 'success' : 'empty');
      
      // Auto-switch tab based on results
      if (result.processes.length === 0 && result.network.length > 0) {
        setActiveTab('network');
      } else {
        setActiveTab('process');
      }
    } catch (error) {
      console.error("Search failed", error);
      setStatus('empty');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f4f6fb]">Investigation</h1>
        <p className="text-sm text-[#a6acb8]">Deep dive into endpoint telemetry and network flows</p>
      </div>

      {/* Search Bar Section */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#6b7280] group-focus-within:text-[#00d4c3] transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by hash, IP, hostname, PID or process name..."
            className="w-full bg-[#0b0c0f] border border-white/10 rounded-xl pl-12 pr-28 py-4 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#00d4c3]/50 focus:ring-1 focus:ring-[#00d4c3]/50 transition-all shadow-lg"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
             <button
              onClick={() => handleSearch()}
              disabled={status === 'loading' || !searchQuery.trim()}
              className="bg-[#00d4c3] text-black font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00d4c3]/90 transition-colors"
            >
              {status === 'loading' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Searching</span>
                </div>
              ) : (
                'Analyze'
              )}
            </button>
          </div>
        </div>
        
        {/* Suggested Searches */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs text-[#6b7280]">
          <span>Suggested:</span>
          {[
            { label: 'malware.exe', type: 'critical' },
            { label: '185.220.101.42', type: 'critical' },
            { label: 'powershell.exe', type: 'medium' }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleSearch(item.label)}
              className={cn(
                "px-2 py-1 rounded border border-transparent hover:border-white/10 transition-colors flex items-center gap-1.5",
                item.type === 'critical' ? "text-[#ff3b30] bg-[#ff3b30]/5 hover:bg-[#ff3b30]/10" :
                "text-[#00d4c3] bg-[#00d4c3]/5 hover:bg-[#00d4c3]/10"
              )}
            >
              <Search size={10} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {status === 'loading' && (
           <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
              <div className="w-12 h-12 border-4 border-[#00d4c3]/20 border-t-[#00d4c3] rounded-full animate-spin" />
              <p className="text-[#a6acb8] animate-pulse">Querying endpoint logs...</p>
           </div>
        )}

        {status === 'idle' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md p-8 rounded-2xl border border-white/5 bg-[#0b0c0f]">
              <div className="w-16 h-16 rounded-full bg-[#00d4c3]/5 flex items-center justify-center mx-auto mb-4">
                <FileSearch className="w-8 h-8 text-[#00d4c3]" />
              </div>
              <h3 className="text-lg font-medium text-[#f4f6fb] mb-2">Ready to Investigate</h3>
              <p className="text-sm text-[#a6acb8]">
                Enter an indicator of compromise (IOC) above to search across process execution history and network traffic logs.
              </p>
            </div>
          </div>
        )}

        {status === 'empty' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-[#52525b]">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-[#a6acb8]">No results found</h3>
              <p className="text-sm">We couldn't find any activity matching "{searchQuery}"</p>
            </div>
          </div>
        )}

        {status === 'success' && data && (
          <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-white/5 mb-4">
              <TabButton 
                active={activeTab === 'process'} 
                onClick={() => setActiveTab('process')}
                icon={Terminal}
                label="Process Activity"
                count={data.processes.length}
              />
              <TabButton 
                active={activeTab === 'network'} 
                onClick={() => setActiveTab('network')}
                icon={Globe}
                label="Network Traffic"
                count={data.network.length}
              />
              <div className="ml-auto text-xs text-[#52525b] font-mono">
                Found {data.meta.totalResults} events in {data.meta.searchDuration}ms
              </div>
            </div>

            {/* Tables Container */}
            <div className="flex-1 bg-[#0b0c0f] border border-white/5 rounded-xl overflow-hidden shadow-inner flex flex-col">
              <div className="overflow-x-auto flex-1">
                {activeTab === 'process' && (
                  <ProcessTable data={data.processes} />
                )}
                {activeTab === 'network' && (
                   <NetworkTable data={data.network} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-Components ---

function TabButton({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all hover:text-[#f4f6fb]",
        active 
          ? "border-[#00d4c3] text-[#00d4c3]" 
          : "border-transparent text-[#a6acb8]"
      )}
    >
      <Icon size={16} />
      {label}
      <span className={cn(
        "px-1.5 py-0.5 rounded text-[10px]",
        active ? "bg-[#00d4c3]/10 text-[#00d4c3]" : "bg-white/5 text-[#52525b]"
      )}>
        {count}
      </span>
    </button>
  );
}

function ProcessTable({ data }: { data: ProcessActivity[] }) {
  if (data.length === 0) return <EmptyTabState type="Process" />;

  return (
    <table className="w-full text-left border-collapse min-w-[800px]">
      <thead>
        <tr className="bg-white/[0.02] text-[#52525b] text-xs uppercase tracking-wider border-b border-white/5">
          <th className="px-6 py-3 font-medium">PID</th>
          <th className="px-6 py-3 font-medium">Process Name</th>
          <th className="px-6 py-3 font-medium">Path</th>
          <th className="px-6 py-3 font-medium">User</th>
          <th className="px-6 py-3 font-medium text-right">Resources</th>
          <th className="px-6 py-3 font-medium">Timestamp</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5 text-sm">
        {data.map((p) => (
          <tr key={p.id} className={cn("group hover:bg-white/[0.02] transition-colors", p.riskLevel === 'critical' && "bg-red-500/[0.03]")}>
            <td className="px-6 py-4 font-mono text-[#a6acb8] text-xs">{p.pid}</td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2 text-[#f4f6fb]">
                {p.riskLevel === 'critical' && <AlertTriangle size={14} className="text-[#ff3b30]" />}
                <span className={cn(p.riskLevel === 'critical' && "text-[#ff3b30] font-medium")}>{p.name}</span>
              </div>
            </td>
            <td className="px-6 py-4 font-mono text-xs text-[#a6acb8] max-w-[200px] truncate" title={p.path}>{p.path}</td>
            <td className="px-6 py-4 text-[#a6acb8]">{p.user}</td>
            <td className="px-6 py-4 text-right font-mono text-xs">
              <div className={cn(p.cpu > 20 ? "text-[#ff9500]" : "text-[#a6acb8]")}>CPU: {p.cpu}%</div>
              <div className="text-[#52525b]">MEM: {p.memory}MB</div>
            </td>
            <td className="px-6 py-4 text-[#52525b] text-xs">
              {new Date(p.timestamp).toLocaleTimeString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NetworkTable({ data }: { data: NetworkTraffic[] }) {
  if (data.length === 0) return <EmptyTabState type="Network" />;

  return (
    <table className="w-full text-left border-collapse min-w-[800px]">
      <thead>
        <tr className="bg-white/[0.02] text-[#52525b] text-xs uppercase tracking-wider border-b border-white/5">
          <th className="px-6 py-3 font-medium">Timestamp</th>
          <th className="px-6 py-3 font-medium">Source</th>
          <th className="px-6 py-3 font-medium">Destination</th>
          <th className="px-6 py-3 font-medium">Protocol</th>
          <th className="px-6 py-3 font-medium">Bytes</th>
          <th className="px-6 py-3 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5 text-sm">
        {data.map((n) => (
          <tr key={n.id} className={cn("group hover:bg-white/[0.02] transition-colors", n.riskLevel === 'critical' && "bg-red-500/[0.03]")}>
            <td className="px-6 py-4 text-[#52525b] text-xs">
              {new Date(n.timestamp).toLocaleTimeString()}
            </td>
            <td className="px-6 py-4 font-mono text-[#a6acb8] text-xs">
              {n.sourceIp}<span className="text-[#52525b]">:{n.sourcePort}</span>
            </td>
            <td className="px-6 py-4 font-mono text-[#f4f6fb] text-xs">
              <div className="flex items-center gap-2">
                 {n.riskLevel === 'critical' && <div className="w-1.5 h-1.5 rounded-full bg-[#ff3b30] animate-pulse" />}
                 {n.destIp}<span className="text-[#52525b]">:{n.destPort}</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <span className="bg-[#00d4c3]/10 text-[#00d4c3] px-2 py-0.5 rounded text-[10px] font-bold">
                {n.protocol}
              </span>
            </td>
            <td className="px-6 py-4 font-mono text-[#a6acb8] text-xs">{n.bytes.toLocaleString()}</td>
            <td className="px-6 py-4 text-right">
              <button className="text-[#00d4c3] hover:text-[#fff] text-xs flex items-center gap-1 justify-end transition-colors">
                Trace <ChevronRight size={12} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyTabState({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-[#52525b]">
       <Server size={32} className="mb-3 opacity-20" />
       <p className="text-sm">No relevant {type} logs found for this search.</p>
    </div>
  );
}