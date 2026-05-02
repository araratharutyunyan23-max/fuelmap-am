'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface StationReview {
  id: string;
  stationId: string;
  userId: string;
  userName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  station_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  // Joined from auth.users via the view (see fetchStationReviews).
  user_name?: string | null;
}

function rowToReview(r: DbRow): StationReview {
  return {
    id: r.id,
    stationId: r.station_id,
    userId: r.user_id,
    userName: r.user_name ?? null,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function useReviews(stationId: string | null) {
  const [reviews, setReviews] = useState<StationReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('station_reviews')
      .select('id, station_id, user_id, user_name, rating, comment, created_at, updated_at')
      .eq('station_id', stationId)
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setReviews((data ?? []).map((r: any) => rowToReview({ ...r, user_name: r.user_name })));
    setError(null);
    setLoading(false);
  }, [stationId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const submit = useCallback(
    async (rating: number, comment: string) => {
      if (!stationId) return { error: 'no station' };
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { error: 'not signed in' };
      const userName =
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split('@')[0] ??
        null;
      const payload = {
        station_id: stationId,
        user_id: user.id,
        user_name: userName,
        rating,
        comment: comment.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('station_reviews')
        .upsert(payload, { onConflict: 'station_id,user_id' });
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [stationId, refetch]
  );

  const remove = useCallback(
    async (reviewId: string) => {
      const { error } = await supabase.from('station_reviews').delete().eq('id', reviewId);
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [refetch]
  );

  return { reviews, loading, error, submit, remove, refetch };
}
