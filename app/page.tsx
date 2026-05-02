'use client';

import { useState } from 'react';
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
import { type Station } from '@/lib/data';
import { StationsProvider } from '@/lib/stations-store';
import { AuthProvider } from '@/lib/auth-store';
import { UserLocationProvider } from '@/lib/user-location';
import { LocaleProvider } from '@/lib/locale-store';

type Screen = 'onboarding' | 'map' | 'list' | 'detail' | 'cheapest' | 'submit' | 'profile' | 'settings' | 'history' | 'login' | 'register';

export default function FuelMapApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen>('map');

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
    </StationsProvider>
    </UserLocationProvider>
    </AuthProvider>
    </LocaleProvider>
  );
}
