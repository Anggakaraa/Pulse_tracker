"use client";

import { colors } from "@/lib/tokens";
import type { StatusBadge as StatusBadgeType, CategoryKey } from "@/lib/tokens";
import StatusBadge from "./StatusBadge";
import TrendChart, { type DataPoint } from "./TrendChart";
import { METRIC_CATALOG } from "@/lib/metrics";
import type { RangeBands } from "@/lib/metrics";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  metricKey: string;
  metricName: string;
  category: CategoryKey;
  value: number;
  unit: string;
  badge: StatusBadgeType | null;
  labRange?: string;
  labLow?: number;
  labHigh?: number;
  lastTested?: string;
  previousValue?: number;
  annotation?: string;
  history?: DataPoint[];
  expanded?: boolean;
  onToggle?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBandRange(lo: number | null, hi: number | null): string {
  if (lo === null && hi !== null) return `< ${hi}`;
  if (lo !== null && hi === null) return `≥ ${lo}`;
  if (lo !== null && hi !== null) return `${lo}–${hi}`;
  return "—";
}

const BADGE_ORDER: StatusBadgeType[] = ["optimal", "strong", "stable", "improve", "act"];

const TIER_NOTES: Record<string, string> = {
  A: "Tier A — strong outcome evidence",
  B: "Tier B — useful preventive marker",
  C: "Tier C — interpret with symptoms & history",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Delta({ current, previous, badge }: {
  current: number; previous: number; badge: StatusBadgeType | null;
}) {
  const diff = current - previous;
  const improving = (badge === "optimal" || badge === "strong" || badge === "stable")
    ? diff >= 0 : diff <= 0;
  const arrow = diff > 0 ? "↑" : "↓";
  const color = improving ? colors.badge.optimal : colors.badge.act;
  return (
    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", fontWeight: 400, color }}>
      {arrow} {Math.abs(diff).toFixed(1)} from previous
    </span>
  );
}

function BandSpectrum({ bands, currentBadge, evidenceTier }: {
  bands: RangeBands;
  currentBadge: StatusBadgeType;
  evidenceTier: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Band pills */}
      <div style={{ display: "flex", gap: "4px" }}>
        {BADGE_ORDER.map(b => {
          const isActive = b === currentBadge;
          const color = colors.badge[b];
          const [lo, hi] = bands[b];
          return (
            <div
              key={b}
              style={{
                flex: 1,
                borderRadius: "4px",
                padding: "8px 6px",
                backgroundColor: isActive ? color : `${color}18`,
                border: `1px solid ${isActive ? color : `${color}30`}`,
                display: "flex",
                flexDirection: "column",
                gap: "3px",
              }}
            >
              <span style={{
                fontFamily: "var(--font-outfit)",
                fontWeight: 600,
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: isActive ? "#FBF8F0" : color,
              }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </span>
              <span style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 300,
                fontSize: "10px",
                color: isActive ? "rgba(251,248,240,0.80)" : colors.inkMuted,
                lineHeight: 1.3,
              }}>
                {formatBandRange(lo, hi)}
              </span>
            </div>
          );
        })}
      </div>
      {/* Evidence tier note */}
      {TIER_NOTES[evidenceTier] && (
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 300,
          fontSize: "12px",
          color: colors.inkMuted,
        }}>
          {TIER_NOTES[evidenceTier]}
        </span>
      )}
    </div>
  );
}

