'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenStore } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!tokenStore.access) {
      router.replace('/login');
      return;
    }

    // Ask who we are before choosing a landing page — a super admin has no
    // pages, so the inbox would be an empty screen for them.
    api
      .me()
      .then((me) => router.replace(me.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'))
      .catch(() => router.replace('/login'));
  }, [router]);

  return <main className="grid min-h-screen place-items-center text-sm opacity-60">Loading…</main>;
}
