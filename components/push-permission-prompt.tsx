'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/locale-store';
import {
  isPushSupported,
  isStandaloneDisplay,
  pushPermission,
  subscribeToPush,
} from '@/lib/push';
import { useAuth } from '@/lib/auth-store';
import { track } from '@/lib/analytics';

const STORAGE_KEY = 'push_prompt_v1';

// Custom pre-prompt that explains *why* we want to send push before
// triggering the native permission dialog. Shows once per device after
// login, only when push is actually usable (i.e. PWA on iOS or any
// modern browser elsewhere). Tracking flag in localStorage means we
// don't pester the user a second time — they can re-enable from the
// profile toggle.
export function PushPermissionPrompt() {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    if (typeof window === 'undefined') return;
    if (!isPushSupported() || !isStandaloneDisplay()) return;
    if (pushPermission() !== 'default') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Tiny delay so it doesn't slam the user the second auth resolves.
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, [authLoading, user]);

  const dismiss = (mark: 'asked' | 'later') => {
    localStorage.setItem(STORAGE_KEY, mark);
    setShow(false);
    if (mark === 'later') track('push_prompt_dismissed');
  };

  const enable = async () => {
    dismiss('asked');
    track('push_prompt_accepted');
    const result = await subscribeToPush();
    track(result.ok ? 'push_subscribed' : 'push_subscribe_failed', {
      reason: result.reason,
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 pb-7">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {t('pushPrompt.title')}
            </h2>
            <p className="text-sm text-slate-500">
              {t('pushPrompt.body')}
            </p>
          </div>
          <button
            onClick={() => dismiss('later')}
            aria-label="close"
            className="p-1 -m-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={enable}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold"
          >
            {t('pushPrompt.enable')}
          </Button>
          <button
            onClick={() => dismiss('later')}
            className="w-full h-10 text-sm text-slate-500 hover:text-slate-700"
          >
            {t('pushPrompt.notNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
