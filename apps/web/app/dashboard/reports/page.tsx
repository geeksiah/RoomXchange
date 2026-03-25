"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../../components/session-provider";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export default function ReportsPage() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => api.getAdminReports()
  });

  const updateMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: "reviewing" | "resolved" | "dismissed" }) =>
      api.updateAdminReport(reportId, { status, resolutionNote: `Updated to ${status}.` }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    }
  });

  const reports = reportsQuery.data ?? [];

  return (
    <section className="admin-workspace">
      <div className="admin-page-head">
        <div>
          <h1>Reports</h1>
          <p>Listing and publisher moderation.</p>
        </div>
      </div>

      <div className="grid">
        {reports.length ? (
          reports.map((report) => (
            <article key={report.reportId} className="admin-record-card">
              <div className="admin-record-head">
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{report.reason}</strong>
                  <span className="admin-record-meta">
                    {formatDate(report.createdAt)} · listing {report.listingId.slice(0, 8)}
                  </span>
                </div>
                <span className="admin-tag">{report.status}</span>
              </div>

              <div className="admin-actions">
                <button className="button secondary" onClick={() => updateMutation.mutate({ reportId: report.reportId, status: "reviewing" })}>
                  Review
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
          <div className="empty-state">{reportsQuery.isLoading ? "Loading reports..." : "No reports."}</div>
        )}
      </div>
    </section>
  );
}
