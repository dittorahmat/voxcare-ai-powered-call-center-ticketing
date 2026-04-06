import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { apiGet, apiPatch } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';

export function CustomerProfilePage() {
  const { user, logout } = useCustomerAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<{ success: boolean; data: any }>('/api/customer/profile')
      .then(res => {
        if (res.success) {
          setName(res.data.name || '');
          setPhone(res.data.phone || '');
          setCompany(res.data.company || '');
        }
      }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPatch('/api/customer/profile', { name, phone, company });
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    setLoading(false);
  };

  const handleLogout = async () => { await logout(); window.location.href = '/customer/login'; };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/customer/dashboard" className="font-bold text-lg">VoxCare Customer Portal</Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" /> Sign Out</Button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile Settings</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-gray-50" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+62 xxx xxxx xxxx" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={company} onChange={e => setCompany(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
