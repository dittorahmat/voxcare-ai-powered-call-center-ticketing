import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Save, Check, Shield, ShieldOff, QrCode } from 'lucide-react';
import { apiPut, apiPost } from '@/lib/apiClient';

export function ProfileSettings() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAUri, setTwoFAUri] = useState('');
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const is2fa = (user as any)?.is2faEnabled;

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/api/settings/profile', { name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="size-5" /> Profile Settings</CardTitle>
        <CardDescription>Update your display name and account information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl">
          <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white">
            <User className="size-6" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Badge className="ml-auto capitalize">{user?.role}</Badge>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} className="max-w-md" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email || ''} disabled className="max-w-md bg-slate-50" />
          <p className="text-xs text-muted-foreground">Contact an admin to change your email address.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saved ? <Check className="size-4 mr-2" /> : <Save className="size-4 mr-2" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </Button>

        {/* 2FA Section */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            {is2fa ? <Shield className="size-5 text-emerald-600" /> : <ShieldOff className="size-5 text-slate-400" />}
            <div>
              <CardTitle className="text-sm">Two-Factor Authentication</CardTitle>
              <CardDescription>{is2fa ? '2FA is enabled on your account.' : 'Add an extra layer of security.'}</CardDescription>
            </div>
            <Badge className="ml-auto" variant={is2fa ? 'default' : 'secondary'}>{is2fa ? 'Enabled' : 'Disabled'}</Badge>
          </div>

          {twoFAStep === 'idle' && !is2fa && (
            <Button onClick={async () => {
              const res = await apiPost<{ success: boolean; data?: { secret: string; uri: string } }>('/api/auth/2fa/setup', {});
              if (res.success && res.data) {
                setTwoFASecret(res.data.secret);
                setTwoFAUri(res.data.uri);
                setTwoFAStep('verify');
              }
            }} variant="outline"><QrCode className="size-4 mr-2" /> Set Up 2FA</Button>
          )}

          {twoFAStep === 'verify' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Scan this QR code in your authenticator app (Google Authenticator, Authy), then enter the 6-digit code:</p>
              <div className="p-4 bg-white border rounded-lg flex justify-center">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(twoFAUri)}&size=200x200`} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all">Secret: {twoFASecret}</p>
              <div className="flex gap-2">
                <Input value={twoFAToken} onChange={e => setTwoFAToken(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="max-w-40" />
                <Button onClick={async () => {
                  const res = await apiPost('/api/auth/2fa/verify', { secret: twoFASecret, token: twoFAToken });
                  if (res.success) { setTwoFAStep('idle'); window.location.reload(); }
                }} disabled={twoFAToken.length !== 6}>Verify & Enable</Button>
              </div>
            </div>
          )}

          {is2fa && user?.role !== 'admin' && (
            <Button variant="outline" onClick={async () => {
              await apiPost('/api/auth/2fa/disable', {});
              window.location.reload();
            }} className="text-red-600 border-red-200 hover:bg-red-50">Disable 2FA</Button>
          )}
          {is2fa && user?.role === 'admin' && (
            <p className="text-xs text-muted-foreground">Admin accounts cannot disable 2FA.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
