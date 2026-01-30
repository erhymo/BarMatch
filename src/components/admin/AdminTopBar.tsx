'use client';

import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFirebaseAuthClient } from '@/lib/firebase/client';

export default function AdminTopBar() {
  const router = useRouter();

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
