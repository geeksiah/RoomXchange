"use client";

import Link from "next/link";
import { Camera, Diamond, MapPinned } from "lucide-react";
import { formatCurrency, type ListingSummary } from "@roomxchange/shared";

export function PropertyCard({ listing, href = "/subscribe" }: { listing: ListingSummary; href?: string }) {
  return (
    <Link
      href={href}
      className="card"
      style={{ overflow: "hidden", display: "grid", minHeight: 360, background: "rgba(255,255,255,0.86)" }}
    >
      <div style={{ position: "relative" }}>
        <img src={listing.previewImage} alt={listing.title} style={{ width: "100%", height: 250, objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            background: "rgba(34, 24, 18, 0.72)",
            color: "white",
            padding: "10px 14px",
            borderRadius: 999
          }}
        >
          {formatCurrency(listing.price)}
        </div>
      </div>
      <div style={{ padding: 18, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <strong style={{ fontSize: 20, lineHeight: 1.2 }}>{listing.title}</strong>
          {listing.vrUrl ? (
            <span className="pill" style={{ fontSize: 12 }}>
              <Diamond size={14} />
              VR
            </span>
          ) : null}
        </div>
        <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <MapPinned size={16} />
          {listing.location}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {listing.amenities.slice(0, 4).map((amenity) => (
            <span key={amenity} className="pill" style={{ fontSize: 12 }}>
              <Camera size={13} />
              {amenity.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
