"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ReferenceArea, Tooltip, ResponsiveContainer,
} from "recharts";
import { colors } from "@/lib/tokens";
import { mmol, mmolDiff } from "@/lib/glucomove-calcs";

const WINDOW_OPTIONS = [90, 120, 180, 240] as const;
type WindowMinutes = typeof WINDOW_OPTIONS[number];

interface GlucoseReading {
  id: string;
  timestamp: string;
  glucose_mmol: number;
  is_baseline: boolean;
}

function nearestReading(
  readings: { min: number; glucose: number }[],
  targetMin: number,
  toleranceMin = 20
): number | null {
  let best: { min: number; glucose: number } | null = null;
  let bestDist = Infinity;
  for (const r of readings) {
    const dist = Math.abs(r.min - targetMin);
    if (dist <= toleranceMin && dist < bestDist) {
      bestDist = dist;
      best = r;
    }
  }
  return best?.glucose ?? null;
}

export default function EventObservationPanel({
  readings,
  startTime,
  endTime,
  eventColor,
}: {
  readings: GlucoseReading[];
  startTime: string;
  endTime: string | null;
  eventColor: string;
}) {
  const [obsMinutes, setObsMinutes] = useState<WindowMinutes>(90);

  const startMs = new Date(startTime).getTime();
  const eventDurationMin = endTime
    ? Math.round((new Date(endTime).getTime() - startMs) / 60000)
    : null;

  // Observation extends obsMinutes past end (or start if no end)
  const obsEndMin = (eventDurationMin ?? 0) + obsMinutes;

  const windowed = readings.filter(r => {
    const diff = (new Date(r.timestamp).getTime() - startMs) / 60000;
    return diff >= -30 && diff <= obsEndMin;
  });

  const chartData = windowed
    .map(r => ({
      min: Math.round((new Date(r.timestamp).getTime() - startMs) / 60000),
      glucose: r.glucose_mmol,
    }))
    .sort((a, b) => a.min - b.min);

  const gv = chartData.map(d => d.glucose);
  const domainMin = gv.length ? Math.max(2, Math.floor((Math.min(...gv, 3.9) - 0.3) * 2) / 2) : 3;
  const domainMax = gv.length ? Math.ceil((Math.max(...gv, 7.8) + 0.3) * 2) / 2 : 9;

  function fmtMin(v: number) {
    if (v === 0) return "Start";
    if (eventDurationMin !== null && v === eventDurationMin) return "End";
    return v > 0 ? `+${v}m` : `${v}m`;
  }

  // Window-dependent metrics
  const atStart   = nearestReading(chartData, 0);
  const atEnd     = eventDurationMin !== null ? nearestReading(chartData, eventDurationMin) : null;
  const finalGlucose = chartData.length > 0 ? chartData[chartData.length - 1].glucose : null;
  const change    = atStart !== null && finalGlucose !== null ? finalGlucose - atStart : null;
  const obsActual = chartData.length > 0
    ? chartData[chartData.length - 1].min - chartData[0].min
    : null;

  const bandFill = `${eventColor}18`; // ~10% opacity

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
              +{w}m
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

                {/* Event duration band */}
                {eventDurationMin !== null && (
                  <ReferenceArea
                    x1={0} x2={eventDurationMin}
                    fill={bandFill}
                    stroke="none"
                  />
                )}

                {/* Event start line */}
                <ReferenceLine x={0} stroke={eventColor} strokeWidth={1.5} strokeOpacity={0.7} />

                {/* Event end line */}
                {eventDurationMin !== null && (
                  <ReferenceLine x={eventDurationMin} stroke={eventColor} strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.5} />
                )}

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
                  dot={{ r: 1.5, fill: "#2E547A", strokeWidth: 0 }}
                  activeDot={{ r: 3, fill: "#2E547A" }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Window-dependent metrics */}
      {atStart !== null && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0", borderTop: `1px solid ${colors.border}` }}>
          {[
            { label: "At start",    value: mmol(atStart) },
            { label: "At end",      value: atEnd !== null ? mmol(atEnd) : "—" },
            { label: "Change",      value: change !== null ? mmolDiff(change) : "—" },
            { label: "Observation", value: obsActual !== null ? `${obsActual} min` : "—" },
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
