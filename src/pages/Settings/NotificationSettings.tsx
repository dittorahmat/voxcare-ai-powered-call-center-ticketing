import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Save, Check } from 'lucide-react';
import { apiPut } from '@/lib/apiClient';

export function NotificationSettings() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [eventToggles, setEventToggles] = useState<Record<string, boolean>>({
    'ticket-created': true,
    'sla-warning': true,
    'sla-breached': true,
    'call-assigned': true,
    'escalation': true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleEvent = (event: string) => {
    setEventToggles(prev => ({ ...prev, [event]: !prev[event] }));
  };

  const requestDesktopPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setDesktopEnabled(permission === 'granted');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/api/settings/notifications', { soundEnabled, desktopEnabled, emailEnabled, eventToggles });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const events = [
    { id: 'ticket-created', label: 'New Ticket Created' },
    { id: 'sla-warning', label: 'SLA Warning (approaching deadline)' },
    { id: 'sla-breached', label: 'SLA Breached' },
    { id: 'call-assigned', label: 'Call Assigned to You' },
    { id: 'escalation', label: 'Ticket Escalation' },
  ];

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="size-5" /> Notification Preferences</CardTitle>
        <CardDescription>Control how and when you receive notifications.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Delivery Methods</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Sound Alerts</p><p className="text-xs text-muted-foreground">Play sound for incoming notifications</p></div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Desktop Notifications</p><p className="text-xs text-muted-foreground">Browser push notifications</p></div>
              <Switch checked={desktopEnabled} onCheckedChange={requestDesktopPermission} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Email Notifications</p><p className="text-xs text-muted-foreground">Receive notifications via email</p></div>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Label className="text-base font-semibold">Event Types</Label>
          {events.map(event => (
            <div key={event.id} className="flex items-center justify-between">
              <span className="text-sm">{event.label}</span>
              <Switch checked={eventToggles[event.id]} onCheckedChange={() => toggleEvent(event.id)} />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saved ? <Check className="size-4 mr-2" /> : <Save className="size-4 mr-2" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
