"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { AdminConversation } from "@roomxchange/shared";
import { useAdminConversationDeleteMutation, useAdminConversations } from "../../../../components/admin/data";
import { EmptyState, Modal, PageHeader, PaginationControls, StatusBadge } from "../../../../components/admin/ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function readConversationFilter() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("conversation") ?? "";
}

export default function AdminConversationsPage() {
  const deleteMutation = useAdminConversationDeleteMutation();
  const [activeConversationId, setActiveConversationId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminConversation | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack[cursorStack.length - 1];

  useEffect(() => {
    setActiveConversationId(readConversationFilter());
  }, []);

  const conversationsQuery = useAdminConversations({
    limit: 20,
    cursor: currentCursor,
    query: searchQuery || undefined
  });
  const sortedConversations = conversationsQuery.data?.items ?? [];
  const conversations = sortedConversations;
  const activeConversation =
    sortedConversations.find((conversation) => conversation.conversationId === activeConversationId) ?? sortedConversations[0] ?? null;

  return (
    <section className="admin-workspace">
      <PageHeader title="Conversations" description="Thread-level moderation with the data currently exposed by the backend." />

      <div className="admin-split-layout">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Threads</h3>
              <p className="admin-panel-copy">Latest activity first.</p>
            </div>
          </div>
          <div className="admin-inline-filters" style={{ marginBottom: 16 }}>
            <input
              className="admin-select"
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCursorStack([]);
              }}
              placeholder="Search conversations"
              value={searchQuery}
            />
          </div>

          {conversationsQuery.isLoading ? (
            <div className="admin-loading-list" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="admin-loading-row" key={index}>
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : sortedConversations.length ? (
            <div className="admin-thread-list">
              {sortedConversations.map((conversation) => (
                <button
                  className={`admin-thread-row ${activeConversation?.conversationId === conversation.conversationId ? "active" : ""}`}
                  key={conversation.conversationId}
                  onClick={() => setActiveConversationId(conversation.conversationId)}
                  type="button"
                >
                    <img alt={conversation.listingTitle} src={conversation.listingPreviewImage} />
                    <span>
                      <strong>{conversation.listingTitle}</strong>
                      <small>
                        {conversation.buyer.name} - {conversation.owner.name}
                      </small>
                      <small>{conversation.lastMessagePreview}</small>
                    </span>
                  <StatusBadge value={`${conversation.messageCount} messages`} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No conversations yet" description="Conversation moderation becomes available when users begin contacting publishers." />
          )}
          <PaginationControls
            canNext={Boolean(conversationsQuery.data?.nextCursor)}
            canPrevious={cursorStack.length > 0}
            currentCount={conversations.length}
            onNext={() => {
              if (conversationsQuery.data?.nextCursor) {
                setCursorStack((current) => [...current, conversationsQuery.data?.nextCursor as string]);
              }
            }}
            onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
            total={conversationsQuery.data?.total ?? 0}
          />
        </article>

        <article className="admin-panel">
          {activeConversation ? (
            <div className="admin-stack">
              <div className="admin-detail-head">
                <div>
                  <h3>{activeConversation.listingTitle}</h3>
                  <p className="admin-record-meta">Last activity {formatDate(activeConversation.lastMessageAt)}</p>
                </div>
                <StatusBadge value={`${activeConversation.messageCount} messages`} />
              </div>

              <img alt={activeConversation.listingTitle} className="admin-detail-media" src={activeConversation.listingPreviewImage} />

              <div className="admin-detail-grid">
                <div>
                  <span className="admin-detail-label">Buyer</span>
                  <strong>{activeConversation.buyer.name}</strong>
                </div>
                <div>
                  <span className="admin-detail-label">Owner</span>
                  <strong>{activeConversation.owner.name}</strong>
                </div>
                <div>
                  <span className="admin-detail-label">Conversation ID</span>
                  <strong>{activeConversation.conversationId}</strong>
                </div>
                <div>
                  <span className="admin-detail-label">Created</span>
                  <strong>{formatDate(activeConversation.createdAt)}</strong>
                </div>
              </div>

              <div className="admin-quote-card">{activeConversation.lastMessagePreview}</div>

              <div className="admin-actions">
                <Link className="button secondary" href={`/dashboard/admin/listings?owner=${activeConversation.owner.userId}` as Route}>
                  View owner listings
                </Link>
                <button className="button" onClick={() => setPendingDelete(activeConversation)} type="button">
                  Remove thread
                </button>
              </div>
            </div>
          ) : (
            <EmptyState title="Pick a thread" description="Select a conversation from the left panel to inspect the latest message context." />
          )}
        </article>
      </div>

      <Modal
        description="This removes the full thread using the existing admin conversation delete endpoint."
        onClose={() => setPendingDelete(null)}
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Remove thread for "${pendingDelete.listingTitle}"?` : "Remove thread"}
      >
        <div className="admin-actions">
          <button className="button secondary" onClick={() => setPendingDelete(null)} type="button">
            Cancel
          </button>
          <button
            className="button"
            onClick={() => {
              if (!pendingDelete) {
                return;
              }
              deleteMutation.mutate(pendingDelete.conversationId, {
                onSuccess: () => setPendingDelete(null)
              });
            }}
            type="button"
          >
            Remove thread
          </button>
        </div>
      </Modal>
    </section>
  );
}
