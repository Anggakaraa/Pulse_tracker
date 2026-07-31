"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ReferenceArea, Tooltip, ResponsiveContainer,
} from "recharts";
import { colors } from "@/lib/tokens";

const EVENT_COLOR: Record<string, string> = {
  stress:   "#B5522A",
  exercise: "#5C8A6A",
  alcohol:  "#6E3D8C",
  illness:  "#B5522A",
  sleep:    "#2E547A",
  travel:   "#A8882A",
  fasting:    "#8A8178",
  medication: "#2E547A",
  other:      "#8A8178",
};

interface Reading { id: string; timestamp: string; glucose_mmol: number; }
interface Meal    { id: string; meal_start_time: string; }
interface GEvent  { id: string; event_type: string; start_time: string; end_time: string | null; }

function toWIBMinute(ts: string): number {
  const ms = new Date(ts).getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(ms);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function fmtMinute(m: number | string): string {
  const n = Number(m);
  return `${Math.floor(n / 60).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
}

export default function DayGlucoseChart({ readings, meals, events }: {
  readings: Reading[];
  meals: Meal[];
  events: GEvent[];
}) {
  if (readings.length < 2) return null;

  const data = readings
    .map(r => ({ minuteOfDay: toWIBMinute(r.timestamp), glucose: r.glucose_mmol }))
    .sort((a, b) => a.minuteOfDay - b.minuteOfDay);

  const gv = data.map(d => d.glucose);
  const domainMin = Math.max(2, Math.floor((Math.min(...gv, 3.9) - 0.5) * 2) / 2);
  const domainMax = Math.ceil((Math.max(...gv, 7.8) + 0.5) * 2) / 2;

  return (
    <div style={{ width: "100%", height: 160, marginBottom: "24px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />

          {events.map((ev, i) => (
            <ReferenceArea
              key={i}
              x1={toWIBMinute(ev.start_time)}
              x2={ev.end_time ? toWIBMinute(ev.end_time) : toWIBMinute(ev.start_time) + 60}
              fill={EVENT_COLOR[ev.event_type] ?? "#8A8178"}
              fillOpacity={0.08}
              stroke={EVENT_COLOR[ev.event_type] ?? "#8A8178"}
              strokeOpacity={0.2}
              strokeWidth={1}
            />
          ))}

          <ReferenceLine y={3.9} stroke={colors.badge.optimal} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} />
          <ReferenceLine y={7.8} stroke={colors.badge.stable}  strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} />

          {meals.map((m, i) => (
            <ReferenceLine key={i} x={toWIBMinute(m.meal_start_time)} stroke={colors.inkMuted} strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.4} />
          ))}

          <XAxis
            dataKey="minuteOfDay"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={fmtMinute}
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
            formatter={(v) => v != null ? [`${Number(v).toFixed(1)} mmol/L`, "Glucose"] : ["-", "Glucose"]}
            labelFormatter={v => fmtMinute(Number(v))}
          />
          <Line
            type="monotone"
            dataKey="glucose"
            stroke="#2E547A"
            strokeWidth={2}
            dot={{ r: 3, fill: "#2E547A", stroke: colors.background, strokeWidth: 1 }}
            activeDot={{ r: 4, fill: "#2E547A" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
