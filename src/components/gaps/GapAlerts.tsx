"use client";

interface Gap {
  description: string;
  severity: "high" | "medium" | "low";
}

interface GapAlertsProps {
  gaps: Gap[];
}

export function GapAlerts({ gaps }: GapAlertsProps) {
  if (gaps.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-800">
          No gaps detected. All entity data appears complete.
        </p>
      </div>
    );
  }

  const highGaps = gaps.filter((g) => g.severity === "high");
  const mediumGaps = gaps.filter((g) => g.severity === "medium");
  const lowGaps = gaps.filter((g) => g.severity === "low");

  return (
    <div className="space-y-3">
      {highGaps.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            Critical Issues ({highGaps.length})
          </h4>
          <ul className="mt-2 space-y-1">
            {highGaps.map((gap, i) => (
              <li key={i} className="text-sm text-red-700">
                {gap.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mediumGaps.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
            Warnings ({mediumGaps.length})
          </h4>
          <ul className="mt-2 space-y-1">
            {mediumGaps.map((gap, i) => (
              <li key={i} className="text-sm text-yellow-700">
                {gap.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {lowGaps.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" />
            Info ({lowGaps.length})
          </h4>
          <ul className="mt-2 space-y-1">
            {lowGaps.map((gap, i) => (
              <li key={i} className="text-sm text-zinc-600">
                {gap.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
