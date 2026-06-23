"use client";
import { useState } from "react";
import { colors } from "@/lib/tokens";
import { getPutihRangeStatus } from "@/lib/putih-metrics";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  metricKey: string;
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

  const dotColor = status === "normal" ? "#4A8C62" : "#A03828";
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
        {/* Range indicator dot */}
        <span style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: dotColor,
          flexShrink: 0,
        }} />

        {/* Name */}
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          color: colors.ink,
          flex: 1,
        }}>
          {name}
        </span>

        {/* Value */}
        <span style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "16px",
          fontWeight: 600,
          color: status === "normal" ? colors.ink : "#A03828",
          marginRight: "4px",
        }}>
          {value}
        </span>

        {/* Unit */}
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "12px",
          color: colors.inkMuted,
          minWidth: "60px",
        }}>
          {unit}
        </span>

        {/* Range */}
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "12px",
          color: colors.inkMuted,
          minWidth: "120px",
          textAlign: "right",
        }}>
          {rangeLabel}
        </span>

        {/* Status label */}
        {status !== "normal" && (
          <span style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#A03828",
            borderLeft: "3px solid #A03828",
            borderRadius: "0 4px 4px 0",
            padding: "2px 8px",
            marginLeft: "8px",
          }}>
            {status === "high" ? "High" : "Low"}
          </span>
        )}
      </div>

      {/* Trend chart — only shown when expanded and history exists */}
      {expanded && history.length > 1 && (
        <div style={{ padding: "0 20px 20px 20px" }}>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}
                tick={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, fill: colors.inkMuted }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: "4px", backgroundColor: colors.surface }}
                formatter={(v) => [`${v} ${unit}`, name]}
                labelFormatter={d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              />
              {rangeHigh !== null && (
                <ReferenceLine y={rangeHigh} stroke="#A03828" strokeDasharray="3 3" strokeWidth={1} />
              )}
              {rangeLow !== null && rangeLow > 0 && (
                <ReferenceLine y={rangeLow} stroke="#A03828" strokeDasharray="3 3" strokeWidth={1} />
              )}
              <Line type="monotone" dataKey="value" stroke={colors.ink} strokeWidth={1.5} dot={{ r: 3, fill: colors.ink }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
