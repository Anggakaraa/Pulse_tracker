import { colors } from "@/lib/tokens";
import type { StatusBadge as StatusBadgeType } from "@/lib/tokens";
import { BADGE_LABELS } from "@/lib/metrics";

interface Props {
  badge: StatusBadgeType;
}

export default function StatusBadge({ badge }: Props) {
  const color = colors.badge[badge];
  return (
    <span
      style={{
        borderLeft: `3px solid ${color}`,
        padding: "3px 9px",
        borderRadius: "0 4px 4px 0",
        minWidth: "100px",
        fontFamily: "var(--font-outfit)",
        fontWeight: 600,
        fontSize: "10px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color,
        background: "none",
        display: "inline-block",
        lineHeight: 1.4,
      }}
    >
      {BADGE_LABELS[badge]}
    </span>
  );
}
