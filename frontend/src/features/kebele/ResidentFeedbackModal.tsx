import { useEffect, useState } from 'react';
import { Loader2, Star, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { ETHIOPIAN_PHONE_MESSAGE } from '../../lib/ethiopianPhone';

type Props = {
  open: boolean;
  appointmentId: number;
  phone: string;
  mode: 'create' | 'view' | 'edit';
  onClose: () => void;
  onSaved: () => void;
};

export function ResidentFeedbackModal({
  open,
  appointmentId,
  phone,
  mode: initialMode,
  onClose,
  onSaved,
}: Props) {
  const [mode, setMode] = useState(initialMode);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ratingError, setRatingError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError('');
    setRatingError('');
    if (initialMode === 'create') {
      setRating(0);
      setComment('');
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const { res, body } = await apiFetch(
          `/api/resident/feedback/${appointmentId}?phone=${encodeURIComponent(phone)}`,
          { skipAuth: true }
        );
        if (!res.ok || !body?.success || !body.data) {
          throw new Error((body as { error?: string })?.error || 'Failed to load feedback');
        }
        const data = body.data as { rating: number; comment?: string | null };
        setRating(data.rating);
        setComment(data.comment || '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load feedback');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, appointmentId, phone, initialMode]);

  async function handleSubmit() {
    if (rating < 1 || rating > 5) {
      setRatingError('Rating is required (1–5 stars).');
      return;
    }
    setRatingError('');
    setSubmitting(true);
    setError('');
    try {
      const payload = { phone, rating, comment: comment.trim() || undefined };
      if (mode === 'create') {
        const { res, body } = await apiFetch('/api/resident/feedback', {
          method: 'POST',
          skipAuth: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, appointmentId }),
        });
        if (!res.ok || !body?.success) {
          throw new Error((body as { error?: string })?.error || 'Submit failed');
        }
      } else {
        const { res, body } = await apiFetch(`/api/resident/feedback/${appointmentId}`, {
          method: 'PUT',
          skipAuth: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok || !body?.success) {
          throw new Error((body as { error?: string })?.error || 'Update failed');
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const readOnly = mode === 'view';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl text-gray-800">
            {mode === 'create' ? 'Leave feedback' : mode === 'edit' ? 'Edit feedback' : 'Your feedback'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-8">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">Rate your experience (required)</p>
            <div className="flex gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={readOnly || submitting}
                  onClick={() => setRating(star)}
                  className="p-1 disabled:opacity-60"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {ratingError ? <p className="text-sm text-red-600 mb-2">{ratingError}</p> : null}

            <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">
              Comment (optional)
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[100px]"
              placeholder="The service was fast and professional."
              value={comment}
              disabled={readOnly || submitting}
              onChange={(e) => setComment(e.target.value)}
            />

            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            {!phone ? (
              <p className="mt-2 text-sm text-amber-700">{ETHIOPIAN_PHONE_MESSAGE}</p>
            ) : null}

            <div className="flex gap-2 mt-6">
              {mode === 'view' ? (
                <>
                  <button
                    type="button"
                    className="flex-1 py-2 border rounded-lg text-sm"
                    onClick={onClose}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm"
                    onClick={() => setMode('edit')}
                  >
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex-1 py-2 border rounded-lg text-sm"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !phone}
                  >
                    {submitting ? 'Saving…' : 'Submit'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
