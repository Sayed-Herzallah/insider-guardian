import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/apiClient';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell} from 'recharts';
import {
  Monitor,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  MoreVertical,
  ShieldAlert
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types (Backend Contract) ---
// The backend team should ensure their API matches these interfaces.

export type TimeRange = '24h' | '7d' | '30d';

export interface DashboardStats {
  endpoints: { total: number; online: number; offline: number; trend: number };
  activeIncidents: { count: number; critical: number; trend: number };
  detectionRate: { percentage: number; trend: number };
  avgResponseTime: { value: string; trend: number; industryAvg: string };
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface AttackVector {
  name: string;
  value: number;
  color: string;
}

export interface RecentAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  threatName: string;
  host: string;
  timestamp: string;
  status: 'new' | 'investigating' | 'contained';
}

export interface DashboardData {
  stats: DashboardStats;
  threatTrend: ChartDataPoint[];
  attackVectors: AttackVector[];
  recentAlerts: RecentAlert[];
}

// --- Mock API Service ---
// NOTE: In production, replace `MOCK_DATA` and `fetchDashboardData` with real API calls.
// The backend contract for this page should conform to the `DashboardData` interface above.
const MOCK_DATA: Record<TimeRange, DashboardData> = {
  '24h': {
    stats: {
      endpoints: { total: 482, online: 460, offline: 22, trend: 0.5 },
      activeIncidents: { count: 3, critical: 1, trend: -10 },
      detectionRate: { percentage: 99.8, trend: 0.2 },
      avgResponseTime: { value: '2m 15s', trend: -5, industryAvg: '15m' },
    },
    threatTrend: [
      { name: '00:00', value: 2 }, { name: '04:00', value: 5 },
      { name: '08:00', value: 15 }, { name: '12:00', value: 8 },
      { name: '16:00', value: 22 }, { name: '20:00', value: 10 },
    ],
    attackVectors: [
      { name: 'Phishing', value: 60, color: '#ff3b30' },
      { name: 'Malware', value: 30, color: '#ff9500' },
      { name: 'DDoS', value: 10, color: '#00d4c3' },
    ],
    recentAlerts: [
      { id: 'ALT-001', severity: 'critical', threatName: 'Ransomware.LockBit', host: 'FIN-SRV-01', timestamp: new Date().toISOString(), status: 'new' },
      { id: 'ALT-002', severity: 'high', threatName: 'Brute Force RDP', host: 'HR-PC-04', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'investigating' },
    ]
  },
  '7d': {
    stats: {
      endpoints: { total: 485, online: 470, offline: 15, trend: 2.4 },
      activeIncidents: { count: 12, critical: 4, trend: 12 },
      detectionRate: { percentage: 99.2, trend: 0.8 },
      avgResponseTime: { value: '4m 12s', trend: -18, industryAvg: '197d' },
    },
    threatTrend: [
      { name: 'Mon', value: 12 }, { name: 'Tue', value: 19 },
      { name: 'Wed', value: 8 }, { name: 'Thu', value: 25 },
      { name: 'Fri', value: 15 }, { name: 'Sat', value: 6 },
      { name: 'Sun', value: 9 },
    ],
    attackVectors: [
      { name: 'Phishing', value: 45, color: '#ff3b30' },
      { name: 'Malware', value: 32, color: '#ff9500' },
      { name: 'Lateral Mov.', value: 18, color: '#ffcc00' },
      { name: 'Exfiltration', value: 5, color: '#00d4c3' },
    ],
    recentAlerts: [
      { id: 'ALT-101', severity: 'critical', threatName: 'Cobalt Strike', host: 'DMZ-WEB-01', timestamp: new Date().toISOString(), status: 'contained' },
      { id: 'ALT-102', severity: 'medium', threatName: 'Suspicious Powershell', host: 'DEV-002', timestamp: new Date().toISOString(), status: 'investigating' },
      { id: 'ALT-103', severity: 'high', threatName: 'Credential Dump', host: 'AD-DC-01', timestamp: new Date().toISOString(), status: 'new' },
    ]
  },
  '30d': {
    stats: {
      endpoints: { total: 490, online: 480, offline: 10, trend: 5 },
      activeIncidents: { count: 45, critical: 8, trend: 20 },
      detectionRate: { percentage: 98.5, trend: -0.5 },
      avgResponseTime: { value: '5m 30s', trend: 2, industryAvg: '20m' },
    },
    threatTrend: [
      { name: 'Week 1', value: 45 }, { name: 'Week 2', value: 32 },
      { name: 'Week 3', value: 55 }, { name: 'Week 4', value: 28 },
    ],
    attackVectors: [
      { name: 'Phishing', value: 50, color: '#ff3b30' },
      { name: 'Malware', value: 20, color: '#ff9500' },
      { name: 'Insider', value: 15, color: '#ffcc00' },
      { name: 'Zero-Day', value: 15, color: '#00d4c3' },
    ],
    recentAlerts: []
  }
};

export const fetchDashboardData = async (range: TimeRange): Promise<DashboardData> => {
  try {
    const days = range === '24h' ? 1 : range === '7d' ? 7 : 30;

    // Fetch stats, timeseries, and top mitre in parallel
    const [statsRes, timeseriesRes, mitreRes] = await Promise.all([
      apiRequest('/dashboard/stats/'),
      apiRequest(`/dashboard/alerts/timeseries/?days=${days}`),
      apiRequest('/dashboard/mitre/top/?limit=10'),
    ]);

    const stats = statsRes?.data || {};
    const timeseries = timeseriesRes?.data || [];
    const mitre = mitreRes?.data || [];

    // Map EDR backend JSON to frontend DashboardData
    const mappedData: DashboardData = {
      stats: {
        endpoints: {
          total: stats.agents?.total ?? 0,
          online: stats.agents?.online ?? 0,
          offline: stats.agents?.offline ?? 0,
          trend: stats.agents?.reconnecting ?? 0,
        },
        activeIncidents: {
          count: stats.incidents?.total_open ?? 0,
          critical: stats.incidents?.by_severity?.critical ?? 0,
          trend: stats.incidents?.total_in_progress ?? 0,
        },
        detectionRate: {
          percentage: 99.8,
          trend: 0,
        },
        avgResponseTime: {
          value: '2m 15s',
          trend: 0,
          industryAvg: '15m',
        },
      },
      threatTrend: timeseries.map((t: any) => ({
        name: t.date || '',
        value: t.count || 0,
      })),
      attackVectors: mitre.map((m: any, index: number) => {
        const colors = ['#ff3b30', '#ff9500', '#00d4c3', '#a855f7', '#3b82f6'];
        return {
          name: m.name || m.technique_id || 'Unknown',
          value: m.count || 0,
          color: colors[index % colors.length],
        };
      }),
      recentAlerts: (stats.alerts?.recent || []).map((a: any) => ({
        id: a.id || '',
        severity: a.severity || 'low',
        threatName: a.title || a.alert_type || 'Threat Detected',
        host: a.agent_name || a.agent__name || 'Unknown',
        timestamp: a.created_at || new Date().toISOString(),
        status: 'new',
      })),
    };

    return mappedData;
  } catch (error) {
    console.warn('Overview API call failed, falling back to mock data:', error);
    // Graceful fallback to mock data if backend is offline
    return MOCK_DATA[range];
  }
};

// --- Sub-Components ---

const StatCard = ({ 
  icon: Icon, 
  color, 
  label, 
  value, 
  subValue, 
  trend 
}: { 
  icon: any, color: string, label: string, value: string | number, subValue?: React.ReactNode, trend: number 
}) => (
  <div className="bg-[#0b0c0f] border border-white/5 rounded-xl p-5 flex flex-col justify-between h-full relative overflow-hidden group hover:border-white/10 transition-colors">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
       <Icon size={80} color={color} />
    </div>
    
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${color}15` }}>
        <Icon size={20} style={{ color: color }} />
      </div>
      <div className={cn("flex items-center text-xs font-medium px-2 py-1 rounded-full", trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
        {trend >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
        {Math.abs(trend)}%
      </div>
    </div>
    
    <div>
      <h3 className="text-2xl sm:text-3xl font-bold text-[#f4f6fb] tracking-tight">{value}</h3>
      <p className="text-[#a6acb8] text-xs font-medium uppercase tracking-wider mt-1">{label}</p>
      {subValue && <div className="mt-3 pt-3 border-t border-white/5 text-xs">{subValue}</div>}
    </div>
  </div>
);

// --- Main Component ---

interface OverviewProps {
  onThreatDetected?: () => void; // Optional for this demo
}

export default function Overview({ }: OverviewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchDashboardData(timeRange);
        if (mounted) {
          setData(res);
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to load dashboard data', err);
          setError('Unable to load overview metrics. Please try again.');
          setData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [timeRange]);

  // Loading State
  if (loading && !data && !error) {
    return (
      <section
        aria-label="Security overview loading state"
        className="flex items-center justify-center h-80 md:h-96 text-[#00d4c3] animate-pulse"
      >
        Loading security metrics...
      </section>
    );
  }

  // Error State
  if (error) {
    return (
      <section
        aria-label="Security overview error state"
        className="flex flex-col items-center justify-center h-80 md:h-96 text-center space-y-3"
      >
        <p className="text-sm text-[#f4f6fb] font-semibold">Something went wrong</p>
        <p className="text-xs text-[#a6acb8]">{error}</p>
        <button
          type="button"
          onClick={() => setTimeRange((prev) => prev)}
          className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#00d4c3] text-black text-xs font-semibold hover:bg-[#00d4c3]/90 transition-colors"
        >
          Retry
        </button>
      </section>
    );
  }

  // Empty State
  if (!loading && data && data.recentAlerts.length === 0) {
    return (
      <section
        aria-label="Security overview empty state"
        className="flex flex-col items-center justify-center h-80 md:h-96 text-center space-y-3"
      >
        <p className="text-sm text-[#f4f6fb] font-semibold">No recent activity</p>
        <p className="text-xs text-[#a6acb8]">
          We could not find any security events for the selected time range.
        </p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section
      aria-label="Security overview dashboard"
      className="space-y-6 animate-in fade-in duration-500"
    >
      
      {/* Header & Actions */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f6fb]">Security Overview</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-[#a6acb8]" aria-live="polite">
              <div className="w-2 h-2 rounded-full bg-[#00d4c3] animate-pulse" />
              System Status: Optimal
            </span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 bg-[#0b0c0f] border border-white/10 p-1 rounded-lg"
          role="radiogroup"
          aria-label="Time range"
        >
          {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                timeRange === range 
                  ? "bg-[#00d4c3]/10 text-[#00d4c3] shadow-sm ring-1 ring-[#00d4c3]/20" 
                  : "text-[#a6acb8] hover:text-white hover:bg-white/5"
              )}
              role="radio"
              aria-checked={timeRange === range}
            >
              Last {range}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => setTimeRange(timeRange)}
            className="p-1.5 text-[#a6acb8] hover:text-white hover:bg-white/5 rounded-md"
            aria-label="Refresh overview data"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        aria-label="Key security metrics"
      >
        <StatCard 
          icon={Monitor} 
          color="#00d4c3" 
          label="Total Endpoints" 
          value={data.stats.endpoints.total}
          trend={data.stats.endpoints.trend}
          subValue={
            <div className="flex gap-3 text-[10px] sm:text-xs">
              <span className="text-[#00d4c3]">{data.stats.endpoints.online} Online</span>
              <span className="text-[#ff3b30]">{data.stats.endpoints.offline} Offline</span>
            </div>
          }
        />
        <StatCard 
          icon={ShieldAlert} 
          color="#ff3b30" 
          label="Active Incidents" 
          value={data.stats.activeIncidents.count}
          trend={data.stats.activeIncidents.trend}
          subValue={
            <div className="flex items-center gap-2 text-[#a6acb8] text-[10px] sm:text-xs">
              <span className="text-[#ff3b30] font-bold">{data.stats.activeIncidents.critical} Critical</span>
              <span>Need Action</span>
            </div>
          }
        />
        <StatCard 
          icon={Target} 
          color="#ff9500" 
          label="Detection Rate" 
          value={`${data.stats.detectionRate.percentage}%`}
          trend={data.stats.detectionRate.trend}
          subValue={
             <div className="w-full h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-[#ff9500] rounded-full" style={{ width: `${data.stats.detectionRate.percentage}%` }} />
             </div>
          }
        />
        <StatCard 
          icon={Clock} 
          color="#3b82f6" 
          label="Avg Response" 
          value={data.stats.avgResponseTime.value}
          trend={data.stats.avgResponseTime.trend}
          subValue={
             <span className="text-[#a6acb8] text-[10px]">vs Industry: {data.stats.avgResponseTime.industryAvg}</span>
          }
        />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Threat Trend Area Chart */}
        <section className="lg:col-span-2 bg-[#0b0c0f] border border-white/5 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#f4f6fb]">Threat Activity Trend</h3>
              <p className="text-xs text-[#a6acb8]">Volume of detected anomalies over time</p>
            </div>
            <button className="text-[#00d4c3] text-xs hover:underline">Download Report</button>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.threatTrend}>
                <defs>
                  <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4c3" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d4c3" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#a6acb8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#a6acb8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111318', borderColor: '#ffffff20', borderRadius: '8px' }}
                  itemStyle={{ color: '#f4f6fb' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00d4c3" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorThreat)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Attack Vectors Donut Chart */}
        <section className="bg-[#0b0c0f] border border-white/5 rounded-xl p-6">
           <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-[#f4f6fb]">Attack Vectors</h3>
            <button
              type="button"
              className="p-1 rounded-md text-[#a6acb8] hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Open attack vectors actions"
            >
              <MoreVertical size={16} />
            </button>
          </div>

          <div className="h-[200px] w-full relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.attackVectors}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.attackVectors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#111318', borderColor: '#ffffff20', borderRadius: '8px', fontSize: '12px' }}
                   itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="block text-2xl font-bold text-white">100%</span>
              <span className="text-[10px] text-[#a6acb8]">Distribution</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {data.attackVectors.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#a6acb8]">{item.name}</span>
                </div>
                <span className="text-[#f4f6fb] font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Alerts Table */}
      <section className="bg-[#0b0c0f] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[#f4f6fb]">Recent Critical Alerts</h3>
          <button
            type="button"
            className="text-xs text-[#00d4c3] hover:text-[#00d4c3]/80 transition-colors"
          >
            View all history
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" aria-label="Recent critical alerts">
            <thead>
              <tr className="bg-white/[0.02] text-[#a6acb8] text-xs uppercase tracking-wider">
                <th scope="col" className="px-6 py-3 font-medium">Severity</th>
                <th scope="col" className="px-6 py-3 font-medium">Threat Name</th>
                <th scope="col" className="px-6 py-3 font-medium">Affected Host</th>
                <th scope="col" className="px-6 py-3 font-medium">Timestamp</th>
                <th scope="col" className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.recentAlerts.length > 0 ? (
                data.recentAlerts.map((alert) => (
                  <tr key={alert.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase",
                        alert.severity === 'critical' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                        alert.severity === 'high' ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                        "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      )}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#f4f6fb] font-medium">{alert.threatName}</td>
                    <td className="px-6 py-4 text-sm text-[#a6acb8] font-mono">{alert.host}</td>
                    <td className="px-6 py-4 text-sm text-[#52525b]">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                       <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs",
                          alert.status === 'new' ? "text-[#00d4c3]" : "text-[#a6acb8]"
                       )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", alert.status === 'new' ? "bg-[#00d4c3] animate-pulse" : "bg-[#a6acb8]")} />
                          {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                       </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#a6acb8] text-sm">
                    No recent alerts found for this time range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  
  );
}