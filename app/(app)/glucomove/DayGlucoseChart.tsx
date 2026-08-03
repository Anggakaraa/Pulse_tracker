"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ReferenceArea, Tooltip, ResponsiveContainer,
} from "recharts";
import { colors, glucomoveEventColors } from "@/lib/tokens";
import { isInSensorErrorPeriod, type SensorErrorPeriod } from "@/lib/glucomove-calcs";

interface Reading { id: string; timestamp: string; glucose_mmol: number; }
interface Meal    { id: string; name: string; meal_start_time: string; }
interface GEvent  { id: string; name: string; event_type: string; start_time: string; end_time: string | null; }

function toWIBMinute(ts: string): number {
  const ms = new Date(ts).getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(ms);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function fmtMinute(m: number | string): string {
  const n = Number(m);
  return `${Math.floor(n / 60).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
}

function parseHHMMtoMinute(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function DayGlucoseChart({ readings, meals, events, sensorErrorPeriods }: {
  readings: Reading[];
  meals: Meal[];
  events: GEvent[];
  sensorErrorPeriods?: SensorErrorPeriod[];
}) {
  if (readings.length < 2) return null;

  const errorPeriods = sensorErrorPeriods ?? [];

  const data = readings
    .map(r => ({
      minuteOfDay: toWIBMinute(r.timestamp),
      glucose: r.glucose_mmol,
      isDimmed: isInSensorErrorPeriod(r.timestamp, errorPeriods),
    }))
    .sort((a, b) => a.minuteOfDay - b.minuteOfDay);

  const gv = data.map(d => d.glucose);
  const domainMin = Math.max(2, Math.floor((Math.min(...gv, 3.9) - 0.5) * 2) / 2);
  const domainMax = Math.ceil((Math.max(...gv, 7.8) + 0.5) * 2) / 2;

  // X domain must include all meal windows, not just reading timestamps
  const mealMinutes = meals.map(m => toWIBMinute(m.meal_start_time));
  const xMin = Math.min(data[0]?.minuteOfDay ?? 0, ...mealMinutes);
  const xMax = Math.max(data.at(-1)?.minuteOfDay ?? 1440, ...mealMinutes.map(m => m + 120));

  return (
    <div style={{ width: "100%", height: 160, marginBottom: "24px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />

          {errorPeriods.map((p, i) => {
            const s = parseHHMMtoMinute(p.start);
            const e = parseHHMMtoMinute(p.end);
            const effectiveEnd = e === 0 ? 1440 : e;
            return (
              <ReferenceArea
                key={`err-${i}`}
                x1={s}
                x2={effectiveEnd}
                fill={colors.inkMuted}
                fillOpacity={0.07}
                stroke={colors.inkMuted}
                strokeOpacity={0.15}
                strokeWidth={1}
              />
            );
          })}

          {/* Combine meals + events, sort by start time, stagger label heights to avoid stacking */}
          {[
            ...events.map(ev => ({
              x1: toWIBMinute(ev.start_time),
              x2: ev.end_time ? toWIBMinute(ev.end_time) : toWIBMinute(ev.start_time) + 60,
              name: ev.name || ev.event_type,
              color: glucomoveEventColors[ev.event_type] ?? colors.inkMuted,
              fillOpacity: 0.08,
              strokeOpacity: 0.2,
            })),
            ...meals.map(m => ({
              x1: toWIBMinute(m.meal_start_time),
              x2: toWIBMinute(m.meal_start_time) + 120,
              name: m.name,
              color: colors.category.nutritional,
              fillOpacity: 0.07,
              strokeOpacity: 0.3,
            })),
          ]
            .sort((a, b) => a.x1 - b.x1)
            .map((item, i) => {
              const label = item.name.length > 14 ? item.name.slice(0, 13) + "…" : item.name;
              return (
                <ReferenceArea
                  key={i}
                  x1={item.x1}
                  x2={item.x2}
                  fill={item.color}
                  fillOpacity={item.fillOpacity}
                  stroke={item.color}
                  strokeOpacity={item.strokeOpacity}
                  strokeWidth={1}
                  label={{ value: label, position: "insideTopLeft", fontSize: 10, fill: item.color, fontFamily: "var(--font-outfit)", dy: 4 + (i % 3) * 12, dx: 4 }}
                />
              );
            })}

          <ReferenceLine y={3.9} stroke={colors.badge.optimal} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} />
          <ReferenceLine y={7.8} stroke={colors.badge.stable}  strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} />

          <XAxis
            dataKey="minuteOfDay"
            type="number"
            domain={[xMin, xMax]}
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
            stroke={colors.category.cardiovascular}
            strokeWidth={2}
            dot={(props: unknown) => {
              const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: { isDimmed?: boolean }; index: number };
              if (payload.isDimmed) {
                return <circle key={`dot-${index}`} cx={cx} cy={cy} r={2} fill={colors.inkMuted} opacity={0.3} />;
              }
              return <circle key={`dot-${index}`} cx={cx} cy={cy} r={1.5} fill={colors.category.cardiovascular} />;
            }}
            activeDot={{ r: 3, fill: colors.category.cardiovascular }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
