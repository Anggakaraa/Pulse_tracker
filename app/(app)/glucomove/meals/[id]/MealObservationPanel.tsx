"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer,
} from "recharts";
import { colors } from "@/lib/tokens";
import { calcMealMetrics, mmol, mmolDiff, RESPONSE_BAND_COLOR, RESPONSE_BAND_LABEL, RESPONSE_SHAPE_LABEL } from "@/lib/glucomove-calcs";
import type { GlucoseReading } from "@/lib/glucomove-calcs";

const WINDOW_OPTIONS = [90, 120, 180, 240] as const;
type WindowMinutes = typeof WINDOW_OPTIONS[number];

export default function MealObservationPanel({
  readings,
  mealStartTime,
}: {
  readings: GlucoseReading[];
  mealStartTime: string;
}) {
  const [obsMinutes, setObsMinutes] = useState<WindowMinutes>(90);

  const mealMs = new Date(mealStartTime).getTime();

  // Filter to: 30 min before meal → obsMinutes after meal start
  const windowed = readings.filter(r => {
    const diff = (new Date(r.timestamp).getTime() - mealMs) / 60000;
    return diff >= -30 && diff <= obsMinutes;
  });

  const metrics = calcMealMetrics(windowed, mealStartTime);

  const chartData = windowed
    .map(r => ({
      min: Math.round((new Date(r.timestamp).getTime() - mealMs) / 60000),
      glucose: r.glucose_mmol,
      isBaseline: r.is_baseline,
    }))
    .sort((a, b) => a.min - b.min);

  const gv = chartData.map(d => d.glucose);
  const domainMin = gv.length ? Math.max(2, Math.floor((Math.min(...gv, 3.9) - 0.3) * 2) / 2) : 3;
  const domainMax = gv.length ? Math.ceil((Math.max(...gv, 7.8) + 0.3) * 2) / 2 : 9;

  function fmtMin(v: number) {
    return v === 0 ? "Meal" : v > 0 ? `+${v}m` : `${v}m`;
  }

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden", marginBottom: "24px" }}>
      {/* Header + window selector */}
      <div style={{ padding: "16px 20px", backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
          Glucose curve
        </p>
        <div style={{ display: "flex", gap: "4px" }}>
          {WINDOW_OPTIONS.map(w => (
            <button
              key={w}
              onClick={() => setObsMinutes(w)}
              style={{
                padding: "4px 10px",
                fontFamily: "var(--font-dm-sans)", fontSize: "12px",
                border: `1px solid ${obsMinutes === w ? colors.ink : colors.border}`,
                borderRadius: "4px",
                backgroundColor: obsMinutes === w ? colors.ink : "transparent",
                color: obsMinutes === w ? colors.background : colors.inkMuted,
                cursor: "pointer",
              }}
            >
              {w}m
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "20px 20px 8px", backgroundColor: colors.background }}>
        {chartData.length < 2 ? (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, paddingBottom: "12px" }}>
            Not enough readings in this window yet.
          </p>
        ) : (
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <ReferenceLine x={0} stroke="#A8882A" strokeWidth={1.5} strokeOpacity={0.6} />
                <ReferenceLine y={3.9} stroke={colors.badge.optimal} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />
                <ReferenceLine y={7.8} stroke={colors.badge.stable}  strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />
                <XAxis
                  dataKey="min"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={fmtMin}
                  tick={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, fill: colors.inkMuted }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[domainMin, domainMax]}
                  tickFormatter={v => Number(v).toFixed(1)}
                  tick={{ fontFamily: "var(--font-dm-sans)", fontSize: 11, fill: colors.inkMuted }}
                  axisLine={false} tickLine={false}
                  width={38}
                />
                <Tooltip
                  contentStyle={{
                    fontFamily: "var(--font-dm-sans)", fontSize: 12,
                    border: `1px solid ${colors.border}`, borderRadius: "4px",
                    backgroundColor: colors.background, color: colors.ink,
                    boxShadow: "0px 2px 8px rgba(42,37,32,0.07)",
                  }}
                  formatter={(v) => [`${Number(v).toFixed(1)} mmol/L`, "Glucose"]}
                  labelFormatter={(v) => fmtMin(Number(v))}
                />
                <Line
                  type="monotone"
                  dataKey="glucose"
                  stroke="#2E547A"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isBaseline) {
                      return <circle key={payload.min} cx={cx} cy={cy} r={4} fill="#4A8C62" stroke={colors.background} strokeWidth={1.5} />;
                    }
                    return <circle key={payload.min} cx={cx} cy={cy} r={1.5} fill="#2E547A" />;
                  }}
                  activeDot={{ r: 3, fill: "#2E547A" }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Window-dependent metrics */}
      {metrics.baselineGlucoseMmol !== null && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0", borderTop: `1px solid ${colors.border}` }}>
          {[
            { label: "Final reading", value: mmol(metrics.finalGlucoseMmol) },
            { label: "vs baseline",   value: mmolDiff(metrics.finalDiffFromBaselineMmol) },
            { label: "Observation",   value: metrics.observationDurationMinutes !== null ? `${metrics.observationDurationMinutes} min` : "—" },
            { label: "Near baseline", value: metrics.returnToBaselineMinutes !== null ? `${metrics.returnToBaselineMinutes} min` : "Not yet" },
          ].map((stat, i) => (
            <div key={i} style={{ padding: "14px 16px", borderLeft: i > 0 ? `1px solid ${colors.border}` : "none", backgroundColor: colors.background }}>
              <p style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
                {stat.label}
              </p>
              <p style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, color: colors.ink }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
