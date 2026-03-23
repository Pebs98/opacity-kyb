"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AttestPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading...</div>}>
      <AttestPageInner />
    </Suspense>
  );
}

const ATTESTATION_STATEMENT =
  "I hereby attest that the information provided in this KYB application, including all uploaded documents and declared beneficial ownership information, is true, accurate, and complete to the best of my knowledge and belief. I understand that providing false or misleading information may result in the rejection of this application and potential legal consequences.";

function AttestPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const applicationId = searchParams.get("applicationId");

  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleAttest() {
    if (!applicationId || !agreed || !fullName) return;
    setLoading(true);

    try {
      // Create attestation
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "ATTEST",
          statement: `${ATTESTATION_STATEMENT}\n\nSigned by: ${fullName}${title ? `, ${title}` : ""}`,
        }),
      });

      // Update application status
      await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, status: "SUBMITTED" }),
      });

      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900">
            Application Submitted
          </h2>
          <p className="text-sm text-zinc-600">
            Your KYB application has been submitted for review by the Opacity
            team. You will be notified when a decision is made.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Attestation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review and sign the attestation statement to submit your KYB
          application.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-900">
          Attestation Statement
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          {ATTESTATION_STATEMENT}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Full Legal Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Title / Role
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="CFO, Head of Operations, etc."
          />
        </div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-zinc-700">
            I have reviewed the extracted ownership structure, confirmed its
            accuracy, and agree to the attestation statement above.
          </span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-white"
        >
          Back to Review
        </button>
        <button
          onClick={handleAttest}
          disabled={!agreed || !fullName || loading}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Sign & Submit"}
        </button>
      </div>
    </div>
  );
}
