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
      setError('Геолокация не поддерживается этим браузером');
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
        const map: Record<number, string> = {
          1: 'Доступ к геолокации запрещён',
          2: 'Не удалось определить позицию',
          3: 'Время ожидания истекло',
        };
        setError(map[err.code] ?? err.message);
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
