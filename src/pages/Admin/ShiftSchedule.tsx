import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiGet, apiPost, apiPatch } from '@/lib/apiClient';
import { ChevronLeft, ChevronRight, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getMondayOfWeek(year: number, week: number): Date {
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7 - (jan1.getDay() - 1);
  const monday = new Date(year, 0, 1 + daysOffset);
  if (monday.getDay() !== 1) monday.setDate(monday.getDate() + (monday.getDay() === 0 ? 1 : -6));
  return monday;
}

export function ShiftSchedulePage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [weekNum, setWeekNum] = useState(getWeekNumber(now));
  const [schedules, setSchedules] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<any>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data: any[] }>('/api/shifts')
      .then(res => { if (res.success) setSchedules(res.data || []); })
      .catch(() => {});
    apiGet<{ success: boolean; data: any[] }>('/api/agents')
      .then(res => { if (res.success) setAgents((res.data || []).map((a: any) => ({ id: a.userId, name: a.name }))); })
      .catch(() => {});
  }, []);

  const schedule = useMemo(() => {
    return schedules.find(s => s.year === year && s.weekNumber === weekNum) ||
      { id: null, year, weekNumber: weekNum, entries: [] };
  }, [schedules, year, weekNum]);

  const monday = getMondayOfWeek(year, weekNum);

  const getAgentsForSlot = (day: number, hour: number) => {
    return schedule.entries?.filter((e: any) => {
      if (e.day !== day) return false;
      const startH = parseInt(e.startTime.split(':')[0]);
      const endH = parseInt(e.endTime.split(':')[0]);
      return hour >= startH && hour < endH;
    }).flatMap((e: any) => e.agentIds || []) || [];
  };

  const coverageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    DAYS.forEach((_, di) => {
      HOURS.forEach(hi => {
        const key = `${di}-${hi}`;
        counts[key] = getAgentsForSlot(di, hi).length;
      });
    });
    return counts;
  }, [schedule]);

  const handleSave = async () => {
    try {
      if (schedule.id) {
        await apiPatch(`/api/shifts/${schedule.id}`, schedule);
      } else {
        await apiPost('/api/shifts', schedule);
      }
      toast.success('Schedule saved');
      setEditing(false);
      apiGet<{ success: boolean; data: any[] }>('/api/shifts')
        .then(res => { if (res.success) setSchedules(res.data || []); });
    } catch { toast.error('Failed to save schedule'); }
  };

  const toggleAgent = (day: number, agentId: string) => {
    const existing = schedule.entries?.find((e: any) => e.day === day);
    let entries = [...(schedule.entries || [])];
    if (existing) {
      const agentIds = existing.agentIds.includes(agentId)
        ? existing.agentIds.filter((id: string) => id !== agentId)
        : [...existing.agentIds, agentId];
      entries = entries.map((e: any) => e.day === day ? { ...e, agentIds } : e);
    } else {
      entries.push({ day, startTime: '09:00', endTime: '17:00', agentIds: [agentId] });
    }
    setCurrentSchedule({ ...schedule, entries });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="size-7 text-indigo-600" /> Shift Schedule
          </h1>
          <p className="text-muted-foreground mt-1">Manage weekly agent shifts and coverage.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const w = weekNum - 1; setWeekNum(w <= 0 ? 52 : w); setYear(w <= 0 ? year - 1 : year); }}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">Week {weekNum}, {year}</span>
          <Button variant="outline" size="sm" onClick={() => { const w = weekNum + 1; setWeekNum(w > 52 ? 1 : w); setYear(w > 52 ? year + 1 : year); }}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant={editing ? 'default' : 'outline'} size="sm" onClick={() => { if (editing) handleSave(); else { setCurrentSchedule(schedule); setEditing(true); } }}>
            {editing ? 'Save' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* Coverage Heatmap */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="size-4" /> Coverage Heatmap</CardTitle>
          <CardDescription>Agent count per time slot. Red = understaffed (&lt;2), Green = adequate (≥2).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-muted-foreground w-16">Hour</th>
                {DAYS.map((d, i) => (
                  <th key={i} className="p-2 text-center font-medium">{d}<br /><span className="text-muted-foreground">{new Date(monday.getTime() + i * 86400000).getDate()}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(h => (
                <tr key={h}>
                  <td className="p-2 font-mono text-muted-foreground">{h}:00</td>
                  {DAYS.map((_, di) => {
                    const count = coverageCount[`${di}-${h}`] || 0;
                    const color = count === 0 ? 'bg-red-100 text-red-700' : count === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
                    return <td key={di} className={`p-2 text-center ${color} rounded`}>{count || '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Agent Assignment Table */}
      {editing && (
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-sm">Agent Assignment</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground">Agent</th>
                  {DAYS.map((d, i) => <th key={i} className="p-2 text-center">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => (
                  <tr key={agent.id} className="border-t">
                    <td className="p-2 font-medium">{agent.name}</td>
                    {DAYS.map((_, di) => (
                      <td key={di} className="p-2 text-center">
                        <Checkbox
                          checked={getAgentsForSlot(di, 9).includes(agent.id)}
                          onCheckedChange={() => toggleAgent(di, agent.id)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
