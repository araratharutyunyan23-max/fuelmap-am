'use client';

import { useEffect, useState } from 'react';
import { MapPin, TrendingDown, Bell, Droplets, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLocale, useT } from '@/lib/locale-store';
import { installArticleUrl } from '@/lib/install-link';

interface OnboardingScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onGuest: () => void;
}

export function OnboardingScreen({ onLogin, onRegister, onGuest }: OnboardingScreenProps) {
  const t = useT();
  const { locale } = useLocale();
  // Computed on the client so navigator.userAgent works.
  const [installUrl, setInstallUrl] = useState<string | null>(null);
  useEffect(() => {
    setInstallUrl(installArticleUrl(locale));
  }, [locale]);

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
