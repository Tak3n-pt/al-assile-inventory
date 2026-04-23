import { useEffect, useRef } from 'react';

// Subscribe to data-changed events broadcast by the main process after writes / sync pulls.
// Usage:
//   useDataChanged(['sales', 'products'], () => reload());
//   useDataChanged('clients', () => reloadClients());
// The callback is debounced — if several changes fire in the same tick, the handler runs once.
export function useDataChanged(domains, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!window.api || !window.api.events || typeof window.api.events.onDataChanged !== 'function') {
      return; // non-Electron / preload unavailable
    }
    const targets = Array.isArray(domains) ? domains : [domains];
    let scheduled = false;
    let lastDomain = null;

    const unsubscribe = window.api.events.onDataChanged((domain) => {
      if (!targets.includes(domain)) return;
      lastDomain = domain;
      if (scheduled) return;
      scheduled = true;
      // Coalesce bursts (e.g., sync import emits sales+clients+products together)
      queueMicrotask(() => {
        scheduled = false;
        try {
          handlerRef.current(lastDomain);
        } catch (e) {
          console.error('[useDataChanged] handler error:', e);
        }
      });
    });
    return unsubscribe;
  }, [Array.isArray(domains) ? domains.join('|') : domains]);
}

export default useDataChanged;
