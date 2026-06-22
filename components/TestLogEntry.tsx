"use client";

import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";
import CategoryPill from "./CategoryPill";

interface Props {
  date: string;
  labName?: string;
  markerCount: number;
  categories: CategoryKey[];
  statusSummary?: string;
  statusState?: "optimal" | "strong" | "stable" | "improve" | "act";
  isOld?: boolean;
  onClick?: () => void;
}

export default function TestLogEntry({
  date,
  labName,
  markerCount,
  categories,
  statusSummary,
  statusState = "stable",
  isOld = false,
  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: colors.surface,
        borderRadius: "6px",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        opacity: isOld ? 0.6 : 1,
        cursor: onClick ? "pointer" : "default",
        border: `1px solid ${colors.border}`,
        transition: `box-shadow var(--duration-micro) var(--ease), border-color var(--duration-micro) var(--ease)`,
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0px 2px 8px rgba(42,37,32,0.07)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.borderColor = colors.border;
      }}
    >
      {/* Left: date, lab, category pills */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span style={{
            fontFamily: "var(--font-outfit)",
            fontWeight: 600,
            fontSize: "14px",
            color: colors.ink,
          }}>
            {date}
          </span>
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 400,
            fontSize: "12px",
            color: colors.inkMuted,
          }}>
            {[labName, `${markerCount} markers`].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {categories.map(cat => (
            <CategoryPill key={cat} category={cat} />
          ))}
        </div>
      </div>

      {/* Right: status summary + chevron */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {statusSummary && (
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 400,
            fontSize: "12px",
            color: statusState ? colors.badge[statusState] : colors.inkMuted,
          }}>
            {statusSummary}
          </span>
        )}
        <span style={{ fontSize: "9px", color: colors.inkMuted }}>›</span>
      </div>
    </div>
  );
}
