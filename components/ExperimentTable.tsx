"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import type { StatusBadge, CategoryKey } from "@/lib/tokens";
import { formatBandRange } from "@/lib/metrics";
import { supabase } from "@/lib/supabase";

export interface ExperimentMetric {
  key: string;
  name: string;
  unit: string;
  category: CategoryKey;
  readings: (number | null)[];  // one per date column, null = not tested
  states: (StatusBadge | null)[];
  targetLow?: number | null;
  targetHigh?: number | null;
}

interface Props {
  experimentId: string;
  dates: string[];           // e.g. ["Aug 2024", "Jan 2025"]
  testIds: string[];         // UUID for each date column
  columnLabels: Record<string, string>; // testId → caption
  excludedTestIds: string[];
  metrics: ExperimentMetric[];
}

const badgeColors: Record<StatusBadge, string> = {
  optimal: colors.badge.optimal,
  strong:  colors.badge.strong,
  stable:  colors.badge.stable,
  improve: colors.badge.improve,
  act:     colors.badge.act,
};

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  const up = current > previous;
  const pct = Math.abs(((current - previous) / previous) * 100).toFixed(0);
  return (
    <span style={{
      fontFamily: "var(--font-dm-sans)",
      fontSize: "12px",
      fontWeight: 300,
      color: colors.inkMuted,
      marginLeft: "4px",
      whiteSpace: "nowrap",
    }}>
      {up ? "▲" : "▼"} {pct}%
    </span>
  );
}

