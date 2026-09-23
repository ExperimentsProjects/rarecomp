'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock, Download, Loader2, Package, RefreshCw, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { Brand } from './visuals';
import { ShippingSteps } from './ship-steps';
import { formatINR } from '@/lib/money';
import type { Order } from '@/db/schema';

export default function OrderPage({ token }: { token: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/orders?token=' + encodeURIComponent(token));
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setOrder(data);
      try {
        const tokens: string[] = JSON.parse(localStorage.getItem('stackd-orders') || '[]');
        if (!tokens.includes(token)) localStorage.setItem('stackd-orders', JSON.stringify([token, ...tokens]));
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load your order.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="order-page">
      <header className="standalone-header">
        <Link href="/">
          <Brand />
        </Link>
        <Link href="/account" className="text-link">
          My Orders <ArrowUpRight size={13} />
        </Link>
      </header>
      <main className="order-page-card">
        {loading && !order ? (
          <div className="empty-state">
            <Loader2 className="spin" size={32} />
            <p>Opening your order…</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <XCircle size={35} />
            <h2>{error}</h2>
            <p>Please check that you have the complete private order link.</p>
            <button className="button button-secondary" onClick={load}>
              Try again <RefreshCw size={15} />
            </button>
          </div>
        ) : (
          order && (
            <>
              <div className="order-page-top">
                <span className="eyebrow">EXPERIMENTS_PROJECTS · ORDER</span>
                <span className={'status status-' + order.status}>{order.status === 'pending' ? 'Payment pending' : order.status}</span>
              </div>
              <div className="order-success">
                <span>
                  {order.status === 'paid' ? <CheckCircle2 size={32} /> : order.status === 'cancelled' ? <XCircle size={32} /> : <Clock size={32} />}
                </span>
                <h1>
                  {order.status === 'paid' ? 'All confirmed!' : order.status === 'cancelled' ? 'This order was cancelled.' : 'Almost there.'}
                </h1>
                <p>
                  {order.status === 'paid'
                    ? `Thanks, ${order.name.split(' ')[0]}. Your items are secured — downloads are below and shipping updates appear here in real time.`
                    : order.status === 'cancelled'
                      ? 'Please contact the store owner for questions about this order.'
                      : `Thanks, ${order.name.split(' ')[0]}. Complete payment to confirm this order. It will appear in My Orders once confirmed.`}
                </p>
              </div>
              <div className="order-meta">
                <div>
                  <small>ORDER NUMBER</small>
                  <b>{order.id}</b>
                </div>
                <div>
                  <small>PLACED ON</small>
                  <b>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
                </div>
                <div>
                  <small>DELIVERY</small>
                  <b>{order.address ? 'Physical' : 'Digital'}</b>
                </div>
              </div>

              {order.status === 'paid' && (
                <div className="account-shipping order-shipping">
                  <div className="account-shipping-top">
                    <span>
                      <Truck size={15} /> Shipping updates
                    </span>
                    {order.shippingUpdatedAt && <small>Updated {new Date(order.shippingUpdatedAt).toLocaleDateString('en-IN')}</small>}
                  </div>
                  <ShippingSteps shipping={order.shipping} />
                  {order.address && (
                    <p className="account-address">
                      {order.address}
                      {order.city ? `, ${order.city}` : ''}
                      {order.state ? `, ${order.state}` : ''} {order.pincode || ''}
                    </p>
                  )}
                  {(order.courier || order.trackingUrl) && (
                    <div className="tracking-line">
                      <Package size={14} />
                      {order.courier && <span>{order.courier}</span>}
                      {order.trackingUrl && (
                        <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                          Track shipment <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              <h3 className="order-items-title">Your components</h3>
              {order.items.map((item) => (
                <div className="order-line" key={item.id}>
                  <span>{item.name}</span>
                  <div>
                    <b>{formatINR(item.price)}</b>
                    {order.status === 'paid' && item.digital && (
                      <a className="button button-lime" href={`/api/download/${item.id}?token=${token}`}>
                        <Download size={14} /> Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
              <div className="checkout-total">
                <span>Total · INR</span>
                <b>{formatINR(order.total)}</b>
              </div>
              <div className="invoice-notice">
                <ShieldCheck size={19} />
                <div>
                  <b>Your private order link</b>
                  <p>Bookmark this page for live shipping status and downloads. Keep the link private — it grants access to your purchase.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="button button-secondary" onClick={load} disabled={loading}>
                  <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh status
                </button>
                <Link className="button button-lime" href="/">
                  Keep shopping <ArrowUpRight size={15} />
                </Link>
              </div>
            </>
          )
        )}
      </main>
      <p className="standalone-footnote">© {new Date().getFullYear()} Experiments_Projects · Made in India.</p>
    </div>
  );
}
