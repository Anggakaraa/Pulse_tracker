import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";
import { CATEGORY_LABELS } from "@/lib/metrics";

interface Props {
  category: CategoryKey;
}

export default function CategoryPill({ category }: Props) {
  return (
    <span
      style={{
        backgroundColor: colors.category[category],
        color: colors.background,
        fontFamily: "var(--font-outfit)",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: "4px",
        display: "inline-block",
        lineHeight: 1.4,
      }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
