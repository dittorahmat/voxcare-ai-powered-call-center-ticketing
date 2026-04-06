import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  'open': 'bg-blue-100 text-blue-800', 'in-progress': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800', 'reopened': 'bg-orange-100 text-orange-800',
  'closed': 'bg-gray-100 text-gray-800',
};

export function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGet<{ success: boolean; data: any[] }>('/api/customer/tickets')
      .then(res => { if (res.success) setTickets(res.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = search ? tickets.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())) : tickets;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/customer/dashboard" className="font-bold text-lg">VoxCare Customer Portal</Link>
          <div className="flex gap-2">
            <Button asChild size="sm"><Link to="/customer/tickets/new"><Plus className="h-4 w-4 mr-1" /> New Ticket</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/customer/dashboard">Dashboard</Link></Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4">
            <CardTitle>My Tickets</CardTitle>
            <div className="relative flex-1 max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tickets found.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(t => (
                  <Link key={t.id} to={`/customer/tickets/${t.id}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition block">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.id} · {t.category} · {new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-800'}>{t.status}</Badge>
                    </div>
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

export function CustomerNewTicketPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General Inquiry');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiPost('/api/customer/tickets', { title, description, category, priority });
      if (res.success) {
        toast.success('Ticket created! Check your email for confirmation.');
        window.location.href = '/customer/tickets';
      }
    } catch { toast.error('Failed to create ticket'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/customer/dashboard" className="font-bold text-lg">VoxCare Customer Portal</Link>
          <Button asChild variant="outline" size="sm"><Link to="/customer/tickets">Back to Tickets</Link></Button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-8">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle>Create New Ticket</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technical Support">Technical Support</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                      <SelectItem value="Complaint">Complaint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} required className="min-h-[120px]" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Create Ticket'}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function CustomerTicketDetailPage() {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    apiGet<{ success: boolean; data: any }>(`/api/customer/tickets/${id}`)
      .then(res => { if (res.success) setTicket(res.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!ticket) return <div className="min-h-screen flex items-center justify-center">Ticket not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/customer/dashboard" className="font-bold text-lg">VoxCare Customer Portal</Link>
          <Button asChild variant="outline" size="sm"><Link to="/customer/tickets">Back to Tickets</Link></Button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{ticket.title}</CardTitle>
              <Badge className={STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-800'}>{ticket.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{ticket.id} · {ticket.category} · {ticket.priority} priority · Created {new Date(ticket.createdAt).toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
            </div>
            {ticket.publicNotes && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium mb-1">Response</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.publicNotes.text}</p>
                <p className="text-xs text-muted-foreground mt-2">— {ticket.publicNotes.authorName}, {new Date(ticket.publicNotes.timestamp).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
