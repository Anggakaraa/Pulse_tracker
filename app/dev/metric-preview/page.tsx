"use client";

import { colors } from "@/lib/tokens";

// ─── Design tokens ────────────────────────────────────────────────────────────
const badge = {
  optimal: "#4A8C62",
  strong:  "#7AAF8A",
  stable:  "#A8882A",
  improve: "#B5522A",
  act:     "#A03828",
};

const badgeLabels = ["Optimal", "Strong", "Stable", "Improve", "Act"];
const badgeKeys   = ["optimal", "strong", "stable", "improve", "act"] as const;

// ─── Band Spectrum component ──────────────────────────────────────────────────
interface Band {
  label: string;
  range: string;
  key: typeof badgeKeys[number];
}

function BandSpectrum({ bands, currentBadge, evidenceTier }: {
  bands: Band[];
  currentBadge: typeof badgeKeys[number];
  evidenceTier: "A" | "B" | "C";
}) {
  const tierLabels = { A: "Tier A — strong outcome evidence", B: "Tier B — useful preventive marker", C: "Tier C — interpret with symptoms & history" };
  const tierColors = { A: colors.category.cardiovascular, B: colors.category.metabolic, C: colors.inkMuted };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Band pills row */}
      <div style={{ display: "flex", gap: "4px" }}>
        {bands.map(b => {
          const isActive = b.key === currentBadge;
          const color = badge[b.key];
          return (
            <div
              key={b.key}
              style={{
                flex: 1,
                borderRadius: "4px",
                padding: "8px 10px",
                backgroundColor: isActive ? color : `${color}18`,
                border: isActive ? `1.5px solid ${color}` : `1px solid ${color}30`,
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                position: "relative",
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
                {b.label}
              </span>
              <span style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 300,
                fontSize: "10px",
                color: isActive ? "rgba(251,248,240,0.80)" : colors.inkMuted,
                lineHeight: 1.3,
              }}>
                {b.range}
              </span>
              {isActive && (
                <span style={{
                  position: "absolute",
                  bottom: "-6px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `5px solid ${color}`,
                }} />
              )}
            </div>
          );
        })}
      </div>
      {/* Evidence tier note */}
      <span style={{
        fontFamily: "var(--font-dm-sans)",
        fontWeight: 300,
        fontSize: "12px",
        color: tierColors[evidenceTier],
        letterSpacing: "0.01em",
      }}>
        {tierLabels[evidenceTier]}
      </span>
    </div>
  );
}

// ─── Lab Range indicator (Tier L) ────────────────────────────────────────────
function LabRangeIndicator({ value, low, high, unit }: {
  value: number; low: number | null; high: number | null; unit: string;
}) {
  const withinRange = (low === null || value >= low) && (high === null || value <= high);
  const statusColor = withinRange ? badge.stable : badge.act;
  const statusText  = withinRange ? "Within lab range" : "Outside lab range";

  // Calculate position on the range bar
  const rangeMin = low ?? (value - 20);
  const rangeMax = high ?? (value + 20);
  const pct = Math.max(0, Math.min(100, ((value - rangeMin) / (rangeMax - rangeMin)) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Status line */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          backgroundColor: statusColor, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 400,
          fontSize: "13px",
          color: statusColor,
        }}>
          {statusText}
        </span>
      </div>

      {/* Range bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{
          height: "6px",
          borderRadius: "3px",
          backgroundColor: colors.border,
          position: "relative",
          overflow: "visible",
        }}>
          {/* Filled portion up to value */}
          <div style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${pct}%`,
            height: "100%",
            backgroundColor: statusColor,
            borderRadius: "3px",
            opacity: 0.4,
          }} />
          {/* Value marker */}
          <div style={{
            position: "absolute",
            left: `${pct}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: statusColor,
            border: `2px solid ${colors.background}`,
            boxShadow: `0 0 0 1px ${statusColor}`,
          }} />
        </div>
        {/* Range labels */}
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
        fontFamily: "var(--font-dm-sans)",
        fontWeight: 300,
        fontSize: "12px",
        color: colors.inkMuted,
        fontStyle: "italic",
      }}>
        Tier L — reference range only, not scored for optimisation
      </span>
    </div>
  );
}