function LabRangeBar({ value, low, high, unit }: {
  value: number; low: number | null; high: number | null; unit: string;
}) {
  const withinRange = (low === null || value >= low) && (high === null || value <= high);
  const statusColor = withinRange ? colors.badge.stable : colors.badge.act;
  const statusText  = withinRange ? "Within lab range" : "Outside lab range";

  const rangeMin = low  ?? value * 0.7;
  const rangeMax = high ?? value * 1.3;
  const pct = Math.max(2, Math.min(98, ((value - rangeMin) / (rangeMax - rangeMin)) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: statusColor, flexShrink: 0 }} />
        <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 400, fontSize: "13px", color: statusColor }}>
          {statusText}
        </span>
      </div>

      {/* Bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ height: "6px", borderRadius: "3px", backgroundColor: colors.border, position: "relative" }}>
          <div style={{
            position: "absolute", left: 0, top: 0,
            width: `${pct}%`, height: "100%",
            backgroundColor: statusColor, borderRadius: "3px", opacity: 0.35,
          }} />
          <div style={{
            position: "absolute",
            left: `${pct}%`, top: "50%",
            transform: "translate(-50%, -50%)",
            width: "10px", height: "10px",
            borderRadius: "50%",
            backgroundColor: statusColor,
            border: `2px solid ${colors.surface}`,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 300, color: colors.inkMuted }}>
            {low !== null ? `${low} ${unit}` : "—"}
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 300, color: colors.inkMuted }}>
            Lab range
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 300, color: colors.inkMuted }}>
            {high !== null ? `${high} ${unit}` : "—"}
          </span>
        </div>
      </div>

      <span style={{
        fontFamily: "var(--font-dm-sans)", fontWeight: 300, fontSize: "12px",
        color: colors.inkMuted, fontStyle: "italic",
      }}>
        Reference range only — not scored for optimisation
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MetricRow({
  metricKey, metricName, category, value, unit, badge,
  labRange, labLow, labHigh,
  lastTested, previousValue, annotation, history,
  expanded, onToggle,
}: Props) {
  const categoryColor = colors.category[category];
  const isExpanded = expanded ?? false;
  const meta = METRIC_CATALOG[metricKey];

  return (
    <div>
      {/* ── Collapsed row ──────────────────────────────────────────────────── */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px",
          cursor: "pointer",
          backgroundColor: colors.background,
          transition: `opacity var(--duration-micro) var(--ease)`,
        }}
        onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.opacity = "0.85"; }}
        onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
      >
        {/* Category dot */}
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: categoryColor, flexShrink: 0, marginRight: "12px" }} />

        {/* Name */}
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", fontWeight: 400, color: colors.ink, flex: 1, minWidth: 0, paddingRight: "16px" }}>
          {metricName}
        </span>

        {/* Value (+ lab range for Tier L only) */}
        <span style={{ width: "140px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", paddingRight: "16px" }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
            <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, color: colors.ink }}>{value}</span>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted }}>{unit}</span>
          </span>
          {badge === null && labRange && (
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, whiteSpace: "nowrap" }}>
              Lab {labRange}
            </span>
          )}
        </span>

        {/* Badge (scored only) */}
        <span style={{ width: "120px", flexShrink: 0, paddingRight: "12px" }}>
          {badge && <StatusBadge badge={badge} />}
        </span>

        {/* Chevron */}
        <span style={{
          width: "16px", flexShrink: 0, fontSize: "9px", color: colors.inkMuted,
          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: `transform var(--duration-micro) var(--ease)`,
          textAlign: "center",
        }}>▼</span>
      </div>

      {/* ── Expanded panel ─────────────────────────────────────────────────── */}
      {isExpanded && (
        <div style={{ backgroundColor: colors.surface, borderRadius: "0 0 6px 6px", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Large value + delta */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "42px", fontWeight: 800, color: colors.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {value}
              </span>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", fontWeight: 300, color: colors.inkMuted }}>
                {unit}
              </span>
              {lastTested && (
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted, marginLeft: "auto" }}>
                  {lastTested}
                </span>
              )}
            </div>
            {previousValue !== undefined && (
              <Delta current={value} previous={previousValue} badge={badge} />
            )}
          </div>

          {/* Band spectrum (scored) or Lab range bar (Tier L) */}
          {meta?.isScored && badge && meta.bands ? (
            <BandSpectrum
              bands={meta.bands}
              currentBadge={badge}
              evidenceTier={meta.evidenceTier}
            />
          ) : (
            <LabRangeBar
              value={value}
              low={labLow ?? null}
              high={labHigh ?? null}
              unit={unit}
            />
          )}

          {/* Trend chart */}
          {history && history.length > 0 && (
            <TrendChart
              data={history}
              category={category}
              unit={unit}
              labLow={labLow}
              labHigh={labHigh}
              height={140}
            />
          )}

          {/* Annotation — only shown if one exists */}
          {annotation && (
            <p style={{
              fontFamily: "var(--font-dm-sans)", fontSize: "16px",
              fontWeight: 400, color: "#6A6460",
              margin: 0, lineHeight: 1.65,
            }}>
              {annotation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
