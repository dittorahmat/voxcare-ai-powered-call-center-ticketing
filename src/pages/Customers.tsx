import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '@/lib/apiClient';
import { PaginationBar } from '@/components/PaginationBar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, ExternalLink, Trash2, Star, User } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  isVip: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  ticketCount: number;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', tags: '', isVip: false, notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Customer[]; pagination?: any }>(`/api/customers?q=${encodeURIComponent(search)}&page=${page}&limit=${limit}`);
      setCustomers(res.data || []);
      if (res.pagination) setTotal(res.pagination.total);
    } catch { /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, page, limit]);

  const handleCreate = async () => {
    try {
      const res = await apiPost<{ success: boolean; data: Customer }>('/api/customers', {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      if (res.success) {
        setDialogOpen(false);
        setForm({ name: '', email: '', phone: '', company: '', tags: '', isVip: false, notes: '' });
        load();
      }
    } catch {
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try {
      await apiDelete(`/api/customers/${id}`);
      load();
    } catch {
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <User className="size-7 text-indigo-600" /> Customers
          </h1>
          <p className="text-muted-foreground mt-1">Manage customer profiles and contact information.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4 mr-2" /> New Customer
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="p-4 px-6 border-b border-slate-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search customers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-muted-foreground">{total > 0 ? `${total} total` : `${customers.length} results`}</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No customers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Tags</th>
                    <th className="px-6 py-4">Tickets</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {c.isVip && <Star className="size-4 text-amber-500" />}
                          <span className="font-semibold text-slate-900">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{c.email || '—'}</div>
                        <div className="text-xs text-muted-foreground">{c.phone || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{c.company || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                          {c.tags.length > 3 && <Badge variant="secondary" className="text-[10px]">+{c.tags.length - 3}</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline">{c.ticketCount || 0}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`/customers/${c.id}`)}>
                            <ExternalLink className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(c.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {total > 0 && (
          <PaginationBar page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Company</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="VIP, Enterprise" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.isVip} onCheckedChange={v => setForm({ ...form, isVip: v })} /><Label>VIP Customer</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
