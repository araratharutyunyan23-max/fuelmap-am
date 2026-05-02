'use client';

import { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, MapPin, Droplets, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-store';
import { useT } from '@/lib/locale-store';

interface RegisterScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onGoToLogin: () => void;
}

export function RegisterScreen({ onBack, onSuccess, onGoToLogin }: RegisterScreenProps) {
  const t = useT();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const validEmail = /\S+@\S+\.\S+/.test(email);
  const longEnough = password.length >= 6;
  const matches = password === confirm;
  const canSubmit =
    trimmedName.length >= 2 && validEmail && longEnough && matches && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await signUp(email.trim(), password, trimmedName);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 py-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="relative">
            <MapPin className="w-10 h-10 text-emerald-600" />
            <Droplets className="w-4 h-4 text-orange-500 absolute -bottom-1 -right-1" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            FuelMap <span className="text-emerald-600">Armenia</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2 text-center">{t('register.title')}</h1>
          <p className="text-slate-600 text-center mb-8">{t('register.subtitle')}</p>

          <label className="text-sm font-medium text-slate-500 mb-2 block">{t('register.name')}</label>
          <div className="relative mb-4">
            <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('register.namePlaceholder')}
              className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <label className="text-sm font-medium text-slate-500 mb-2 block">{t('login.email')}</label>
          <div className="relative mb-4">
            <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <label className="text-sm font-medium text-slate-500 mb-2 block">{t('login.password')}</label>
          <div className="relative mb-4">
            <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              className="w-full h-14 pl-12 pr-12 bg-slate-50 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <label className="text-sm font-medium text-slate-500 mb-2 block">{t('register.confirmPassword')}</label>
          <div className="relative mb-4">
            <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('register.confirmPlaceholder')}
              className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {confirm.length > 0 && !matches && (
            <p className="text-sm text-red-600 mb-3 -mt-1">{t('register.passwordsDontMatch')}</p>
          )}
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
          >
            {submitting ? t('register.submitting') : t('register.submit')}
          </Button>

          <p className="text-sm text-slate-500 text-center mt-6">
            {t('register.haveAccount')}{' '}
            <button
              onClick={onGoToLogin}
              className="text-emerald-600 font-semibold hover:underline"
            >
              {t('register.goToLogin')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
