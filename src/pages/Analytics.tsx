import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  AlertTriangle,
  Monitor,
  Shield,
  Clock,
  Loader2,
  Check,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types (API Contract) ---

export type TimeRange = '24h' | '7d' | '30d';

export interface TopTarget {
  hostname: string;
  attacks: number;
  trend: number; // positive or negative percentage
}

export interface MalwareFamily {
  name: string;
  count: number;
  color: string;
}

export interface AlertVolume {
  time: string;
  count: number;
}

export interface Report {
  id: string;
  name: string;
  generatedAt: string;
  status: 'ready' | 'generating' | 'failed';
  size?: string;
  type: string;
}

export interface KPI {
  label: string;
  value: string;
  trend: number;
  icon: 'shield' | 'alert' | 'clock' | 'monitor';
}

export interface AnalyticsData {
  kpis: KPI[];
  topTargets: TopTarget[];
  malwareFamilies: MalwareFamily[];
  alertVolume: AlertVolume[];
  reports: Report[];
}

// --- Mock Data Service ---

const MOCK_DATA: Record<TimeRange, AnalyticsData> = {
  '24h': {
    kpis: [
      { label: 'Detection Accuracy', value: '99.8%', trend: 0.2, icon: 'shield' },
      { label: 'Threats Blocked', value: '42', trend: -12, icon: 'alert' },
      { label: 'Avg Response Time', value: '2m 15s', trend: -5, icon: 'clock' },
      { label: 'Endpoints Active', value: '482', trend: 1.5, icon: 'monitor' }
    ],
    topTargets: [
      { hostname: 'SRV-DC-01', attacks: 45, trend: 12 },
      { hostname: 'WS-FIN-03', attacks: 32, trend: 5 },
      { hostname: 'SRV-WEB-02', attacks: 28, trend: -2 },
      { hostname: 'WS-HR-01', attacks: 15, trend: 8 }
    ],
    malwareFamilies: [
      { name: 'Ransomware', count: 45, color: '#ff3b30' },
      { name: 'Spyware', count: 30, color: '#ff9500' },
      { name: 'Adware', count: 15, color: '#00d4c3' },
      { name: 'Other', count: 10, color: '#a6acb8' }
    ],
    alertVolume: [
      { time: '00:00', count: 12 }, { time: '04:00', count: 8 },
      { time: '08:00', count: 45 }, { time: '12:00', count: 67 },
      { time: '16:00', count: 89 }, { time: '20:00', count: 34 }
    ],
    reports: [
      { id: 'r1', name: 'Daily_Security_Brief.pdf', generatedAt: new Date().toISOString(), status: 'ready', size: '1.2 MB', type: 'PDF' },
      { id: 'r2', name: 'Incident_Log_24h.csv', generatedAt: new Date(Date.now() - 3600000).toISOString(), status: 'generating', type: 'CSV' }
    ]
  },
  '7d': {
    kpis: [
      { label: 'Detection Accuracy', value: '99.2%', trend: -0.4, icon: 'shield' },
      { label: 'Threats Blocked', value: '348', trend: 23, icon: 'alert' },
      { label: 'Avg Response Time', value: '4m 12s', trend: 2, icon: 'clock' },
      { label: 'Endpoints Active', value: '485', trend: 0.5, icon: 'monitor' }
    ],
    topTargets: [
      { hostname: 'SRV-DC-01', attacks: 145, trend: 15 },
      { hostname: 'SRV-DB-01', attacks: 98, trend: 5 },
      { hostname: 'WS-DEV-042', attacks: 87, trend: 23 },
      { hostname: 'WS-ENG-031', attacks: 64, trend: -8 },
      { hostname: 'SRV-WEB-02', attacks: 52, trend: 3 }
    ],
    malwareFamilies: [
      { name: 'Cobalt Strike', count: 28, color: '#ff3b30' },
      { name: 'Emotet', count: 22, color: '#ff9500' },
      { name: 'TrickBot', count: 18, color: '#ffcc00' },
      { name: 'Ryuk', count: 15, color: '#00d4c3' },
      { name: 'Qakbot', count: 17, color: '#3b82f6' }
    ],
    alertVolume: [
      { time: 'Mon', count: 120 }, { time: 'Tue', count: 132 },
      { time: 'Wed', count: 101 }, { time: 'Thu', count: 154 },
      { time: 'Fri', count: 190 }, { time: 'Sat', count: 90 },
      { time: 'Sun', count: 85 }
    ],
    reports: [
      { id: 'r3', name: 'Weekly_Compliance_Report.pdf', generatedAt: new Date().toISOString(), status: 'ready', size: '4.5 MB', type: 'PDF' },
      { id: 'r4', name: 'Threat_Vector_Analysis.pdf', generatedAt: new Date(Date.now() - 86400000).toISOString(), status: 'ready', size: '2.8 MB', type: 'PDF' }
    ]
  },
  '30d': {
    kpis: [
      { label: 'Detection Accuracy', value: '98.5%', trend: 1.2, icon: 'shield' },
      { label: 'Threats Blocked', value: '1,240', trend: 8, icon: 'alert' },
      { label: 'Avg Response Time', value: '3m 45s', trend: -12, icon: 'clock' },
      { label: 'Endpoints Active', value: '490', trend: 3.2, icon: 'monitor' }
    ],
    topTargets: [
      { hostname: 'SRV-DC-01', attacks: 520, trend: 10 },
      { hostname: 'VPN-GW-01', attacks: 410, trend: 45 },
      { hostname: 'SRV-MAIL-01', attacks: 380, trend: -5 },
      { hostname: 'WS-FIN-ALL', attacks: 200, trend: 2 }
    ],
    malwareFamilies: [
      { name: 'Ransomware', count: 35, color: '#ff3b30' },
      { name: 'Phishing', count: 40, color: '#ff9500' },
      { name: 'Trojans', count: 15, color: '#ffcc00' },
      { name: 'Worms', count: 10, color: '#00d4c3' }
    ],
    alertVolume: [
      { time: 'Week 1', count: 450 }, { time: 'Week 2', count: 520 },
      { time: 'Week 3', count: 480 }, { time: 'Week 4', count: 600 }
    ],
    reports: [
      { id: 'r5', name: 'Monthly_Executive_Summary.pdf', generatedAt: new Date().toISOString(), status: 'ready', size: '12.4 MB', type: 'PDF' }
    ]
  }
};

