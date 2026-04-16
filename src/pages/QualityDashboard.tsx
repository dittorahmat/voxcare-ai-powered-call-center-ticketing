import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet } from '@/lib/apiClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Star, TrendingUp, TrendingDown, Users, Award, AlertTriangle, Target } from 'lucide-react';

export function QualityDashboard() {
  const { user } = useAuth();
  const isSupervisor = ['supervisor', 'admin'].includes(user?.role || '');
  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    const now = new Date();
    let from: string | undefined;
    const to = now.toISOString();
    if (dateRange === '7d') from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    else if (dateRange === '30d') from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const params = (f?: string) => f ? `?from=${f}&to=${to}` : '';

    try {
      if (isSupervisor) {
        const [teamRes] = await Promise.all([
          apiGet(`/api/quality/team${params(from)}`),
        ]);
        if ((teamRes as any).success) setTeamData((teamRes as any).data);
      } else {
        const [agentRes] = await Promise.all([
          apiGet(`/api/quality/agent/${user?.sub}${params(from)}`),
        ]);
        if ((agentRes as any).success) setAgentData((agentRes as any).data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Memuat...</div>;

  if (isSupervisor && teamData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Quality Management — Team</h2>
          <div className="flex gap-2">
            {['7d', '30d'].map(r => (
              <Button key={r} variant={dateRange === r ? 'default' : 'outline'} size="sm" onClick={() => setDateRange(r)}>
                {r === '7d' ? '7 Days' : '30 Days'}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Agents</p>
                  <p className="text-2xl font-bold">{teamData.rankings?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Agent Leaderboard</CardTitle>
            <CardDescription>Ranked by quality score (manual scorecards)</CardDescription>
          </CardHeader>
          <CardContent>
            {teamData.rankings?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data yet. Supervisors need to score tickets first.</p>
            ) : (
              <div className="space-y-2">
                {teamData.rankings?.map((r: any, i: number) => (
                  <div key={r.agentId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-8">{i + 1}</span>
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.totalTickets} tickets · {r.resolvedTickets} resolved</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">{r.avgManualScore || '—'}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{r.role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Agent view
  if (agentData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Quality Score</h2>
          <div className="flex gap-2">
            {['7d', '30d'].map(r => (
              <Button key={r} variant={dateRange === r ? 'default' : 'outline'} size="sm" onClick={() => setDateRange(r)}>
                {r === '7d' ? '7 Days' : '30 Days'}
              </Button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-indigo-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Composite Score</p>
                  <p className="text-2xl font-bold">{agentData.compositeScore || '—'}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Manual Score</p>
                  <p className="text-2xl font-bold">{agentData.avgManualScore || '—'}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                {agentData.slaCompliance >= 80 ? <TrendingUp className="h-8 w-8 text-green-600" /> : <AlertTriangle className="h-8 w-8 text-red-600" />}
                <div>
                  <p className="text-sm text-muted-foreground">SLA Compliance</p>
                  <p className="text-2xl font-bold">{agentData.slaCompliance || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg CSAT</p>
                  <p className="text-2xl font-bold">{agentData.avgCSAT || '—'}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Tickets</p>
              <p className="text-lg font-semibold">{agentData.totalTickets}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-lg font-semibold">{agentData.resolvedTickets}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Negative Sentiment</p>
              <p className="text-lg font-semibold text-red-600">{agentData.negativeSentimentCount || 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        {agentData.trend?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quality Trend</CardTitle>
              <CardDescription>Manual quality score over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={agentData.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString('id-ID')} />
                  <Line type="monotone" dataKey="composite" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return <div className="text-center text-muted-foreground py-20">No quality data available yet.</div>;
}
