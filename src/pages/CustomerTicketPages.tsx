import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Send, Loader2, Paperclip, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ConversationThread } from '@/components/tickets/ConversationThread';

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
  const [suggestedArticles, setSuggestedArticles] = useState<any[]>([]);

  // Fetch KB suggestions as user types
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title.length > 3 || description.length > 10) {
        try {
          const params = new URLSearchParams();
          params.set('search', `${title} ${description}`);
          const res = await apiGet<{ success: boolean; data: any[] }>(`/api/knowledge-base/articles?${params}`);
          if (res.success) setSuggestedArticles(res.data.slice(0, 3));
        } catch { setSuggestedArticles([]); }
      } else {
        setSuggestedArticles([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [title, description]);

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
              {suggestedArticles.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Artikel yang mungkin membantu</span>
                  </div>
                  <div className="space-y-1">
                    {suggestedArticles.map(a => (
                      <Link
                        key={a.id}
                        to={`/kb/${a.id}`}
                        target="_blank"
                        className="block text-sm text-blue-700 hover:text-blue-900 hover:underline py-1"
                      >
                        {a.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
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
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    Promise.all([
      apiGet<{ success: boolean; data: any }>(`/api/customer/tickets/${id}`),
      apiGet<{ success: boolean; data: any[] }>(`/api/customer/tickets/${id}/replies`),
    ])
      .then(([ticketRes, repliesRes]) => {
        if (ticketRes.success) setTicket(ticketRes.data);
        if (repliesRes.success) setReplies(repliesRes.data);
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [replies]);

  const handleReply = async () => {
    if ((!replyText.trim() && selectedFiles.length === 0) || !ticket) return;
    setSending(true);

    try {
      // Upload attachments first
      const attachments: any[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch(`/api/customer/tickets/${ticket.id}/replies/attachments`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.success) attachments.push(uploadData.data);
        }
      }

      // Send reply with attachments
      const res = await apiPost(`/api/customer/tickets/${ticket.id}/replies`, {
        text: replyText.trim(),
        attachments,
      });
      if (res.success) {
        setReplies(prev => [...prev, res.data]);
        setReplyText('');
        setSelectedFiles([]);
        toast.success('Reply sent');
      }
    } catch {
      toast.error('Failed to send reply');
    }
    setSending(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!ticket) return <div className="min-h-screen flex items-center justify-center">Ticket not found</div>;

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

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
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Percakapan ({replies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
              <ConversationThread replies={replies} />
            </ScrollArea>
          </CardContent>
        </Card>

        {!isResolved && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Balas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Ketik balasan Anda..."
                    className="min-h-[80px]"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.ctrlKey) handleReply();
                    }}
                  />
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded">
                          <Paperclip className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{f.name}</span>
                          <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 ml-1">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Paperclip className="h-4 w-4 text-muted-foreground hover:text-foreground transition" />
                    </label>
                    <span className="text-xs text-muted-foreground">Lampiran (maks 10MB)</span>
                  </div>
                </div>
                <Button
                  onClick={handleReply}
                  disabled={sending || (!replyText.trim() && selectedFiles.length === 0)}
                  className="self-end"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Tekan Ctrl+Enter untuk mengirim</p>
            </CardContent>
          </Card>
        )}

        {isResolved && (
          <div className="text-center text-sm text-muted-foreground py-4">
            Tiket ini telah {ticket.status === 'resolved' ? 'selesai' : 'ditutup'}. Buat tiket baru jika Anda membutuhkan bantuan lebih lanjut.
          </div>
        )}
      </main>
    </div>
  );
}
