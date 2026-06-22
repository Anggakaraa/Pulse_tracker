import MetricList from "@/components/MetricList";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";
import { getMetricDataForCategory } from "@/lib/queries";
import { CATEGORY_LABELS } from "@/lib/metrics";

const CATEGORY_PAGE_LABELS: Record<string, string> = {
  metabolic:      "Metabolic Health",
  cardiovascular: "Cardiovascular Risk",
  inflammation:   "Inflammation",
  hormonal:       "Hormonal Balance",
  nutritional:    "Nutritional Status",
  blood:          "Blood & Organ Function",
};

const VALID_CATEGORIES = ["metabolic", "cardiovascular", "inflammation", "hormonal", "nutritional", "blood"];

// RGB values matching colors.category tokens for header tint
const CATEGORY_RGB: Record<string, string> = {
  metabolic:      "92, 138, 106",
  cardiovascular: "46, 84, 122",
  inflammation:   "181, 82, 42",
  hormonal:       "110, 61, 140",
  nutritional:    "168, 136, 42",
  blood:          "122, 58, 74",
};

export default async function MetricDetailPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  if (!VALID_CATEGORIES.includes(category)) {
    return (
      <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
        Category not found.
      </div>
    );
  }

  const metrics = await getMetricDataForCategory(category as CategoryKey);
  const label = CATEGORY_PAGE_LABELS[category] ?? category;
  const rgb = CATEGORY_RGB[category];

  return (
    <div>
      {/* Header — tinted with category color at 15% opacity */}
      <div style={{
        backgroundColor: `rgba(${rgb}, 0.15)`,
        borderBottom: "1px solid #EAE3D3",
        marginBottom: "40px",
        marginLeft: "-64px",
        marginRight: "-64px",
        marginTop: "-64px",
        padding: "64px 64px 32px",
      }}>
        <p style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.inkMuted,
          marginBottom: "8px",
          marginTop: 0,
        }}>
          {CATEGORY_LABELS[category as CategoryKey] ?? category}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "28px",
            fontWeight: 600,
            color: colors.ink,
            letterSpacing: "-0.01em",
            margin: 0,
          }}>
            {label}
          </h1>
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "13px",
            fontWeight: 300,
            color: colors.inkMuted,
          }}>
            {metrics.length} {metrics.length === 1 ? "marker" : "markers"}
          </span>
        </div>
      </div>

      {metrics.length === 0 ? (
        <p style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          fontWeight: 300,
          fontStyle: "italic",
          color: colors.inkMuted,
        }}>
          No data yet for this category.
        </p>
      ) : (
        <MetricList metrics={metrics} />
      )}
    </div>
  );
}
