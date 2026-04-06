import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';
import { Plus, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ScheduledReportsSettings() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReport, setNewReport] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; data: any[] }>('/api/scheduled-reports')
      .then(res => { if (res.success) setReports(res.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (report: any) => {
    try {
      if (report.id) {
        await apiPatch(`/api/scheduled-reports/${report.id}`, report);
      } else {
        report.id = undefined;
        await apiPost('/api/scheduled-reports', report);
      }
      toast.success('Report schedule saved');
      setNewReport(false);
      apiGet<{ success: boolean; data: any[] }>('/api/scheduled-reports')
        .then(res => { if (res.success) setReports(res.data || []); });
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/scheduled-reports/${id}`);
      toast.success('Report schedule deleted');
      apiGet<{ success: boolean; data: any[] }>('/api/scheduled-reports')
        .then(res => { if (res.success) setReports(res.data || []); });
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Scheduled Reports</span>
          <Button size="sm" onClick={() => setNewReport(true)}><Plus className="h-3 w-3 mr-1" /> Add Schedule</Button>
        </CardTitle>
        <CardDescription>Automatically email reports on a recurring schedule.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newReport && (
          <ReportForm onSave={handleSave} onCancel={() => setNewReport(false)} />
        )}
        {reports.map(r => (
          <div key={r.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium capitalize">{r.type.replace(/-/g, ' ')}</h4>
                <Badge variant={r.enabled ? 'default' : 'secondary'} className="text-[10px]">{r.enabled ? 'Active' : 'Paused'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                {r.schedule.frequency} at {r.schedule.time}
                {r.schedule.dayOfWeek !== undefined && ` on ${DAYS[r.schedule.dayOfWeek]}`}
                {' · '}{r.recipients?.length || 0} recipient(s)
              </p>
              {r.lastRunAt && (
                <p className="text-xs text-muted-foreground">
                  Last run: {format(new Date(r.lastRunAt), 'PPp')}
                  {r.nextRunAt && ` · Next: ${format(new Date(r.nextRunAt), 'PPp')}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.enabled} onCheckedChange={(checked) => handleSave({ ...r, enabled: checked })} />
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {!loading && reports.length === 0 && !newReport && (
          <p className="text-muted-foreground text-center py-8">No scheduled reports configured.</p>
        )}
      </CardContent>
    </Card>
  );
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ReportForm({ onSave, onCancel }: { onSave: (r: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    type: 'daily-summary',
    schedule: { frequency: 'daily' as 'daily' | 'weekly', time: '08:00', dayOfWeek: 1 },
    recipients: '',
    dateRange: 'last-7-days',
    enabled: true,
  });

  const handleSave = () => {
    onSave({
      ...form,
      recipients: form.recipients.split(',').map((e: string) => e.trim()).filter(Boolean),
    });
  };

  return (
    <div className="p-4 border rounded-lg bg-white space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Report Type</Label>
          <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily-summary">Daily Summary</SelectItem>
              <SelectItem value="weekly-sla">Weekly SLA Compliance</SelectItem>
              <SelectItem value="weekly-agent-performance">Weekly Agent Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select value={form.schedule.frequency} onValueChange={v => setForm({ ...form, schedule: { ...form.schedule, frequency: v } })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Time (HH:MM)</Label>
          <Input value={form.schedule.time} onChange={e => setForm({ ...form, schedule: { ...form.schedule, time: e.target.value } })} />
        </div>
        {form.schedule.frequency === 'weekly' && (
          <div className="space-y-2">
            <Label>Day of Week</Label>
            <Select value={String(form.schedule.dayOfWeek)} onValueChange={v => setForm({ ...form, schedule: { ...form.schedule, dayOfWeek: parseInt(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Recipient Emails (comma-separated)</Label>
        <Input value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} placeholder="admin@voxcare.com, supervisor@voxcare.com" />
      </div>
      <div className="space-y-2">
        <Label>Date Range</Label>
        <Select value={form.dateRange} onValueChange={v => setForm({ ...form, dateRange: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
