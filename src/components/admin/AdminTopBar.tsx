	'use client';

	import { useEffect, useState } from 'react';
	import { signOut } from 'firebase/auth';
	import Link from 'next/link';
	import { useRouter } from 'next/navigation';
	import { getFirebaseAuthClient } from '@/lib/firebase/client';
	import { useAdminMe } from '@/lib/admin/useAdminMe';

	export default function AdminTopBar() {
	  const router = useRouter();
	  const { user, me } = useAdminMe();
	  const [unreadCount, setUnreadCount] = useState<number | null>(null);

	  useEffect(() => {
	    let cancelled = false;

	    async function loadUnreadMessages() {
	      if (!user || !me || me.role !== 'bar_owner' || !me.barId) return;
	      try {
	        const token = await user.getIdToken();
	        const res = await fetch(`/api/admin/bars/${me.barId}/messages`, {
	          headers: { Authorization: `Bearer ${token}` },
	        });
	        if (!res.ok) return;

	        const raw: unknown = await res.json().catch(() => ({}));
	        const data =
	          raw && typeof raw === 'object' && !Array.isArray(raw)
	            ? (raw as { messages?: { readByBar?: boolean }[] })
	            : null;
	        const list = Array.isArray(data?.messages) ? data!.messages : [];
	        const unread = list.filter((m) => !m.readByBar).length;
	        if (!cancelled) {
	          setUnreadCount(unread);
	        }
	      } catch (e) {
	        console.error('[AdminTopBar] Failed to load messages', e);
	      }
	    }

	    void loadUnreadMessages();

	    return () => {
	      cancelled = true;
	    };
	  }, [user, me]);

  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
	        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            where2watch
          </Link>
          <span className="text-xs rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Admin
          </span>
	          {me?.role === 'bar_owner' && typeof unreadCount === 'number' && unreadCount > 0 && (
	            <span className="text-xs rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
	              {unreadCount} nye meldinger
	            </span>
	          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            await signOut(getFirebaseAuthClient());
            router.replace('/admin');
          }}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Logg ut
        </button>
      </div>
    </header>
  );
}
