"use client";

import {
  ComposedChart,
  Line,
  ReferenceArea,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  LabelList,
} from "recharts";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";

export interface DataPoint {
  date: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  category: CategoryKey;
  unit: string;
  optimalLow?: number;
  optimalHigh?: number;
  labLow?: number;
  labHigh?: number;
  height?: number;
}

// Custom tooltip
function ChartTooltip({ active, payload, unit }: { active?: boolean; payload?: { value: number }[]; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: "4px",
      padding: "5px 9px",
      fontFamily: "var(--font-dm-sans)",
      fontSize: "12px",
      fontWeight: 400,
      color: colors.ink,
      boxShadow: "0px 2px 8px rgba(42,37,32,0.07)",
    }}>
      {payload[0].value} {unit}
    </div>
  );
}

// Custom dot — 2px tick style
function TickDot(props: { cx?: number; cy?: number; fill?: string }) {
  const { cx, cy, fill } = props;
  if (!cx || !cy) return null;
  return <circle cx={cx} cy={cy} r={2.5} fill={fill} stroke="none" />;
}

export default function TrendChart({
  data,
  category,
  unit,
  optimalLow,
  optimalHigh,
  labLow,
  labHigh,
  height = 160,
}: Props) {
  const categoryColor = colors.category[category];
  const count = data.length;
  const showBands = count >= 3 && (optimalLow !== undefined || optimalHigh !== undefined || labLow !== undefined || labHigh !== undefined);

  // Compute Y domain with padding
  const allValues = data.map(d => d.value);
  const rangeValues = [optimalLow, optimalHigh, labLow, labHigh].filter((v): v is number => v !== undefined);
  const allNumbers = [...allValues, ...rangeValues];
  const min = Math.min(...allNumbers);
  const max = Math.max(...allNumbers);
  const pad = (max - min) * 0.20 || 1;
  const yMin = Math.max(0, parseFloat((min - pad).toFixed(1)));
  const yMax = parseFloat((max + pad).toFixed(1));

  // Single point — dot + label only
  if (count === 1) {
    return (
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
            <YAxis hide domain={[yMin, yMax]} />
            <XAxis dataKey="date" hide />
            <ReferenceDot
              x={data[0].date}
              y={data[0].value}
              r={4}
              fill={categoryColor}
              stroke="none"
              label={{
                value: `${data[0].value} ${unit}`,
                position: "top",
                fontFamily: "DM Sans",
                fontSize: 11,
                fill: colors.ink,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>

          {/* Reference bands — lab range (outer, amber 8%) */}
          {showBands && (labLow !== undefined || labHigh !== undefined) && (
            <ReferenceArea
              y1={labLow ?? yMin}
              y2={labHigh ?? yMax}
              fill="#A8882A"
              fillOpacity={0.08}
              stroke="none"
            />
          )}

          {/* Reference bands — optimal range (inner, green 15%) */}
          {showBands && (optimalLow !== undefined || optimalHigh !== undefined) && (
            <ReferenceArea
              y1={optimalLow ?? yMin}
              y2={optimalHigh ?? yMax}
              fill="#4A8C62"
              fillOpacity={0.15}
              stroke="none"
            />
          )}

          <XAxis
            dataKey="date"
            axisLine={{ stroke: colors.border, strokeWidth: 0.5 }}
            tickLine={false}
            tick={{
              fontFamily: "DM Sans",
              fontSize: 10,
              fill: colors.inkMuted,
              fontWeight: 300,
            }}
            dy={6}
          />

          <YAxis
            domain={[yMin, yMax]}
            axisLine={false}
            tickLine={false}
            tickCount={4}
            tick={{
              fontFamily: "DM Sans",
              fontSize: 10,
              fill: colors.inkMuted,
              fontWeight: 300,
            }}
            width={36}
          />

          <Tooltip
            content={<ChartTooltip unit={unit} />}
            cursor={{ stroke: colors.border, strokeWidth: 1 }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke={categoryColor}
            strokeWidth={2}
            dot={count >= 3 ? <TickDot fill={categoryColor} /> : false}
            activeDot={{ r: 4, fill: categoryColor, stroke: "none" }}
            isAnimationActive={false}
          />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
