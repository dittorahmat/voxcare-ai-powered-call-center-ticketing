import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';
import { Plus, Trash2, Play, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export function AutoCloseRulesSettings() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState(false);

  const load = () => {
    apiGet<{ success: boolean; data: any[] }>('/api/auto-close-rules')
      .then(res => { if (res.success) setRules(res.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (rule: any) => {
    try {
      if (rule.id && rule.id.startsWith('acr-')) {
        await apiPatch(`/api/auto-close-rules/${rule.id}`, rule);
      } else {
        rule.id = undefined;
        await apiPost('/api/auto-close-rules', rule);
      }
      toast.success('Rule saved');
      setNewRule(false);
      setEditingId(null);
      load();
    } catch { toast.error('Failed to save rule'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/auto-close-rules/${id}`);
      toast.success('Rule deleted');
      load();
    } catch { toast.error('Failed to delete rule'); }
  };

  const handleEvaluate = async () => {
    try {
      const res = await apiPost('/api/auto-close/evaluate', {});
      toast.success(`Evaluated: ${res.data?.closedCount || 0} tickets closed`);
    } catch { toast.error('Failed to evaluate rules'); }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Auto-Close Rules</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleEvaluate} className="text-xs">
              <Play className="h-3 w-3 mr-1" /> Evaluate Now
            </Button>
            <Button size="sm" onClick={() => setNewRule(true)} className="text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Rule
            </Button>
          </div>
        </CardTitle>
        <CardDescription>Automatically close tickets based on inactivity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-muted-foreground">Loading...</p>}
        {newRule && (
          <RuleForm
            rule={{ name: '', condition: { status: 'resolved', daysSinceUpdate: 7 }, action: { setStatus: 'closed', addInternalNote: '' }, enabled: true }}
            onSave={handleSave}
            onCancel={() => setNewRule(false)}
          />
        )}
        {rules.map(rule => (
          editingId === rule.id ? (
            <RuleForm key={rule.id} rule={rule} onSave={handleSave} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={rule.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{rule.name}</h4>
                  <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-[10px]">{rule.enabled ? 'Active' : 'Disabled'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  When status is <strong>{rule.condition.status}</strong> and{' '}
                  {rule.condition.daysSinceUpdate ? <><strong>{rule.condition.daysSinceUpdate} days</strong> since last update</> : null}
                  {rule.condition.daysSinceCustomerReply ? <><strong>{rule.condition.daysSinceCustomerReply} days</strong> since customer reply</> : null}
                  {' '}→ set to <strong>{rule.action.setStatus}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={rule.enabled} onCheckedChange={(checked) => handleSave({ ...rule, enabled: checked })} />
                <Button size="sm" variant="ghost" onClick={() => setEditingId(rule.id)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )
        ))}
        {!loading && rules.length === 0 && !newRule && (
          <p className="text-muted-foreground text-center py-8">No auto-close rules configured.</p>
        )}
      </CardContent>
    </Card>
  );
}

function RuleForm({ rule, onSave, onCancel }: { rule: any; onSave: (r: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState(rule);
  return (
    <div className="p-4 border rounded-lg bg-white space-y-3">
      <div className="space-y-2">
        <Label>Rule Name</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Auto-close resolved after 7 days" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Ticket Status</Label>
          <Select value={form.condition.status} onValueChange={v => setForm({ ...form, condition: { ...form.condition, status: v } })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Days Since Update</Label>
          <Input type="number" value={form.condition.daysSinceUpdate || ''} onChange={e => setForm({ ...form, condition: { ...form.condition, daysSinceUpdate: parseInt(e.target.value) || 0 } })} placeholder="7" />
        </div>
        <div className="space-y-2">
          <Label>Action: Set Status</Label>
          <Select value={form.action.setStatus} onValueChange={v => setForm({ ...form, action: { ...form.action, setStatus: v } })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Internal Note Template (optional)</Label>
        <Input value={form.action.addInternalNote || ''} onChange={e => setForm({ ...form, action: { ...form.action, addInternalNote: e.target.value } })} placeholder="[Auto-Close] Ticket automatically closed" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}><X className="h-3 w-3 mr-1" /> Cancel</Button>
        <Button size="sm" onClick={() => onSave(form)}><Check className="h-3 w-3 mr-1" /> Save</Button>
      </div>
    </div>
  );
}
