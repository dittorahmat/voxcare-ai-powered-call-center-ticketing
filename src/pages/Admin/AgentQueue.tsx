import React, { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/apiClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, RefreshCw, Clock, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Agent {
  userId: string;
  name: string;
  availability: string;
  activeTicketCount: number;
  lastActivityAt: string;
  skills: string[];
  activeBreak?: { startedAt: string; reason: string };
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  busy: 'bg-amber-50 text-amber-700 border-amber-200',
  break: 'bg-blue-50 text-blue-700 border-blue-200',
  lunch: 'bg-orange-50 text-orange-700 border-orange-200',
  offline: 'bg-slate-50 text-slate-500 border-slate-200',
};

function getBreakDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function AgentQueue() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await apiGet<{ success: boolean; data: Agent[] }>('/api/agents');
      setAgents(res.data || []);
    } catch { /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="size-7 text-indigo-600" /> Agent Queue
          </h1>
          <p className="text-muted-foreground mt-1">Real-time agent status and workload.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-4 mr-1" /> Refresh</Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-6 border-b border-slate-50">
          <span className="text-sm text-muted-foreground">{agents.length} agents</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading...</div>
          ) : agents.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No agents registered.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                  <th className="px-6 py-4">Agent</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Active Tickets</th>
                  <th className="px-6 py-4">Last Activity</th>
                  <th className="px-6 py-4">Break</th>
                  <th className="px-6 py-4">Skills</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agents.map(a => (
                  <tr key={a.userId} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-6 py-4 font-semibold text-slate-900">{a.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`capitalize ${STATUS_COLORS[a.availability] || ''}`}>{a.availability}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline">{a.activeTicketCount || 0}</Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {a.lastActivityAt ? formatDistanceToNow(new Date(a.lastActivityAt), { addSuffix: true }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {(a.availability === 'break' || a.availability === 'lunch') && a.activeBreak ? (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Timer className="h-3 w-3" />
                          {getBreakDuration(a.activeBreak.startedAt)} · {a.activeBreak.reason}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(a.skills || []).slice(0, 3).map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                        {(a.skills || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
