"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../../components/session-provider";

export default function ReportsPage() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => api.getAdminReports()
  });

  const updateMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: "reviewing" | "resolved" | "dismissed" }) =>
      api.updateAdminReport(reportId, { status, resolutionNote: `Updated to ${status} from dashboard.` }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    }
  });

  return (
    <section className="grid">
      <div>
        <h2 style={{ marginBottom: 6 }}>Moderation reports</h2>
        <p className="muted" style={{ margin: 0 }}>
          Admin-only review flow for reported listings and owners.
        </p>
      </div>
      {reportsQuery.data?.length ? (
        reportsQuery.data.map((report) => (
          <article key={report.reportId} className="card" style={{ padding: 22, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>{report.reason}</strong>
              <span className="pill">{report.status}</span>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Listing {report.listingId} reported by {report.reporterId}.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="button secondary" onClick={() => updateMutation.mutate({ reportId: report.reportId, status: "reviewing" })}>
                Reviewing
              </button>
              <button className="button" onClick={() => updateMutation.mutate({ reportId: report.reportId, status: "resolved" })}>
                Resolve
              </button>
              <button className="button secondary" onClick={() => updateMutation.mutate({ reportId: report.reportId, status: "dismissed" })}>
                Dismiss
              </button>
            </div>
          </article>
        ))
      ) : (
        <div className="empty-state">
          {reportsQuery.isLoading ? "Loading moderation queue..." : "No reports found or this account does not have admin access."}
        </div>
      )}
    </section>
  );
}
