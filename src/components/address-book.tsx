'use client';
import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Trash2, Check, X, Phone, Home, Briefcase } from 'lucide-react';

export type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
};

type Props = {
  /** Pre-fill the form with a chosen address. */
  onSelect: (address: SavedAddress | null) => void;
  /** Currently applied address id (so we can show it as selected). */
  selectedId?: string | null;
  /** Hide the manual form when the cart is fully digital. */
  compact?: boolean;
};

export default function AddressBook({ onSelect, selectedId, compact }: Props) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/user/addresses', { cache: 'no-store' });
      if (!r.ok) return;
      const list = await r.json();
      setAddresses(Array.isArray(list) ? list : []);
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(data.error || 'Could not save this address.');
      setAddresses((prev) => [data, ...prev]);
      setAdding(false);
      setForm({ label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
      onSelect(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this address.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch('/api/user/addresses?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (!r.ok) throw Error();
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) onSelect(null);
    } catch {
      setError('Could not remove this address.');
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch('/api/user/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDefault: true }),
      });
      if (!r.ok) throw Error();
      await load();
      const chosen = addresses.find((a) => a.id === id);
      if (chosen) onSelect({ ...chosen, isDefault: true });
    } catch {
      setError('Could not update this address.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="address-loading">Loading saved addresses…</div>;
  }

  return (
    <div className="address-book">
      {addresses.length > 0 && (
        <div className="address-list">
          {addresses.map((a) => {
            const Icon = a.label.toLowerCase().includes('office') || a.label.toLowerCase().includes('work') ? Briefcase : Home;
            const isSelected = selectedId === a.id;
            return (
              <div key={a.id} className={'address-card ' + (isSelected ? 'selected' : '')}>
                <button type="button" className="address-main" onClick={() => onSelect(a)}>
                  <span className="address-icon"><Icon size={15} /></span>
                  <span className="address-body">
                    <b>
                      {a.label}
                      {a.isDefault && <em>Default</em>}
                    </b>
                    <span>{a.fullName} · {a.phone}</span>
                    <span>
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}
                    </span>
                  </span>
                  <span className="address-check">{isSelected ? <Check size={15} /> : <MapPin size={15} />}</span>
                </button>
                <span className="address-actions">
                  {!a.isDefault && (
                    <button type="button" className="address-link" onClick={() => makeDefault(a.id)} disabled={busy}>
                      Set default
                    </button>
                  )}
                  <button type="button" className="address-link danger-text" onClick={() => remove(a.id)} disabled={busy} aria-label={`Delete ${a.label} address`}>
                    <Trash2 size={12} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!adding ? (
        <button type="button" className="address-add" onClick={() => setAdding(true)}>
          <Plus size={15} /> {addresses.length ? 'Use a different address' : 'Save a delivery address'}
        </button>
      ) : (
        <form className="address-form" onSubmit={save}>
          <div className="address-form-head">
            <b>New delivery address</b>
            <button type="button" className="icon-button" onClick={() => setAdding(false)} aria-label="Cancel">
              <X size={16} />
            </button>
          </div>
          <div className="form-row">
            <label>
              Label
              <input value={form.label} maxLength={30} placeholder="Home / Office" onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </label>
            <label>
              Full name
              <input required maxLength={100} value={form.fullName} placeholder="Raju Laveti" onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Phone
              <input required maxLength={20} inputMode="tel" value={form.phone} placeholder="8639396238" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              PIN code
              <input required maxLength={6} inputMode="numeric" pattern="[0-9]{6}" value={form.pincode} placeholder="532407" onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} />
            </label>
          </div>
          <label>
            Flat, house no., building, street
            <input required maxLength={200} value={form.line1} placeholder="Flat 2, RR Road" onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          </label>
          <label>
            Area, landmark <small>(optional)</small>
            <input maxLength={200} value={form.line2} placeholder="Near bus stop" onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          </label>
          <div className="form-row">
            <label>
              City
              <input required maxLength={80} value={form.city} placeholder="Ranasthalam" onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <label>
              State
              <input required maxLength={80} value={form.state} placeholder="Andhra Pradesh" onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-lime" disabled={busy}>
            {busy ? <span className="spin"><Phone size={14} /></span> : <MapPin size={14} />} Save address
          </button>
          <p className="address-note">Saved addresses are encrypted at rest and only visible to your account.</p>
        </form>
      )}
    </div>
  );
}
