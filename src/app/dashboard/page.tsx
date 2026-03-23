import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.role === "REVIEWER") redirect("/admin");

  const applications = await db.application.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      documents: { select: { id: true } },
      _count: { select: { extractedEntities: true } },
    },
  });

  const statusColors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700",
    SUBMITTED: "bg-blue-100 text-blue-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    NEEDS_MORE_INFO: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Your Applications</h1>
        <Link
          href="/apply"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New Application
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center">
          <p className="text-zinc-500">No applications yet.</p>
          <Link
            href="/apply"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Start your KYB verification
          </Link>
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
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Documents
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Entities Found
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Updated
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
                  <td className="px-4 py-3 text-zinc-500">
                    {app.updatedAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={
                        app.status === "DRAFT"
                          ? `/apply?id=${app.id}`
                          : `/review/${app.id}`
                      }
                      className="text-blue-600 hover:text-blue-500"
                    >
                      {app.status === "DRAFT" ? "Continue" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
