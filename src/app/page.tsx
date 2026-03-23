import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50">
      <div className="max-w-2xl space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Opacity KYB
        </h1>
        <p className="text-lg text-zinc-600">
          Self-service Know Your Business verification for onboarding into the
          Opacity Verified Data Network. Identify your Ultimate Beneficial
          Owners, upload supporting documents, and get verified.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-white"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
