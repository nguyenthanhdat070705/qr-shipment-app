'use client';

import { useEffect, useState } from 'react';

export interface CatalogInventory {
  code: string;
  tonKho: string;
  khaDung: string;
  warehouseBreakdown: { name: string; qty: number; avail: number }[];
}

/** Stock is fetched only after the authenticated API has authorized inventory access. */
export function useCatalogInventory() {
  const [inventory, setInventory] = useState<Record<string, CatalogInventory>>({});
  const [status, setStatus] = useState<'hidden' | 'loading' | 'ready' | 'error'>('hidden');
  useEffect(() => {
    let currentRequest: AbortController | null = null;
    function load() {
      currentRequest?.abort();
      let allowed = false;
      try {
        const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
        allowed = !!localStorage.getItem('auth_token') && user?.permissions?.canViewInventory === true;
      } catch { /* Invalid cached session must not expose stock. */ }
      setInventory({});
      if (!allowed) { setStatus('hidden'); return; }
      const controller = new AbortController();
      currentRequest = controller;
      setStatus('loading');
      fetch('/api/inventory', { signal: controller.signal, cache: 'no-store' })
        .then(async response => {
          if (!response.ok) throw new Error('Unable to load inventory');
          const payload = await response.json();
          if (!Array.isArray(payload.data)) throw new Error('Invalid inventory response');
          if (!controller.signal.aborted) {
            setInventory(Object.fromEntries(payload.data.map((item: CatalogInventory) => [item.code, item])));
            setStatus('ready');
          }
        })
        .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    }
    load();
    window.addEventListener('auth-user-updated', load);
    return () => { currentRequest?.abort(); window.removeEventListener('auth-user-updated', load); };
  }, []);
  return { inventory, status };
}
