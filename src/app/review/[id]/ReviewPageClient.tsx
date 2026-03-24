"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SideBySideView } from "@/components/review/SideBySideView";

interface EntityData {
  id: string;
  entityName: string;
  entityType: string;
  ownershipPct: number | null;
  sourceText: string | null;
  confidence: number;
  isUbo: boolean;
  parentEntityId: string | null;
  childEntities: {
    id: string;
    entityName: string;
    entityType: string;
    ownershipPct: number | null;
    sourceText: string | null;
    confidence: number;
    isUbo: boolean;
    parentEntityId: string | null;
    childEntities: never[];
  }[];
}

interface ReviewPageClientProps {
  application: {
    id: string;
    companyName: string | null;
    status: string;
  };
  documents: {
    id: string;
    fileName: string;
    fileType: string;
    extractedText: string | null;
  }[];
  entities: EntityData[];
  orgStructure: object[];
  hasAttested: boolean;
}

export function ReviewPageClient({
  application,
  documents,
  entities,
  orgStructure,
  hasAttested,
}: ReviewPageClientProps) {
  const router = useRouter();

  // UBO sign-off state: track which UBOs user has confirmed/rejected
  const ubos = entities.filter((e) => e.isUbo);
  const [uboDecisions, setUboDecisions] = useState<
    Record<string, "confirmed" | "rejected" | null>
  >(() => {
    const initial: Record<string, "confirmed" | "rejected" | null> = {};
    ubos.forEach((u) => (initial[u.id] = null));
    return initial;
  });
  const [uboNotes, setUboNotes] = useState<Record<string, string>>({});
  const [showSignOff, setShowSignOff] = useState(false);

  const allDecided = ubos.length > 0 && ubos.every((u) => uboDecisions[u.id] !== null);
  const confirmedCount = Object.values(uboDecisions).filter((d) => d === "confirmed").length;
  const rejectedCount = Object.values(uboDecisions).filter((d) => d === "rejected").length;

  function handleProceedToAttestation() {
    if (!allDecided) return;
    router.push(`/apply/attest?applicationId=${application.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {application.companyName || "Application"} - Review
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review the extracted ownership structure against source documents.
            {!hasAttested && " Then sign off on identified UBOs to proceed."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ubos.length > 0 && (
            <span className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
              {ubos.length} UBO{ubos.length !== 1 ? "s" : ""} identified
            </span>
          )}
          {hasAttested && (
            <span className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
              Attested
            </span>
          )}
          {!hasAttested && application.status !== "SUBMITTED" && (
            <button
              onClick={() => setShowSignOff(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Sign Off on UBOs
            </button>
          )}
        </div>
      </div>

      <SideBySideView
        documents={documents}
        entities={entities}
        orgStructure={orgStructure as never}
      />

      {/* UBO Sign-Off Panel */}
      {showSignOff && !hasAttested && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-2xl">
            <div className="border-b border-zinc-200 px-6 py-4">
              <h2 className="text-lg font-bold text-zinc-900">
                UBO Sign-Off
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Review each identified Ultimate Beneficial Owner. Confirm or
                reject each one. You must decide on all UBOs before proceeding
                to attestation.
              </p>
            </div>

            <div className="divide-y divide-zinc-100 px-6">
              {ubos.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-400">
                  No UBOs were identified from the uploaded documents.
                </div>
              ) : (
                ubos.map((ubo) => {
                  const decision = uboDecisions[ubo.id];
                  return (
                    <div key={ubo.id} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-900">
                              {ubo.entityName}
                            </p>
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                              {ubo.entityType}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                ubo.confidence > 0.7
                                  ? "bg-green-100 text-green-700"
                                  : ubo.confidence > 0.4
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {(ubo.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          {ubo.ownershipPct !== null && (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {ubo.ownershipPct}% ownership
                            </p>
                          )}
                          {ubo.sourceText && (
                            <p className="mt-1 rounded bg-zinc-50 px-2 py-1 text-xs italic text-zinc-600">
                              Source: &ldquo;{ubo.sourceText.slice(0, 120)}
                              {ubo.sourceText.length > 120 ? "..." : ""}&rdquo;
                            </p>
                          )}
                          <input
                            type="text"
                            placeholder="Optional notes..."
                            value={uboNotes[ubo.id] || ""}
                            onChange={(e) =>
                              setUboNotes((prev) => ({
                                ...prev,
                                [ubo.id]: e.target.value,
                              }))
                            }
                            className="mt-2 block w-full rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setUboDecisions((prev) => ({
                                ...prev,
                                [ubo.id]: "confirmed",
                              }))
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              decision === "confirmed"
                                ? "bg-green-600 text-white"
                                : "border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() =>
                              setUboDecisions((prev) => ({
                                ...prev,
                                [ubo.id]: "rejected",
                              }))
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              decision === "rejected"
                                ? "bg-red-600 text-white"
                                : "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4">
              <div className="text-xs text-zinc-500">
                {confirmedCount} confirmed, {rejectedCount} rejected
                {!allDecided &&
                  ubos.length > 0 &&
                  ` — ${ubos.length - confirmedCount - rejectedCount} remaining`}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOff(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Back to Review
                </button>
                <button
                  onClick={handleProceedToAttestation}
                  disabled={!allDecided}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  Proceed to Attestation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
