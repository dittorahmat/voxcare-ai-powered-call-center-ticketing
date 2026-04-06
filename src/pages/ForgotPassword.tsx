import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneCall, Mail, CheckCircle2 } from 'lucide-react';
import { apiPost } from '@/lib/apiClient';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiPost<{ success: boolean; data?: { message: string; resetToken?: string } }>('/api/auth/forgot-password', { email });
      if (res.success) {
        setSent(true);
        if (res.data?.resetToken) setResetToken(res.data.resetToken); // Show token in dev mode
      } else {
        setError(res.data?.message || 'Request failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <Card className="w-full max-w-md mx-4 border-none shadow-2xl bg-white/95">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mb-4">
              <Mail className="h-7 w-7" />
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>If an account exists with that email, a password reset link has been sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Link to="/login"><Button variant="outline">Back to Login</Button></Link>
            </div>
            {resetToken && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                <p className="font-bold mb-1">Dev Mode — Reset Token:</p>
                <code className="break-all">{resetToken}</code>
                <p className="mt-1"><Link to={`/reset-password?token=${resetToken}`} className="text-indigo-600 hover:underline">Use this link →</Link></p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <Card className="w-full max-w-md mx-4 border-none shadow-2xl bg-white/95">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-4">
            <PhoneCall className="h-7 w-7" />
          </div>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Enter your email address and we'll send you a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@voxcare.com" />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-indigo-600 hover:underline">← Back to Login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
