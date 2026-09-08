import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Phone, Mail } from 'lucide-react';
import { useAppStore } from '@/src/store';
import { cn } from '@/src/lib/utils';
import { BrandLogo } from '@/src/components/ui/BrandLogo';
import { api, setToken } from '@/src/lib/api';
import { connectSocket } from '@/src/lib/socket';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, theme } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setError('Please enter username and password');
      setIsLoading(false);
      return;
    }

    try {
      // Real auth against the backend: POST /api/auth/login verifies the bcrypt-hashed
      // password and issues a JWT. There is no client-side credential check — the backend
      // is the sole authority on who's allowed in and what role they have.
      const { token, user } = await api.auth.login(u, p);
      setToken(token);
      setUser(user);
      connectSocket(token); // open the real-time connection for the rest of the session
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--background)' }}
      data-theme={theme}
    >
      {/* Ambient background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'var(--accent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'var(--accent)' }} />
      </div>

      {/* Login card */}
      <div
        className="w-full max-w-md rounded-2xl shadow-xl border overflow-hidden relative z-10 animate-in fade-in zoom-in duration-500"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* ── Logo + heading ── */}
        <div className="px-8 pt-10 pb-0 flex flex-col items-center gap-0">
          {/* Logo — large, centered, prominent */}
          <BrandLogo size="lg" className="mb-7" />

          <h1 className="text-2xl font-bold tracking-tight text-center" style={{ color: 'var(--text)' }}>
            Log In
          </h1>
          <p className="mt-1 mb-0 text-sm text-center opacity-50" style={{ color: 'var(--text)' }}>
            Welcome to Coded Clouds Internal Management
          </p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleLogin} className="px-8 pt-6 pb-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
              {error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Username
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text)', opacity: 0.4 }}
              />
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or employee"
                className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  // @ts-ignore
                  '--tw-ring-color': 'color-mix(in srgb, var(--accent) 20%, transparent)',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Password
              </label>
              <button
                type="button"
                className="text-xs hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text)', opacity: 0.4 }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--text)', opacity: 0.4 }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              className="w-4 h-4 rounded accent-[var(--accent)]"
            />
            <label htmlFor="remember" className="text-sm opacity-60" style={{ color: 'var(--text)' }}>
              Remember me
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full text-white font-bold py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100',
              isLoading && 'cursor-not-allowed',
            )}
            style={{ background: 'var(--accent)' }}
          >
            {isLoading ? 'Authenticating…' : 'Log In'}
          </button>

          {/* Contact info */}
          <div className="pt-1 space-y-3">
            <a
              href="tel:+966557385262"
              className="flex items-center gap-3 group"
            >
              <span
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors group-hover:bg-accent/10"
                style={{ borderColor: 'var(--accent)' }}
              >
                <Phone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest opacity-50" style={{ color: 'var(--text)' }}>
                  Phone
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  +966-557385262
                </p>
              </div>
            </a>

            <a
              href="mailto:hashim@codedclouds.org"
              className="flex items-center gap-3 group"
            >
              <span
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors group-hover:bg-accent/10"
                style={{ borderColor: 'var(--accent)' }}
              >
                <Mail className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest opacity-50" style={{ color: 'var(--text)' }}>
                  E-Mail
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  hashim@codedclouds.org
                </p>
              </div>
            </a>
          </div>
        </form>


      </div>

      {/* Footer */}
      <p className="mt-6 text-xs opacity-30 relative z-10" style={{ color: 'var(--text)' }}>
        © 2026 Coded Clouds. All rights reserved.
      </p>
    </div>
  );
}
