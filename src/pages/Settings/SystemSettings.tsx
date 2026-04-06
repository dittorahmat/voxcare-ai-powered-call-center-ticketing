import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Shield, Save, Check, Plus, X, Target } from 'lucide-react';
import { apiGet, apiPut } from '@/lib/apiClient';

export function SystemSettings() {
  const [companyName, setCompanyName] = useState('VoxCare Call Center');
  const [timezone, setTimezone] = useState('UTC');
  const [categories, setCategories] = useState<string[]>(['Technical Support', 'Billing', 'General Inquiry', 'Complaint']);
  const [sendgridKey, setSendgridKey] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [fcrWindow, setFcrWindow] = useState(60);
  const [skillsMap, setSkillsMap] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet('/api/settings')
      .then(data => {
        if (data.data?.system) {
          setCompanyName(data.data.system.companyName || companyName);
          setTimezone(data.data.system.timezone || timezone);
          setCategories(data.data.system.ticketCategories || categories);
          setFcrWindow(data.data.system.fcrTimeWindowMinutes || 60);
          if (data.data.system.categorySkillsMap) setSkillsMap(data.data.system.categorySkillsMap);
        }
      })
      .catch(() => {});
  }, []);

  const addCategory = () => {
    if (newCat.trim() && !categories.includes(newCat.trim())) {
      setCategories([...categories, newCat.trim()]);
      setNewCat('');
    }
  };
  const removeCategory = (cat: string) => setCategories(categories.filter(c => c !== cat));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/api/settings/system', {
        companyName, timezone, ticketCategories: categories,
        sendgridKey, emailFrom, emailFromName,
        fcrTimeWindowMinutes: fcrWindow,
        categorySkillsMap: skillsMap,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="size-5" /> System Configuration</CardTitle>
        <CardDescription>Manage company settings and ticket categories.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Company Name</Label>
          <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Input value={timezone} onChange={e => setTimezone(e.target.value)} />
        </div>
        <div className="space-y-3">
          <Label>Ticket Categories</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Badge key={cat} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                {cat}
                <button onClick={() => removeCategory(cat)} className="hover:text-red-600 ml-1"><X className="size-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category..." onKeyDown={e => e.key === 'Enter' && addCategory()} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={addCategory}><Plus className="size-4 mr-1" /> Add</Button>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <Label className="text-sm font-semibold text-slate-700">Email Notifications (SendGrid)</Label>
          <p className="text-xs text-muted-foreground mb-3">Configure SendGrid to enable email notifications and email-to-ticket.</p>
          <div className="space-y-3">
            <div className="space-y-2"><Label>SendGrid API Key</Label><Input type="password" value={sendgridKey} onChange={e => setSendgridKey(e.target.value)} placeholder="SG.xxxxx" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>From Email</Label><Input value={emailFrom} onChange={e => setEmailFrom(e.target.value)} placeholder="support@voxcare.com" /></div>
              <div className="space-y-2"><Label>From Name</Label><Input value={emailFromName} onChange={e => setEmailFromName(e.target.value)} placeholder="VoxCare Support" /></div>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Target className="h-4 w-4" /> First Contact Resolution</Label>
          <p className="text-xs text-muted-foreground mb-3">Tickets resolved within this window from creation count as FCR.</p>
          <div className="flex items-center gap-2 max-w-xs">
            <Input type="number" value={fcrWindow} onChange={e => setFcrWindow(parseInt(e.target.value) || 60)} className="w-24" min={5} max={480} />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <Label className="text-sm font-semibold text-slate-700">Skills-Based Routing</Label>
          <p className="text-xs text-muted-foreground mb-3">Map ticket categories to required agent skills. Comma-separated.</p>
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-sm w-40 truncate">{cat}</span>
              <Input
                value={skillsMap[cat] || ''}
                onChange={e => setSkillsMap({ ...skillsMap, [cat]: e.target.value })}
                placeholder="e.g. technical, networking"
                className="max-w-sm"
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saved ? <Check className="size-4 mr-2" /> : <Save className="size-4 mr-2" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
