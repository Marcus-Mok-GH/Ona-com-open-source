'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/libs/auth-client';

const GH_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

type GithubLinkGateProps = {
  open: boolean;
  onLinked: () => void;
  onClose: () => void;
};

export function GithubLinkGate({ open, onLinked, onClose }: GithubLinkGateProps) {
  const [mounted, setMounted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedHandled, setLinkedHandled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      setLinkedHandled(false);
      setStarting(false);
      setWaiting(false);
    }
  }, [open]);

  // If the user completes the connection in another tab, resolve the gate automatically.
  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setInterval(async () => {
      if (linkedHandled) {
        return;
      }
      try {
        const res = await apiFetch('/api/composio/github/status');
        if (!res.ok) {
          return;
        }
        const data = await res.json() as { linked: boolean };
        if (data.linked && !linkedHandled) {
          setLinkedHandled(true);
          onLinked();
        }
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [open, linkedHandled, onLinked]);

  if (!open || !mounted) {
    return null;
  }

  async function startLinking() {
    setStarting(true);
    setError(null);
    try {
      const res = await apiFetch('/api/composio/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackUrl: `${window.location.origin}/task?composio_connected=1` }),
      });
      const data = await res.json() as { redirectUrl?: string; message?: string };
      if (!res.ok || !data.redirectUrl) {
        setError(data.message || 'Could not start the GitHub connection. Try again.');
        setStarting(false);
        return;
      }
      setWaiting(true);
      window.location.href = data.redirectUrl;
    } catch {
      setError('Could not reach the connection service. Try again.');
      setStarting(false);
    }
  }

  return createPortal(
    <div
      role="presentation"
      className="fixed left-0 top-0 z-[2147483647] flex h-[100dvh] w-screen items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-2xl"
        style={{ backgroundColor: 'var(--bg)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {GH_ICON}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Link your GitHub to continue
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Starting a new chat requires a linked GitHub account. Connect securely through Composio — it only takes a minute.
            </p>
          </div>

          {error && (
            <p className="w-full rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {waiting
            ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <div className="size-2.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  Redirecting to Composio…
                </div>
              )
            : (
                <div className="flex w-full flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={startLinking}
                    disabled={starting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 dark:bg-gray-100 px-5 py-3 text-sm font-medium text-white dark:text-gray-900 transition-opacity hover:opacity-80 disabled:opacity-60"
                  >
                    {starting
                      ? <div className="size-4 rounded-full border-2 border-white/40 border-t-white dark:border-gray-900/40 dark:border-t-gray-900 animate-spin" />
                      : GH_ICON}
                    Link GitHub via Composio
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
