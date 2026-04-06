import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiPost } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function CustomerVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useState(() => {
    // Verification is handled server-side by redirect
    // This page is shown when user arrives via email link
    setStatus('success');
  });

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><p>Verifying...</p></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          {status === 'success' ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-center">Email Verified!</CardTitle>
              <CardDescription className="text-center">Your account is now active. You can sign in.</CardDescription>
            </>
          ) : (
            <>
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
              <CardTitle className="text-center">Verification Failed</CardTitle>
              <CardDescription className="text-center">{message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/customer/login"><Button>Go to Login</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost('/api/customer/auth/forgot-password', { email });
      setSent(true);
    } catch { /* always show success */ setSent(true); }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <CardTitle className="text-center">Check your email</CardTitle>
            <CardDescription className="text-center">If an account exists with that email, we sent a password reset link.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>Enter your email and we'll send you a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input className="w-full h-10 px-3 border rounded-md" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomerResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain an uppercase letter'); return; }
    if (!/[a-z]/.test(password)) { setError('Password must contain a lowercase letter'); return; }
    if (!/[0-9]/.test(password)) { setError('Password must contain a number'); return; }

    setLoading(true);
    try {
      const res = await apiPost('/api/customer/auth/reset-password', { token, password });
      if (res.success) setSuccess(true);
      else setError((res as any).error || 'Failed');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <CardTitle className="text-center">Password Updated</CardTitle>
            <CardDescription className="text-center">You can now sign in with your new password.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set new password</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <input className="w-full h-10 px-3 border rounded-md" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Updating...' : 'Reset Password'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
