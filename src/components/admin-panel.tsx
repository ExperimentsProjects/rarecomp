'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Box, Check, CheckCircle2, ChevronRight, Code2, Database, Download, EyeOff, ImagePlus, IndianRupee, Layers, LayoutDashboard, Loader2, LogIn, LogOut, Mail, Package, Pencil, Plus, RefreshCw, Search, Settings as SettingsIcon, ShieldCheck, ShoppingBag, Star, Tag, Trash2, Truck, UserPlus, Users, X } from 'lucide-react';
import type { Product, Order, Review, Section } from '@/db/schema';
import { formatINR } from '@/lib/money';
import { Brand, ProductVisual } from './visuals';
import { SHIPPING_STEPS } from './ship-steps';
import { patchFetchWithSessionTokens, saveSessionToken, clearSessionToken, captureTokenFromUrl, loginUrl } from './session-token';
import Modal from './modal';

type ProductView = Product & { ratingAvg?: number; ratingCount?: number };
type AdminSettings = Record<'razorpay_enabled' | 'razorpay_key_id' | 'razorpay_key_secret' | 'contact_email' | 'contact_phone' | 'instagram_url' | 'youtube_url' | 'x_url', string>;
type Tab = 'overview' | 'sections' | 'products' | 'orders' | 'users' | 'reviews' | 'subscribers' | 'settings';
type Subscriber = { email: string; createdAt: string };
type AdminUser = { id: string; name: string; email: string; createdAt: string; lastLoginAt: string | null; loginCount: number; orderCount: number; paidOrders: number; totalSpentPaise: number };
type AdminActivity = { email: string; action: string; createdAt: string };
type MongoStatus = { configured: boolean; connected: boolean; source: 'uri' | 'split' | 'none'; host: string; database: string; message: string };

const blank = { id: '', name: '', description: '', category: 'UI Components', sectionId: '', price: '999', oldPrice: '', image: '', preview: 'dashboard', tags: 'React, Tailwind CSS', specs: 'Delivery: Instant download', badge: '', featured: false, active: true, source: '' };

