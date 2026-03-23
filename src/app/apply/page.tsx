"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileUploader } from "@/components/upload/FileUploader";

type Step = "company" | "documents" | "ubos" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "company", label: "Company Info" },
  { key: "documents", label: "Upload Documents" },
  { key: "ubos", label: "Known UBOs" },
  { key: "review", label: "Review & Submit" },
];

export default function ApplyPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading...</div>}>
      <ApplyPage />
    </Suspense>
  );
}

interface KnownUbo {
  name: string;
  ownershipPct: string;
  relationship: string;
}

function ApplyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const existingId = searchParams.get("id");

  const [step, setStep] = useState<Step>("company");
  const [applicationId, setApplicationId] = useState<string | null>(
    existingId
  );
  const [loading, setLoading] = useState(false);

  // Step 1: Company info
  const [companyName, setCompanyName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [registrationNum, setRegistrationNum] = useState("");

  // Step 2: Documents tracked via FileUploader
  const [uploadedDocIds, setUploadedDocIds] = useState<string[]>([]);

  // Step 3: Known UBOs (optional self-declaration)
  const [knownUbos, setKnownUbos] = useState<KnownUbo[]>([
    { name: "", ownershipPct: "", relationship: "" },
  ]);

  // Load existing application if resuming
  useEffect(() => {
    if (existingId) {
      fetch(`/api/applications?id=${existingId}`)
        .then((r) => r.json())
        .then((app) => {
          if (app.companyName) setCompanyName(app.companyName);
          if (app.jurisdiction) setJurisdiction(app.jurisdiction);
          if (app.registrationNum) setRegistrationNum(app.registrationNum);
        })
        .catch(() => {});
    }
  }, [existingId]);

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  async function handleCompanySubmit() {
    setLoading(true);
    try {
      if (applicationId) {
        await fetch("/api/applications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: applicationId,
            companyName,
            jurisdiction,
            registrationNum,
          }),
        });
      } else {
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName, jurisdiction, registrationNum }),
        });
        const app = await res.json();
        setApplicationId(app.id);
      }
      setStep("documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForExtraction() {
    if (!applicationId) return;
    setLoading(true);
    try {
      // Trigger extraction
      await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      // Navigate to review
      router.push(`/review/${applicationId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (i <= currentStepIndex) setStep(s.key);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= currentStepIndex
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-200 text-zinc-500"
              }`}
            >
              {i + 1}
            </button>
            <span
              className={`text-sm ${
                i <= currentStepIndex
                  ? "font-medium text-zinc-900"
                  : "text-zinc-400"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-2 h-px w-8 bg-zinc-300" />
            )}
          </div>
        ))}
      </nav>

      {/* Step 1: Company Info */}
      {step === "company" && (
        <div className="max-w-lg space-y-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">
              Company Information
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Basic details about the entity being verified.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Acme Holdings Ltd."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Jurisdiction
              </label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Delaware, USA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Registration Number
              </label>
              <input
                type="text"
                value={registrationNum}
                onChange={(e) => setRegistrationNum(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="5555555"
              />
            </div>
          </div>
          <button
            onClick={handleCompanySubmit}
            disabled={!companyName || loading}
            className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Next: Upload Documents"}
          </button>
        </div>
      )}

      {/* Step 2: Upload Documents */}
      {step === "documents" && applicationId && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">
              Upload Documents
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Upload documents that establish the ownership structure. Articles
              of incorporation, shareholder registers, cap tables, org charts,
              trust deeds, etc.
            </p>
          </div>
          <FileUploader
            applicationId={applicationId}
            onUploadComplete={(docId) =>
              setUploadedDocIds((prev) => [...prev, docId])
            }
          />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep("company")}
              className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-white"
            >
              Back
            </button>
            <button
              onClick={() => setStep("ubos")}
              disabled={uploadedDocIds.length === 0}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Next: Known UBOs
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Known UBOs */}
      {step === "ubos" && (
        <div className="max-w-lg space-y-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">
              Known Ultimate Beneficial Owners
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Optional: declare known UBOs. This helps validate what our system
              extracts from your documents.
            </p>
          </div>
          <div className="space-y-4">
            {knownUbos.map((ubo, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4"
              >
                <input
                  type="text"
                  value={ubo.name}
                  onChange={(e) => {
                    const updated = [...knownUbos];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setKnownUbos(updated);
                  }}
                  placeholder="Full name"
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={ubo.ownershipPct}
                    onChange={(e) => {
                      const updated = [...knownUbos];
                      updated[i] = {
                        ...updated[i],
                        ownershipPct: e.target.value,
                      };
                      setKnownUbos(updated);
                    }}
                    placeholder="Ownership %"
                    className="block w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={ubo.relationship}
                    onChange={(e) => {
                      const updated = [...knownUbos];
                      updated[i] = {
                        ...updated[i],
                        relationship: e.target.value,
                      };
                      setKnownUbos(updated);
                    }}
                    placeholder="Relationship (e.g., Director, Shareholder)"
                    className="block flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() =>
                setKnownUbos([
                  ...knownUbos,
                  { name: "", ownershipPct: "", relationship: "" },
                ])
              }
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              + Add another UBO
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep("documents")}
              className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-white"
            >
              Back
            </button>
            <button
              onClick={() => setStep("review")}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === "review" && (
        <div className="max-w-lg space-y-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">
              Review & Submit
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Review your information before submitting for UBO extraction and
              analysis.
            </p>
          </div>
          <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
            <div>
              <span className="text-xs font-medium text-zinc-500">
                Company
              </span>
              <p className="text-sm font-medium text-zinc-900">{companyName}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-500">
                Jurisdiction
              </span>
              <p className="text-sm text-zinc-900">
                {jurisdiction || "Not specified"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-500">
                Registration #
              </span>
              <p className="text-sm text-zinc-900">
                {registrationNum || "Not specified"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-500">
                Documents Uploaded
              </span>
              <p className="text-sm text-zinc-900">{uploadedDocIds.length}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-500">
                Declared UBOs
              </span>
              <p className="text-sm text-zinc-900">
                {knownUbos.filter((u) => u.name).length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep("ubos")}
              className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-white"
            >
              Back
            </button>
            <button
              onClick={handleSubmitForExtraction}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Submit for Analysis"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
