'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Search, ShoppingBag, ChevronDown, Check, Heart, X, SlidersHorizontal, Grid2X2, Box, Sparkles, Code2, ShieldCheck, Download, ExternalLink, Plus, Menu, UserRound, Star, CheckCircle2, Loader2, Trash2, Copy, Mail, Phone, RefreshCw, Package, Truck } from 'lucide-react';
import type { Product, Order, Review, Section } from '@/db/schema';
import type { StoreSettings } from '@/lib/settings';
import { formatINR, isDigital } from '@/lib/money';
import { Brand, ProductVisual, InstagramIcon, YoutubeIcon, XIcon } from './visuals';
import { useIsAdmin } from './use-admin';
import { useTilt } from './use-tilt';
import { patchFetchWithSessionTokens } from './session-token';
import { ProductReviews, RecentReviews } from './reviews';
import Hero3D from './hero-3d';
import Modal from './modal';

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

type ProductView = Product & { ratingAvg?: number; ratingCount?: number; hasSource?: boolean };
type Dialog = 'cart' | 'checkout' | 'search' | null;

function Tilt({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, active } = useTilt<HTMLDivElement>(6);
  return (
    <div ref={ref} className={`tilt-card ${active ? 'is-tilting' : ''} ${className}`}>
      <span className="tilt-glow" />
      {children}
    </div>
  );
}

function StarsRow({ value, size = 13, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <span className={onChange ? 'stars-row stars-edit' : 'stars-row'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= value ? 'star star-on' : 'star'}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={onChange ? () => onChange(n) : undefined}
          tabIndex={onChange ? 0 : -1}
        >
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  );
}

