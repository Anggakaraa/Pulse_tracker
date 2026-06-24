"use client";
import { useState } from "react";
import { colors } from "@/lib/tokens";
import { getPutihRangeStatus } from "@/lib/putih-metrics";
import TrendChart from "@/components/TrendChart";

interface Props {
  name: string;
  value: number;
  unit: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  history: { date: string; value: number }[];
}

export default function PutihMetricRow({ name, value, unit, rangeLow, rangeHigh, history }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = getPutihRangeStatus(value, rangeLow, rangeHigh);

  const dotColor = status === "normal" ? colors.badge.optimal : colors.badge.act;
  const valueColor = status === "normal" ? colors.ink : colors.badge.act;

  const rangeLabel = rangeLow !== null && rangeHigh !== null
    ? `${rangeLow}–${rangeHigh} ${unit}`
    : rangeHigh !== null ? `< ${rangeHigh} ${unit}`
    : rangeLow !== null ? `> ${rangeLow} ${unit}`
    : "—";

  return (
    <div style={{ borderBottom: `1px solid ${colors.border}` }}>
      <div
        onClick={() => history.length > 1 && setExpanded(e => !e)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px",
          cursor: history.length > 1 ? "pointer" : "default",
          gap: "12px",
        }}
      >
        <span style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: dotColor,
          flexShrink: 0,
        }} />

        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          color: colors.ink,
          flex: 1,
        }}>
          {name}
        </span>

        <span style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "16px",
          fontWeight: 600,
          color: valueColor,
          marginRight: "4px",
        }}>
          {value}
        </span>

        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "12px",
          color: colors.inkMuted,
          minWidth: "60px",
        }}>
          {unit}
        </span>

        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "12px",
          color: colors.inkMuted,
          minWidth: "120px",
          textAlign: "right",
        }}>
          {rangeLabel}
        </span>

        {status !== "normal" && (
          <span style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: colors.badge.act,
            borderLeft: `3px solid ${colors.badge.act}`,
            borderRadius: "0 4px 4px 0",
            padding: "2px 8px",
            marginLeft: "8px",
          }}>
            {status === "high" ? "High" : "Low"}
          </span>
        )}
      </div>

      {expanded && history.length > 1 && (
        <div style={{ padding: "0 20px 16px 20px" }}>
          <TrendChart
            data={history}
            lineColor={colors.ink}
            unit={unit}
            labLow={rangeLow ?? undefined}
            labHigh={rangeHigh ?? undefined}
            height={140}
          />
        </div>
      )}
    </div>
  );
}
