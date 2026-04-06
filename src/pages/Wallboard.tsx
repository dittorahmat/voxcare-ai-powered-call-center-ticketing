import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Ticket, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { apiGet } from '@/lib/apiClient';

interface WallboardData {
  agents: { active: number; total: number };
  tickets: { open: number; inProgress: number; resolved: number };
  slaCompliance: number;
  today: { new: number; resolved: number };
  avgFirstResponseTime: number;
  topAgents: { id: string; name: string; resolvedToday: number }[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function getSLAColor(rate: number): string {
  if (rate >= 90) return 'text-green-500';
  if (rate >= 75) return 'text-yellow-500';
  return 'text-red-500';
}

function getSLABg(rate: number): string {
  if (rate >= 90) return 'bg-green-500';
  if (rate >= 75) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function Wallboard() {
  const [data, setData] = useState<WallboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const res = await apiGet('/api/wallboard');
      if (res.success) setData(res.data);
    } catch (err) {
      console.error('Failed to fetch wallboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    // Pause when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        fetchData();
        intervalRef.current = setInterval(fetchData, 15000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading wallboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">VoxCare Live Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live · Auto-refresh 15s
          </div>
        </div>

        {/* Top Row: Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Users className="h-4 w-4" /> Active Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{data.agents.active}</div>
              <p className="text-sm text-gray-400 mt-1">dari {data.agents.total} total</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Ticket className="h-4 w-4" /> Open Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{data.tickets.open}</div>
              <p className="text-sm text-gray-400 mt-1">{data.tickets.inProgress} in progress</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Resolved Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-400">{data.today.resolved}</div>
              <p className="text-sm text-gray-400 mt-1">{data.today.new} baru hari ini</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Avg Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{formatDuration(data.avgFirstResponseTime)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: SLA + Ticket Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">SLA Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`text-6xl font-bold ${getSLAColor(data.slaCompliance)}`}>
                {data.slaCompliance}%
              </div>
              <Progress value={data.slaCompliance} className="h-3" />
              <div className="flex gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500" />&gt;90% Good</span>
                <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-yellow-500" />75-90% Warning</span>
                <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-red-500" />&lt;75% Critical</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Ticket Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Open</span>
                <span className="text-2xl font-bold text-blue-400">{data.tickets.open}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">In Progress</span>
                <span className="text-2xl font-bold text-yellow-400">{data.tickets.inProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Resolved</span>
                <span className="text-2xl font-bold text-green-400">{data.tickets.resolved}</span>
              </div>
              <div className="pt-2">
                <Progress
                  value={data.tickets.open + data.tickets.inProgress + data.tickets.resolved > 0
                    ? (data.tickets.resolved / (data.tickets.open + data.tickets.inProgress + data.tickets.resolved)) * 100
                    : 0}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Top Agents */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Top Agents Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topAgents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Belum ada resolved tickets hari ini</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {data.topAgents.map((agent, i) => (
                  <div key={agent.id} className="text-center p-4 bg-gray-800 rounded-lg">
                    <div className="text-3xl font-bold text-blue-400">#{i + 1}</div>
                    <div className="text-sm font-medium mt-1">{agent.name}</div>
                    <Badge variant="secondary" className="mt-2 bg-green-900 text-green-300">
                      {agent.resolvedToday} resolved
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
