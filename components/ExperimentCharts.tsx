"use client";

import { useState } from "react";
import TrendChart from "@/components/TrendChart";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";
import type { ExperimentDetailMetric } from "@/lib/queries";
import { METRIC_CATALOG } from "@/lib/metrics";

interface ExperimentData {
  dates: string[];
  metrics: ExperimentDetailMetric[];
  categories: CategoryKey[];
}

export default function ExperimentCharts({ exp }: { exp: ExperimentData }) {
  const [open, setOpen] = useState(false);

  // Convert readings array to DataPoint[] for TrendChart
  const toDataPoints = (metric: ExperimentDetailMetric) =>
    exp.dates
      .map((date, i) => metric.readings[i] !== null ? { date, value: metric.readings[i] as number } : null)
      .filter((p): p is { date: string; value: number } => p !== null);

  return (
    <div>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: open ? "24px" : 0,
        }}
      >
        <p style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.inkMuted,
          margin: 0,
        }}>
          Trend charts
        </p>
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "11px",
          color: colors.inkMuted,
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: `transform var(--duration-micro) var(--ease)`,
          display: "inline-block",
        }}>
          ›
        </span>
      </button>

      {open && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px",
        }}>
          {exp.metrics.map(metric => {
            const dataPoints = toDataPoints(metric);
            if (dataPoints.length === 0) return null;

            return (
              <div
                key={metric.key}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "6px",
                  padding: "20px",
                }}
              >
                {/* Chart header */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}>
                  <span style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 400,
                    fontSize: "14px",
                    color: colors.ink,
                  }}>
                    {metric.name}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 300,
                    fontSize: "12px",
                    color: colors.inkMuted,
                  }}>
                    {metric.unit}
                  </span>
                </div>

                <TrendChart
                  data={dataPoints}
                  category={metric.category}
                  unit={metric.unit}
                  height={120}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
