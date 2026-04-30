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
import { type Station } from '@/lib/data';
import { StationsProvider } from '@/lib/stations-store';

type Screen = 'onboarding' | 'map' | 'list' | 'detail' | 'cheapest' | 'submit' | 'profile' | 'settings' | 'history';

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
    <StationsProvider>
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onStart={handleStart} onSkip={handleStart} />
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
  );
}
