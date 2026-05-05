'use client';

import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth');
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
    >
      Sign out
    </button>
  );
}
