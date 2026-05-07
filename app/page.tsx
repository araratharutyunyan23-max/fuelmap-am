'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin, Droplets } from 'lucide-react';
import { OnboardingScreen } from '@/components/screens/onboarding-screen';
import { MapScreen } from '@/components/screens/map-screen';
import { StationDetailScreen } from '@/components/screens/station-detail-screen';
import { ListScreen } from '@/components/screens/list-screen';
import { CheapestScreen } from '@/components/screens/cheapest-screen';
import { SubmitPriceScreen } from '@/components/screens/submit-price-screen';
import { SubmitStationScreen } from '@/components/screens/submit-station-screen';
import { ProfileScreen } from '@/components/screens/profile-screen';
import { LoginScreen } from '@/components/screens/login-screen';
import { RegisterScreen } from '@/components/screens/register-screen';
import { type Station } from '@/lib/data';
import { StationsProvider } from '@/lib/stations-store';
import { AuthProvider, useAuth } from '@/lib/auth-store';
import { UserLocationProvider } from '@/lib/user-location';
import { LocaleProvider } from '@/lib/locale-store';
import { FavoritesProvider } from '@/lib/favorites-store';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { PushPermissionPrompt } from '@/components/push-permission-prompt';
import { InstallTracker } from '@/components/install-tracker';

type Screen = 'onboarding' | 'map' | 'list' | 'detail' | 'cheapest' | 'submit' | 'submit-station' | 'profile' | 'login' | 'register';

function SplashScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="flex items-center gap-2 mb-6">
        <div className="relative">
          <MapPin className="w-10 h-10 text-emerald-600" />
          <Droplets className="w-4 h-4 text-orange-500 absolute -bottom-1 -right-1" />
        </div>
        <span className="text-2xl font-bold text-slate-900">
          FuelMap <span className="text-emerald-600">Armenia</span>
        </span>
      </div>
      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
    </div>
  );
}

function AppShell() {
  const { user, loading: authLoading } = useAuth();
  // null until first auth check resolves; then either 'onboarding' (logged-out)
  // or 'map' (returning logged-in user). Subsequent state changes (logout etc.)
  // do NOT auto-redirect — user navigates as usual.
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen>('map');

  // Telegram bot still posts ?admin=<id> deep links from older messages —
  // bounce those at the new /admin area instead of trying to render an
  // admin screen inside the user app.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('admin');
    if (!id) return;
    if (id === 'stations') {
      window.location.replace('/admin/stations');
      return;
    }
    window.location.replace(`/admin/prices?highlight=${encodeURIComponent(id)}`);
  }, []);

  // Capture ?r=CODE referral parameter — stash in localStorage so the
  // signUp() flow in auth-store can attach it via apply_referral_code()
  // after Supabase creates the auth.users row.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('r');
    if (code && /^[A-Z0-9]{4,12}$/i.test(code)) {
      window.localStorage.setItem('fuelmap.referral_code', code.toUpperCase());
    }
  }, []);

  // Once auth state resolves, route returning users straight to the map.
  useEffect(() => {
    if (authLoading) return;
    setCurrentScreen((prev) => {
      if (prev !== null) return prev; // already routed (e.g. by ?admin=)
      return user ? 'map' : 'onboarding';
    });
  }, [authLoading, user]);


  const handleNavigate = (screen: string) => {
    setPreviousScreen(currentScreen ?? 'map');
    setCurrentScreen(screen as Screen);
  };

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    setPreviousScreen(currentScreen ?? 'map');
    setCurrentScreen('detail');
  };

  const handleBack = () => {
    setCurrentScreen(previousScreen);
  };

  const handleStart = () => {
    setCurrentScreen('map');
  };

  if (authLoading || currentScreen === null) {
    return <SplashScreen />;
  }

  return (
    <UserLocationProvider>
      <FavoritesProvider>
        <PushPermissionPrompt />
        <InstallTracker />
        <StationsProvider>
        {currentScreen === 'onboarding' && (
          <OnboardingScreen
            onLogin={() => handleNavigate('login')}
            onRegister={() => handleNavigate('register')}
            onGuest={handleStart}
          />
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onBack={handleBack}
            onSuccess={() => setCurrentScreen('map')}
            onGoToRegister={() => setCurrentScreen('register')}
          />
        )}

        {currentScreen === 'register' && (
          <RegisterScreen
            onBack={handleBack}
            onSuccess={() => setCurrentScreen('map')}
            onGoToLogin={() => setCurrentScreen('login')}
          />
        )}

        {currentScreen === 'map' && (
          <MapScreen
            onNavigate={handleNavigate}
            onStationSelect={handleStationSelect}
          />
        )}

        {currentScreen === 'detail' && selectedStation && (
          <StationDetailScreen
            station={selectedStation}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'list' && (
          <ListScreen
            onNavigate={handleNavigate}
            onStationSelect={handleStationSelect}
          />
        )}

        {currentScreen === 'cheapest' && (
          <CheapestScreen
            onBack={handleBack}
            onNavigate={handleNavigate}
            onStationSelect={handleStationSelect}
          />
        )}

        {currentScreen === 'submit' && (
          <SubmitPriceScreen
            onBack={handleBack}
            onNavigate={handleNavigate}
            initialStationId={previousScreen === 'detail' ? selectedStation?.id ?? null : null}
          />
        )}

        {currentScreen === 'submit-station' && (
          <SubmitStationScreen
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen onNavigate={handleNavigate} onStationSelect={handleStationSelect} />
        )}

        </StationsProvider>
      </FavoritesProvider>
    </UserLocationProvider>
  );
}

export default function FuelMapApp() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <AnalyticsProvider>
          <AppShell />
        </AnalyticsProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
