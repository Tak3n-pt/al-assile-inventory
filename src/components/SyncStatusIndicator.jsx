import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';

const STALE_MS = 15 * 60 * 1000; // 15 min

function formatAgo(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

function formatTs(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function getIndicator(status) {
  if (!status) return { dot: 'bg-dark-600', text: 'text-dark-500', label: '…' };
  if (!status.configured) return { dot: 'bg-dark-600', text: 'text-dark-500', label: 'No sync' };
  if (status.dev_mode && !status.dev_sync_allowed)
    return { dot: 'bg-dark-500', text: 'text-dark-500', label: 'Dev' };

  const lastAt = status.last_sync_attempt_at ? new Date(status.last_sync_attempt_at) : null;
  const ageMs = lastAt ? Date.now() - lastAt.getTime() : Infinity;

  if (!lastAt) return { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Not synced' };
  if (!status.last_sync_attempt_ok) return { dot: 'bg-red-500', text: 'text-red-400', label: 'Sync error' };
  if (ageMs > STALE_MS) return { dot: 'bg-yellow-500', text: 'text-yellow-400', label: formatAgo(status.last_sync_attempt_at) };
  return { dot: 'bg-green-500', text: 'text-green-400', label: formatAgo(status.last_sync_attempt_at) };
}

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await window.api?.sync?.getStatus();
      if (res?.success) setStatus(res.data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const handlePushNow = async () => {
    if (pushing) return;
    setPushing(true);
    setPushMsg('');
    try {
      const res = await window.api?.sync?.pushNow();
      if (res?.success && res.data?.last_sync_attempt_ok) {
        setPushMsg('ok');
        setStatus(s => ({ ...s, ...res.data }));
      } else {
        setPushMsg(res?.data?.last_sync_error || res?.error || 'Failed');
      }
      await refresh();
    } catch (e) {
      setPushMsg(e.message || 'Error');
    } finally {
      setPushing(false);
    }
  };

  const { dot, text, label } = getIndicator(status);

  return (
    <div className="relative flex items-center h-full">
      <button
        onClick={() => { setOpen(o => !o); setPushMsg(''); }}
        title="Cloud sync status"
        className={`title-bar-button flex items-center gap-1.5 px-3 h-full text-xs ${text} hover:bg-dark-800/80 transition-all duration-200`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="hidden sm:inline opacity-80">{label}</span>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl bg-dark-900 border border-dark-700 shadow-2xl text-xs text-dark-200 overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-dark-700">
              <span className="font-semibold text-white">Cloud Sync</span>
              <button onClick={() => setOpen(false)} className="text-dark-500 hover:text-white transition-colors">
                <X size={12} />
              </button>
            </div>

            <div className="px-3 py-2 space-y-2">
              {!status ? (
                <p className="text-dark-400 text-center py-2">Loading…</p>
              ) : !status.configured ? (
                <p className="text-yellow-400">Not configured.<br />Add server URL &amp; key in Settings → Cloud Sync.</p>
              ) : status.dev_mode && !status.dev_sync_allowed ? (
                <p className="text-dark-400">Dev mode — auto-sync disabled.</p>
              ) : (
                <>
                  <div className="space-y-1">
                    <Row label="Last push" value={formatTs(status.last_sync_push)} />
                    <Row label="Last pull" value={formatTs(status.last_sync_pull)} />
                    {status.last_sync_attempt_at && (
                      <Row
                        label={`Last attempt (${status.last_sync_attempt_kind || '?'})`}
                        value={
                          <span className={status.last_sync_attempt_ok ? 'text-green-400' : 'text-red-400'}>
                            {status.last_sync_attempt_ok ? 'OK' : 'FAILED'}
                            {' · '}{formatAgo(status.last_sync_attempt_at)}
                          </span>
                        }
                      />
                    )}
                    {status.last_sync_error && (
                      <p className="text-red-400 break-words pt-1">{status.last_sync_error}</p>
                    )}
                  </div>

                  <button
                    onClick={handlePushNow}
                    disabled={pushing}
                    className="w-full mt-1 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 font-medium"
                  >
                    <RefreshCw size={11} className={pushing ? 'animate-spin' : ''} />
                    {pushing ? 'Pushing…' : 'Push now'}
                  </button>

                  {pushMsg && (
                    <p className={`text-center ${pushMsg === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                      {pushMsg === 'ok' ? '✓ Push succeeded' : pushMsg}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-dark-400 flex-shrink-0">{label}</span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}
