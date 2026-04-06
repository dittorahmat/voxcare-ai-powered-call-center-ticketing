import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPatch } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Mail, Phone, Building, Star, Ticket, Calendar, FileText, Pencil, Save } from 'lucide-react';
import { format } from 'date-fns';

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

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

export function CustomerDetails() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const [custRes, ticketRes] = await Promise.all([
        apiGet<{ success: boolean; data: Customer }>(`/api/customers/${id}`),
        apiGet<{ success: boolean; data: Ticket[] }>('/api/tickets'),
      ]);
      setCustomer(custRes.data);
      setEditForm(custRes.data || {});
      const allTickets = ticketRes.data || [];
      setTickets(allTickets.filter(t => (t as any).customerId === id || t.customerName === custRes.data?.name));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      await apiPatch(`/api/customers/${id}`, editForm);
      setEditOpen(false);
      load();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  if (!customer) return <div className="py-20 text-center">Customer not found. <Link to="/customers" className="text-indigo-600">Back</Link></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link to="/customers"><ArrowLeft className="size-4" /></Link></Button>
          <div className="flex items-center gap-3">
            {customer.isVip && <Star className="size-6 text-amber-500" />}
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            {customer.isVip && <Badge className="bg-amber-100 text-amber-700 border-amber-200">VIP</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={() => { setEditForm(customer || {}); setEditOpen(true); }}>
          <Pencil className="size-4 mr-2" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-slate-400">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {customer.email && <div className="flex items-center gap-3"><Mail className="size-4 text-muted-foreground" /><span className="text-sm">{customer.email}</span></div>}
            {customer.phone && <div className="flex items-center gap-3"><Phone className="size-4 text-muted-foreground" /><span className="text-sm">{customer.phone}</span></div>}
            {customer.company && <div className="flex items-center gap-3"><Building className="size-4 text-muted-foreground" /><span className="text-sm">{customer.company}</span></div>}
            <div className="flex items-center gap-3"><Ticket className="size-4 text-muted-foreground" /><span className="text-sm">{customer.ticketCount || tickets.length} tickets</span></div>
            <div className="pt-2">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Created</p>
              <p className="text-sm">{format(new Date(customer.createdAt), 'MMM d, yyyy')}</p>
            </div>
            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {customer.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2"><FileText className="size-4" /> Notes</CardTitle></CardHeader>
          <CardContent>
            {customer.notes ? (
              <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes added.</p>
            )}
          </CardContent>
        </Card>

        {/* Ticket History */}
        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="size-5" /> Ticket History</CardTitle></CardHeader>
          <CardContent>
            {tickets.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {tickets.map(t => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link to={`/tickets/${t.id}`} className="font-semibold text-sm text-indigo-600 hover:underline">{t.id}</Link>
                      <p className="text-sm text-slate-700 ml-2">{t.title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={t.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize text-[10px]">{t.priority}</Badge>
                      <Badge variant="outline" className="capitalize text-[10px]">{t.status}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(t.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No ticket history found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Company</Label><Input value={editForm.company || ''} onChange={e => setEditForm({ ...editForm, company: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input value={(editForm.tags || []).join(', ')} onChange={e => setEditForm({ ...editForm, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={editForm.isVip || false} onCheckedChange={v => setEditForm({ ...editForm, isVip: v })} /><Label>VIP Customer</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><span className="animate-spin mr-2">⏳</span> Saving...</> : <><Save className="size-4 mr-2" /> Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
