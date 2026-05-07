'use client';

import { useEffect, useState } from 'react';
import { MapPin, TrendingDown, Bell, Droplets, ArrowUpRight, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLocale, useT } from '@/lib/locale-store';
import { installArticleUrl, isAppInstalled } from '@/lib/install-link';
import { supabase } from '@/lib/supabase';

interface OnboardingScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onGuest: () => void;
}

export function OnboardingScreen({ onLogin, onRegister, onGuest }: OnboardingScreenProps) {
  const t = useT();
  const { locale } = useLocale();
  // Computed on the client so navigator.userAgent + display-mode work.
  // Hide the CTA when we're already running as an installed PWA — telling
  // somebody who's already in the shell how to install it is noise.
  const [installUrl, setInstallUrl] = useState<string | null>(null);
  useEffect(() => {
    if (isAppInstalled()) return;
    setInstallUrl(installArticleUrl(locale));
  }, [locale]);

  // Referral banner: if the user landed via /?r=CODE the code was
  // stashed in localStorage by app/page.tsx. Look up the referrer's
  // display name via the anonymous-safe RPC and show a small banner
  // so they know what they're signing up for.
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [hasReferralCode, setHasReferralCode] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = window.localStorage.getItem('fuelmap.referral_code');
    if (!code) return;
    setHasReferralCode(true);
    let cancelled = false;
    supabase.rpc('lookup_referrer_name', { code }).then(({ data }) => {
      if (cancelled) return;
      if (data && typeof data === 'string' && data.trim().length > 0) {
        setReferrerName(data.trim());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <MapPin className="w-10 h-10 text-emerald-600" />
            <Droplets className="w-4 h-4 text-orange-500 absolute -bottom-1 -right-1" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            FuelMap <span className="text-emerald-600">Armenia</span>
          </span>
        </div>

        {hasReferralCode && (
          <div className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl flex items-center gap-3">
            <Gift className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-900 font-medium">
              {referrerName
                ? t('onboarding.referral.banner', { name: referrerName })
                : t('onboarding.referral.banner_anon')}
            </p>
          </div>
        )}

        <p className="text-center text-lg text-slate-600 mb-10 text-balance">
          {t('onboarding.tagline')}
        </p>

        <div className="w-full space-y-4 mb-8">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
              <MapPin className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">{t('onboarding.feature.map')}</p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">{t('onboarding.feature.cheaper')}</p>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full flex-shrink-0">
              <Bell className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-700 font-medium">{t('onboarding.feature.alerts')}</p>
              {installUrl && (
                <a
                  href={installUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  {t('onboarding.feature.alerts.installCta')}
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8 space-y-3">
        <Button
          onClick={onRegister}
          className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
        >
          {t('onboarding.cta.register')}
        </Button>
        <Button
          onClick={onLogin}
          variant="outline"
          className="w-full h-14 text-base font-semibold rounded-xl border-slate-300"
        >
          {t('onboarding.cta.login')}
        </Button>
        <button
          onClick={onGuest}
          className="w-full py-3 text-slate-500 text-sm font-medium hover:text-slate-700"
        >
          {t('onboarding.cta.guest')}
        </button>
      </div>
    </div>
  );
}
