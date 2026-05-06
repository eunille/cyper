'use client';

import { useEffect, useState } from 'react';

interface SessionExpiredModalProps {
  onLogout: () => void;
}

export function SessionExpiredModal({ onLogout }: SessionExpiredModalProps) {
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    if (seconds <= 0) {
      onLogout();
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, onLogout]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-700"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="mb-1 text-base font-semibold text-neutral-900">Session expired</h2>
        <p className="mb-5 text-sm text-neutral-500">
          Your session has expired or you are no longer authenticated. You will be redirected to the
          login page.
        </p>

        {/* Countdown bar */}
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all duration-1000 ease-linear"
            style={{ width: `${(seconds / 4) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">Redirecting in {seconds}s…</span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-700"
          >
            Log out now
          </button>
        </div>
      </div>
    </div>
  );
}