// ─── Expanded Panel shell ─────────────────────────────────────────────────────
function ExpandedPanel({ children, value, unit, delta, previousValue, direction }: {
  children: React.ReactNode;
  value: number;
  unit: string;
  delta?: number;
  previousValue?: number;
  direction?: "up" | "down";
}) {
  const arrow = direction === "up" ? "↑" : "↓";
  const deltaColor = direction === "up" ? badge.act : badge.optimal; // assume lower=better for demo

  return (
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: "0 0 6px 6px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    }}>
      {/* Value + delta */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "42px", fontWeight: 800, color: colors.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {value}
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", fontWeight: 300, color: colors.inkMuted }}>
            {unit}
          </span>
        </div>
        {delta !== undefined && (
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", fontWeight: 400, color: deltaColor }}>
            {arrow} {delta} from previous
          </span>
        )}
      </div>

      {/* Main content — band spectrum or lab range */}
      {children}

      {/* Annotation placeholder */}
      <p style={{
        fontFamily: "var(--font-dm-sans)",
        fontSize: "16px",
        fontWeight: 300,
        fontStyle: "italic",
        color: colors.inkMuted,
        margin: 0,
        lineHeight: 1.65,
      }}>
        No annotations yet — add a note for context.
      </p>
    </div>
  );
}

// ─── Collapsed row shell ──────────────────────────────────────────────────────
function CollapsedRow({ name, value, unit, badgeKey, showBadge = true }: {
  name: string; value: number; unit: string;
  badgeKey?: typeof badgeKeys[number]; showBadge?: boolean;
}) {
  const color = badgeKey ? badge[badgeKey] : colors.inkMuted;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "16px 20px",
      backgroundColor: colors.surface,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <span style={{ width: "16px", flexShrink: 0, display: "flex", alignItems: "center" }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: colors.category.metabolic, display: "inline-block" }} />
      </span>
      <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", fontWeight: 400, color: colors.ink, flex: 1 }}>
        {name}
      </span>
      <span style={{ width: "120px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", paddingRight: "16px" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, color: colors.ink }}>{value}</span>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted }}>{unit}</span>
        </span>
      </span>
      <span style={{ width: "120px", flexShrink: 0, paddingRight: "12px" }}>
        {showBadge && badgeKey && (
          <span style={{
            borderLeft: `3px solid ${color}`,
            padding: "3px 9px",
            borderRadius: "0 4px 4px 0",
            fontFamily: "var(--font-outfit)",
            fontWeight: 600,
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color,
          }}>
            {badgeKey.charAt(0).toUpperCase() + badgeKey.slice(1)}
          </span>
        )}
      </span>
      <span style={{ width: "16px", flexShrink: 0, fontSize: "9px", color: colors.inkMuted, textAlign: "center" as const }}>▼</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MetricPreviewPage() {
  return (
    <div style={{ backgroundColor: colors.background, minHeight: "100vh", padding: "64px", display: "flex", flexDirection: "column", gap: "64px" }}>

      <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "22px", color: colors.ink, margin: 0 }}>
        Metric row — expanded panel redesign
      </h1>

      {/* ── Tier A example: LDL-C ─────────────────────────────────────────── */}
      <div>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginBottom: "8px", marginTop: 0 }}>
          Tier A — LDL-C, 241 mg/dL (Act)
        </p>
        <div style={{ borderRadius: "6px", border: `1px solid ${colors.border}`, overflow: "hidden", maxWidth: "680px" }}>
          <CollapsedRow name="LDL-C" value={241} unit="mg/dL" badgeKey="act" />
          <ExpandedPanel value={241} unit="mg/dL" delta={33} direction="up">
            <BandSpectrum
              currentBadge="act"
              evidenceTier="A"
              bands={[
                { key: "optimal", label: "Optimal", range: "< 70" },
                { key: "strong",  label: "Strong",  range: "70–100" },
                { key: "stable",  label: "Stable",  range: "100–130" },
                { key: "improve", label: "Improve", range: "130–190" },
                { key: "act",     label: "Act",     range: "≥ 190" },
              ]}
            />
          </ExpandedPanel>
        </div>
      </div>

      {/* ── Tier B example: Uric acid ─────────────────────────────────────── */}
      <div>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginBottom: "8px", marginTop: 0 }}>
          Tier B — Uric acid, 6.9 mg/dL (Stable)
        </p>
        <div style={{ borderRadius: "6px", border: `1px solid ${colors.border}`, overflow: "hidden", maxWidth: "680px" }}>
          <CollapsedRow name="Uric acid" value={6.9} unit="mg/dL" badgeKey="stable" />
          <ExpandedPanel value={6.9} unit="mg/dL" delta={0.5} direction="up">
            <BandSpectrum
              currentBadge="stable"
              evidenceTier="B"
              bands={[
                { key: "optimal", label: "Optimal", range: "4.0–5.5" },
                { key: "strong",  label: "Strong",  range: "5.5–6.0" },
                { key: "stable",  label: "Stable",  range: "6.0–7.0" },
                { key: "improve", label: "Improve", range: "7.0–8.0" },
                { key: "act",     label: "Act",     range: "> 8.0" },
              ]}
            />
          </ExpandedPanel>
        </div>
      </div>

      {/* ── Tier L example: Haemoglobin ───────────────────────────────────── */}
      <div>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginBottom: "8px", marginTop: 0 }}>
          Tier L — Haemoglobin, 16.1 g/dL (unscored)
        </p>
        <div style={{ borderRadius: "6px", border: `1px solid ${colors.border}`, overflow: "hidden", maxWidth: "680px" }}>
          <CollapsedRow name="Haemoglobin" value={16.1} unit="g/dL" showBadge={false} />
          <ExpandedPanel value={16.1} unit="g/dL">
            <LabRangeIndicator value={16.1} low={13.2} high={17.3} unit="g/dL" />
          </ExpandedPanel>
        </div>
      </div>

      {/* ── Tier L example: outside range ─────────────────────────────────── */}
      <div>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginBottom: "8px", marginTop: 0 }}>
          Tier L — Bilirubin total, 1.5 mg/dL (outside lab range)
        </p>
        <div style={{ borderRadius: "6px", border: `1px solid ${colors.border}`, overflow: "hidden", maxWidth: "680px" }}>
          <CollapsedRow name="Bilirubin total" value={1.5} unit="mg/dL" showBadge={false} />
          <ExpandedPanel value={1.5} unit="mg/dL">
            <LabRangeIndicator value={1.5} low={0.2} high={1.2} unit="mg/dL" />
          </ExpandedPanel>
        </div>
      </div>

    </div>
  );
}
