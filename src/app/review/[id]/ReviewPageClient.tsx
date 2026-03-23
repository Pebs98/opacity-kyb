"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SideBySideView } from "@/components/review/SideBySideView";

interface ReviewPageClientProps {
  application: {
    id: string;
    companyName: string | null;
    status: string;
  };
  documents: {
    id: string;
    fileName: string;
    extractedText: string | null;
  }[];
  entities: {
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
  }[];
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
  const [attesting, setAttesting] = useState(false);

  const ubos = entities.filter((e) => e.isUbo);

  async function handleAttest() {
    setAttesting(true);
    try {
      await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: application.id, status: "SUBMITTED" }),
      });
      router.push(`/apply/attest?applicationId=${application.id}`);
    } finally {
      setAttesting(false);
    }
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
            Highlighted text in the left panel corresponds to entities in the org
            chart on the right.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ubos.length > 0 && (
            <span className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
              {ubos.length} UBO{ubos.length !== 1 ? "s" : ""} identified
            </span>
          )}
          {!hasAttested && application.status !== "SUBMITTED" && (
            <button
              onClick={handleAttest}
              disabled={attesting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {attesting ? "Processing..." : "Proceed to Attestation"}
            </button>
          )}
          {hasAttested && (
            <span className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
              Attested
            </span>
          )}
        </div>
      </div>

      <SideBySideView
        documents={documents}
        entities={entities}
        orgStructure={orgStructure as never}
      />
    </div>
  );
}
