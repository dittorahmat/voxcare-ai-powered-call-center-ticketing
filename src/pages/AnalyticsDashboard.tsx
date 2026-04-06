import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Inbox, CheckCircle2, Clock, TrendingUp, Download, Calendar,
  BarChart3, Users, Shield, Star, Target, Smile,
} from 'lucide-react';

const RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
];

import { apiGet } from '@/lib/apiClient';

const authFetch = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}`, ...(init?.headers || {}) } });

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState('7d');
  const [volumeData, setVolumeData] = useState<any>(null);
  const [resolutionData, setResolutionData] = useState<any>(null);
  const [agentData, setAgentData] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any>(null);
  const [csatData, setCsatData] = useState<any>(null);
  const [fcrData, setFcrData] = useState<number>(0);
  const [ahtData, setAhtData] = useState<number>(0);
  const [tagData, setTagData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Compute date range
      const now = new Date();
      let from: string | undefined;
      const to = now.toISOString();
      if (range === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (range === '7d') {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (range === '30d') {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      const params = (f?: string) => f ? `?from=${f}&to=${to}` : '';

      try {
        const [volRes, resRes, slaRes, agentRes, csatRes] = await Promise.all([
          apiGet(`/api/analytics/volume${params(from)}`),
          user && ['supervisor', 'admin'].includes(user.role) ? apiGet(`/api/analytics/resolution-time${params(from)}`) : Promise.resolve(null),
          apiGet(`/api/analytics/sla-compliance${params(from)}`),
          user && ['supervisor', 'admin'].includes(user.role) ? apiGet(`/api/analytics/agent-performance${params(from)}`) : Promise.resolve(null),
          user && ['supervisor', 'admin'].includes(user.role) ? apiGet(`/api/csat/stats${params(from)}`) : Promise.resolve(null),
        ]);
        if ((volRes as any).success) setVolumeData((volRes as any).data);
        if ((resRes as any)?.success) setResolutionData((resRes as any).data);
        if ((slaRes as any).success) setSlaData((slaRes as any).data);
        if ((agentRes as any)?.success) setAgentData((agentRes as any).data);
        if ((csatRes as any)?.success) setCsatData((csatRes as any).data);

        // Calculate FCR from volume data
        if ((volRes as any).success && (volRes as any).data?.fcrRate !== undefined) {
          setFcrData((volRes as any).data.fcrRate);
        }
        // Calculate AHT from resolution data
        if ((resRes as any)?.success && (resRes as any).data?.averageHandleTime) {
          setAhtData((resRes as any).data.averageHandleTime);
        }

        // Fetch tag data
        const tagRes = await apiGet(`/api/tags`);
        if ((tagRes as any)?.success) {
          setTagData((tagRes as any).data.map((t: any) => ({ name: t.name, value: t.count })));
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range, user]);

  const chartData = useMemo(() => {
    if (!volumeData?.byDate) return [];
    return Object.entries(volumeData.byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({ date, tickets: count as number }));
  }, [volumeData]);

  const categoryData = useMemo(() => {
    if (!volumeData?.byCategory) return [];
    return Object.entries(volumeData.byCategory).map(([name, value]) => ({ name, value: value as number }));
  }, [volumeData]);

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

  const exportCSV = (type: string) => {
    const token = localStorage.getItem('accessToken');
    window.open(`/api/analytics/export/csv?type=${type}`, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Clock className="animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="size-7 text-indigo-600" /> Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Performance metrics and ticket insights.</p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map(r => (
            <Button key={r.value} variant={range === r.value ? 'default' : 'outline'} size="sm" onClick={() => setRange(r.value)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <h3 className="text-2xl font-bold mt-1">{volumeData?.total || 0}</h3>
              </div>
              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl"><Inbox className="size-6" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <h3 className="text-2xl font-bold mt-1">{volumeData?.byStatus?.resolved || 0}</h3>
              </div>
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl"><CheckCircle2 className="size-6" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <h3 className="text-2xl font-bold mt-1">{resolutionData?.average ? `${resolutionData.average}m` : '—'}</h3>
              </div>
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl"><TrendingUp className="size-6" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SLA Compliance</p>
                <h3 className="text-2xl font-bold mt-1">{slaData?.rate ? `${slaData.rate}%` : '—'}</h3>
              </div>
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Shield className="size-6" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extended Metrics: FCR, AHT, CSAT */}
      {['supervisor', 'admin'].includes(user?.role || '') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">First Contact Resolution</p>
                  <h3 className="text-2xl font-bold mt-1">{fcrData ? `${fcrData}%` : '—'}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Resolved on first interaction</p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl"><Target className="size-6" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Handle Time</p>
                  <h3 className="text-2xl font-bold mt-1">{ahtData ? `${Math.floor(ahtData / 60)}h ${(ahtData % 60)}m` : '—'}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Assignment to resolution</p>
                </div>
                <div className="bg-amber-50 text-amber-600 p-3 rounded-xl"><Clock className="size-6" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer Satisfaction</p>
                  <div className="flex items-center gap-2 mt-1">
                    <h3 className="text-2xl font-bold">{csatData?.avgRating ? `${csatData.avgRating}/5` : '—'}</h3>
                    <div className="flex">{[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(csatData?.avgRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    ))}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{csatData?.totalResponses || 0} responses ({csatData?.responseRate || 0}% rate)</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Smile className="size-6" /></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Volume Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ticket Volume Over Time</CardTitle>
              <CardDescription>Daily ticket creation count.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => exportCSV('volume')}><Download className="size-4" /></Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {chartData.length > 0 ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="tickets" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {loading ? "Loading..." : "No data for selected range"}
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Tickets by Category</CardTitle>
            <CardDescription>Distribution of ticket categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {categoryData.length > 0 ? (
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tag Breakdown */}
      {tagData.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Tickets by Tag</CardTitle>
            <CardDescription>Tag distribution across all tickets.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tagData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* SLA Compliance & Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SLA Donut */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>SLA Compliance</CardTitle>
            <CardDescription>Resolved within SLA deadlines.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {slaData ? (
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Compliant', value: slaData.compliant },
                      { name: 'Breached', value: slaData.breached },
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance Table */}
        {['supervisor', 'admin'].includes(user?.role || '') && (
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Users className="size-5" /> Agent Performance</CardTitle>
                <CardDescription>Per-agent metrics and SLA compliance.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportCSV('agent')}><Download className="size-4" /></Button>
            </CardHeader>
            <CardContent>
              {agentData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-bold text-slate-400 uppercase">
                        <th className="pb-2">Agent</th><th className="pb-2">Assigned</th><th className="pb-2">Resolved</th><th className="pb-2">FCR %</th><th className="pb-2">SLA %</th><th className="pb-2">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentData.map(a => (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="py-2 font-medium">{a.name}</td>
                          <td className="py-2">{a.assigned}</td>
                          <td className="py-2">{a.resolved}</td>
                          <td className="py-2">
                            <Badge variant={a.fcrRate !== undefined && a.fcrRate >= 60 ? 'default' : a.fcrRate !== undefined && a.fcrRate >= 30 ? 'secondary' : 'destructive'}>
                              {a.fcrRate !== undefined ? `${a.fcrRate}%` : '—'}
                            </Badge>
                          </td>
                          <td className="py-2">
                            <Badge variant={a.slaCompliance !== null && a.slaCompliance >= 80 ? 'default' : a.slaCompliance !== null && a.slaCompliance >= 50 ? 'secondary' : 'destructive'}>
                              {a.slaCompliance !== null ? `${a.slaCompliance}%` : '—'}
                            </Badge>
                          </td>
                          <td className="py-2">{a.avgResolutionTime ? `${a.avgResolutionTime}m` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-muted-foreground text-sm text-center py-8">No agent data available</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
