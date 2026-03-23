"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Nav() {
  const { data: session } = useSession();

  if (!session) return null;

  const isReviewer = session.user.role === "REVIEWER";

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-bold text-zinc-900">
            Opacity KYB
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {isReviewer ? (
              <>
                <Link
                  href="/admin"
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  Review Queue
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/apply"
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  New Application
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">{session.user.email}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {session.user.role}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-zinc-500 hover:text-zinc-900"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
