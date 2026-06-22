"use client";

import { colors, shadow } from "@/lib/tokens";
import type { StatusBadge, CategoryKey } from "@/lib/tokens";
import { useState } from "react";

import { CATEGORY_LABELS } from "@/lib/metrics";

const categoryLabels: Record<CategoryKey, string> = {
  ...CATEGORY_LABELS,
  // Richer display names for category cards
  metabolic:      "Metabolic Health",
  cardiovascular: "Cardiovascular Risk",
  hormonal:       "Hormonal Balance",
  nutritional:    "Nutritional & Gut",
};

const BADGE_SUMMARY: Record<StatusBadge, string> = {
  optimal: "Optimal",
  strong:  "Strong",
  stable:  "Stable",
  improve: "Needs improvement",
  act:     "Act now",
};

const dotStyle = (state: StatusBadge | null): React.CSSProperties => {
  if (!state || state === "optimal" || state === "strong") {
    return { backgroundColor: "rgba(251,248,240,0.90)" };
  }
  return {
    backgroundColor: colors.badge[state],
    border: "1px solid rgba(251,248,240,0.30)",
  };
};

export interface SecondaryMetric {
  name: string;
  value: number;
  unit: string;
  badge: StatusBadge | null;
}

interface Props {
  category: CategoryKey;
  metricName?: string;
  value?: number;
  unit?: string;
  badge?: StatusBadge | null;
  secondaryMetrics?: SecondaryMetric[];
}

export default function CategoryCard({
  category,
  metricName,
  value,
  unit,
  badge = null,
  secondaryMetrics,
}: Props) {
  const summary = badge ? BADGE_SUMMARY[badge] : null;
  const [hovered, setHovered] = useState(false);
  const hasData = value !== undefined;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: colors.category[category],
        borderRadius: "6px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        boxShadow: hovered ? shadow.raised : "none",
        transition: `box-shadow var(--duration-micro) var(--ease)`,
        minHeight: "160px",
        height: "100%",
      }}
    >
      {/* Eyebrow row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: "13px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(251,248,240,0.60)",
        }}>
          {categoryLabels[category]}
        </span>
        <span style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          flexShrink: 0,
          ...dotStyle(badge),
        }} />
      </div>

      {hasData ? (
        <>
          {/* Primary metric — large */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
              <span style={{
                fontFamily: "var(--font-outfit)",
                fontWeight: 800,
                fontSize: "32px",
                color: "#FBF8F0",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}>
                {value}
              </span>
              <span style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 300,
                fontSize: "12px",
                color: "rgba(251,248,240,0.55)",
              }}>
                {unit}
              </span>
            </div>
            <span style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 400,
              fontSize: "12px",
              color: "rgba(251,248,240,0.60)",
            }}>
              {metricName}
            </span>
          </div>

          {/* Secondary metrics — smaller */}
          {secondaryMetrics && secondaryMetrics.length > 0 && (
            <div style={{
              display: "flex",
              gap: "8px",
              paddingTop: "8px",
              borderTop: "1px solid rgba(251,248,240,0.12)",
              flex: 1,
              alignItems: "flex-start",
            }}>
              {secondaryMetrics.map((m, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                    <span style={{
                      fontFamily: "var(--font-outfit)",
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "rgba(251,248,240,0.90)",
                      lineHeight: 1,
                    }}>
                      {m.value}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontWeight: 300,
                      fontSize: "12px",
                      color: "rgba(251,248,240,0.50)",
                    }}>
                      {m.unit}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 400,
                    fontSize: "12px",
                    color: "rgba(251,248,240,0.55)",
                    display: "block",
                    marginTop: "1px",
                  }}>
                    {m.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {summary && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                flexShrink: 0,
                ...dotStyle(badge),
              }} />
              <span style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 400,
                fontSize: "10px",
                color: "rgba(251,248,240,0.60)",
              }}>
                {summary}
              </span>
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 300,
            fontSize: "12px",
            fontStyle: "italic",
            color: "rgba(251,248,240,0.50)",
          }}>
            No recent data
          </span>
        </div>
      )}
    </div>
  );
}
