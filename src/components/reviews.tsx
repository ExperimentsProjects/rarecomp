'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Star, Trash2, MessageSquare, PenLine } from 'lucide-react';
import type { Review } from '@/db/schema';
import { ProductVisual } from './visuals';

type ReviewRow = Review & { product?: { id: string; name: string; preview: string; image: string | null } | null };

export function Stars({ value, size = 13, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <span className={onChange ? 'stars-row stars-edit' : 'stars-row'} role={onChange ? undefined : 'img'} aria-label={onChange ? undefined : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" className={n <= value ? 'star star-on' : 'star'} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)}>
            <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
          </button>
        ) : (
          <span key={n} className={n <= value ? 'star star-on' : 'star'}>
            <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
          </span>
        ),
      )}
    </span>
  );
}

function timeAgo(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Full reviews block shown under each product. */
export function ProductReviews({ productId, productName, onNotify }: { productId: string; productName: string; onNotify?: (m: string) => void }) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<'recent' | 'high' | 'low'>('recent');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/reviews?productId=' + encodeURIComponent(productId));
      const d = await r.json();
      setRows(d.reviews || []);
      setCanReview(!!d.canReview);
      setPurchased(!!d.purchased);
      setMe(d.user || null);
      if (d.myReview) {
        setRating(d.myReview.rating);
        setTitle(d.myReview.title || '');
        setComment(d.myReview.comment);
      }
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, title, comment }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setOpen(false);
      onNotify?.('Thanks! Your review is now live.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your review.');
    } finally {
      setBusy(false);
    }
  };

  const removeMine = async (id: string) => {
    try {
      await fetch('/api/reviews?id=' + id, { method: 'DELETE' });
      onNotify?.('Your review was removed.');
      await load();
    } catch {
      setError('Could not remove your review.');
    }
  };

  const count = rows.length;
  const avg = count ? rows.reduce((a, r) => a + r.rating, 0) / count : 0;
  const buckets = [5, 4, 3, 2, 1].map((n) => ({ n, c: rows.filter((r) => r.rating === n).length }));
  const mine = me ? rows.find((r) => r.userId === me.id) : null;
  const sorted = [...rows].sort((a, b) =>
    sort === 'high' ? b.rating - a.rating : sort === 'low' ? a.rating - b.rating : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="reviews-block" id="reviews">
      <div className="reviews-head">
        <h4>
          <MessageSquare size={15} /> Customer reviews
        </h4>
        {count > 0 && (
          <label className="review-sort">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort reviews">
              <option value="recent">Most recent</option>
              <option value="high">Highest rated</option>
              <option value="low">Lowest rated</option>
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <div className="reviews-loading">
          <Loader2 className="spin" size={18} /> Loading reviews…
        </div>
      ) : (
        <>
          {count > 0 && (
            <div className="rating-summary">
              <div className="rating-score">
                <b>{avg.toFixed(1)}</b>
                <Stars value={Math.round(avg)} size={14} />
                <small>{count} review{count !== 1 ? 's' : ''}</small>
              </div>
              <div className="rating-bars">
                {buckets.map(({ n, c }) => (
                  <div className="rating-bar" key={n}>
                    <span>{n}★</span>
                    <i>
                      <b style={{ width: count ? `${(c / count) * 100}%` : '0%' }} />
                    </i>
                    <small>{c}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Write / edit a review */}
          {canReview ? (
            open || (count === 0 && !mine) ? (
              <form className="review-form" onSubmit={submit}>
                <h5>{mine ? 'Update your review' : `Share your experience with ${productName.split(' — ')[0]}`}</h5>
                <div className="review-rating-row">
                  <Stars value={rating} size={22} onChange={setRating} />
                  <span>{['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}</span>
                </div>
                <input className="review-title-input" maxLength={90} placeholder="Headline (optional) — e.g. Works great with ESP32" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea rows={3} required minLength={10} maxLength={1500} placeholder="How was the build quality, delivery and performance? Real details help other builders." value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="review-form-foot">
                  <small>{purchased ? '✓ Your review will show a Verified purchase badge' : 'Posting as a signed-in customer'}</small>
                  <div>
                    {(open || mine) && (
                      <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>
                        Cancel
                      </button>
                    )}
                    <button className="button button-lime" disabled={busy || comment.trim().length < 10}>
                      {busy ? <Loader2 size={15} className="spin" /> : <Star size={15} />} {mine ? 'Update review' : 'Post review'}
                    </button>
                  </div>
                </div>
                {error && <p className="form-error">{error}</p>}
              </form>
            ) : (
              <button className="button button-secondary write-review-btn" onClick={() => setOpen(true)}>
                <PenLine size={15} /> {mine ? 'Edit your review' : 'Write a review'}
              </button>
            )
          ) : (
            <div className="review-signin-hint">
              <PenLine size={16} />
              <p>
                <Link href="/account" className="lime-text">
                  Sign in
                </Link>{' '}
                to share your review. Buyers get a <b>Verified purchase</b> badge.
              </p>
            </div>
          )}

          {/* Reviews list */}
          {count === 0 ? (
            <p className="muted no-reviews">No reviews yet — be the first builder to share your experience.</p>
          ) : (
            <div className="review-list">
              {sorted.map((r) => (
                <article className="review-item" key={r.id}>
                  <div className="review-top">
                    <span className="review-avatar">{r.userName.charAt(0).toUpperCase()}</span>
                    <div>
                      <b>{r.userName}</b>
                      <Stars value={r.rating} size={11} />
                    </div>
                    <small>{timeAgo(r.createdAt)}</small>
                  </div>
                  {r.title && <h5 className="review-title">{r.title}</h5>}
                  <p>{r.comment}</p>
                  <div className="review-foot">
                    {r.verified ? (
                      <span className="verified-pill">
                        <CheckCircle2 size={10} /> Verified purchase
                      </span>
                    ) : (
                      <span className="verified-pill unverified">Customer review</span>
                    )}
                    {me?.id === r.userId && (
                      <button className="text-link danger-text" onClick={() => removeMine(r.id)}>
                        <Trash2 size={12} /> Delete mine
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Storefront social-proof strip: newest reviews across every product. */
export function RecentReviews({ onOpenProduct }: { onOpenProduct?: (id: string) => void }) {
  const [rows, setRows] = useState<ReviewRow[]>([]);

  useEffect(() => {
    fetch('/api/reviews?recent=true')
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d) => setRows(d.reviews || []))
      .catch(() => {});
  }, []);

  if (!rows.length) return null;
  const avg = rows.reduce((a, r) => a + r.rating, 0) / rows.length;

  return (
    <section className="social-proof page-container">
      <div className="section-heading">
        <div>
          <div className="section-kicker">
            <span /> REAL REVIEWS FROM REAL BUILDERS
          </div>
          <h2>
            What builders <span>actually say.</span>
          </h2>
          <p>
            {avg.toFixed(1)} average from {rows.length} recent review{rows.length !== 1 ? 's' : ''} — written by customers, not us.
          </p>
        </div>
      </div>
      <div className="proof-grid">
        {rows.slice(0, 6).map((r) => (
          <article className="proof-card" key={r.id} onClick={() => r.product && onOpenProduct?.(r.product.id)} role={onOpenProduct ? 'button' : undefined} tabIndex={onOpenProduct ? 0 : -1} onKeyDown={(e) => { if (e.key === 'Enter' && r.product) onOpenProduct?.(r.product.id); }}>
            <Stars value={r.rating} size={12} />
            {r.title && <h4>{r.title}</h4>}
            <p>{r.comment.length > 150 ? r.comment.slice(0, 150) + '…' : r.comment}</p>
            <div className="proof-foot">
              <span className="proof-thumb">{r.product && <ProductVisual kind={r.product.preview} image={r.product.image} />}</span>
              <div>
                <b>{r.userName}</b>
                <small>{r.product?.name.split(' — ')[0]}</small>
              </div>
              {r.verified && (
                <span className="verified-pill">
                  <CheckCircle2 size={10} /> Verified
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
