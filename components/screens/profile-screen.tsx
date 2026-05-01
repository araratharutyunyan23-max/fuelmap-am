'use client';

import { User, ChevronRight, Lock, LogIn, LogOut } from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { userProfile } from '@/lib/data';
import { useAuth } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const displayName =
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Гость';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Profile Header */}
      <div className="bg-white px-4 py-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{displayName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                {userProfile.level} · {userProfile.karma} кармы
              </span>
            </div>
            {user?.email && (
              <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>
            )}
          </div>
          {user ? (
            <button
              onClick={signOut}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1"
            >
              <LogIn className="w-4 h-4" />
              Войти
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{userProfile.pricesSubmitted}</p>
            <p className="text-sm text-slate-500">цен</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{userProfile.saved}</p>
            <p className="text-sm text-slate-500">֏ сэкономлено</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{userProfile.visitedStations}</p>
            <p className="text-sm text-slate-500">АЗС</p>
          </div>
        </div>
      </div>

      {/* Recent Fills */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Последние заправки</h2>
          <button className="text-sm text-emerald-600 font-medium flex items-center gap-1">
            Все
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
          {userProfile.recentFills.map((fill, index) => (
            <div key={index} className="flex items-center gap-3 p-4">
              <div
                className="w-1 h-10 rounded-full"
                style={{ backgroundColor: fill.brandColor }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{fill.station}</p>
                  <span className="text-xs text-slate-400">{fill.fuel}</span>
                </div>
                <p className="text-sm text-slate-500">{fill.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{fill.amount.toLocaleString()} ֏</p>
                <p className="text-sm text-slate-500">{fill.liters} л</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Stations */}
      <div className="px-4 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Сохранённые АЗС</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {userProfile.savedStations.map((station) => (
            <div
              key={station.id}
              className="flex-shrink-0 w-28 bg-white rounded-xl p-3 shadow-sm text-center"
            >
              <div
                className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: station.brandColor }}
              >
                {station.brand.charAt(0)}
              </div>
              <p className="text-sm font-medium text-slate-900 truncate">{station.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="px-4 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Достижения</h2>
        <div className="grid grid-cols-3 gap-3">
          {userProfile.achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={cn(
                'bg-white rounded-xl p-4 text-center shadow-sm',
                !achievement.unlocked && 'opacity-50'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl',
                  achievement.unlocked ? 'bg-emerald-100' : 'bg-slate-100'
                )}
              >
                {achievement.unlocked ? (
                  achievement.icon
                ) : (
                  <Lock className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <p className="text-xs font-medium text-slate-700 truncate">{achievement.name}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}