export default function AdminPanel() {
  const [admin, setAdmin] = useState<{ id: string; name: string; email: string } | null>(null);
  const [setup, setSetup] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [products, setProducts] = useState<ProductView[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [userRows, setUserRows] = useState<AdminUser[]>([]);
  const [userActivity, setUserActivity] = useState<AdminActivity[]>([]);
  const [userSource, setUserSource] = useState<'mongodb' | 'postgres'>('postgres');
  const [rzpTesting, setRzpTesting] = useState(false);
  const [rzpResult, setRzpResult] = useState<{ ok: boolean; message?: string; error?: string; mode?: string } | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [confirmOrder, setConfirmOrder] = useState<{ order: Order; status: string } | null>(null);
  const [shipEdit, setShipEdit] = useState<Order | null>(null);
  const [shipDraft, setShipDraft] = useState({ shipping: 'processing', courier: '', trackingUrl: '' });
  const [archive, setArchive] = useState<ProductView | null>(null);
  const [deleteSection, setDeleteSection] = useState<Section | null>(null);
  const [sectionDraft, setSectionDraft] = useState({ id: '', name: '', active: true });
  const [formError, setFormError] = useState('');
  const [reload, setReload] = useState(false);

  const checkAuth = useCallback(async () => {
    setChecking(true);
    try {
      const r = await fetch('/api/admin/session');
      if (!r.ok) throw Error('Unable to connect. Please refresh to try again.');
      const data = await r.json();
      setAdmin(data.admin);
      setSetup(data.needsSetup);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setChecking(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setReload(true);
    try {
      const urls = ['/api/products?admin=true', '/api/orders', '/api/admin/subscribers', '/api/sections?admin=true', '/api/reviews', '/api/settings?admin=true', '/api/admin/users'];
      const responses = await Promise.all(urls.map((u) => fetch(u)));
      if (responses.some((r) => r.status === 401)) {
        clearSessionToken('admin');
        setAdmin(null);
        throw Error('Your session has expired. Please sign in again.');
      }
      const [p, o, s, sec, rev, setg, usr] = await Promise.all(responses.map((r) => (r.ok ? r.json() : [])));
      setProducts(p);
      setOrders(o);
      setSubscribers(s);
      setSections(sec);
      setReviews(rev.reviews || []);
      setSettings(setg);
      if (usr && !usr.error) {
        setUserRows(usr.users || []);
        setUserActivity(usr.activity || []);
        setUserSource(usr.source === 'mongodb' ? 'mongodb' : 'postgres');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      setReload(false);
    }
  }, []);

  useEffect(() => {
    captureTokenFromUrl();
    patchFetchWithSessionTokens();
    void checkAuth();
  }, [checkAuth]);
  useEffect(() => {
    if (admin) void loadData();
  }, [admin, loadData]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password'), setup }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      saveSessionToken('admin', data.token);
      // Diagnose each session channel against a pristine probe (no injected headers).
      const probe = await window.fetch('/api/admin/session', { cache: 'no-store', credentials: 'omit' }).then((x) => x.json());
      if (probe.admin) {
        await checkAuth();
        return; // one of the channels works — proceed normally
      }
      // All bridges failed (cookies + storage + no header echo). Transport auth in the URL once.
      const keys = (['ep_admin', '/admin', data.token] as const);
      if (keys[2] && /^[a-f0-9]{64}$/i.test(String(keys[2]))) {
        window.location.assign(keys[0] === 'ep_admin' ? loginUrl('admin', '/admin', keys[2]) : '/admin');
        return;
      }
      throw Error('Your browser is holding its own session and refusing all others. Try a normal (non-incognito, non-embedded) window to continue.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
      clearSessionToken('admin');
      setAdmin(null);
      setProducts([]);
      setOrders([]);
    } catch {
      setError('Could not sign out.');
    }
  };

  const changeTab = (next: Tab) => {
    setTab(next);
    setSearch('');
    setError('');
  };

  /* ---------- Sections ---------- */
  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const r = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sectionDraft.id || undefined, name: sectionDraft.name, active: sectionDraft.active, order: sections.length + 1 }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setSectionDraft({ id: '', name: '', active: true });
      setNotice('Section saved. It’s live on the storefront.');
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save section.');
    } finally {
      setBusy(false);
    }
  };

  const removeSection = async () => {
    if (!deleteSection) return;
    setBusy(true);
    try {
      const r = await fetch('/api/sections?id=' + deleteSection.id, { method: 'DELETE' });
      if (!r.ok) throw Error((await r.json()).error);
      setDeleteSection(null);
      setNotice('Section deleted. Its products were unassigned — reassign them from the editor.');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete section.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Products ---------- */
  const editProduct = (p?: ProductView) => {
    setFormError('');
    setDraft(
      p
        ? {
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            sectionId: p.sectionId || '',
            price: String(p.price / 100),
            oldPrice: p.oldPrice ? String(p.oldPrice / 100) : '',
            image: p.image || '',
            preview: p.preview,
            tags: p.tags.join(', '),
            specs: p.specs.map((s) => `${s.name}: ${s.value}`).join('\n'),
            badge: p.badge || '',
            featured: p.featured,
            active: p.active,
            source: p.source || '',
          }
        : { ...blank, sectionId: sections[0]?.id || '' },
    );
    setEditing(true);
  };

  const parseSpecs = (text: string) =>
    text
      .split('\n')
      .map((line) => {
        const idx = line.indexOf(':');
        if (idx === -1) return null;
        return { name: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      })
      .filter((s): s is { name: string; value: string } => !!s && !!s.name && !!s.value)
      .slice(0, 20);

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          id: draft.id || undefined,
          sectionId: draft.sectionId || null,
          price: Math.round(Number(draft.price) * 100),
          oldPrice: draft.oldPrice ? Math.round(Number(draft.oldPrice) * 100) : null,
          specs: parseSpecs(draft.specs),
          tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setEditing(false);
      setNotice(draft.id ? 'Component updated successfully.' : 'Your new component is live.');
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const body = new FormData();
      body.set('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setDraft((d) => ({ ...d, image: data.url }));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const uploadSource = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 500000 || !/\.html?$/i.test(file.name)) {
      setFormError('Choose an HTML file smaller than 500 KB.');
      return;
    }
    try {
      const source = await file.text();
      setDraft((d) => ({ ...d, source }));
      setNotice('HTML source attached. Save to publish it.');
    } catch {
      setFormError('Could not read your source file.');
    }
  };

  const archiveProduct = async () => {
    if (!archive) return;
    setBusy(true);
    try {
      const r = await fetch('/api/products?id=' + archive.id, { method: 'DELETE' });
      if (!r.ok) throw Error('Could not unpublish this component.');
      setArchive(null);
      setNotice('Component unpublished.');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please retry.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Orders ---------- */
  const updateOrderStatus = async () => {
    if (!confirmOrder) return;
    setBusy(true);
    setFormError('');
    try {
      const r = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmOrder.order.id, status: confirmOrder.status }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setConfirmOrder(null);
      setNotice('Order status updated.');
      await loadData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not update order.');
    } finally {
      setBusy(false);
    }
  };

  const openShipping = (o: Order) => {
    setFormError('');
    setShipEdit(o);
    setShipDraft({ shipping: o.shipping, courier: o.courier || '', trackingUrl: o.trackingUrl || '' });
  };

  const saveShipping = async () => {
    if (!shipEdit) return;
    setBusy(true);
    setFormError('');
    try {
      const r = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shipEdit.id, shipping: shipDraft.shipping, courier: shipDraft.courier, trackingUrl: shipDraft.trackingUrl }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setShipEdit(null);
      setNotice('Shipping updated — customers see it instantly in My Orders.');
      await loadData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not update shipping.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Reviews & settings ---------- */
  const deleteReview = async (id: string) => {
    try {
      const r = await fetch('/api/reviews?id=' + id, { method: 'DELETE' });
      if (!r.ok) throw Error();
      setReviews((r2) => r2.filter((x) => x.id !== id));
      setNotice('Review removed.');
    } catch {
      setError('Could not remove review.');
    }
  };

  const saveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_enabled: form.get('rzp_enabled') === 'on' ? '1' : '0',
          razorpay_key_id: form.get('rzp_key_id'),
          razorpay_key_secret: form.get('rzp_key_secret'),
          contact_email: form.get('contact_email'),
          contact_phone: form.get('contact_phone'),
          instagram_url: form.get('instagram_url'),
          youtube_url: form.get('youtube_url'),
          x_url: form.get('x_url'),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setNotice('Settings saved. Storefront updated instantly.');
      await loadData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  };

  const testRazorpay = async () => {
    setRzpTesting(true);
    setRzpResult(null);
    try {
      const r = await fetch('/api/admin/razorpay-test', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Test failed.');
      setRzpResult(data);
      await loadData();
    } catch (e) {
      setRzpResult({ ok: false, error: e instanceof Error ? e.message : 'Test failed.' });
    } finally {
      setRzpTesting(false);
    }
  };

  const forceSignOut = async (id: string) => {
    try {
      const r = await fetch('/api/admin/users?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (!r.ok) throw Error();
      setNotice('That user has been signed out of all devices.');
    } catch {
      setError('Could not sign out that user.');
    }
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const el = e.currentTarget;
    const form = new FormData(el);
    try {
      if (form.get('password') !== form.get('confirm')) throw Error('New passwords do not match.');
      const r = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.get('currentPassword'), password: form.get('password') }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setNotice('Password updated. Other sessions signed out.');
      el.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update password.');
    } finally {
      setBusy(false);
    }
  };

  const exportSubscribers = () => {
    const csv = 'Email,Subscribed on\n' + subscribers.map((s) => `"${s.email.replace(/"/g, '""').replace(/^[=+\-@]/, "'")}","${new Date(s.createdAt).toISOString()}"`).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'experiments-projects-subscribers.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const unsubscribe = async (email: string) => {
    try {
      const r = await fetch('/api/admin/subscribers?email=' + encodeURIComponent(email), { method: 'DELETE' });
      if (!r.ok) throw Error();
      setSubscribers((s) => s.filter((x) => x.email !== email));
      setNotice('Subscriber removed.');
    } catch {
      setError('Could not remove subscriber.');
    }
  };

  const visibleProducts = products.filter((p) => [p.name, p.category].join(' ').toLowerCase().includes(search.toLowerCase()));
  const visibleOrders = orders.filter((o) => (orderFilter === 'all' || o.status === orderFilter) && [o.id, o.name, o.email].join(' ').toLowerCase().includes(search.toLowerCase()));
  const revenue = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter((o) => o.status === 'pending').length;
  const inTransit = orders.filter((o) => ['packed', 'shipped', 'out_for_delivery'].includes(o.shipping)).length;
  const rzpOn = settings?.razorpay_enabled === '1' && !!settings?.razorpay_key_id && !!settings?.razorpay_key_secret;

  if (checking)
    return (
      <div className="admin-loading">
        <Brand />
        <Loader2 className="spin" />
        <p>Getting your workspace ready…</p>
      </div>
    );

  if (!admin)
    return (
      <div className="admin-login-page">
        <header className="standalone-header">
          <Link href="/">
            <Brand />
          </Link>
          <Link href="/" className="text-link">
            <ArrowLeft size={14} /> Back to store
          </Link>
        </header>
        <div className="admin-login-card">
          <div className="login-symbol">
            <ShieldCheck size={25} />
          </div>
          <span className="eyebrow">YOUR STORE. YOUR WORKSPACE.</span>
          <h1>{setup ? 'Make yourself at home.' : 'Welcome back, builder.'}</h1>
          <p>{setup ? 'Create your owner account to manage Experiments_Projects. One-time setup — only before the first administrator exists.' : 'Sign in to manage components, sections, orders, shipping, and reviews.'}</p>
          <form className="admin-form" onSubmit={signIn}>
            <label>
              Email address
              <input name="email" type="email" required autoComplete="username" placeholder="you@yourstudio.in" />
            </label>
            <label>
              {setup ? 'Create a password' : 'Password'}
              <input name="password" type="password" required minLength={8} maxLength={128} autoComplete={setup ? 'new-password' : 'current-password'} placeholder="At least 8 characters" />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-lime full-width" disabled={busy}>
              {busy ? <Loader2 size={17} className="spin" /> : setup ? 'Create owner account' : 'Sign in to your workspace'}
            </button>
          </form>
          <div className="login-security">
            <ShieldCheck size={13} />
            <span>Encrypted passwords. Secure, HTTP-only sessions.</span>
          </div>
        </div>
        <p className="standalone-footnote">Experiments_Projects · Owner workspace.</p>
      </div>
    );

  const tabs: { id: Tab; name: string; icon: typeof Box }[] = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'sections', name: 'Sections', icon: Layers },
    { id: 'products', name: 'Components', icon: Box },
    { id: 'orders', name: 'Orders', icon: ShoppingBag },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'reviews', name: 'Reviews', icon: Star },
    { id: 'subscribers', name: 'Audience', icon: Users },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/">
          <Brand />
        </Link>
        <span className="workspace-label">OWNER · FULL ACCESS</span>
        <nav>
          {tabs.map(({ id, name, icon: Icon }) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => changeTab(id)}>
              <Icon size={17} />
              <span>{name}</span>
              {id === 'orders' && pending > 0 && <i>{pending}</i>}
              {id === 'reviews' && reviews.length > 0 && <i className="badge-muted">{reviews.length}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-promo">
          <span>✦</span>
          <h3>Your store, fully in your hands.</h3>
          <p>Sections, rare components, Razorpay, shipping — all configurable here.</p>
          <button onClick={() => changeTab('sections')}>Create a new section <Plus size={13} /></button>
        </div>
        <div className="admin-sidebar-bottom">
          <Link href="/" target="_blank">
            View storefront <ArrowUpRight size={15} />
          </Link>
          <button onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
          <div>
            <span className="admin-avatar">{admin.name[0].toUpperCase()}</span>
            <span>
              <b>{admin.name} · Store owner</b>
              <small>{admin.email}</small>
            </span>
            <ShieldCheck size={15} />
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{tabs.find((t) => t.id === tab)?.name}</b>
          </div>
          <div>
            <span className="store-live">
              <i /> Store is live
            </span>
            <span className={'rzp-status ' + (rzpOn ? 'rzp-on' : 'rzp-off')}>
              <IndianRupee size={12} /> {rzpOn ? 'Razorpay ON' : 'Razorpay OFF'}
            </span>
            <button className="icon-button" aria-label="Refresh dashboard" onClick={loadData}>
              <RefreshCw size={16} className={reload ? 'spin' : ''} />
            </button>
            <Link href="/" className="text-link">
              Visit store <ArrowUpRight size={14} />
            </Link>
          </div>
        </header>

        <main className="admin-content">
          <div className="admin-page-heading">
            <div>
              <span className="section-kicker">FULL ADMIN CONTROL</span>
              <h1>
                {tab === 'overview' && 'Your store at a glance.'}
                {tab === 'sections' && 'Organize your shelves.'}
                {tab === 'products' && 'Your component collection.'}
                {tab === 'orders' && 'Orders, payments & shipping.'}
                {tab === 'users' && 'Everyone who signed in.'}
                {tab === 'reviews' && 'What builders say.'}
                {tab === 'subscribers' && 'Your growing community.'}
                {tab === 'settings' && 'Payments, contact & socials.'}
              </h1>
              <p>
                {tab === 'overview' && 'Sales, components, orders, and shipping — one calm dashboard.'}
                {tab === 'sections' && 'Create storefront sections like “Rare Components” or “STEM Kits”. Products can be assigned to each section.'}
                {tab === 'products' && 'Add images, descriptions, specs, prices in ₹, and download files. Only you can edit these.'}
                {tab === 'orders' && 'Confirm Razorpay payments and update shipping (Packed → Shipped → Delivered). Customers see it instantly.'}
                {tab === 'users' && `Every registered customer with their orders, spend and login activity. Stored in ${userSource === 'mongodb' ? 'MongoDB' : 'PostgreSQL'}.`}
                {tab === 'reviews' && 'Monitor and moderate reviews left by verified buyers.'}
                {tab === 'subscribers' && 'Newsletter subscribers, exportable anytime.'}
                {tab === 'settings' && 'Connect Razorpay for live ₹ payments, plus contact, social, and account security.'}
              </p>
            </div>
            {(tab === 'overview' || tab === 'products') && (
              <button className="button button-lime" onClick={() => editProduct()}>
                <Plus size={16} /> Add component
              </button>
            )}
            {tab === 'subscribers' && (
              <button className="button button-secondary" onClick={exportSubscribers} disabled={!subscribers.length}>
                <Download size={15} /> Export CSV
              </button>
            )}
          </div>

          {error && (
            <div className="form-error">
              {error}
              <button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error">
                <X size={13} />
              </button>
            </div>
          )}

          {tab === 'overview' && (
            <>
              <div className="admin-stats">
                {[
                  { label: 'Total revenue', value: formatINR(revenue), note: 'Confirmed payments (INR)', icon: IndianRupee },
                  { label: 'Published components', value: String(products.filter((p) => p.active).length), note: `${sections.length} storefront sections`, icon: Box },
                  { label: 'Total orders', value: String(orders.length), note: `${pending} awaiting payment`, icon: ShoppingBag },
                  { label: 'In transit', value: String(inTransit), note: 'Packed / shipped / out for delivery', icon: Truck },
                ].map(({ label, value, note, icon: Icon }) => (
                  <div className="stat-card" key={label}>
                    <div>
                      <span>{label}</span>
                      <Icon size={16} />
                    </div>
                    <b>{value}</b>
                    <small>
                      <span /> {note}
                    </small>
                  </div>
                ))}
              </div>
              <div className="admin-overview-grid">
                <section className="admin-panel">
                  <div className="panel-heading">
                    <h2>Recent orders</h2>
                    <button className="text-link" onClick={() => changeTab('orders')}>
                      View all <ArrowUpRight size={13} />
                    </button>
                  </div>
                  {orders.length === 0 ? (
                    <div className="empty-state">
                      <ShoppingBag size={31} />
                      <h3>Your first order is on the horizon.</h3>
                      <p>Share the store. Orders appear here the moment they’re placed.</p>
                    </div>
                  ) : (
                    <div className="recent-orders">
                      {orders.slice(0, 5).map((o) => (
                        <div key={o.id}>
                          <span className="order-initial">{o.name.charAt(0).toUpperCase()}</span>
                          <div>
                            <b>{o.name}</b>
                            <small>
                              {o.id} · {o.items.length} items
                            </small>
                          </div>
                          <span className={'status status-' + o.status}>{o.status}</span>
                          <strong>{formatINR(o.total)}</strong>
                          <Link href={'/orders/' + o.token} target="_blank" aria-label="View order">
                            <ArrowUpRight size={14} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section className="admin-panel launch-checklist">
                  <div className="panel-heading">
                    <h2>Go-live checklist</h2>
                    <span className="lime-text" style={{ fontSize: 22 }}>✦</span>
                  </div>
                  {[
                    { done: true, name: 'Create your owner account', note: 'Your workspace is secure.' },
                    { done: rzpOn, name: 'Enable Razorpay payments', note: rzpOn ? 'Live ₹ payments via UPI & cards.' : 'Add keys in Settings to accept UPI & cards.' },
                    { done: sections.length > 1, name: 'Create custom sections', note: `${sections.length} section${sections.length !== 1 ? 's' : ''} on the storefront.` },
                    { done: products.some((p) => p.image), name: 'Add real product photos', note: 'Uploads appear instantly on the storefront.' },
                  ].map((s, i) => (
                    <button key={s.name} onClick={() => changeTab(i === 0 ? 'settings' : i === 1 ? 'settings' : i === 2 ? 'sections' : 'products')}>
                      <span className={s.done ? 'done' : ''}>{s.done ? <Check size={13} /> : i + 1}</span>
                      <div>
                        <b>{s.name}</b>
                        <small>{s.note}</small>
                      </div>
                      <ChevronRight size={13} />
                    </button>
                  ))}
                  <p>
                    <ShieldCheck size={13} /> All prices are in Indian Rupees (₹). Customers pay via Razorpay or invoice checkout.
                  </p>
                </section>
              </div>
            </>
          )}

          {tab === 'sections' && (
            <div className="settings-grid">
              <section className="admin-panel sections-panel">
                <div className="panel-heading">
                  <h2>Create a section</h2>
                  <Tag size={16} />
                </div>
                <form className="admin-form section-form" onSubmit={saveSection}>
                  <label>
                    Section name
                    <input required maxLength={60} placeholder="Rare Components" value={sectionDraft.name} onChange={(e) => setSectionDraft((d) => ({ ...d, name: e.target.value }))} />
                    <small>Examples: Rare Components, STEM Kits, Sensors, Boards</small>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={sectionDraft.active} onChange={(e) => setSectionDraft((d) => ({ ...d, active: e.target.checked }))} />
                    Show on storefront
                  </label>
                  {formError && <p className="form-error">{formError}</p>}
                  <button className="button button-lime" disabled={busy}>
                    {busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} {sectionDraft.id ? 'Save section' : 'Create section'}
                  </button>
                  {sectionDraft.id && (
                    <button type="button" className="text-link" onClick={() => setSectionDraft({ id: '', name: '', active: true })}>
                      Cancel editing
                    </button>
                  )}
                </form>
                <p className="settings-note">Assign products to a section from the product editor. Sections appear as storefront tabs instantly.</p>
              </section>
              <section className="admin-panel sections-panel">
                <div className="panel-heading">
                  <h2>Your sections ({sections.length})</h2>
                  <Layers size={16} />
                </div>
                {sections.length === 0 ? (
                  <div className="empty-state">
                    <Layers size={28} />
                    <h3>No sections yet.</h3>
                    <p>Create your first — e.g., “Rare Components”.</p>
                  </div>
                ) : (
                  sections.map((s) => {
                    const count = products.filter((p) => p.sectionId === s.id).length;
                    return (
                      <div className="section-row" key={s.id}>
                        <div>
                          <b>{s.name}</b>
                          <small>{count} component{count !== 1 ? 's' : ''} assigned</small>
                        </div>
                        <span className={'status ' + (s.active ? 'status-paid' : 'status-draft')}>{s.active ? 'Live' : 'Hidden'}</span>
                        <button className="icon-button" aria-label={`Edit ${s.name}`} onClick={() => setSectionDraft({ id: s.id, name: s.name, active: s.active })}>
                          <Pencil size={14} />
                        </button>
                        <button className="icon-button danger-hover" aria-label={`Delete ${s.name}`} onClick={() => setDeleteSection(s)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </section>
            </div>
          )}

          {tab === 'products' && (
            <section className="admin-panel">
              <div className="admin-table-toolbar">
                <div className="admin-search">
                  <Search size={16} />
                  <input aria-label="Search components" placeholder="Search your components…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <span>{visibleProducts.length} components</span>
              </div>
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Section</th>
                      <th>Price (₹)</th>
                      <th>Rating</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product">
                            <div className={'table-thumb preview-' + p.preview}>
                              <ProductVisual kind={p.preview} image={p.image} />
                            </div>
                            <div>
                              <b>{p.name}</b>
                              <small>{p.tags.join(' · ')}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="table-category">{sections.find((s) => s.id === p.sectionId)?.name || '—'}</span>
                        </td>
                        <td>
                          <b>{formatINR(p.price)}</b>
                          {p.oldPrice && <del>{formatINR(p.oldPrice)}</del>}
                        </td>
                        <td>
                          {p.ratingCount ? (
                            <span className="rating-cell">
                              <Star size={12} fill="currentColor" /> {p.ratingAvg!.toFixed(1)} <small>({p.ratingCount})</small>
                            </span>
                          ) : (
                            <span className="table-category">No reviews</span>
                          )}
                        </td>
                        <td>
                          <span className={'status ' + (p.active ? 'status-paid' : 'status-draft')}>{p.active ? 'Published' : 'Draft'}</span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-button" aria-label={`Edit ${p.name}`} title="Edit" onClick={() => editProduct(p)}>
                              <Pencil size={15} />
                            </button>
                            <a className="icon-button" href={'/api/download/' + p.id} aria-label="Download source" title="Download source">
                              <Download size={15} />
                            </a>
                            {p.active && (
                              <button className="icon-button danger-hover" aria-label={`Unpublish ${p.name}`} title="Unpublish" onClick={() => setArchive(p)}>
                                <EyeOff size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleProducts.length === 0 && (
                <div className="empty-state">
                  <Search size={28} />
                  <h3>No components found.</h3>
                  <button className="button button-lime" onClick={() => editProduct()}>
                    <Plus size={15} /> Add component
                  </button>
                </div>
              )}
            </section>
          )}

          {tab === 'orders' && (
            <>
              <div className="admin-invoice-banner">
                <IndianRupee size={21} />
                <div>
                  <b>{rzpOn ? 'Razorpay live payments are ON.' : 'Payments: invoice mode (Razorpay OFF).'}</b>
                  <p>
                    {rzpOn
                      ? 'Paid orders auto-confirm via Razorpay. Update shipping below — customers watch it live in My Orders.'
                      : 'Enable Razorpay in Settings to accept UPI & cards. Meanwhile, use “Mark paid” after manual payment confirmation.'}
                  </p>
                </div>
              </div>
              <section className="admin-panel">
                <div className="admin-table-toolbar">
                  <div className="admin-search">
                    <Search size={16} />
                    <input placeholder="Search orders or customers…" aria-label="Search orders" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} aria-label="Filter order status">
                    <option value="all">All statuses</option>
                    <option value="pending">Pending payment</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="table-scroll">
                  <table className="admin-table orders-table">
                    <thead>
                      <tr>
                        <th>Order / customer</th>
                        <th>Items</th>
                        <th>Total (₹)</th>
                        <th>Payment</th>
                        <th>Shipping</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleOrders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <b>{o.id}</b>
                            <small>
                              {o.name} · {new Date(o.createdAt).toLocaleDateString('en-IN')}
                            </small>
                            <a className="table-email" href={'mailto:' + o.email}>
                              {o.email}
                            </a>
                            {o.city && (
                              <small>
                                {o.city}
                                {o.pincode ? ` · ${o.pincode}` : ''}
                              </small>
                            )}
                          </td>
                          <td>
                            <span>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</span>
                            <small>{o.items.map((i) => i.name.split(' — ')[0]).join(', ')}</small>
                          </td>
                          <td>
                            <b>{formatINR(o.total)}</b>
                            {o.paymentId && <small className="table-email">{o.paymentId}</small>}
                          </td>
                          <td>
                            <span className={'status status-' + o.status}>{o.status}</span>
                          </td>
                          <td>
                            <span className={'status ship-status ship-' + o.shipping}>
                              <Truck size={10} /> {SHIPPING_STEPS.find((s) => s.id === o.shipping)?.name || o.shipping}
                            </span>
                          </td>
                          <td>
                            <div className="order-action-list">
                              <Link className="text-link" href={'/orders/' + o.token} target="_blank">
                                <ArrowUpRight size={12} /> View order
                              </Link>
                              <button className="text-link" onClick={() => openShipping(o)}>
                                <Truck size={12} /> Update shipping
                              </button>
                              {o.status === 'pending' && (
                                <>
                                  <a className="text-link" href={`mailto:${o.email}?subject=${encodeURIComponent('Your Experiments_Projects invoice · ' + o.id)}&body=${encodeURIComponent(`Hi ${o.name},\n\nThanks for your order ${o.id}! Total: ${formatINR(o.total)}.\n\nPayment link / instructions: [add here]\n\nOrder page: ${typeof window !== 'undefined' ? window.location.origin : ''}/orders/${o.token}`)}`}>
                                    <Mail size={12} /> Send invoice
                                  </a>
                                  <button className="text-link lime-text" onClick={() => { setFormError(''); setConfirmOrder({ order: o, status: 'paid' }); }}>
                                    <CheckCircle2 size={12} /> Mark paid
                                  </button>
                                </>
                              )}
                              {o.status !== 'cancelled' && (
                                <button className="text-link danger-text" onClick={() => { setFormError(''); setConfirmOrder({ order: o, status: 'cancelled' }); }}>
                                  <X size={12} /> Cancel
                                </button>
                              )}
                              {o.status === 'cancelled' && (
                                <button className="text-link" onClick={() => { setFormError(''); setConfirmOrder({ order: o, status: 'pending' }); }}>
                                  <RefreshCw size={12} /> Reopen
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {visibleOrders.length === 0 && (
                  <div className="empty-state">
                    <ShoppingBag size={30} />
                    <h3>No orders here just yet.</h3>
                  </div>
                )}
              </section>
            </>
          )}

          {tab === 'users' && (
            <>
              <div className="admin-invoice-banner">
                {userSource === 'mongodb' ? <Database size={21} /> : <Users size={21} />}
                <div>
                  <b>{userSource === 'mongodb' ? 'User data is live in MongoDB.' : 'User data is being stored in PostgreSQL.'}</b>
                  <p>
                    {userSource === 'mongodb'
                      ? 'Accounts, sessions and login activity are held in your MongoDB cluster (users + login_activity collections).'
                      : 'Add MONGODB_URI to your environment to move user records into MongoDB — the app switches over automatically, no code changes needed.'}
                  </p>
                </div>
              </div>
              <div className="admin-stats">
                <div className="stat-card">
                  <div>
                    <span>Total users</span>
                    <Users size={16} />
                  </div>
                  <b>{userRows.length}</b>
                  <small><span /> Registered accounts</small>
                </div>
                <div className="stat-card">
                  <div>
                    <span>Active buyers</span>
                    <ShoppingBag size={16} />
                  </div>
                  <b>{userRows.filter((u) => u.paidOrders > 0).length}</b>
                  <small><span /> With confirmed orders</small>
                </div>
                <div className="stat-card">
                  <div>
                    <span>Lifetime value</span>
                    <IndianRupee size={16} />
                  </div>
                  <b>{formatINR(userRows.reduce((s, u) => s + u.totalSpentPaise, 0))}</b>
                  <small><span /> Total confirmed spend</small>
                </div>
                <div className="stat-card">
                  <div>
                    <span>Database</span>
                    <Database size={16} />
                  </div>
                  <b>{userSource === 'mongodb' ? 'MongoDB' : 'Postgres'}</b>
                  <small><span /> User records source</small>
                </div>
              </div>
              <section className="admin-panel">
                <div className="admin-table-toolbar">
                  <div className="admin-search">
                    <Search size={16} />
                    <input aria-label="Search users" placeholder="Search users by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <span>{userRows.filter((u) => [u.name, u.email].join(' ').toLowerCase().includes(search.toLowerCase())).length} users</span>
                </div>
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Joined</th>
                        <th>Last seen</th>
                        <th>Orders</th>
                        <th>Spend (₹)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userRows
                        .filter((u) => [u.name, u.email].join(' ').toLowerCase().includes(search.toLowerCase()))
                        .map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div className="table-product">
                                <span className="order-initial">{u.name.charAt(0).toUpperCase()}</span>
                                <div>
                                  <b>{u.name}</b>
                                  <small>{u.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                            <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : '—'}</td>
                            <td>
                              <b>{u.orderCount}</b>
                              {u.paidOrders > 0 && <small>{u.paidOrders} paid</small>}
                            </td>
                            <td>
                              <b>{u.totalSpentPaise ? formatINR(u.totalSpentPaise) : '—'}</b>
                            </td>
                            <td>
                              <button className="text-link danger-text" onClick={() => forceSignOut(u.id)}>
                                <LogOut size={12} /> Sign out
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {userRows.length === 0 && (
                  <div className="empty-state">
                    <Users size={30} />
                    <h3>No users yet.</h3>
                    <p>When someone creates an account on /account they appear here instantly.</p>
                  </div>
                )}
              </section>
              {userActivity.length > 0 && (
                <section className="admin-panel">
                  <div className="panel-heading">
                    <h2>Recent login activity</h2>
                    <span className="muted">{userActivity.length} events</span>
                  </div>
                  {userActivity.slice(0, 25).map((a, i) => (
                    <div className="activity-row" key={i}>
                      <span className={'activity-icon act-' + a.action}>
                        {a.action === 'signup' ? <UserPlus size={13} /> : a.action === 'failed' ? <X size={13} /> : <LogIn size={13} />}
                      </span>
                      <b>{a.email}</b>
                      <span className={'status status-' + (a.action === 'failed' ? 'cancelled' : a.action === 'signup' ? 'paid' : 'draft')}>{a.action}</span>
                      <small>{new Date(a.createdAt).toLocaleString('en-IN')}</small>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}

          {tab === 'reviews' && (
            <section className="admin-panel">
              <div className="panel-heading">
                <h2>Reviews ({reviews.length})</h2>
                <span className="muted">From verified buyers</span>
              </div>
              {reviews.length === 0 ? (
                <div className="empty-state">
                  <Star size={30} />
                  <h3>No reviews yet.</h3>
                  <p>Buyers can review after a confirmed purchase — they’ll appear here.</p>
                </div>
              ) : (
                reviews.map((r) => {
                  const product = products.find((p) => p.id === r.productId);
                  return (
                    <div className="admin-review-row" key={r.id}>
                      <span className="review-avatar">{r.userName.charAt(0).toUpperCase()}</span>
                      <div className="admin-review-body">
                        <div>
                          <b>{r.userName}</b>
                          <span className="stars-row">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} size={11} className={n <= r.rating ? 'star star-on' : 'star'} fill={n <= r.rating ? 'currentColor' : 'none'} />
                            ))}
                          </span>
                          {r.verified ? (
                            <span className="verified-pill"><CheckCircle2 size={10} /> Verified purchase</span>
                          ) : (
                            <span className="verified-pill unverified">Customer review</span>
                          )}
                          <small>{new Date(r.createdAt).toLocaleDateString('en-IN')}</small>
                        </div>
                        <p>{r.comment}</p>
                        <small className="muted">{product?.name || r.productId}</small>
                      </div>
                      <button className="icon-button danger-hover" aria-label="Delete review" title="Delete review (moderation)" onClick={() => deleteReview(r.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {tab === 'subscribers' && (
            <section className="admin-panel">
              <div className="panel-heading">
                <h2>Email subscribers</h2>
                <span className="muted">{subscribers.length} total</span>
              </div>
              {subscribers.length === 0 ? (
                <div className="empty-state">
                  <Mail size={32} />
                  <h3>Your community starts with one.</h3>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Email address</th>
                        <th>Subscribed on</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((s) => (
                        <tr key={s.email}>
                          <td>
                            <b>{s.email}</b>
                          </td>
                          <td>{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                          <td>
                            <button className="text-link danger-text" onClick={() => unsubscribe(s.email)}>
                              <Trash2 size={13} /> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'settings' && settings && (
            <div className="settings-grid settings-grid-wide">
              <section className="admin-panel settings-panel">
                <div className="panel-heading">
                  <h2>Razorpay payments (INR)</h2>
                  <span className={'status ' + (rzpOn ? 'status-paid' : 'status-draft')}>{rzpOn ? 'Live' : 'Not enabled'}</span>
                </div>
                <form className="admin-form" onSubmit={saveSettings}>
                  <label className="checkbox-label settings-toggle">
                    <input type="checkbox" name="rzp_enabled" defaultChecked={settings.razorpay_enabled === '1'} />
                    <span>
                      <b>Enable Razorpay checkout</b>
                      <small>Customers pay via UPI, cards, net-banking & wallets. Orders auto-confirm as “Paid”.</small>
                    </span>
                  </label>
                  <label>
                    Razorpay Key ID
                    <input name="rzp_key_id" placeholder="rzp_test_… or rzp_live_…" defaultValue={settings.razorpay_key_id} autoComplete="off" />
                    <small>From Razorpay Dashboard → Settings → API Keys. Use test keys first.</small>
                  </label>
                  <label>
                    Razorpay Key Secret
                    <input name="rzp_key_secret" type="password" placeholder="Key secret (stored securely)" defaultValue={settings.razorpay_key_secret} autoComplete="new-password" />
                    <small>Never shown publicly. Payments verify with an HMAC signature.</small>
                  </label>
                  <h3 className="settings-subhead">Store contact & socials</h3>
                  <div className="form-row">
                    <label>
                      Contact email
                      <input name="contact_email" type="email" defaultValue={settings.contact_email} />
                    </label>
                    <label>
                      Phone / WhatsApp
                      <input name="contact_phone" defaultValue={settings.contact_phone} />
                    </label>
                  </div>
                  <label>
                    Instagram URL
                    <input name="instagram_url" type="url" placeholder="https://instagram.com/…" defaultValue={settings.instagram_url} />
                  </label>
                  <label>
                    YouTube URL
                    <input name="youtube_url" type="url" placeholder="https://youtube.com/@…" defaultValue={settings.youtube_url} />
                  </label>
                  <label>
                    X (Twitter) URL
                    <input name="x_url" type="url" placeholder="https://x.com/…" defaultValue={settings.x_url} />
                  </label>
                  {formError && <p className="form-error">{formError}</p>}
                  <button className="button button-lime" disabled={busy}>
                    {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Save store settings
                  </button>
                 </form>
                <button type="button" className="button button-secondary rzp-test-btn" onClick={testRazorpay} disabled={rzpTesting}>
                  {rzpTesting ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />} Test Razorpay credentials
                </button>
                {rzpResult && (
                  <p className={'rzp-result ' + (rzpResult.ok ? 'rzp-ok' : 'rzp-bad')}>
                    {rzpResult.ok ? <CheckCircle2 size={14} /> : <X size={14} />}
                    {rzpResult.ok ? rzpResult.message : rzpResult.error}
                  </p>
                )}
              </section>

              <section className="admin-panel settings-panel">
                <div className="panel-heading">
                  <h2>Account security</h2>
                  <ShieldCheck size={18} />
                </div>
                <div className="account-email">
                  <small>OWNER</small>
                  <b>{admin.name}</b>
                  <small>OWNER EMAIL</small>
                  <b>{admin.email}</b>
                </div>
                <form className="admin-form" onSubmit={changePassword}>
                  <label>
                    Current password
                    <input name="currentPassword" type="password" required autoComplete="current-password" />
                  </label>
                  <label>
                    New password
                    <input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" />
                  </label>
                  <label>
                    Confirm new password
                    <input name="confirm" type="password" minLength={8} maxLength={128} required autoComplete="new-password" />
                  </label>
                  <button className="button button-lime" disabled={busy}>
                    {busy ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />} Update password
                  </button>
                </form>
                <div className="panel-heading" style={{ marginTop: 20 }}>
                  <h2>Integrations</h2>
                  <Code2 size={18} />
                </div>
                {[
                  { name: 'PostgreSQL database', detail: 'Products, sections, orders, users & reviews.', status: 'Connected', on: true },
                  { name: 'Razorpay (₹)', detail: 'Live UPI/card payments with signature verification.', status: rzpOn ? 'Live' : 'Configure keys', on: rzpOn },
                  { name: 'Image storage', detail: 'Product images up to 5 MB (JPG/PNG/WebP/GIF).', status: 'Connected', on: true },
                  { name: 'Digital delivery', detail: 'Downloads unlock after payment confirms.', status: 'Connected', on: true },
                ].map((i) => (
                  <div className="integration-item" key={i.name}>
                    <div>
                      <b>{i.name}</b>
                      <p>{i.detail}</p>
                    </div>
                    <span className={'status ' + (i.on ? 'status-paid' : 'status-draft')}>{i.status}</span>
                  </div>
                ))}
              </section>
            </div>
          )}

          <footer className="admin-footer">
            <Brand small />
            <span>Full access: sections · components · orders · shipping · reviews.</span>
            <Link href="/">
              Back to storefront <ArrowUpRight size={12} />
            </Link>
          </footer>
        </main>
      </div>

      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {notice}
          <button aria-label="Dismiss" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {editing && (
        <Modal title={draft.id ? 'Edit your component.' : 'Add a new component.'} onClose={() => { if (!busy && !uploading) setEditing(false); }} wide>
          <form className="admin-form product-edit-form" onSubmit={saveProduct}>
            <div className="edit-grid">
              <div>
                <label>
                  Component name *
                  <input required maxLength={150} value={draft.name} placeholder="Unihiker K10 Board" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </label>
                <label>
                  Description *
                  <textarea required rows={4} maxLength={5000} value={draft.description} placeholder="What it does, what’s in the box, compatibility…" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </label>
                <div className="form-row">
                  <label>
                    Storefront section
                    <select value={draft.sectionId} onChange={(e) => setDraft({ ...draft, sectionId: e.target.value })}>
                      <option value="">No section</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <small>Manage sections in the Sections tab.</small>
                  </label>
                  <label>
                    Category
                    <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                      {['Devices', 'Source Code', 'Development Boards', 'Wireless & RF', 'Antennas & Accessories', 'Modules & Sensors', 'Kits & Bundles', 'Freebies'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Price (₹) *
                    <input type="number" min="0" max="1000000" step="0.01" required value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
                    <small>In Indian Rupees. 0 = free download.</small>
                  </label>
                  <label>
                    MRP / old price (₹)
                    <input type="number" min="0" max="1000000" step="0.01" value={draft.oldPrice} placeholder="1499" onChange={(e) => setDraft({ ...draft, oldPrice: e.target.value })} />
                  </label>
                </div>
                <label>
                  Specifications (one per line, “Name: Value”)
                  <textarea rows={3} value={draft.specs} placeholder={'MCU: ESP32-S3\nDisplay: 2.8-inch color\nConnectivity: Wi-Fi + BT 5.0'} onChange={(e) => setDraft({ ...draft, specs: e.target.value })} />
                  <small>Shown as a specs table on the product page. Only you can edit these.</small>
                </label>
                <label>
                  Technology tags
                  <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="ESP32, TinyML, AI" />
                </label>
                <div className="form-row">
                  <label>
                    Badge
                    <select value={draft.badge} onChange={(e) => setDraft({ ...draft, badge: e.target.value })}>
                      <option value="">No badge</option>
                      {['NEW', 'BESTSELLER', 'POPULAR', 'FREE'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Starter layout / preview
                    <select value={draft.preview} onChange={(e) => setDraft({ ...draft, preview: e.target.value })}>
                      {[
                        ['hardware-device', 'Assembled Device (Screen & Box)'],
                        ['hardware-code', 'Source Code / Firmware (Editor)'],
                        ['hardware-board', 'Dev board (PCB with headers)'],
                        ['hardware-module', 'RF module (shielded)'],
                        ['hardware-antenna', 'Antenna (SMA whip)'],
                        ['hardware-kit', 'Kit / bundle (multiple parts)'],
                        ['dashboard', 'Analytics dashboard'],
                        ['orbit', '3D orbital hero'],
                        ['pricing', 'Pricing cards'],
                        ['landing', 'SaaS landing page'],
                        ['buttons', 'Interactive buttons'],
                        ['login', 'Authentication UI'],
                        ['portfolio', 'Creative portfolio'],
                        ['aurora', 'Aurora background'],
                      ].map(([v, n]) => (
                        <option key={v} value={v}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div>
                <label>Product image (only you can upload)</label>
                <div className={'image-upload-preview preview-' + draft.preview}>
                  <ProductVisual kind={draft.preview} image={draft.image} />
                  {draft.image && (
                    <button type="button" className="save-button" aria-label="Remove image" onClick={() => setDraft({ ...draft, image: '' })}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <label className="upload-label">
                  {uploading ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />} {uploading ? 'Uploading…' : 'Upload product image'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => upload(e.target.files?.[0])} disabled={uploading} />
                </label>
                <p className="upload-note">JPG, PNG, WebP or GIF · Up to 5 MB</p>
                <label>
                  Or image URL
                  <input type="text" placeholder="https://…" value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} />
                </label>
                <div className="publish-controls">
                  <label>
                    <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                    <span>
                      <b>Publish to storefront</b>
                      <small>Visible and purchasable by customers.</small>
                    </span>
                  </label>
                  <label>
                    <input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} />
                    <span>
                      <b>Featured component</b>
                      <small>Highlighted in the popular rail.</small>
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="source-editor">
              <div>
                <h3>
                  <Code2 size={16} /> Downloadable file (buy option)
                </h3>
                <label className="source-upload">
                  <Download size={13} /> Attach HTML file
                  <input type="file" accept=".html,.htm" onChange={(e) => uploadSource(e.target.files?.[0])} />
                </label>
              </div>
              <p>Customers can download this after payment. Leave empty to use the built-in starter. Only logged-in admin can access it beforehand.</p>
              <textarea rows={4} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="<!DOCTYPE html> … your file" maxLength={500000} spellCheck={false} aria-label="Downloadable HTML source" />
              <span>{draft.source ? `${draft.source.length.toLocaleString()} characters attached` : 'Using the included starter source'}</span>
            </div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="modal-footer">
              <button className="button button-secondary" type="button" onClick={() => setEditing(false)} disabled={busy || uploading}>
                Cancel
              </button>
              <button type="submit" className="button button-lime" disabled={busy || uploading}>
                {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />} {draft.id ? 'Save changes' : draft.active ? 'Publish component' : 'Save draft'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {shipEdit && (
        <Modal title={`Shipping · ${shipEdit.id}`} onClose={() => setShipEdit(null)}>
          <p className="modal-intro">Update the delivery stage — customers see it instantly on My Orders and their private order page.</p>
          <div className="admin-form ship-form">
            <label>
              Delivery stage
              <select value={shipDraft.shipping} onChange={(e) => setShipDraft({ ...shipDraft, shipping: e.target.value })}>
                {SHIPPING_STEPS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Courier partner (optional)
              <input placeholder="Delhivery / BlueDart / India Post…" value={shipDraft.courier} onChange={(e) => setShipDraft({ ...shipDraft, courier: e.target.value })} />
            </label>
            <label>
              Tracking URL (optional)
              <input placeholder="https://track.courier.com/…" type="url" value={shipDraft.trackingUrl} onChange={(e) => setShipDraft({ ...shipDraft, trackingUrl: e.target.value })} />
            </label>
            {shipEdit.address && (
              <div className="invoice-notice">
                <Package size={19} />
                <div>
                  <b>Delivering to</b>
                  <p>
                    {shipEdit.name} — {shipEdit.address}
                    {shipEdit.city ? `, ${shipEdit.city}` : ''}
                    {shipEdit.state ? `, ${shipEdit.state}` : ''} {shipEdit.pincode || ''}
                  </p>
                </div>
              </div>
            )}
            {formError && <p className="form-error">{formError}</p>}
            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setShipEdit(null)}>
                Cancel
              </button>
              <button className="button button-lime" onClick={saveShipping} disabled={busy}>
                {busy ? <Loader2 size={15} className="spin" /> : <Truck size={15} />} Update shipping
              </button>
            </div>
          </div>
        </Modal>
      )}

      {archive && (
        <Modal title="Unpublish this component?" onClose={() => setArchive(null)}>
          <p className="modal-intro">{archive.name} will be hidden from the storefront. Existing customers keep their downloads. Publish again anytime.</p>
          <div className="modal-footer">
            <button className="button button-secondary" onClick={() => setArchive(null)}>
              Keep published
            </button>
            <button className="button button-danger" onClick={archiveProduct} disabled={busy}>
              {busy ? <Loader2 size={14} className="spin" /> : <EyeOff size={14} />} Unpublish
            </button>
          </div>
        </Modal>
      )}

      {deleteSection && (
        <Modal title={`Delete “${deleteSection.name}”?`} onClose={() => setDeleteSection(null)}>
          <p className="modal-intro">
            {products.filter((p) => p.sectionId === deleteSection.id).length} component{products.filter((p) => p.sectionId === deleteSection.id).length !== 1 ? 's' : ''} in this section will become unassigned (not deleted).
          </p>
          <div className="modal-footer">
            <button className="button button-secondary" onClick={() => setDeleteSection(null)}>
              Keep section
            </button>
            <button className="button button-danger" onClick={removeSection} disabled={busy}>
              {busy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Delete section
            </button>
          </div>
        </Modal>
      )}

      {confirmOrder && (
        <Modal title={confirmOrder.status === 'paid' ? 'Confirm payment received?' : confirmOrder.status === 'cancelled' ? 'Cancel this order?' : 'Reopen this order?'} onClose={() => setConfirmOrder(null)}>
          <div className="order-reference">
            <span>{confirmOrder.order.id}</span>
            <b>{formatINR(confirmOrder.order.total)}</b>
          </div>
          <p className="modal-intro">
            {confirmOrder.status === 'paid'
              ? `Only confirm after receiving ${formatINR(confirmOrder.order.total)} from ${confirmOrder.order.name}. Downloads unlock immediately.`
              : confirmOrder.status === 'cancelled'
                ? 'Cancelling blocks downloads. Refunds must be handled through your payment provider.'
                : 'The order returns to pending payment.'}
          </p>
          {formError && <p className="form-error">{formError}</p>}
          <div className="modal-footer">
            <button className="button button-secondary" onClick={() => setConfirmOrder(null)}>
              Go back
            </button>
            <button className={'button ' + (confirmOrder.status === 'cancelled' ? 'button-danger' : 'button-lime')} onClick={updateOrderStatus} disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />} {confirmOrder.status === 'paid' ? 'Yes, payment received' : confirmOrder.status === 'cancelled' ? 'Cancel order' : 'Reopen order'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
