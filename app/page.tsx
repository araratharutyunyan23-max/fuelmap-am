'use client';

import { useEffect, useState } from 'react';
import { OnboardingScreen } from '@/components/screens/onboarding-screen';
import { MapScreen } from '@/components/screens/map-screen';
import { StationDetailScreen } from '@/components/screens/station-detail-screen';
import { ListScreen } from '@/components/screens/list-screen';
import { CheapestScreen } from '@/components/screens/cheapest-screen';
import { SubmitPriceScreen } from '@/components/screens/submit-price-screen';
import { ProfileScreen } from '@/components/screens/profile-screen';
import { SettingsScreen } from '@/components/screens/settings-screen';
import { HistoryScreen } from '@/components/screens/history-screen';
import { LoginScreen } from '@/components/screens/login-screen';
import { RegisterScreen } from '@/components/screens/register-screen';
import { AdminScreen } from '@/components/screens/admin-screen';
import { type Station } from '@/lib/data';
import { StationsProvider } from '@/lib/stations-store';
import { AuthProvider } from '@/lib/auth-store';
import { UserLocationProvider } from '@/lib/user-location';
import { LocaleProvider } from '@/lib/locale-store';

type Screen = 'onboarding' | 'map' | 'list' | 'detail' | 'cheapest' | 'submit' | 'profile' | 'settings' | 'history' | 'login' | 'register' | 'admin';

export default function FuelMapApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen>('map');
  const [highlightReportId, setHighlightReportId] = useState<string | null>(null);

  // Deep link from Telegram: ?admin=<report_id> jumps straight into the
  // admin screen with that report scrolled into view.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('admin');
    if (id) {
      setHighlightReportId(id);
      setCurrentScreen('admin');
      // Strip the param so a refresh doesn't keep re-routing.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleNavigate = (screen: string) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen as Screen);
  };

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    setPreviousScreen(currentScreen);
    setCurrentScreen('detail');
  };

  const handleBack = () => {
    setCurrentScreen(previousScreen);
  };

  const handleStart = () => {
    setCurrentScreen('map');
  };

  return (
    <LocaleProvider>
    <AuthProvider>
    <UserLocationProvider>
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

      {currentScreen === 'history' && (
        <HistoryScreen onNavigate={handleNavigate} />
      )}

      {currentScreen === 'profile' && (
        <ProfileScreen onNavigate={handleNavigate} />
      )}

      {currentScreen === 'settings' && (
        <SettingsScreen
          onBack={handleBack}
          onNavigate={handleNavigate}
        />
      )}

      {currentScreen === 'admin' && (
        <AdminScreen
          onBack={() => setCurrentScreen('profile')}
          highlightId={highlightReportId}
        />
      )}
    </StationsProvider>
    </UserLocationProvider>
    </AuthProvider>
    </LocaleProvider>
  );
}
