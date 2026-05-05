'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect away if already logged in as admin.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: ok } = await supabase.rpc('is_admin');
      if (!cancelled && ok) router.replace('/admin');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInErr) {
      setSubmitting(false);
      setError(
        signInErr.message === 'Invalid login credentials'
          ? 'Неверный email или пароль'
          : signInErr.message
      );
      return;
    }
    // Confirm admin rights before redirecting — non-admins shouldn't
    // ever see the dashboard, even if they happen to have a Supabase
    // account.
    const { data: ok, error: rpcErr } = await supabase.rpc('is_admin');
    setSubmitting(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    if (!ok) {
      await supabase.auth.signOut();
      setError('Этот аккаунт не входит в список администраторов.');
      return;
    }
    router.replace('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">FuelMap Admin</h1>
            <p className="text-xs text-slate-500">Вход для администраторов</p>
          </div>
        </div>

        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full h-11 px-3 mb-4 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          Пароль
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full h-11 px-3 mb-5 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Войти'}
        </button>
      </form>
    </div>
  );
}