export default function ExperimentTable({ experimentId, dates, testIds, columnLabels: initialLabels, excludedTestIds: initialExcluded, metrics }: Props) {
  const router = useRouter();
  const [labels, setLabels] = useState<Record<string, string>>(initialLabels);

  const handleLabelBlur = async (testId: string, value: string) => {
    const trimmed = value.slice(0, 20);
    const updated = { ...labels, [testId]: trimmed };
    setLabels(updated);
    await supabase
      .from("experiments")
      .update({ column_labels: updated })
      .eq("id", experimentId);
  };

  const handleExclude = async (testId: string) => {
    const updated = [...initialExcluded, testId];
    await supabase
      .from("experiments")
      .update({ excluded_test_ids: updated })
      .eq("id", experimentId);
    router.refresh();
  };

  return (
    <div style={{
      width: "100%",
      overflowX: "auto",
    }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "fixed",
      }}>
        {/* Header */}
        <thead>
          <tr>
            {/* Metric name col */}
            <th style={{
              width: "200px",
              padding: "8px 10px",
              textAlign: "left",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "12px",
              fontWeight: 300,
              color: colors.inkMuted,
              borderBottom: `1px solid ${colors.border}`,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              Metric
            </th>

            {/* Date columns */}
            {dates.map((date, i) => {
              const testId = testIds[i] ?? `col-${i}`;
              const label = labels[testId] ?? "";
              return (
                <th key={testId} style={{
                  padding: "8px 10px",
                  textAlign: "right",
                  borderBottom: `1px solid ${colors.border}`,
                  verticalAlign: "bottom",
                }}>
                  {/* Date + remove button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", marginBottom: "4px" }}>
                    <span style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "12px",
                      fontWeight: 300,
                      color: colors.inkMuted,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}>
                      {i === 0 ? `${date} · Baseline` : date}
                    </span>
                    <button
                      onClick={() => handleExclude(testId)}
                      title="Remove from experiment"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: colors.inkMuted, fontSize: "9px", lineHeight: 1,
                        padding: "1px 2px", borderRadius: "3px", flexShrink: 0,
                        opacity: 0.4,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = colors.badge.act; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.4"; (e.currentTarget as HTMLButtonElement).style.color = colors.inkMuted; }}
                    >
                      ✕
                    </button>
                  </div>
                  {/* Editable caption */}
                  <input
                    type="text"
                    defaultValue={label}
                    maxLength={20}
                    placeholder="Add note…"
                    onBlur={e => handleLabelBlur(testId, e.target.value)}
                    style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "11px",
                      fontWeight: 300,
                      color: colors.inkMuted,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      textAlign: "right",
                      width: "100%",
                      padding: "1px 0",
                      cursor: "text",
                    }}
                  />
                </th>
              );
            })}

            {/* Total change col */}
            <th style={{
              padding: "8px 10px",
              textAlign: "right",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "12px",
              fontWeight: 300,
              color: colors.inkMuted,
              borderBottom: `1px solid ${colors.border}`,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              Total change
            </th>

            {/* Target band col */}
            <th style={{
              padding: "8px 10px",
              textAlign: "right",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "12px",
              fontWeight: 300,
              color: colors.inkMuted,
              borderBottom: `1px solid ${colors.border}`,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              Target band
            </th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.key}>
              {/* Metric name */}
              <td style={{
                padding: "8px 10px",
                borderBottom: `1px solid ${colors.border}`,
                verticalAlign: "middle",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: colors.category[metric.category],
                    flexShrink: 0,
                    display: "inline-block",
                  }} />
                  <span>
                    <span style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "14px",
                      fontWeight: 400,
                      color: colors.ink,
                    }}>
                      {metric.name}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "14px",
                      fontWeight: 300,
                      color: colors.inkMuted,
                      marginLeft: "4px",
                    }}>
                      {metric.unit}
                    </span>
                  </span>
                </div>
              </td>

              {/* Value cells */}
              {metric.readings.map((reading, i) => {
                const state = metric.states[i];
                const prevReading = i > 0 ? metric.readings.slice(0, i).reverse().find(r => r !== null) : null;
                const cellKey = testIds[i] ?? `cell-${i}`;

                return (
                  <td key={cellKey} style={{
                    padding: "8px 10px",
                    textAlign: "right",
                    borderBottom: `1px solid ${colors.border}`,
                    verticalAlign: "middle",
                  }}>
                    {reading !== null ? (
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
                        <span style={{
                          fontFamily: "var(--font-outfit)",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: state ? badgeColors[state] : colors.ink,
                        }}>
                          {reading}
                        </span>
                        {prevReading !== null && prevReading !== undefined && (
                          <TrendArrow current={reading} previous={prevReading} />
                        )}
                      </span>
                    ) : (
                      <span style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "14px",
                        fontWeight: 300,
                        color: colors.inkMuted,
                      }}>
                        —
                      </span>
                    )}
                  </td>
                );
              })}

              {/* Total change */}
              {(() => {
                const baseline = metric.readings.find(r => r !== null);
                const latest = [...metric.readings].reverse().find(r => r !== null);
                const canCompute = baseline !== null && baseline !== undefined && latest !== null && latest !== undefined && baseline !== latest;
                if (!canCompute) {
                  return (
                    <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: `1px solid ${colors.border}`, verticalAlign: "middle" }}>
                      <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 300, color: colors.inkMuted }}>—</span>
                    </td>
                  );
                }
                const up = latest! > baseline!;
                const pct = Math.abs(((latest! - baseline!) / baseline!) * 100).toFixed(0);
                return (
                  <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: `1px solid ${colors.border}`, verticalAlign: "middle" }}>
                    <span style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "14px",
                      fontWeight: 400,
                      color: colors.inkMuted,
                      whiteSpace: "nowrap",
                    }}>
                      {up ? "▲" : "▼"} {pct}%
                    </span>
                  </td>
                );
              })()}

              {/* Target band — user-defined */}
              <td style={{
                padding: "8px 10px",
                textAlign: "right",
                borderBottom: `1px solid ${colors.border}`,
                verticalAlign: "middle",
              }}>
                {(metric.targetLow != null || metric.targetHigh != null) ? (
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 300, color: colors.badge.optimal }}>
                    {formatBandRange(metric.targetLow ?? null, metric.targetHigh ?? null)}
                  </span>
                ) : (
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 300, color: colors.inkMuted }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
