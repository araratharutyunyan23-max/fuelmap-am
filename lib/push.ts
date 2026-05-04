// Browser-side Web Push helpers. The server route holds the VAPID private
// key — here we just register with the browser, ship the resulting
// subscription to /api/push/subscribe, and let the SW deal with incoming
// notifications.

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// iOS only exposes the Notification API to PWAs installed to the home
// screen. If we're in a regular Safari tab the permission button does
// nothing, so we hide it and tell the user to install first.
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS — non-standard property on navigator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (navigator as any).standalone === true;
  const matchMediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || matchMediaStandalone;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function pushPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  return Notification.permission;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.ready;
  return reg;
}

export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'missing_vapid' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { ok: false, reason: 'not_logged_in' };

  const r = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!r.ok) {
    return { ok: false, reason: `server_${r.status}` };
  }
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true };

  const endpoint = sub.endpoint;
  const session = (await supabase.auth.getSession()).data.session;
  // Tear down browser side first; the server delete is best-effort.
  await sub.unsubscribe();
  if (session) {
    await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {});
  }
  return { ok: true };
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await getRegistration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}
