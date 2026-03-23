"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SideBySideView } from "@/components/review/SideBySideView";

interface AdminReviewClientProps {
  application: {
    id: string;
    companyName: string | null;
    jurisdiction: string | null;
    registrationNum: string | null;
    status: string;
    applicantEmail: string;
    applicantOrg: string | null;
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
  attestations: {
    attestedAt: string;
    statement: string;
    ipAddress: string | null;
  }[];
  reviewHistory: {
    action: string;
    notes: string | null;
    createdAt: string;
    reviewerEmail: string;
  }[];
}

export function AdminReviewClient({
  application,
  documents,
  entities,
  orgStructure,
  attestations,
  reviewHistory,
}: AdminReviewClientProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const ubos = entities.filter((e) => e.isUbo);
  const lowConfidence = entities.filter((e) => e.confidence < 0.5);

  async function handleAction(action: "APPROVE" | "REJECT" | "REQUEST_INFO") {
    setLoading(true);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          action,
          notes,
        }),
      });
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with application metadata */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Review: {application.companyName || "Untitled"}
          </h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">
            <span>Applicant: {application.applicantEmail}</span>
            {application.jurisdiction && (
              <span>Jurisdiction: {application.jurisdiction}</span>
            )}
            {application.registrationNum && (
              <span>Reg #: {application.registrationNum}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ubos.length > 0 && (
            <span className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
              {ubos.length} UBO{ubos.length !== 1 ? "s" : ""}
            </span>
          )}
          {lowConfidence.length > 0 && (
            <span className="rounded-lg bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-700">
              {lowConfidence.length} low confidence
            </span>
          )}
        </div>
      </div>

      {/* Attestation info */}
      {attestations.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-800">
            Applicant Attestation
          </h3>
          <p className="mt-1 text-xs text-green-700">
            Attested on{" "}
            {new Date(attestations[0].attestedAt).toLocaleString()} from IP{" "}
            {attestations[0].ipAddress || "unknown"}
          </p>
        </div>
      )}

      {/* Review history */}
      {reviewHistory.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            Review History
          </h3>
          <ul className="mt-2 space-y-2">
            {reviewHistory.map((r, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-zinc-700">{r.action}</span>{" "}
                by {r.reviewerEmail} on{" "}
                {new Date(r.createdAt).toLocaleString()}
                {r.notes && (
                  <p className="mt-0.5 text-zinc-500">{r.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Side-by-side review with actions */}
      <SideBySideView
        documents={documents}
        entities={entities}
        orgStructure={orgStructure as never}
        showActions={
          application.status !== "APPROVED" &&
          application.status !== "REJECTED"
        }
        onApprove={() => handleAction("APPROVE")}
        onReject={() => handleAction("REJECT")}
        onRequestInfo={() => handleAction("REQUEST_INFO")}
        reviewerNotes={notes}
        onReviewerNotesChange={setNotes}
      />

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20">
          <div className="rounded-lg bg-white px-6 py-4 shadow-lg">
            <p className="text-sm text-zinc-600">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}
