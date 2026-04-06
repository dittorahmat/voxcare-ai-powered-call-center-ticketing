import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneCall, CheckCircle2 } from 'lucide-react';
import { apiPost } from '@/lib/apiClient';
import { validatePassword, getPasswordStrengthLabel, getPasswordStrengthColor } from '../../worker/password';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pwCheck = validatePassword(newPassword);

  useEffect(() => {
    if (!token) navigate('/forgot-password');
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!pwCheck.valid) { setError(pwCheck.errors.join(', ')); return; }
    setLoading(true);
    try {
      const res = await apiPost<{ success: boolean; data?: { message: string } }>('/api/auth/reset-password', { token, newPassword });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(res.data?.message || 'Reset failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <Card className="w-full max-w-md mx-4 border-none shadow-2xl bg-white/95">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-4">
            {success ? <CheckCircle2 className="h-7 w-7" /> : <PhoneCall className="h-7 w-7" />}
          </div>
          <CardTitle>{success ? 'Password Reset!' : 'Reset Password'}</CardTitle>
          <CardDescription>{success ? 'Redirecting to login...' : 'Enter your new password.'}</CardDescription>
        </CardHeader>
        {success ? (
          <CardContent className="text-center"><Link to="/login"><Button>Go to Login</Button></Link></CardContent>
        ) : (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                {newPassword && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pwCheck.score <= 1 ? 'bg-red-500' : pwCheck.score <= 2 ? 'bg-amber-500' : pwCheck.score <= 3 ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${(pwCheck.score / 4) * 100}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${getPasswordStrengthColor(pwCheck.score)}`}>{getPasswordStrengthLabel(pwCheck.score)}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
