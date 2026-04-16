import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bell, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPatch } from '@/lib/apiClient';

interface NotificationPrefs {
  events: Record<string, boolean>;
  frequency: 'instant' | 'daily-digest';
  digestTime: string;
}

const EVENT_LABELS: Record<string, string> = {
  'ticket-created': 'Tiket dibuat',
  'ticket-updated': 'Tiket diperbarui',
  'ticket-resolved': 'Tiket diselesaikan',
  'agent-reply': 'Balasan agen',
};

interface NotificationPreferencesFormProps {
  onSaved?: () => void;
}

export function NotificationPreferencesForm({ onSaved }: NotificationPreferencesFormProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: NotificationPrefs }>('/api/customer/notification-preferences');
      if (res.success) {
        setPrefs(res.data);
      }
    } catch {
      toast.error('Gagal memuat preferensi notifikasi');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await apiPatch('/api/customer/notification-preferences', prefs);
      if (res.success) {
        toast.success('Preferensi notifikasi disimpan');
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSaved?.();
      }
    } catch {
      toast.error('Gagal menyimpan preferensi');
    }
    setSaving(false);
  };

  const toggleEvent = (eventKey: string) => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      events: {
        ...prefs.events,
        [eventKey]: !prefs.events[eventKey],
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Memuat...</span>
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferensi Notifikasi Email
          </CardTitle>
          <CardDescription>
            Pilih notifikasi yang ingin Anda terima melalui email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Frekuensi Pengiriman</label>
            <Select
              value={prefs.frequency}
              onValueChange={(v) => setPrefs({ ...prefs, frequency: v as 'instant' | 'daily-digest' })}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Langsung (setiap ada update)</SelectItem>
                <SelectItem value="daily-digest">Ringkasan harian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Digest time (only shown when daily-digest) */}
          {prefs.frequency === 'daily-digest' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Waktu Ringkasan Harian</label>
              <input
                type="time"
                value={prefs.digestTime || '09:00'}
                onChange={(e) => setPrefs({ ...prefs, digestTime: e.target.value })}
                className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          {/* Event toggles */}
          <div className="space-y-3 pt-4 border-t">
            <label className="text-sm font-medium">Jenis Notifikasi</label>
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={prefs.events[key] ?? true}
                  onCheckedChange={() => toggleEvent(key)}
                />
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : saved ? <Check className="h-4 w-4 mr-1" /> : null}
              {saving ? 'Menyimpan...' : saved ? 'Tersimpan' : 'Simpan Preferensi'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
