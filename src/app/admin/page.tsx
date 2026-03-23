import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "REVIEWER") redirect("/dashboard");

  const applications = await db.application.findMany({
    where: {
      status: { in: ["SUBMITTED", "IN_REVIEW", "NEEDS_MORE_INFO"] },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { email: true, name: true, organization: true } },
      documents: { select: { id: true } },
      _count: { select: { extractedEntities: true } },
      attestations: { orderBy: { attestedAt: "desc" }, take: 1 },
      reviewActions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Also show recently resolved
  const resolved = await db.application.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      user: { select: { email: true, name: true } },
      reviewActions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const statusColors: Record<string, string> = {
    SUBMITTED: "bg-blue-100 text-blue-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-700",
    NEEDS_MORE_INFO: "bg-orange-100 text-orange-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Review Queue</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Applications pending review. Click to open the side-by-side review
          view.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center">
          <p className="text-zinc-500">No applications pending review.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Company
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Applicant
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Docs
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Entities
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Attested
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {app.companyName || "Untitled"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {app.user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[app.status]}`}
                    >
                      {app.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {app.documents.length}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {app._count.extractedEntities}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {app.attestations.length > 0 ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-zinc-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/review/${app.id}`}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">
            Recently Resolved
          </h2>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Applicant
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Decision
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {resolved.map((app) => (
                  <tr key={app.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {app.companyName || "Untitled"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {app.user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[app.status]}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/review/${app.id}`}
                        className="text-blue-600 hover:text-blue-500"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
