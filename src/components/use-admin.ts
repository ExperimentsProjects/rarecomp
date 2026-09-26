'use client';
import { useEffect, useState } from 'react';
import { patchFetchWithSessionTokens } from './session-token';

/**
 * Detects a real, active admin session (verified server-side via the
 * httpOnly admin cookie). Returns false for visitors and signed-in customers,
 * so admin-only entry points stay completely hidden from them.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    patchFetchWithSessionTokens();
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { admin: null }))
      .then((d) => {
        if (active) setIsAdmin(!!d?.admin);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return isAdmin;
}
