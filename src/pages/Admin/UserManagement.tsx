import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/apiClient';
import { PaginationBar } from '@/components/PaginationBar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Shield, ShieldOff, Key, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'agent' | 'supervisor' | 'admin';
  availability: string;
  active: boolean;
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' as const });
  const [resetDialog, setResetDialog] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => { load(); }, [page, limit]);

  const load = async () => {
    try {
      const res = await apiGet<{ success: boolean; data: User[]; pagination?: any }>(`/api/users?page=${page}&limit=${limit}`);
      setUsers(res.data || []);
      if (res.pagination) setTotal(res.pagination.total);
    } catch { /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await apiPost('/api/auth/register', form);
      setDialogOpen(false);
      setForm({ name: '', email: '', password: '', role: 'agent' });
      load();
    } catch {
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || !resetPassword) return;
    try {
      await apiPatch(`/api/users/${resetUser.id}`, { passwordReset: resetPassword } as any);
      setResetDialog(false);
      setResetPassword('');
      setResetUser(null);
    } catch {
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await apiPatch(`/api/users/${user.id}`, { active: !user.active } as any);
      load();
    } catch {
    }
  };

  const handleRoleChange = async (user: User, role: string) => {
    try {
      await apiPatch(`/api/users/${user.id}`, { role });
      load();
    } catch {
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-50 text-red-700 border-red-200',
    supervisor: 'bg-amber-50 text-amber-700 border-amber-200',
    agent: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="size-7 text-indigo-600" /> User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage agents, supervisors, and admins.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4 mr-2" /> New User
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-6 border-b border-slate-50">
          <span className="text-sm text-muted-foreground">{total > 0 ? `${total} total` : `${users.length} users`}</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="px-6 py-4 font-semibold text-slate-900">{u.name}</td>
                      <td className="px-6 py-4 text-sm">{u.email}</td>
                      <td className="px-6 py-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="h-8 px-2 text-xs rounded-md border border-input bg-background capitalize"
                        >
                          <option value="agent">Agent</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={u.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>
                          {u.active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" title="Reset Password" onClick={() => { setResetUser(u); setResetDialog(true); }}>
                            <Key className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className={`size-8 ${u.active ? 'text-amber-600' : 'text-emerald-600'}`} title={u.active ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(u)}>
                            {u.active ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
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

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-2"><Label>Role</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name || !form.email || !form.password}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password — {resetUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>New Password</Label><Input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={!resetPassword}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