async function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export default function Storefront() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [products, setProducts] = useState<ProductView[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [section, setSection] = useState('all');
  const [sort, setSort] = useState('popular');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState<ProductView | null>(null);
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [mobile, setMobile] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  const loadProducts = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetch('/api/products')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setProducts)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    patchFetchWithSessionTokens();
    loadProducts();
    fetch('/api/sections').then((r) => (r.ok ? r.json() : [])).then(setSections).catch(() => {});
    fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).then(setSettings).catch(() => {});
    fetch('/api/user/session').then((r) => (r.ok ? r.json() : { user: null })).then((d) => setUser(d.user)).catch(() => {});
    try {
      setCart(JSON.parse(localStorage.getItem('stackd-cart') || '[]'));
      setSaved(JSON.parse(localStorage.getItem('stackd-saved') || '[]'));
    } catch {}
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setDialog('search');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [loadProducts]);


  const updateCart = (ids: string[]) => {
    setCart(ids);
    localStorage.setItem('stackd-cart', JSON.stringify(ids));
  };
  const addToCart = (p: ProductView) => {
    if (cart.includes(p.id)) {
      setSelected(null);
      setDialog('cart');
      return;
    }
    updateCart([...cart, p.id]);
    notify(p.name.split(' — ')[0] + ' added to your cart');
  };
  const toggleSaved = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    localStorage.setItem('stackd-saved', JSON.stringify(next));
  };

  const cartProducts = products.filter((p) => cart.includes(p.id));
  const total = cartProducts.reduce((a, p) => a + p.price, 0);

  const filtered = useMemo(() => {
    const list = products.filter(
      (p) =>
        (section === 'all' || p.sectionId === section) &&
        (!onlySaved || saved.includes(p.id)) &&
        (!query || [p.name, p.description, ...p.tags].join(' ').toLowerCase().includes(query.toLowerCase())),
    );
    if (sort === 'low') list.sort((a, b) => a.price - b.price);
    if (sort === 'high') list.sort((a, b) => b.price - a.price);
    if (sort === 'new') list.sort((a, b) => (b.badge === 'NEW' ? 1 : 0) - (a.badge === 'NEW' ? 1 : 0));
    if (sort === 'popular') list.sort((a, b) => Number(b.featured) - Number(a.featured) || (b.ratingAvg || 0) - (a.ratingAvg || 0));
    return list;
  }, [products, section, sort, query, onlySaved, saved]);

  const browse = (sec = 'all') => {
    setSection(sec);
    setOnlySaved(false);
    setQuery('');
    setMobile(false);
    document.getElementById('components')?.scrollIntoView({ behavior: 'smooth' });
  };

  const openDialog = (d: Dialog) => {
    setError('');
    setDialog(d);
    setMobile(false);
  };

  const finishOrder = (placed: Order) => {
    try {
      const tokens: string[] = JSON.parse(localStorage.getItem('stackd-orders') || '[]');
      localStorage.setItem('stackd-orders', JSON.stringify([placed.token, ...tokens]));
    } catch {}
    updateCart([]);
    setOrder(placed);
    setDialog(null);
  };

  const checkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name'),
      email: form.get('email'),
      productIds: cartProducts.map((p) => p.id),
      address: form.get('address'),
      city: form.get('city'),
      state: form.get('state'),
      pincode: form.get('pincode'),
    };
    const headers = { 'Content-Type': 'application/json' };
    try {
      if (total > 0 && settings?.razorpayEnabled) {
        const r = await fetch('/api/checkout/razorpay', { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) throw Error('Unable to load Razorpay checkout. Please check your connection and retry.');
        const rzp = new window.Razorpay({
          key: data.razorpay.keyId,
          amount: data.razorpay.amount,
          currency: 'INR',
          name: 'Experiments_Projects',
          description: 'Component purchase',
          order_id: data.razorpay.orderId,
          prefill: { name: payload.name as string, email: payload.email as string },
          theme: { color: '#d1f876' },
          handler: async (response: Record<string, string>) => {
            const v = await fetch('/api/checkout/verify', { method: 'POST', headers, body: JSON.stringify({ token: data.order.token, ...response }) });
            const verified = await v.json();
            if (!v.ok) {
              setError(verified.error || 'Payment verification failed.');
              setBusy(false);
              return;
            }
            finishOrder(verified);
            setBusy(false);
          },
          modal: {
            ondismiss: () => {
              setBusy(false);
              setError('Payment was not completed. Your order is saved as pending — you can find it in My Orders.');
            },
          },
        });
        rzp.open();
      } else {
        const r = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        finishOrder(data);
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  };


  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setSubscribed(true);
      notify('You’re on the list. Welcome to the stack.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const orderPaid = order?.status === 'paid';

  const socials = [
    { name: 'Instagram', icon: InstagramIcon, url: settings?.instagramUrl },
    { name: 'YouTube', icon: YoutubeIcon, url: settings?.youtubeUrl },
    { name: 'X (Twitter)', icon: XIcon, url: settings?.xUrl },
  ].filter((s) => s.url);

  return (
    <div className="storefront">
      <header className="site-header">
        <div className="nav-container">
          <Link href="/" className="brand-link" aria-label="Experiments_Projects home">
            <Brand />
          </Link>
          <nav className={mobile ? 'main-nav mobile-open' : 'main-nav'}>
            <button onClick={() => browse('all')}>All Parts</button>
            <button onClick={() => browse('devices')}>
              Devices <span className="nav-new">NEW</span>
            </button>
            <button onClick={() => browse('source-code')}>
              Source Code <span className="nav-new">CODE</span>
            </button>
            <button onClick={() => browse('wireless')}>Wireless &amp; RF</button>
            <Link href="/account" className="nav-link-plain">
              My Orders
            </Link>
            <button className="mobile-search-menu" onClick={() => openDialog('search')}>
              <Search size={16} /> Search products
            </button>
            {isAdmin && (
              <Link href="/admin" className="nav-admin-pill">
                <ShieldCheck size={13} /> Admin panel
              </Link>
            )}
          </nav>
          <div className="nav-actions">
            <button className="icon-button search-trigger" aria-label="Search components" onClick={() => openDialog('search')}>
              <Search size={19} />
              <kbd>⌘ K</kbd>
            </button>
            <span className="nav-separator" />
            <button className="icon-button cart-trigger" onClick={() => openDialog('cart')} aria-label={`Shopping cart, ${cart.length} items`}>
              <ShoppingBag size={19} />
              <span>{cart.length}</span>
            </button>
            <button className="profile-button" aria-label={user ? `My account (${user.name})` : 'Sign in to my account'} onClick={() => router.push('/account')}>
              {user ? <span className="profile-initials">{user.name.trim().charAt(0).toUpperCase()}</span> : <UserRound size={16} />}
            </button>
            <button className="icon-button mobile-toggle" aria-label="Toggle menu" onClick={() => setMobile(!mobile)}>
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero page-container">
          <div className="hero-copy">
            <button className="hero-eyebrow" onClick={() => { setSort('new'); browse(); }}>
              <span className="live-dot" /> MADE IN INDIA · SHIPPED WITH CARE <ArrowUpRight size={12} />
            </button>
            <h1>
              Touch. Build.
              <br />
              <span>Electrify ideas.</span>
              <svg className="headline-star" viewBox="0 0 50 50">
                <path d="M25 2V48M2 25H48M8 8L42 42M8 42L42 8" stroke="currentColor" strokeWidth="3" />
              </svg>
            </h1>
            <p>
              Genuine boards, sensors & rare components.
              <br />
              Priced in ₹ with secure Razorpay checkout, and support from real builders across India.
            </p>
            <div className="hero-actions">
              <button className="button button-lime" onClick={() => browse('devices')}>
                Shop Devices <ArrowUpRight size={18} />
              </button>
              <button className="button button-secondary" onClick={() => browse('source-code')}>
                Source Code &amp; Firmware <Code2 size={16} />
              </button>
              <button className="button button-secondary" onClick={() => browse('all')}>
                All Components <Box size={16} />
              </button>
            </div>
            <div className="hero-social">
              <div className="avatars">
                <span className="avatar avatar-one">JL</span>
                <span className="avatar avatar-two">AK</span>
                <span className="avatar avatar-three">SM</span>
                <span className="avatar avatar-four">RD</span>
              </div>
              <div>
                <div className="social-stars">
                  ★★★★★ <span>1,200+ builders in India</span>
                </div>
                <p>Secure payments. Real reviews. Fast delivery.</p>
              </div>
            </div>
          </div>
          <Hero3D />
        </section>

        <section className="catalog-section page-container" id="components">
          <div className="section-heading">
            <div>
              <div className="section-kicker">
                <span /> THE BUILDING BLOCKS OF SOMETHING GREAT
              </div>
              <h2>
                Small parts. <span>Big possibilities.</span>
              </h2>
              <p>From your first LED to a custom AI rig — the lab has it.</p>
            </div>
            <Link className="text-link" href="/account">
              My orders & tracking <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="catalog-toolbar">
            <div className="category-tabs">
              <button className={section === 'all' && !onlySaved ? 'active' : ''} onClick={() => { setSection('all'); setOnlySaved(false); }}>
                <Grid2X2 size={14} />
                All components <span>{products.length || 8}</span>
              </button>
              {sections.map((s) => (
                <button key={s.id} className={section === s.id && !onlySaved ? 'active' : ''} onClick={() => { setSection(s.id); setOnlySaved(false); }}>
                  <Box size={14} />
                  {s.name}
                </button>
              ))}
            </div>
            <button className={'filter-button ' + (onlySaved ? 'active' : '')} onClick={() => setOnlySaved(!onlySaved)} aria-label="Filter saved components" title="Saved components">
              <Heart size={15} fill={onlySaved ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="results-toolbar">
            <span>
              {loading ? 'Loading the good stuff…' : `${filtered.length} carefully crafted components`}
              {query && (
                <button className="query-chip" onClick={() => setQuery('')}>
                  “{query}” <X size={11} />
                </button>
              )}
              {onlySaved && (
                <span className="query-chip">
                  Saved{' '}
                  <button aria-label="Clear saved filter" onClick={() => setOnlySaved(false)}>
                    <X size={11} />
                  </button>
                </span>
              )}
            </span>
            <label>
              <SlidersHorizontal size={13} />
              <select aria-label="Sort components" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="popular">Most popular</option>
                <option value="new">Newest first</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
              <ChevronDown size={12} />
            </label>
          </div>

          {loading ? (
            <div className="product-grid">
              {[1, 2, 3, 4].map((x) => (
                <div className="product-skeleton" key={x} />
              ))}
            </div>
          ) : loadError ? (
            <div className="empty-state">
              <Box size={35} />
              <h3>Let’s try that again.</h3>
              <p>The catalog couldn’t load. Please retry.</p>
              <button className="button button-lime" onClick={loadProducts}>
                Reload components <RefreshCw size={15} />
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Search size={35} />
              <h3>{onlySaved ? 'Your inspiration starts here.' : 'No components found.'}</h3>
              <p>{onlySaved ? 'Tap the heart on a component to save it for later.' : 'Try a different section or search term.'}</p>
              <button className="button button-secondary" onClick={() => browse()}>
                View all components
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {filtered.map((p) => (
                <Tilt key={p.id} className="product-card">
                  <div
                    className={'product-preview preview-' + p.preview}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${p.name}`}
                    onClick={() => { setSelected(p); setPreview(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setSelected(p); setPreview(false); } }}
                  >
                    <ProductVisual kind={p.preview} image={p.image} name={p.name} />
                    {p.badge && (
                      <span className={'product-badge badge-' + p.badge.toLowerCase()}>{p.badge}</span>
                    )}
                    <button className={'save-button ' + (saved.includes(p.id) ? 'is-saved' : '')} aria-label={saved.includes(p.id) ? `Unsave ${p.name}` : `Save ${p.name}`} onClick={(e) => { e.stopPropagation(); toggleSaved(p.id); }}>
                      <Heart size={14} fill={saved.includes(p.id) ? 'currentColor' : 'none'} />
                    </button>
                    <div className="preview-overlay">
                      <span>
                        Explore component <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </div>
                  <div className="product-content">
                    <div className="product-category">
                      {p.category}
                      {(p.ratingCount || 0) > 0 ? (
                        <span className="rating-chip">
                          <Star size={9} fill="currentColor" /> {p.ratingAvg!.toFixed(1)} ({p.ratingCount})
                        </span>
                      ) : (
                        <span>
                          <Star size={10} fill="currentColor" /> Premium quality
                        </span>
                      )}
                    </div>
                    <button className="product-title" onClick={() => { setSelected(p); setPreview(false); }}>
                      {p.name}
                    </button>
                    <div className="product-tags">
                      {p.tags.map((t) => (
                        <span key={t}>
                          <Code2 size={10} /> {t}
                        </span>
                      ))}
                    </div>
                    <div className="product-bottom">
                      <div className={p.price === 0 ? 'price price-free' : 'price'}>
                        {formatINR(p.price)}
                        {p.oldPrice && <del>{formatINR(p.oldPrice)}</del>}
                        <span>one-time</span>
                      </div>
                    <button className={'add-button ' + (cart.includes(p.id) ? 'in-cart' : '')} aria-label={cart.includes(p.id) ? 'View cart' : `Add ${p.name} to cart`} onClick={() => addToCart(p)}>
                      {cart.includes(p.id) ? <Check size={15} /> : <Plus size={16} />}
                    </button>
                  </div>
                </div>
                </Tilt>
              ))}
            </div>
          )}
          <div className="catalog-footnote">
            <span>
              <CheckCircle2 size={13} /> Genuine components
            </span>
            <i />
            <span>
              <ShieldCheck size={13} /> Secure Razorpay payments
            </span>
            <i />
            <span>
              <Package size={13} /> Pan-India delivery
            </span>
          </div>
        </section>

        <RecentReviews onOpenProduct={(id) => { const p = products.find((x) => x.id === id); if (p) { setSelected(p); setPreview(false); } }} />

        <section className="benefits-section page-container">
          <div className="benefit">
            <span>
              <Box size={21} />
            </span>
            <h3>Looks good. Works better.</h3>
            <p>Responsive, accessible components that feel as good as they look.</p>
          </div>
          <div className="benefit">
            <span>
              <Code2 size={21} />
            </span>
            <h3>Your code. Your way.</h3>
            <p>No black boxes. Clear specs, honest descriptions, and full support.</p>
          </div>
          <div className="benefit">
            <span>
              <ShieldCheck size={21} />
            </span>
            <h3>Pay in ₹ with Razorpay.</h3>
            <p>UPI, cards, net-banking and wallets with instant confirmation.</p>
          </div>
          <div className="benefit">
            <span>
              <Sparkles size={21} />
            </span>
            <h3>Made to stand out.</h3>
            <p>Distinctive details and smooth motion. Never just another template.</p>
          </div>
        </section>

        <section className="newsletter page-container">
          <div className="newsletter-inner">
            <div>
              <span className="section-kicker">A LITTLE INSPIRATION FOR YOUR INBOX</span>
              <h2>
                Stay ahead of the <span>stack.</span> <Sparkles size={27} />
              </h2>
              <p>Fresh components, restocks, and ideas worth building.</p>
            </div>
            <form onSubmit={subscribe}>
              {subscribed ? (
                <div className="subscribed-state">
                  <CheckCircle2 /> You’re on the list. Let’s build something great.
                </div>
              ) : (
                <>
                  <div className="newsletter-input">
                    <Mail size={17} />
                    <input type="email" aria-label="Email address for newsletter" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <button type="submit" disabled={busy}>
                      Count me in <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <small>No noise. Just the good stuff. Unsubscribe anytime.</small>
                </>
              )}
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer page-container" aria-label="Website footer">
        <div className="footer-brand-col footer-cell">
          <div>
            <Link href="/" className="brand-link">
              <Brand small />
            </Link>
            <p>Genuine electronics, devices and source code for builders across India.</p>
          </div>
          <div className="footer-socials">
            {socials.length ? (
              socials.map(({ name, icon: Icon, url }) => (
                <a key={name} href={url!} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}>
                  <Icon size={17} />
                </a>
              ))
            ) : isAdmin ? (
              <span className="footer-social-hint">Add social links in Admin → Settings</span>
            ) : null}
          </div>
          <span className="footer-trust"><ShieldCheck size={13} /> Secure Razorpay checkout</span>
        </div>

        <div className="footer-col footer-cell footer-shop">
          <h4>Shop</h4>
          <div className="footer-link-grid">
            <button onClick={() => browse('all')}>All parts</button>
            <button onClick={() => browse('devices')}>Devices</button>
            <button onClick={() => browse('source-code')}>Source code</button>
            <button onClick={() => browse('wireless')}>Wireless &amp; RF</button>
          </div>
        </div>

        <div className="footer-col footer-cell footer-policies">
          <h4>Policies</h4>
          <div className="footer-link-grid footer-policy-grid">
            <Link href="/pages/return-policy">Returns</Link>
            <Link href="/pages/refund-policy">Refunds</Link>
            <Link href="/pages/shipping">Shipping</Link>
            <Link href="/pages/privacy">Privacy</Link>
            <Link href="/pages/disclaimer">Disclaimer</Link>
            <Link href="/pages/terms">Terms</Link>
          </div>
        </div>

        <div className="footer-col footer-cell footer-company">
          <h4>Company</h4>
          <div className="footer-link-grid">
            <Link href="/pages/about">About us</Link>
            <Link href="/pages/contact">Contact</Link>
            <Link href="/account">My orders</Link>
            <Link href="/pages/contact">Help centre</Link>
          </div>
        </div>

        <div className="footer-col footer-cell footer-contact">
          <h4>Contact</h4>
          <div className="footer-contact-lines">
            <a href={'mailto:' + (settings?.contactEmail || 'electricalandelectronics64@gmail.com')}>
              <Mail size={13} /> <span>{settings?.contactEmail || 'electricalandelectronics64@gmail.com'}</span>
            </a>
            <a href={'tel:' + (settings?.contactPhone || '+918639396238')}>
              <Phone size={13} /> <span>{settings?.contactPhone || '+91 86393 96238'}</span>
            </a>
            {isAdmin && (
              <Link href="/admin" className="lime-text">
                Admin panel <ArrowUpRight size={12} />
              </Link>
            )}
          </div>
        </div>
      </footer>
      <div className="footer-bottom page-container">
        <span>© {new Date().getFullYear()} Experiments_Projects · Made in India</span>
        <span className="footer-payment-note"><ShieldCheck size={12} /> Payments secured by Razorpay · Prices in INR</span>
      </div>

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      )}

      {selected && (
        <Modal title={preview ? 'Live component preview' : selected.name} onClose={() => { setSelected(null); setPreview(false); }} wide>
          {preview ? (
            <>
              <div className="preview-browser">
                <span />
                <span />
                <span />
                <b>{selected.name} · responsive preview</b>
              </div>
              <iframe className="component-iframe" title={selected.name + ' live preview'} src={'/api/preview/' + selected.id} sandbox="allow-scripts" />
              <div className="modal-footer">
                <button className="button button-secondary" onClick={() => setPreview(false)}>
                  ← Back to details
                </button>
                <button className="button button-lime" onClick={() => addToCart(selected)}>
                  Add to cart · {formatINR(selected.price)} <Plus size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="product-detail">
              <div className={'detail-visual preview-' + selected.preview}>
                <ProductVisual kind={selected.preview} image={selected.image} name={selected.name} />
              </div>
              <div className="detail-body">
                <div className="detail-topline">
                  <span className="eyebrow">{selected.category}</span>
                  <span className="detail-price">
                    {formatINR(selected.price)} {selected.oldPrice && <del>{formatINR(selected.oldPrice)}</del>}
                  </span>
                </div>
                <p>{selected.description}</p>
                {selected.specs.length > 0 && (
                  <div className="specs-block">
                    <h4>Specifications</h4>
                    <table className="specs-table">
                      <tbody>
                        {selected.specs.map((s, i) => (
                          <tr key={i}>
                            <td>{s.name}</td>
                            <td>{s.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="detail-features">
                  <span>
                    <Check size={14} /> Verified genuine product
                  </span>
                  <span>
                    <Check size={14} /> Commercial use license
                  </span>
                  <span>
                    <Check size={14} /> Pan-India delivery
                  </span>
                  <span>
                    <Check size={14} /> Pan-India support
                  </span>
                </div>
                <div className="detail-actions">
                  <button className="button button-lime" onClick={() => addToCart(selected)}>
                    {cart.includes(selected.id) ? 'View in cart' : 'Add to cart'} <ShoppingBag size={16} />
                  </button>
                  <button className="button button-secondary" onClick={() => setPreview(true)}>
                    Live preview <ExternalLink size={15} />
                  </button>
                  {selected.price === 0 && isDigital(selected.category) && (
                    <a className="button button-secondary" href={'/api/download/' + selected.id}>
                      Download <Download size={15} />
                    </a>
                  )}
                  {!isDigital(selected.category) && (
                    <span className="ship-hint-pill"><Package size={13} /> Ships pan-India in 1–2 days</span>
                  )}
                  <button className="icon-button" aria-label="Save component" onClick={() => toggleSaved(selected.id)}>
                    <Heart size={20} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <ProductReviews productId={selected.id} productName={selected.name} onNotify={notify} />
              </div>
            </div>
          )}
        </Modal>
      )}

      {dialog === 'search' && (
        <Modal title="Find your next head start" onClose={() => setDialog(null)}>
          <div className="search-box">
            <Search size={20} />
            <input autoFocus placeholder="Search components, rare parts, kits…" aria-label="Search catalog" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={17} />
              </button>
            )}
          </div>
          <div className="search-results">
            {products
              .filter((p) => [p.name, p.category, ...p.tags].join(' ').toLowerCase().includes(query.toLowerCase()))
              .slice(0, 6)
              .map((p) => (
                <button key={p.id} onClick={() => { setDialog(null); setSelected(p); setPreview(false); }}>
                  <span className={'search-thumb preview-' + p.preview}>
                    <ProductVisual kind={p.preview} image={p.image} />
                  </span>
                  <span>
                    <b>{p.name}</b>
                    <small>{p.category}</small>
                  </span>
                  <strong>{formatINR(p.price)}</strong>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            {query && !products.some((p) => p.name.toLowerCase().includes(query.toLowerCase())) && <p className="muted">Try a component name or tag.</p>}
          </div>
          <button className="button button-secondary full-width" onClick={() => { setDialog(null); setSection('all'); document.getElementById('components')?.scrollIntoView({ behavior: 'smooth' }); }}>
            View all search results <ArrowRight size={16} />
          </button>
        </Modal>
      )}

      {dialog === 'cart' && (
        <Modal title={`Your cart (${cartProducts.length})`} onClose={() => setDialog(null)} drawer>
          {cartProducts.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={42} />
              <h3>Great things start with one component.</h3>
              <p>Your cart is waiting for a little inspiration.</p>
              <button className="button button-lime" onClick={() => { setDialog(null); browse(); }}>
                Explore components <ArrowUpRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cartProducts.map((p) => (
                  <div className="cart-item" key={p.id}>
                    <div className={'cart-thumb preview-' + p.preview}>
                      <ProductVisual kind={p.preview} image={p.image} />
                    </div>
                    <div>
                      <small>{p.category}</small>
                      <h3>{p.name}</h3>
                      <b>{formatINR(p.price)}</b>
                    </div>
                    <button className="icon-button" aria-label={`Remove ${p.name}`} onClick={() => updateCart(cart.filter((id) => id !== p.id))}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="cart-summary">
                <div>
                  <span>Subtotal</span>
                  <b>{formatINR(total)}</b>
                </div>
                <div>
                  <span>Payment</span>
                  <span>{settings?.razorpayEnabled ? 'Razorpay · UPI / Cards / Net-banking' : 'Invoice checkout'}</span>
                </div>
                <div className="cart-total">
                  <span>Total</span>
                  <b>{formatINR(total)}</b>
                </div>
                <button className="button button-lime full-width" onClick={() => openDialog('checkout')}>
                  Continue to checkout <ArrowRight size={17} />
                </button>
                <p>
                  <ShieldCheck size={13} /> Prices include all taxes. Pan-India delivery.
                </p>
              </div>
            </>
          )}
        </Modal>
      )}

      {dialog === 'checkout' && (
        <Modal title="Complete your order" onClose={() => setDialog('cart')}>
          <p className="modal-intro">Secure checkout. Pay in ₹ — UPI, cards, net-banking, and wallets.</p>
          <form className="checkout-form" onSubmit={checkout}>
            <div className="form-row">
              <label>
                Full name
                <input name="name" required placeholder="Aarav Sharma" maxLength={150} defaultValue={user?.name || ''} />
              </label>
              <label>
                Email address
                <input name="email" required type="email" placeholder="aarav@example.com" maxLength={254} defaultValue={user?.email || ''} />
              </label>
            </div>
            <label>
              Delivery address <small>(optional for digital products)</small>
              <input name="address" placeholder="Flat, street, area" maxLength={300} />
            </label>
            <div className="form-row form-row-3">
              <label>
                City
                <input name="city" placeholder="Bengaluru" maxLength={80} />
              </label>
              <label>
                State
                <input name="state" placeholder="Karnataka" maxLength={80} />
              </label>
              <label>
                PIN code
                <input name="pincode" placeholder="560001" maxLength={12} inputMode="numeric" />
              </label>
            </div>
            <div className="invoice-notice">
              {settings?.razorpayEnabled ? <ShieldCheck size={21} /> : <Mail size={21} />}
              <div>
                <b>{total > 0 ? (settings?.razorpayEnabled ? 'Razorpay secure checkout' : 'Invoice checkout') : 'Your free components'}</b>
                <p>
                  {total > 0
                    ? settings?.razorpayEnabled
                      ? 'You’ll be redirected to Razorpay to pay securely with UPI, cards, net-banking, or wallets. Your order confirms the moment payment succeeds.'
                      : 'Razorpay is not enabled yet. Place your order now and the store owner will share payment details by email. Downloads unlock after confirmation.'
                    : 'Your downloads will be available immediately after checkout.'}
                </p>
              </div>
            </div>
            <div className="checkout-total">
              <span>
                {cartProducts.length} component{cartProducts.length !== 1 ? 's' : ''}
              </span>
              <b>{formatINR(total)}</b>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" required /> I agree to the terms of sale. Digital downloads are non-refundable once delivered.
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-lime full-width" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : total > 0 ? (
                <>{settings?.razorpayEnabled ? 'Pay securely with Razorpay' : 'Place invoice order'} <ArrowRight size={17} /></>
              ) : (
                <>
                  Get my components <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </Modal>
      )}

      {order && (
        <Modal title={orderPaid ? 'Your build starts now.' : 'Your order is saved.'} onClose={() => setOrder(null)}>
          <div className="order-success">
            <span>{orderPaid ? <CheckCircle2 size={32} /> : order.status === 'cancelled' ? <X size={32} /> : <Package size={32} />}</span>
            <h3>{orderPaid ? 'Payment confirmed. Enjoy!' : order.status === 'cancelled' ? 'This order was cancelled.' : 'Order placed!'}</h3>
            <p>
              {orderPaid
                ? 'Your components are ready to download / are being prepared for dispatch.'
                : order.status === 'cancelled'
                  ? 'Contact the store owner if you have questions.'
                  : 'Payment is pending. You can track and manage this order anytime from My Orders.'}
            </p>
          </div>
          <div className="order-reference">
            <span>{order.id}</span>
            <span className={'status status-' + order.status}>{order.status === 'pending' ? (settings?.razorpayEnabled ? 'Payment pending' : 'Awaiting payment') : order.status}</span>
          </div>
          {order.items.map((item) => (
            <div className="order-line" key={item.id}>
              <span>{item.name}</span>
              {orderPaid ? (
                item.digital ? (
                  <a href={`/api/download/${item.id}?token=${order.token}`} className="text-link">
                    <Download size={15} /> Download
                  </a>
                ) : (
                  <span className="ship-hint-pill"><Truck size={13} /> Shipping in My Orders</span>
                )
              ) : (
                <b>{formatINR(item.price)}</b>
              )}
            </div>
          ))}
          <div className="checkout-total">
            <span>Total</span>
            <b>{formatINR(order.total)}</b>
          </div>
          <p className="detail-note">Sign in (or create an account) with the same email to see this order in My Orders with live shipping updates.</p>
          <div className="modal-footer">
            <button className="button button-secondary" onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/orders/${order.token}`);
                notify('Private order link copied');
              } catch {
                notify('Copy the order link from your browser address bar.');
              }
            }}>
              <Copy size={14} /> Copy order link
            </button>
            <Link href={user ? '/account' : '/orders/' + order.token} className="button button-lime">
              {user ? 'Go to My Orders' : 'View order'} <ArrowUpRight size={15} />
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
