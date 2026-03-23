"use client";

import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-zinc-400">Loading...</p></div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, callbackUrl });
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, callbackUrl });
    setSent(true);
    setLoading(false);
  }

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Opacity KYB</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in to start your KYB verification
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-green-50 p-4 text-center text-green-800">
            Check your email for a sign-in link.
          </div>
        ) : (
          <form
            onSubmit={isDev ? handleDevLogin : handleEmailLogin}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="you@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Signing in..." : isDev ? "Dev Sign In" : "Send Magic Link"}
            </button>
          </form>
        )}

        {isDev && (
          <p className="text-center text-xs text-zinc-400">
            Dev mode: use &quot;reviewer@test.com&quot; to sign in as reviewer
          </p>
        )}
      </div>
    </div>
  );
}
