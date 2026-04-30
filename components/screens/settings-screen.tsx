'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronRight, User, LogOut, Globe, Bell, Fuel, Map, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { BottomNav } from '@/components/bottom-nav';
import { cn } from '@/lib/utils';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export function SettingsScreen({ onBack, onNavigate }: SettingsScreenProps) {
  const [language, setLanguage] = useState<'hy' | 'ru' | 'en'>('ru');
  const [mapTheme, setMapTheme] = useState<'standard' | 'satellite' | 'dark'>('standard');
  const [notifications, setNotifications] = useState({
    priceDrops: true,
    news: false,
    reviewReplies: true,
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Настройки</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Account Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">Аккаунт</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <User className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">Имя</p>
                <p className="font-medium text-slate-900">Арарат А.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Globe className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-slate-900">ararat@email.com</p>
              </div>
            </div>
            <button className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-slate-50 transition-colors">
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="font-medium text-red-500">Выйти</span>
            </button>
          </div>
        </div>

        {/* Language Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">Язык</h2>
          </div>
          <div className="p-4">
            <div className="flex bg-slate-100 rounded-lg p-1">
              {[
                { id: 'hy' as const, label: 'ՀԱՅ' },
                { id: 'ru' as const, label: 'RU' },
                { id: 'en' as const, label: 'EN' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                    language === lang.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500'
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">Уведомления</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-900">Падение цен</span>
              </div>
              <Switch
                checked={notifications.priceDrops}
                onCheckedChange={(checked) =>
                  setNotifications((n) => ({ ...n, priceDrops: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-900">Новости</span>
              </div>
              <Switch
                checked={notifications.news}
                onCheckedChange={(checked) =>
                  setNotifications((n) => ({ ...n, news: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-900">Ответы на отзывы</span>
              </div>
              <Switch
                checked={notifications.reviewReplies}
                onCheckedChange={(checked) =>
                  setNotifications((n) => ({ ...n, reviewReplies: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* Default Fuel Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">Топливо по умолчанию</h2>
          </div>
          <button className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Fuel className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-900">95</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Map Theme Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">Тема карты</h2>
          </div>
          <div className="p-4">
            <div className="flex bg-slate-100 rounded-lg p-1">
              {[
                { id: 'standard' as const, label: 'Standard' },
                { id: 'satellite' as const, label: 'Satellite' },
                { id: 'dark' as const, label: 'Dark' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setMapTheme(theme.id)}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                    mapTheme === theme.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500'
                  )}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">О приложении</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-900">Версия</span>
              </div>
              <span className="text-slate-500">1.0.0</span>
            </div>
            <button className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-slate-50 transition-colors">
              <span className="font-medium text-slate-900">Политика конфиденциальности</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
            <button className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-slate-50 transition-colors">
              <span className="font-medium text-slate-900">Поддержка</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}
