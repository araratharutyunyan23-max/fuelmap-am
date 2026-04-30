'use client';

import { MapPin, TrendingDown, Bell, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';

interface OnboardingScreenProps {
  onStart: () => void;
  onSkip: () => void;
}

export function OnboardingScreen({ onStart, onSkip }: OnboardingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Language Switcher */}
      <div className="flex justify-end p-4">
        <LanguageSwitcher selected="ru" />
      </div>

      {/* Logo & Tagline */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <MapPin className="w-10 h-10 text-emerald-600" />
            <Droplets className="w-4 h-4 text-orange-500 absolute -bottom-1 -right-1" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            FuelMap <span className="text-emerald-600">Armenia</span>
          </span>
        </div>
        
        <p className="text-center text-lg text-slate-600 mb-12 text-balance">
          Все заправки Армении в одном приложении
        </p>

        {/* Features */}
        <div className="w-full space-y-5 mb-12">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
              <MapPin className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">
              Карта 500+ АЗС по всей стране
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">
              Сравнивай цены и экономь до 30 ֏/литр
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full">
              <Bell className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">
              Уведомления о падении цен
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-8 space-y-3">
        <Button 
          onClick={onStart}
          className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
        >
          Начать
        </Button>
        <button 
          onClick={onSkip}
          className="w-full py-3 text-slate-500 text-sm font-medium hover:text-slate-700"
        >
          Пропустить
        </button>
      </div>
    </div>
  );
}
