import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Save, Check } from 'lucide-react';

interface Holiday {
  id: string;
  date: string;
  name: string;
  createdAt: string;
}

export function SLASettings() {
  const [rules, setRules] = useState<Record<string, { response: number; resolution: number; escalation: number }>>({
    low: { response: 480, resolution: 1440, escalation: 960 },
    medium: { response: 240, resolution: 720, escalation: 480 },
    high: { response: 60, resolution: 240, escalation: 120 },
    urgent: { response: 15, resolution: 120, escalation: 30 },
  });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet('/api/sla/configs').then(res => {
      if (res.success && res.data?.length > 0) {
        const newRules = { ...rules };
        res.data.forEach((c: any) => {
          newRules[c.priority] = { response: c.responseMinutes, resolution: c.resolutionMinutes, escalation: c.escalationMinutes };
        });
        setRules(newRules);
      }
    }).catch(() => {});
    apiGet('/api/holidays').then(res => {
      if (res.success) setHolidays(res.data || []);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const configs = Object.entries(rules).map(([priority, r]) => ({
        id: `sla-${priority}`, priority,
        responseMinutes: r.response, resolutionMinutes: r.resolution, escalationMinutes: r.escalation,
      }));
      for (const config of configs) {
        await apiPost(`/api/sla/configs/${config.id}`, config);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const addHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) return;
    try {
      const res = await apiPost<{ success: boolean; data: Holiday }>('/api/holidays', newHoliday);
      if (res.success) {
        setHolidays(prev => [...prev, res.data].sort((a, b) => a.date.localeCompare(b.date)));
        setNewHoliday({ date: '', name: '' });
      }
    } catch { /* ignore */ }
  };

  const deleteHoliday = async (id: string) => {
    try {
      await apiDelete(`/api/holidays/${id}`);
      setHolidays(prev => prev.filter(h => h.id !== id));
    } catch { /* ignore */ }
  };

  const PRIORITY_COLORS: Record<string, string> = { low: 'bg-slate-100', medium: 'bg-blue-50', high: 'bg-amber-50', urgent: 'bg-red-50' };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="size-5" /> SLA Configuration</CardTitle>
          <CardDescription>Set response, resolution, and escalation times per priority level (in minutes).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-4 text-xs font-bold text-slate-400 uppercase px-2">
            <div>Priority</div><div>Response (min)</div><div>Resolution (min)</div><div>Escalation (min)</div>
          </div>
          {Object.entries(rules).map(([p, r]) => (
            <div key={p} className={`grid grid-cols-5 gap-4 items-center p-3 rounded-lg ${PRIORITY_COLORS[p]}`}>
              <div className="font-semibold capitalize">{p}</div>
              <Input type="number" value={r.response} onChange={e => setRules(prev => ({ ...prev, [p]: { ...prev[p], response: parseInt(e.target.value) || 0 } }))} className="h-9" />
              <Input type="number" value={r.resolution} onChange={e => setRules(prev => ({ ...prev, [p]: { ...prev[p], resolution: parseInt(e.target.value) || 0 } }))} className="h-9" />
              <Input type="number" value={r.escalation} onChange={e => setRules(prev => ({ ...prev, [p]: { ...prev[p], escalation: parseInt(e.target.value) || 0 } }))} className="h-9" />
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-4">
            {saved ? <Check className="size-4 mr-2" /> : <Save className="size-4 mr-2" />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save SLA Rules'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="size-5" /> Holiday Schedule</CardTitle>
          <CardDescription>Holidays where SLA timers are paused.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1"><Label>Date</Label><Input type="date" value={newHoliday.date} onChange={e => setNewHoliday(prev => ({ ...prev, date: e.target.value }))} /></div>
            <div className="space-y-2 flex-1"><Label>Name</Label><Input value={newHoliday.name} onChange={e => setNewHoliday(prev => ({ ...prev, name: e.target.value }))} placeholder="Christmas Day" /></div>
            <Button onClick={addHoliday} size="sm"><Plus className="size-4 mr-1" /> Add</Button>
          </div>
          {holidays.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-semibold text-sm">{h.name}</span>
                    <span className="text-xs text-muted-foreground ml-3">{h.date}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteHoliday(h.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No holidays configured.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
