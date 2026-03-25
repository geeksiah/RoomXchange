"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../../../components/session-provider";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export default function AdminConversationsPage() {
  const { api, session } = useSession();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: () => api.getAdminConversations(),
    enabled: Boolean(session && session.user.role !== "member")
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => api.deleteAdminConversation(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    }
  });

  const conversations = conversationsQuery.data ?? [];

  return (
    <section className="admin-workspace">
      <div className="admin-page-head">
        <div>
          <h1>Conversations</h1>
          <p>Monitor active buyer and owner threads.</p>
        </div>
      </div>

      <div className="grid">
        {conversations.length ? (
          conversations.map((conversation) => (
            <article key={conversation.conversationId} className="admin-record-card">
              <div className="admin-record-head">
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <img
                    alt={conversation.listingTitle}
                    src={conversation.listingPreviewImage}
                    style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover", background: "#f3f4f6" }}
                  />
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong>{conversation.listingTitle}</strong>
                    <span className="admin-record-meta">
                      {conversation.buyer.name} · {conversation.owner.name}
                    </span>
                    <span className="admin-record-meta">{formatDate(conversation.lastMessageAt)}</span>
                  </div>
                </div>
                <span className="admin-tag">{conversation.messageCount} msgs</span>
              </div>

              <div className="admin-record-meta" style={{ lineHeight: 1.6 }}>
                {conversation.lastMessagePreview}
              </div>

              <div className="admin-actions">
                <button className="button" onClick={() => deleteMutation.mutate(conversation.conversationId)}>
                  Remove thread
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">{conversationsQuery.isLoading ? "Loading conversations..." : "No conversations."}</div>
        )}
      </div>
    </section>
  );
}
