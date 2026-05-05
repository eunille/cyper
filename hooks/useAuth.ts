'use client';

import { useEffect, useState } from 'react';

export interface AuthUser {
  userId: string;
  username: string;
}

export function useAuth(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) { setUser(null); return; }
        const data = await res.json() as { userId: string; username: string };
        setUser({ userId: data.userId, username: data.username });
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return { user, loading };
}
