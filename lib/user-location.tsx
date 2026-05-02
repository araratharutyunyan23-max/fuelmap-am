'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface UserLocationContextValue {
  location: UserLocation | null;
  error: string | null;
  requesting: boolean;
  request: () => void;
}

const UserLocationContext = createContext<UserLocationContextValue>({
  location: null,
  error: null,
  requesting: false,
  request: () => {},
});

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('map.location.notSupported');
      return;
    }
    setRequesting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setRequesting(false);
      },
      (err) => {
        // Emit a translation key so consumers can render in current locale.
        const codeToKey: Record<number, string> = {
          1: 'map.location.denied',
          2: 'map.location.failed',
          3: 'map.location.timeout',
        };
        setError(codeToKey[err.code] ?? 'map.location.failed');
        setRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return (
    <UserLocationContext.Provider value={{ location, error, requesting, request }}>
      {children}
    </UserLocationContext.Provider>
  );
}

export function useUserLocation() {
  return useContext(UserLocationContext);
}
