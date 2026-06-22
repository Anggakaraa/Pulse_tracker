"use client";

import Link from "next/link";
import CategoryPill from "./CategoryPill";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";

export interface ExperimentSummary {
  id: string;
  name: string;
  hypothesis: string;
  startDate: string;
  endDate?: string;
  status: "active" | "completed";
  categories: CategoryKey[];
  metricCount: number;
}

export default function ExperimentCard({ exp }: { exp: ExperimentSummary }) {
  return (
    <Link href={`/experiments/${exp.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          padding: "20px 24px",
          cursor: "pointer",
          transition: `box-shadow var(--duration-micro) var(--ease), border-color var(--duration-micro) var(--ease)`,
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.boxShadow = "0px 2px 8px rgba(42,37,32,0.07)";
          el.style.borderColor = "transparent";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.boxShadow = "none";
          el.style.borderColor = colors.border;
        }}
      >
        {/* Top row: name + status */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "6px" }}>
          <span style={{
            fontFamily: "var(--font-outfit)",
            fontWeight: 600,
            fontSize: "16px",
            color: colors.ink,
            lineHeight: 1.3,
          }}>
            {exp.name}
          </span>
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 300,
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: exp.status === "active" ? colors.badge.optimal : colors.inkMuted,
            flexShrink: 0,
            marginTop: "3px",
          }}>
            {exp.status === "active" ? "● Active" : "Completed"}
          </span>
        </div>

        {/* Hypothesis */}
        <p style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 400,
          fontSize: "14px",
          color: colors.inkMuted,
          margin: "0 0 14px",
          lineHeight: 1.5,
        }}>
          {exp.hypothesis}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 300,
            fontSize: "12px",
            color: colors.inkMuted,
          }}>
            {exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : " – ongoing"} · {exp.metricCount} markers
          </span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {exp.categories.map(cat => <CategoryPill key={cat} category={cat} />)}
          </div>
        </div>
      </div>
    </Link>
  );
}
