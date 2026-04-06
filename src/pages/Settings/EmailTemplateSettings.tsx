import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Save, Check } from 'lucide-react';
import { toast } from 'sonner';

export function EmailTemplateSettings() {
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data: any[] }>('/api/email-templates')
      .then(res => {
        if (res.success) {
          const map: Record<string, any> = {};
          (res.data || []).forEach((t: any) => { map[t.name] = t; });
          // Ensure all template types exist
          ['ticket-created', 'ticket-updated', 'ticket-resolved'].forEach(name => {
            if (!map[name]) map[name] = { name, subject: '', htmlBody: '', textBody: '' };
          });
          setTemplates(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (name: string) => {
    setSaving(name);
    try {
      const t = templates[name];
      if (t.id) {
        await apiPut(`/api/email-templates/${t.id}`, t);
      } else {
        t.id = `et-${name}`;
        await apiPost('/api/email-templates', t);
      }
      toast.success(`Template "${name}" saved`);
      setTemplates({ ...templates });
    } catch { toast.error('Failed to save template'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>Email Notification Templates</CardTitle>
        <CardDescription>
          Customize email templates with variables: {'{{customer_name}}'}, {'{{ticket_id}}'}, {'{{ticket_title}}'}, {'{{ticket_status}}'}, {'{{ticket_url}}'}, {'{{agent_name}}'}, {'{{resolution_notes}}'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {Object.entries(templates).map(([name, t]) => (
          <div key={name} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold capitalize">{name.replace(/-/g, ' ')}</h4>
              <Badge variant="outline">{name}</Badge>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={t.subject || ''} onChange={e => setTemplates({ ...templates, [name]: { ...t, subject: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>HTML Body</Label>
              <Textarea value={t.htmlBody || ''} onChange={e => setTemplates({ ...templates, [name]: { ...t, htmlBody: e.target.value } })} className="min-h-[120px] font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Text Body (fallback)</Label>
              <Textarea value={t.textBody || ''} onChange={e => setTemplates({ ...templates, [name]: { ...t, textBody: e.target.value } })} className="min-h-[60px] font-mono text-xs" />
            </div>
            <Button size="sm" onClick={() => handleSave(name)} disabled={saving === name}>
              {saving === name ? <><Check className="h-3 w-3 mr-1" /> Saving...</> : <><Save className="h-3 w-3 mr-1" /> Save Template</>}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
