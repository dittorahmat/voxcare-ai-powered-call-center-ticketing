import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { apiGet } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Inbox, CheckCircle2, Clock, Plus, LogOut } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'open': 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800',
  'reopened': 'bg-orange-100 text-orange-800',
  'closed': 'bg-gray-100 text-gray-800',
};

export function CustomerDashboardPage() {
  const { user, logout } = useCustomerAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ success: boolean; data: any[] }>('/api/customer/tickets')
      .then(res => { if (res.success) setTickets(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const handleLogout = async () => { await logout(); window.location.href = '/customer/login'; };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><Inbox className="size-5" /></div>
          <span className="font-bold text-lg">VoxCare Customer Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" /> Sign Out</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Tickets</p><h3 className="text-2xl font-bold">{stats.total}</h3></div>
              <Inbox className="size-8 text-indigo-600" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Open</p><h3 className="text-2xl font-bold">{stats.open}</h3></div>
              <Clock className="size-8 text-amber-600" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Resolved</p><h3 className="text-2xl font-bold">{stats.resolved}</h3></div>
              <CheckCircle2 className="size-8 text-green-600" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Tickets</CardTitle>
            <Button asChild size="sm"><Link to="/customer/tickets/new"><Plus className="h-4 w-4 mr-1" /> New Ticket</Link></Button>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-muted-foreground">Loading...</p> : tickets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tickets yet. Create your first ticket!</p>
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, 5).map(t => (
                  <Link key={t.id} to={`/customer/tickets/${t.id}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition block">
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.id} · {new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge className={STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-800'}>{t.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
