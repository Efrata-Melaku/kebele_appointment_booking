import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Lock, Mail } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { setAuthSession, type AuthUser } from '../../lib/auth';

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export function LoginPage() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const expectedRole = role === 'admin' ? 'ADMIN' : role === 'staff' ? 'STAFF' : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!expectedRole) {
      setError('Invalid login link. Use /login/admin or /login/staff.');
      return;
    }
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
      if (data.user.role !== expectedRole) {
        throw new Error(
          expectedRole === 'ADMIN'
            ? 'This account is not an administrator'
            : 'This account is not a staff member'
        );
      }
      setAuthSession(data.token, data.user);
      navigate(expectedRole === 'ADMIN' ? '/admin' : '/staff', { replace: true });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  if (!expectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p className="text-gray-700">Invalid role. Go back to home.</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl text-gray-800 mb-2 text-center">
          {expectedRole === 'ADMIN' ? 'Admin login' : 'Staff login'}
        </h1>
        <p className="text-sm text-gray-600 mb-8 text-center">Kebele Appointment System</p>

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
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to role selection
          </button>
        </form>
      </div>
    </div>
  );
}
