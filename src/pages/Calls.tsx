import React, { useState, useEffect } from 'react';
import { apiGet } from '@/lib/apiClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, Search, ExternalLink, Calendar, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface CallRecord {
  id: string;
  callId: string;
  callerNumber: string | null;
  agentId: string | null;
  ticketId: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  transcript: string | null;
  outcome: string | null;
}

export function Calls() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [agentId, setAgentId] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo + 'T23:59:59');
      if (agentId) params.set('agentId', agentId);
      const res = await apiGet<{ success: boolean; data: CallRecord[] }>(`/api/calls?${params}`);
      setCalls(res.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ended: 'bg-slate-50 text-slate-600 border-slate-200',
    ringing: 'bg-amber-50 text-amber-700 border-amber-200',
    hold: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <PhoneCall className="size-7 text-indigo-600" /> Call History
        </h1>
        <p className="text-muted-foreground mt-1">Log of all inbound and outbound calls.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="p-4 px-6 border-b border-slate-50">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 h-9" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 h-9" />
            </div>
            <Input placeholder="Agent ID..." value={agentId} onChange={e => setAgentId(e.target.value)} className="w-48 h-9" />
            <Button size="sm" onClick={load}><Filter className="size-3 mr-1" /> Filter</Button>
            <span className="text-sm text-muted-foreground ml-auto">{calls.length} calls</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading...</div>
          ) : calls.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No calls found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                    <th className="px-6 py-4">Call ID</th>
                    <th className="px-6 py-4">Caller</th>
                    <th className="px-6 py-4">Agent</th>
                    <th className="px-6 py-4">Ticket</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Outcome</th>
                    <th className="px-6 py-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {calls.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="px-6 py-4 text-xs font-mono text-indigo-500">{c.callId}</td>
                      <td className="px-6 py-4 text-sm">{c.callerNumber || 'Web Intake'}</td>
                      <td className="px-6 py-4 text-sm">{c.agentId || '—'}</td>
                      <td className="px-6 py-4">
                        {c.ticketId ? (
                          <Link to={`/tickets/${c.ticketId}`} className="text-indigo-600 hover:underline text-xs font-mono">{c.ticketId}</Link>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono">{formatDuration(c.durationSeconds)}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`capitalize text-[10px] ${statusColors[c.status] || ''}`}>{c.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">{c.outcome || '—'}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{format(new Date(c.startedAt), 'MMM d, p')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
