'use client';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { I18nProvider, useI18n } from '@/context/I18nContext';
import { MainShell } from '@/components/layout/MainShell';

function MainAppContent() {
  const { user, token, login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('developer@riwi.com');
  const [password, setPassword] = useState('riwi2026');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('invalidCredentials'));
      }
      login(data.accessToken, data.refreshToken, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-very-light p-4">
        <div className="w-full max-w-md bg-white border border-gray-light rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-navy-blue">{t('title')}</h1>
            <p className="text-xs text-gray-medium mt-1">{t('subtitle')}</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-text-dark mb-1.5">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-very-light border border-gray-light rounded-xl px-4 py-3 text-sm text-text-dark focus:outline-none focus:border-purple-primary transition-all"
                placeholder="correo@riwi.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-dark mb-1.5">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-very-light border border-gray-light rounded-xl px-4 py-3 text-sm text-text-dark focus:outline-none focus:border-purple-primary transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-xs text-red-500 font-medium bg-red-50 border border-red-100 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-purple-primary hover:bg-purple-light text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? t('loggingIn') : t('login')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <MainShell />
    </ChatProvider>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <I18nProvider>
        <MainAppContent />
      </I18nProvider>
    </AuthProvider>
  );
}
