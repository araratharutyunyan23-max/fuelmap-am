'use client';

import { useEffect, useState } from 'react';
import { User, ChevronRight, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { useAuth } from '@/lib/auth-store';
import { useT } from '@/lib/locale-store';
import { supabase } from '@/lib/supabase';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const t = useT();
  const { user, signOut } = useAuth();
  const displayName =
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Guest';

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    supabase.rpc('is_admin').then(({ data }) => {
      if (!cancelled) setIsAdmin(Boolean(data));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
            {user?.email && (
              <p className="text-sm text-slate-400 mt-1 truncate">{user.email}</p>
            )}
          </div>
          {user ? (
            <button
              onClick={signOut}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              title={t('profile.signOut')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1"
            >
              <LogIn className="w-4 h-4" />
              {t('profile.signIn')}
            </button>
          )}
        </div>
      </div>

      {/* Admin link — only for admins */}
      {isAdmin && (
        <div className="px-4 pt-4">
          <button
            onClick={() => onNavigate('admin')}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="flex-1 font-medium text-slate-900">{t('profile.adminLink')}</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      )}

      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}
