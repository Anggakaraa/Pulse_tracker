import { colors } from "@/lib/tokens";

type RowState = "confirmed" | "review" | "unmapped";

interface Props {
  metricName: string;
  rawName?: string;
  value: number;
  unit: string;
  rowState: RowState;
}

const indicators: Record<RowState, { icon: string; color: string; label: string }> = {
  confirmed: { icon: "✓", color: colors.badge.optimal, label: "Confirmed" },
  review:    { icon: "✎", color: colors.badge.stable, label: "Needs review" },
  unmapped:  { icon: "⚠", color: colors.badge.act, label: "Unmapped" },
};

export default function UploadReviewRow({ metricName, rawName, value, unit, rowState }: Props) {
  const ind = indicators[rowState];
  const isUnmapped = rowState === "unmapped";

  return (
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: "4px",
      padding: "8px 12px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      border: isUnmapped ? `1px solid ${colors.badge.act}` : `1px solid transparent`,
    }}>
      {/* State indicator */}
      <span style={{
        fontFamily: "var(--font-dm-sans)",
        fontSize: "13px",
        color: ind.color,
        flexShrink: 0,
        width: "16px",
        textAlign: "center",
      }}>
        {ind.icon}
      </span>

      {/* Metric name + raw name */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          fontWeight: 400,
          color: isUnmapped ? colors.inkMuted : colors.ink,
        }}>
          {isUnmapped ? "—" : metricName}
        </span>
        {rawName && (
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "12px",
            fontWeight: 300,
            color: colors.inkMuted,
          }}>
            {rawName}
          </span>
        )}
      </div>

      {/* Value + unit */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "3px", flexShrink: 0 }}>
        <span style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "14px",
          fontWeight: 600,
          color: colors.ink,
        }}>
          {value}
        </span>
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "12px",
          fontWeight: 300,
          color: colors.inkMuted,
        }}>
          {unit}
        </span>
      </div>

      {/* State label */}
      <span style={{
        fontFamily: "var(--font-dm-sans)",
        fontSize: "12px",
        fontWeight: 400,
        color: ind.color,
        flexShrink: 0,
      }}>
        {ind.label}
      </span>
    </div>
  );
}
