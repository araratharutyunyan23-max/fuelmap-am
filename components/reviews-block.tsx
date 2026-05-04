'use client';

import { useMemo, useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/star-rating';
import { useAuth } from '@/lib/auth-store';
import { useReviews, type StationReview } from '@/lib/reviews-store';
import { useT, useLocale } from '@/lib/locale-store';
import { cn } from '@/lib/utils';

interface ReviewsBlockProps {
  stationId: string;
  onLoginRequired: () => void;
}

function formatDate(iso: string, locale: 'ru' | 'hy'): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'hy' ? 'hy-AM' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export function ReviewsBlock({ stationId, onLoginRequired }: ReviewsBlockProps) {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { reviews, loading, submit, remove } = useReviews(stationId);

  const ownReview = useMemo<StationReview | undefined>(
    () => (user ? reviews.find((r) => r.userId === user.id) : undefined),
    [reviews, user]
  );
  const otherReviews = useMemo(
    () => (user ? reviews.filter((r) => r.userId !== user.id) : reviews),
    [reviews, user]
  );

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setRating(ownReview?.rating ?? 0);
    setComment(ownReview?.comment ?? '');
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setRating(0);
    setComment('');
    setError(null);
  };

  const onSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError(t('reviews.errorRating'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await submit(rating, comment);
    setSubmitting(false);
    if (error) {
      setError(error.includes('rate_limit') ? t('common.rateLimited') : error);
      return;
    }
    cancelEdit();
  };

  const onDelete = async () => {
    if (!ownReview) return;
    if (!confirm(t('reviews.deleteConfirm'))) return;
    await remove(ownReview.id);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('reviews.title')}{' '}
          <span className="text-sm font-normal text-slate-400">({reviews.length})</span>
        </h2>
      </div>

      {/* Own review or compose form */}
      {editing ? (
        <div className="bg-slate-50 rounded-xl p-4 mb-3">
          <div className="mb-3">
            <p className="text-sm text-slate-600 mb-2">{t('reviews.yourRating')}</p>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('reviews.commentPlaceholder')}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            rows={3}
            maxLength={500}
          />
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <Button onClick={onSubmit} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('reviews.submit')}
            </Button>
            <Button variant="outline" onClick={cancelEdit} disabled={submitting}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : ownReview ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-emerald-900">{t('reviews.yourReview')}</p>
              <StarRating value={ownReview.rating} readOnly size="sm" className="mt-1" />
            </div>
            <div className="flex gap-1">
              <button
                onClick={startEdit}
                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                aria-label={t('reviews.edit')}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                aria-label={t('reviews.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {ownReview.comment && (
            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{ownReview.comment}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">{formatDate(ownReview.updatedAt, locale)}</p>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full mb-3"
          onClick={() => (user ? startEdit() : onLoginRequired())}
        >
          {user ? t('reviews.leaveReview') : t('reviews.loginToReview')}
        </Button>
      )}

      {/* Other reviews */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : otherReviews.length === 0 && !ownReview ? (
        <p className="text-sm text-slate-400 text-center py-4">{t('reviews.empty')}</p>
      ) : (
        <div className="space-y-3">
          {otherReviews.map((r) => (
            <div key={r.id} className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-slate-700">
                  {r.userName || t('reviews.anonymous')}
                </p>
                <StarRating value={r.rating} readOnly size="sm" />
              </div>
              {r.comment && (
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{r.comment}</p>
              )}
              <p className="text-xs text-slate-400 mt-2">{formatDate(r.createdAt, locale)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