const fetchAnalytics = async (range: TimeRange): Promise<AnalyticsData> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_DATA[range]), 600); // Simulate network latency
  });
};

// --- Components ---

export default function Analytics() {
  const [dateRange, setDateRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAnalytics(dateRange).then((res) => {
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [dateRange]);

  const handleDownload = (reportId: string) => {
    setDownloadingReport(reportId);
    // Simulate API download call
    setTimeout(() => {
      setDownloadingReport(null);
    }, 2000);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'shield': return Shield;
      case 'alert': return AlertTriangle;
      case 'clock': return Clock;
      case 'monitor': return Monitor;
      default: return Shield;
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 size={40} className="text-[#00d4c3] animate-spin" />
        <p className="text-[#a6acb8] text-sm animate-pulse">Aggregating security metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f6fb]">Analytics & Reports</h1>
          <p className="text-sm text-[#a6acb8]">Security posture, threat trends, and compliance reporting</p>
        </div>
        <div className="flex items-center bg-[#0b0c0f] border border-white/10 p-1 rounded-lg">
          {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                dateRange === range 
                  ? "bg-[#00d4c3]/10 text-[#00d4c3] shadow-sm ring-1 ring-[#00d4c3]/20" 
                  : "text-[#a6acb8] hover:text-white hover:bg-white/5"
              )}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.kpis.map((kpi, index) => {
          const Icon = getIcon(kpi.icon);
          return (
            <div key={index} className="bg-[#0b0c0f] border border-white/5 p-4 rounded-xl flex items-center gap-4 hover:border-white/10 transition-colors">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                kpi.icon === 'alert' ? "bg-[#ff3b30]/10 text-[#ff3b30]" :
                kpi.icon === 'monitor' ? "bg-[#ff9500]/10 text-[#ff9500]" :
                "bg-[#00d4c3]/10 text-[#00d4c3]"
              )}>
                <Icon size={20} />
              </div>
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-[#f4f6fb]">{kpi.value}</span>
                  <div className={cn("flex items-center text-[10px] mb-1.5 font-medium", kpi.trend >= 0 ? "text-[#00d4c3]" : "text-[#ff3b30]")}>
                    {kpi.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(kpi.trend)}%
                  </div>
                </div>
                <p className="text-xs text-[#a6acb8]">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Targeted Hosts (Bar Chart) */}
        <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-[#f4f6fb] mb-4">Top Targeted Hosts</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.topTargets} margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="hostname" 
                  type="category" 
                  stroke="#a6acb8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#111318', borderColor: '#ffffff20', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="attacks" fill="#ff3b30" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Malware Families (Donut Chart) */}
        <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-[#f4f6fb] mb-4">Malware Families</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.malwareFamilies}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  stroke="none"
                >
                  {data.malwareFamilies.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#111318', borderColor: '#ffffff20', borderRadius: '8px', fontSize: '12px' }}
                   itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="block text-2xl font-bold text-white">
                {data.malwareFamilies.reduce((a, b) => a + b.count, 0)}
              </span>
              <span className="text-[10px] text-[#a6acb8]">Detections</span>
            </div>
          </div>
        </div>

        {/* Alert Volume (Area Chart) */}
        <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-[#f4f6fb] mb-4">Alert Volume</h3>
          <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.alertVolume}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4c3" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d4c3" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#a6acb8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111318', borderColor: '#ffffff20', borderRadius: '8px' }}
                  itemStyle={{ color: '#f4f6fb' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#00d4c3" 
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Reports Library Table */}
      <div className="bg-[#0b0c0f] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#f4f6fb]">Reports Library</h3>
            <p className="text-xs text-[#a6acb8]">Generated compliance and activity reports</p>
          </div>
          <button className="text-xs text-[#00d4c3] border border-[#00d4c3]/20 bg-[#00d4c3]/5 px-3 py-1.5 rounded-lg hover:bg-[#00d4c3]/10 transition-colors">
            Generate New Report
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-[#52525b] text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Report Name</th>
                <th className="px-6 py-3 font-medium">Generated</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Size</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {data.reports.map((report) => (
                <tr key={report.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00d4c3]/10 flex items-center justify-center text-[#00d4c3]">
                        <FileText size={16} />
                      </div>
                      <span className="font-medium text-[#f4f6fb]">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#a6acb8] text-xs">
                    {new Date(report.generatedAt).toLocaleDateString()}
                    <span className="ml-2 text-[#52525b]">{new Date(report.generatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                      report.status === 'ready' ? "bg-[#00d4c3]/10 text-[#00d4c3]" : "bg-[#ff9500]/10 text-[#ff9500]"
                    )}>
                      {report.status === 'ready' ? <Check size={12} /> : <Loader2 size={12} className="animate-spin" />}
                      {report.status === 'ready' ? 'Ready' : 'Generating'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#a6acb8] font-mono text-xs">{report.size || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownload(report.id)}
                      disabled={report.status !== 'ready' || downloadingReport === report.id}
                      className="inline-flex items-center gap-2 text-[#00d4c3] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                    >
                      {downloadingReport === report.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          Download
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}