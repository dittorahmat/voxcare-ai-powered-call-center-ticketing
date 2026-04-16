import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, QrCode, AlertTriangle, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/apiClient';

export function WhatsAppSettings() {
  const [status, setStatus] = useState<{ connected: boolean; session?: string; error?: string }>({ connected: false, error: 'Loading...' });
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [qrData, setQrData] = useState<any>(null);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: any }>('/api/admin/whatsapp/status');
      if (res.success) setStatus(res.data);
    } catch {
      setStatus({ connected: false, error: 'Failed to load status' });
    }
    setLoading(false);
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const res = await apiPost('/api/admin/whatsapp/reconnect', {});
      if (res.success) {
        toast.success('Reconnect initiated. Check QR code below.');
        await loadQr();
      } else {
        toast.error(res.error || 'Reconnect failed');
      }
    } catch {
      toast.error('Failed to reconnect');
    }
    setReconnecting(false);
  };

  const loadQr = async () => {
    try {
      const res = await apiGet('/api/admin/whatsapp/qr');
      if (res.success) setQrData(res.data);
    } catch {
      toast.error('Failed to load QR code');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp Channel (WAHA)
          </CardTitle>
          <CardDescription>
            Manage WhatsApp integration via WAHA server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : status.connected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {loading ? 'Checking...' : status.connected ? 'Connected' : 'Disconnected'}
                </p>
                {status.session && (
                  <p className="text-xs text-muted-foreground">Session: {status.session}</p>
                )}
                {status.error && !status.connected && (
                  <p className="text-xs text-red-600">{status.error}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadStatus} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleReconnect} disabled={reconnecting}>
              {reconnecting ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
              {reconnecting ? 'Reconnecting...' : 'Reconnect'}
            </Button>
            <Button variant="outline" onClick={loadQr}>
              <QrCode className="h-4 w-4 mr-1" /> Show QR Code
            </Button>
          </div>

          {/* QR Code */}
          {qrData && (
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
              <p className="text-sm font-medium mb-2">Scan this QR code with WhatsApp</p>
              <p className="text-xs text-muted-foreground mb-4">
                Open WhatsApp → Linked Devices → Link a Device
              </p>
              {qrData.qr && (
                <img
                  src={qrData.qr}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 mx-auto border rounded"
                />
              )}
              {qrData.message && (
                <p className="text-xs text-muted-foreground mt-2">{qrData.message}</p>
              )}
            </div>
          )}

          {/* Setup Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions</h4>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Deploy WAHA on your VPS using <code className="bg-blue-100 px-1 rounded">infra/waha/docker-compose.yml</code></li>
              <li>Start the container: <code className="bg-blue-100 px-1 rounded">docker compose up -d</code></li>
              <li>Click "Show QR Code" and scan with WhatsApp</li>
              <li>Set <code className="bg-blue-100 px-1 rounded">WAHA_URL</code> and <code className="bg-blue-100 px-1 rounded">WAHA_API_KEY</code> in wrangler.jsonc</li>
              <li>Configure WAHA webhook to point to <code className="bg-blue-100 px-1 rounded">YOUR_DOMAIN/api/whatsapp/webhook</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
