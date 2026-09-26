'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Download, ExternalLink, Eye, EyeOff, Link2, Loader2, LogOut, Package, RefreshCw, ShoppingBag, Star, Truck, UserRound, X } from 'lucide-react';
import { isDigital } from '@/lib/money';
import type { Order } from '@/db/schema';
import { formatINR } from '@/lib/money';
import { Brand, InstagramIcon, YoutubeIcon, XIcon } from './visuals';
import { ShippingSteps } from './ship-steps';
import { patchFetchWithSessionTokens, saveSessionToken, clearSessionToken, captureTokenFromUrl, loginUrl } from './session-token';
import Modal from './modal';

type User = { id: string; name: string; email: string } | null;

export default function Account() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [linkToken, setLinkToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reviewFor, setReviewFor] = useState<{ productId: string; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      const r = await fetch('/api/user/orders');
      if (!r.ok) return;
      setOrders(await r.json());
    } catch {}
  }, []);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/user/session');
      const d = await r.json();
      setUser(d.user);
      if (d.user) await loadOrders();
    } catch {
      setError('Could not connect. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [loadOrders]);

  useEffect(() => {
    captureTokenFromUrl();
    patchFetchWithSessionTokens();
    void check();
    const i = setInterval(loadOrders, 30000);
    return () => clearInterval(i);
  }, [check, loadOrders]);

  const auth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/user/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, name: form.get('name'), email: form.get('email'), password: form.get('password') }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      saveSessionToken('user', data.token);
      const probe = await window.fetch('/api/user/session', { cache: 'no-store', credentials: 'omit' }).then((x) => x.json());
      if (probe.user) {
        await check();
        setNotice(mode === 'signup' ? 'Account created — welcome aboard!' : 'Welcome back!');
        return;
      }
      if (data.token && /^[a-f0-9]{64}$/i.test(String(data.token))) {
        window.location.assign(loginUrl('user', '/account', data.token));
        return;
      }
      throw Error('Your browser is holding its own session and refusing all others. Try a normal (non-incognito, non-embedded) window to continue.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch('/api/user/session', { method: 'DELETE' });
    clearSessionToken('user');
    setUser(null);
    setOrders([]);
  };

  const linkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const token = linkToken.trim().split('/').pop() || '';
      const r = await fetch('/api/user/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setLinkToken('');
      setNotice(`Order ${data.orderId} is now linked to your account.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link order.');
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewFor) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: reviewFor.productId, rating, comment }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setReviewFor(null);
      setComment('');
      setNotice('Thanks! Your review is now live on the product page.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post review.');
    } finally {
      setBusy(false);
    }
  };

  const paidOrders = orders.filter((o) => o.status === 'paid').length;
  const inTransit = orders.filter((o) => ['shipped', 'out_for_delivery', 'packed'].includes(o.shipping)).length;

  return (
    <div className="account-page">
      <header className="standalone-header">
        <Link href="/" aria-label="Back to store">
          <Brand />
        </Link>
        <div className="standalone-header-actions">
          <Link className="text-link" href="/">
            <ArrowLeft size={14} /> Continue shopping
          </Link>

        </div>
      </header>

      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <main className="account-wrap">
        {loading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={30} />
            <p>Loading your account…</p>
          </div>
        ) : !user ? (
          <div className="account-auth-card">
            <span className="account-auth-icon">
              <UserRound size={26} />
            </span>
            <span className="eyebrow">MY ORDERS · REVIEWS · TRACKING</span>
            <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back, builder'}</h1>
            <p>One account for your purchases, live shipping updates, and reviews that help other builders.</p>
            <div className="auth-tabs">
              <button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>
                Sign in
              </button>
              <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>
                Create account
              </button>
            </div>
            <form className="admin-form" onSubmit={auth}>
              {mode === 'signup' && (
                <label>
                  Full name
                  <input name="name" required maxLength={100} placeholder="Aarav Sharma" autoComplete="name" />
                </label>
              )}
              <label>
                Email address
                <input name="email" required type="email" maxLength={254} placeholder="you@example.com" autoComplete="email" />
              </label>
              <label>
                Password
                <span className="password-wrap">
                  <input name="password" required type={showPassword ? 'text' : 'password'} minLength={8} maxLength={128} placeholder="At least 8 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                  <button type="button" className="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button button-lime full-width" disabled={busy}>
                {busy ? <Loader2 size={17} className="spin" /> : mode === 'signup' ? 'Create my account' : 'Sign in'}
              </button>
            </form>
            <p className="account-hint">Guest checkouts can be attached later with your private order link.</p>
          </div>
        ) : (
          <>
            <div className="account-head">
              <div className="account-card">
                <span className="account-avatar-big">{user.name.trim().charAt(0).toUpperCase()}</span>
                <div>
                  <span className="eyebrow">MY ACCOUNT</span>
                  <h1>Hey, {user.name.split(' ')[0]}.</h1>
                  <p>{user.email}</p>
                </div>
                <button className="button button-secondary" onClick={signOut}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
              <div className="account-stats">
                <div>
                  <b>{orders.length}</b>
                  <span>Orders</span>
                </div>
                <div>
                  <b>{paidOrders}</b>
                  <span>Confirmed</span>
                </div>
                <div>
                  <b>{inTransit}</b>
                  <span>In transit</span>
                </div>
              </div>
            </div>

            <form className="link-order-bar" onSubmit={linkOrder}>
              <Link2 size={17} />
              <input aria-label="Private order link or token" placeholder="Paste a private order link to attach a guest checkout…" value={linkToken} onChange={(e) => setLinkToken(e.target.value)} />
              <button className="button button-secondary" disabled={busy || !linkToken.trim()}>
                Link order
              </button>
              {error && <small className="inline-error">{error}</small>}
            </form>

            {orders.length === 0 ? (
              <div className="empty-state account-empty">
                <ShoppingBag size={36} />
                <h2>No orders yet — your first build awaits.</h2>
                <p>Browse components and check out with this email to see orders, shipping updates, and reviews here.</p>
                <Link className="button button-lime" href="/">
                  Explore components <ArrowUpRight size={15} />
                </Link>
              </div>
            ) : (
              orders.map((o) => (
                <article className="account-order" key={o.id}>
                  <div className="account-order-head">
                    <div>
                      <b>{o.id}</b>
                      <small>
                        {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.items.length} item{o.items.length !== 1 ? 's' : ''}
                      </small>
                    </div>
                    <span className={'status status-' + o.status}>{o.status === 'pending' ? 'Payment pending' : o.status}</span>
                    <strong>{formatINR(o.total)}</strong>
                    <Link className="icon-button" href={'/orders/' + o.token} target="_blank" aria-label="Open private order page" title="Private order page">
                      <ExternalLink size={14} />
                    </Link>
                  </div>

                  {o.status === 'paid' && (
                    <div className="account-shipping">
                      <div className="account-shipping-top">
                        <span>
                          <Truck size={15} /> Delivery status
                        </span>
                        {!o.address && <small>Digital delivery · downloads below</small>}
                      </div>
                      {o.address ? (
                        <p className="account-address">
                          {o.address}
                          {o.city ? `, ${o.city}` : ''}
                          {o.state ? `, ${o.state}` : ''} {o.pincode || ''}
                        </p>
                      ) : null}
                      <ShippingSteps shipping={o.shipping} />
                      {o.shippingUpdatedAt && (
                        <small className="ship-updated">Last updated {new Date(o.shippingUpdatedAt).toLocaleString('en-IN')}</small>
                      )}
                      {(o.courier || o.trackingUrl) && (
                        <div className="tracking-line">
                          <Package size={14} />
                          {o.courier && <span>{o.courier}</span>}
                          {o.trackingUrl && (
                            <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                              Track shipment <ArrowUpRight size={12} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="account-order-items">
                    {o.items.map((item) => (
                      <div className="account-item" key={item.id}>
                        <div>
                          <b>{item.name}</b>
                          <small>{formatINR(item.price)}</small>
                        </div>
                        <div className="account-item-actions">
                          {o.status === 'paid' && (
                            <>
                              {item.digital && (
                                <a className="text-link" href={`/api/download/${item.id}?token=${o.token}`}>
                                  <Download size={13} /> Download
                                </a>
                              )}
                              {!item.digital && (
                                <span className="ship-hint-pill"><Truck size={13} /> {o.shipping === 'delivered' ? 'Delivered' : 'Shipping'}</span>
                              )}
                              <button className="text-link" onClick={() => { setReviewFor({ productId: item.id, name: item.name }); setRating(5); setComment(''); }}>
                                <Star size={13} /> Review
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </>
        )}
      </main>

      {reviewFor && (
        <Modal title={`Review · ${reviewFor.name}`} onClose={() => setReviewFor(null)}>
          <form className="review-form review-form-modal" onSubmit={submitReview}>
            <span className="stars-row stars-edit">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={n <= rating ? 'star star-on' : 'star'} aria-label={`${n} stars`} onClick={() => setRating(n)}>
                  <Star size={22} fill={n <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </span>
            <textarea rows={3} required maxLength={1500} placeholder="How was the quality, delivery, and support?" value={comment} onChange={(e) => setComment(e.target.value)} />
            {error && <p className="form-error">{error}</p>}
            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={() => setReviewFor(null)}>
                Cancel
              </button>
              <button className="button button-lime" disabled={busy || comment.trim().length < 3}>
                {busy ? <Loader2 size={15} className="spin" /> : 'Post review'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export { InstagramIcon, YoutubeIcon, XIcon };
