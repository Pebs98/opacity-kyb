"use client";

import { useState, useCallback } from "react";
import { HighlightedText } from "./HighlightedText";
import { OrgChart } from "./OrgChart";

interface Entity {
  id: string;
  entityName: string;
  entityType: string;
  ownershipPct: number | null;
  sourceText: string | null;
  confidence: number;
  isUbo: boolean;
  parentEntityId: string | null;
  childEntities: Entity[];
}

interface DocumentData {
  id: string;
  fileName: string;
  extractedText: string | null;
}

interface OrgNode {
  id: string;
  name: string;
  type: string;
  ownershipPct: number | null;
  confidence: number;
  isUbo: boolean;
  children: OrgNode[];
}

interface SideBySideViewProps {
  documents: DocumentData[];
  entities: Entity[];
  orgStructure: OrgNode[];
  gaps?: { description: string; severity: string }[];
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestInfo?: (notes: string) => void;
  reviewerNotes?: string;
  onReviewerNotesChange?: (notes: string) => void;
}

export function SideBySideView({
  documents,
  entities,
  orgStructure,
  gaps = [],
  showActions = false,
  onApprove,
  onReject,
  onRequestInfo,
  reviewerNotes = "",
  onReviewerNotesChange,
}: SideBySideViewProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  const handleEntityClick = useCallback((entityId: string) => {
    setSelectedEntityId(entityId);
    // Scroll to source text highlight in document panel
    const sourceEl = document.getElementById(`source-${entityId}`);
    if (sourceEl) {
      sourceEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const activeDoc = documents[activeDocIndex];

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs">
        <span className="font-medium text-zinc-600">Entity Types:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-blue-300 bg-blue-100" />
          Company
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-green-300 bg-green-100" />
          Individual
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-orange-300 bg-orange-100" />
          Trust
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-purple-300 bg-purple-100" />
          Fund
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-2 border-red-500 bg-red-50" />
          UBO
        </span>
      </div>

      {/* Main panels */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Source Documents */}
        <div className="flex w-1/2 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900">
                Source Documents
              </h3>
              {documents.length > 1 && (
                <div className="flex gap-1">
                  {documents.map((doc, i) => (
                    <button
                      key={doc.id}
                      onClick={() => setActiveDocIndex(i)}
                      className={`rounded px-2 py-0.5 text-xs ${
                        i === activeDocIndex
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {doc.fileName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {activeDoc?.extractedText ? (
              <HighlightedText
                text={activeDoc.extractedText}
                entities={entities.filter(
                  (e) => e.sourceText && activeDoc.extractedText?.includes(e.sourceText)
                )}
                selectedEntityId={selectedEntityId}
                onEntityClick={handleEntityClick}
              />
            ) : (
              <p className="text-sm text-zinc-400">
                No extracted text available for this document.
              </p>
            )}
          </div>
        </div>

        {/* Right: Org Structure */}
        <div className="flex w-1/2 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-2">
            <h3 className="text-sm font-semibold text-zinc-900">
              Extracted Ownership Structure
            </h3>
          </div>
          <div className="flex-1">
            {orgStructure.length > 0 ? (
              <OrgChart
                structure={orgStructure}
                selectedEntityId={selectedEntityId}
                onEntityClick={handleEntityClick}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-zinc-400">
                  No structure extracted yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Gaps + Actions */}
      <div className="space-y-3">
        {gaps.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="text-sm font-semibold text-yellow-800">
              Missing Information
            </h4>
            <ul className="mt-2 space-y-1">
              {gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                      gap.severity === "high"
                        ? "bg-red-500"
                        : gap.severity === "medium"
                          ? "bg-yellow-500"
                          : "bg-zinc-400"
                    }`}
                  />
                  <span className="text-yellow-900">{gap.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showActions && (
          <div className="flex items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4">
            {onReviewerNotesChange && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-600">
                  Review Notes
                </label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => onReviewerNotesChange(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Add notes about this review..."
                />
              </div>
            )}
            <div className="flex gap-2">
              {onRequestInfo && (
                <button
                  onClick={() => onRequestInfo(reviewerNotes)}
                  className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
                >
                  Request More Info
                </button>
              )}
              {onReject && (
                <button
                  onClick={onReject}
                  className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Reject
                </button>
              )}
              {onApprove && (
                <button
                  onClick={onApprove}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
