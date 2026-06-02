import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Lock, Mail } from 'lucide-react';
import { apiFetch } from '@kebele/shared/lib/api';
import { setAuthSession, type AuthUser } from '@kebele/shared/lib/auth';
import { KebeleLogo } from '@kebele/shared/components/KebeleLogo';
import { managementHomeForRole } from '@/lib/routes';

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export function PortalLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fromPath = (location.state as { from?: string } | null)?.from;
  const from =
    fromPath &&
    (fromPath.startsWith('/admin') || fromPath.startsWith('/staff'))
      ? fromPath
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { res, body } = await apiFetch('/api/auth/login', {
        method: 'POST',
        skipAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok || !body?.success || body.data == null) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Login failed');
      }
      const data = body.data as LoginResponse;
      if (data.user.role !== 'ADMIN' && data.user.role !== 'STAFF') {
        throw new Error('This portal is for administrators and staff only.');
      }
      setAuthSession(data.token, data.user);
      const target = from ?? managementHomeForRole(data.user.role);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bento-shell min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bento-card p-8">
        <div className="flex justify-center mb-6">
          <KebeleLogo size="xl" showText={false} />
        </div>
        <h1 className="text-2xl text-gray-800 mb-2 text-center">Management portal</h1>
        <p className="text-sm text-gray-600 mb-8 text-center">
          Sign in as administrator or staff
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          ) : null}

          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
