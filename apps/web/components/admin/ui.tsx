"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import clsx from "clsx";
import { MoreHorizontal, X } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-page-head">
      <div className="admin-page-copy">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="admin-actions">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  href,
  tone = "default"
}: {
  label: string;
  value: ReactNode;
  note?: string;
  href?: string;
  tone?: "default" | "accent" | "success" | "warning" | "info";
}) {
  const content = (
    <>
      <span className="admin-stat-label">{label}</span>
      <strong className="admin-stat-value">{value}</strong>
      {note ? <span className="admin-stat-note">{note}</span> : null}
    </>
  );

  const className = clsx("admin-stat-card", tone !== "default" && `soft-${tone}`, href && "is-link");

  if (href) {
    return (
      <Link className={className} href={href as Route}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone =
    normalized.includes("active") || normalized.includes("resolved") || normalized.includes("published")
      ? "success"
      : normalized.includes("review") || normalized.includes("pending") || normalized.includes("open")
        ? "warning"
        : normalized.includes("admin") || normalized.includes("subscribed")
          ? "info"
          : normalized.includes("frozen") || normalized.includes("removed") || normalized.includes("dismissed") || normalized.includes("archived")
            ? "neutral"
            : "accent";

  return <span className={`admin-status-badge ${tone}`}>{value.replace(/_/g, " ")}</span>;
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <div className="admin-actions">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="admin-loading-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="admin-loading-row" key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

type Column<Row> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  loading
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty: ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return <LoadingState rows={5} />;
  }

  if (!rows.length) {
    return <>{empty}</>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td className={column.className} key={column.key}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SegmentTabs({
  options,
  value,
  onChange
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="admin-segment-tabs" role="tablist" aria-label="Filters">
      {options.map((option) => (
        <button
          className={clsx("admin-segment-tab", value === option.value && "active")}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PaginationControls({
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  total,
  currentCount
}: {
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  total: number;
  currentCount: number;
}) {
  return (
    <div className="admin-pagination">
      <span>
        Showing {currentCount} of {total}
      </span>
      <div className="admin-actions">
        <button className="button secondary" disabled={!canPrevious} onClick={onPrevious} type="button">
          Previous
        </button>
        <button className="button secondary" disabled={!canNext} onClick={onNext} type="button">
          Next
        </button>
      </div>
    </div>
  );
}

export function ActionDropdown({
  label = "Actions",
  items
}: {
  label?: string;
  items: Array<{ label: string; onSelect: () => void; danger?: boolean; disabled?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      window.addEventListener("click", handleClick);
    }

    return () => window.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div className="admin-dropdown" ref={ref}>
      <button
        aria-expanded={open}
        aria-label={label}
        className="admin-icon-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div className="admin-dropdown-menu">
          {items.map((item) => (
            <button
              className={clsx("admin-dropdown-item", item.danger && "danger")}
              disabled={item.disabled}
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-modal="true"
        className="admin-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="admin-modal-head">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button aria-label="Close" className="admin-icon-button" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
