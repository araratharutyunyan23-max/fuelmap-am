'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-store';
import { track } from './analytics';

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  loading: boolean;
  isFavorite: (stationId: string) => boolean;
  toggle: (stationId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteIds: new Set(),
  loading: false,
  isFavorite: () => false,
  toggle: async () => {},
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Reload whenever the user changes (login / logout).
  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('user_favorites')
      .select('station_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setFavoriteIds(new Set((data ?? []).map((r) => r.station_id)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isFavorite = useCallback(
    (stationId: string) => favoriteIds.has(stationId),
    [favoriteIds]
  );

  // Optimistic toggle. The DB call is best-effort — on failure we revert
  // and surface nothing visible (caller can refetch by triggering a
  // user-id change if it really cares).
  const toggle = useCallback(
    async (stationId: string) => {
      if (!user) return;
      const wasFav = favoriteIds.has(stationId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFav) next.delete(stationId);
        else next.add(stationId);
        return next;
      });
      const result = wasFav
        ? await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('station_id', stationId)
        : await supabase
            .from('user_favorites')
            .insert({ user_id: user.id, station_id: stationId });
      if (result.error) {
        // Revert.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFav) next.add(stationId);
          else next.delete(stationId);
          return next;
        });
        return;
      }
      track(wasFav ? 'favorite_removed' : 'favorite_added', { station_id: stationId });
    },
    [favoriteIds, user]
  );

  const value = useMemo(
    () => ({ favoriteIds, loading, isFavorite, toggle }),
    [favoriteIds, loading, isFavorite, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
