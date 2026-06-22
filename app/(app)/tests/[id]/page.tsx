import Link from "next/link";
import { notFound } from "next/navigation";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/metrics";
import { getTestById } from "@/lib/queries";
import type { TestDetailReading } from "@/lib/queries";
import StatusBadge from "@/components/StatusBadge";
import AddMarkerPanel from "@/components/AddMarkerPanel";

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_META = Object.fromEntries(
  CATEGORY_ORDER.map(cat => [cat, {
    label: CATEGORY_LABELS[cat],
    color: colors.category[cat as CategoryKey],
  }])
) as Record<CategoryKey, { label: string; color: string }>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = await getTestById(id);

  if (!test) notFound();

  // Group readings by category
  const byCategory: Partial<Record<CategoryKey, TestDetailReading[]>> = {};
  for (const r of test.readings) {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category]!.push(r);
  }

  const presentCategories = CATEGORY_ORDER.filter(
    cat => (byCategory[cat]?.length ?? 0) > 0
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/tests"
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 300,
            fontSize: "14px",
            color: colors.inkMuted,
            textDecoration: "none",
          }}
        >
          ← Test log
        </Link>
      </div>

      {/* Header */}
      <p style={{
        fontFamily: "var(--font-outfit)",
        fontWeight: 600,
        fontSize: "13px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: colors.inkMuted,
        marginBottom: "8px",
      }}>
        {test.labName}
      </p>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: test.notes ? "8px" : "40px",
      }}>
        <h1 style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: "28px",
          color: colors.ink,
          letterSpacing: "-0.01em",
          margin: 0,
        }}>
          {test.dateFormatted}
        </h1>
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 300,
          fontSize: "14px",
          color: colors.inkMuted,
        }}>
          {test.readings.length} {test.readings.length === 1 ? "marker" : "markers"}
        </span>
      </div>

      {test.notes && (
        <p style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 400,
          fontSize: "14px",
          color: colors.inkMuted,
          marginTop: 0,
          marginBottom: "40px",
        }}>
          {test.notes}
        </p>
      )}

      {/* Readings grouped by category */}
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {presentCategories.map(cat => {
          const meta = CATEGORY_META[cat];
          const readings = byCategory[cat]!;
          // Sort: act → improve → stable → strong → optimal → null
          const BADGE_ORDER = ["act", "improve", "stable", "strong", "optimal", null];
          readings.sort((a, b) => BADGE_ORDER.indexOf(a.badge) - BADGE_ORDER.indexOf(b.badge));

          return (
            <section key={cat}>
              {/* Category heading */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: meta.color,
                  flexShrink: 0,
                }} />
                <h2 style={{
                  fontFamily: "var(--font-outfit)",
                  fontWeight: 600,
                  fontSize: "13px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: meta.color,
                  margin: 0,
                }}>
                  {meta.label}
                </h2>
              </div>

              {/* Readings table */}
              <div style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                overflow: "hidden",
              }}>
                {readings.map((r, i) => {
                  const labRange = r.labLow != null && r.labHigh != null
                    ? `${r.labLow}–${r.labHigh}`
                    : r.labLow != null ? `> ${r.labLow}`
                    : r.labHigh != null ? `< ${r.labHigh}`
                    : null;

                  return (
                    <div
                      key={r.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 20px",
                        borderBottom: i < readings.length - 1 ? `1px solid ${colors.border}` : "none",
                      }}
                    >
                      {/* Name */}
                      <span style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "14px",
                        fontWeight: 400,
                        color: colors.ink,
                        flex: "1",
                      }}>
                        {r.name}
                      </span>

                      {/* Lab range */}
                      <span style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "12px",
                        fontWeight: 300,
                        color: colors.inkMuted,
                        marginRight: "24px",
                        minWidth: "80px",
                        textAlign: "right",
                      }}>
                        {labRange ? `ref ${labRange}` : ""}
                      </span>

                      {/* Value */}
                      <span style={{
                        fontFamily: "var(--font-outfit)",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: colors.ink,
                        letterSpacing: "-0.01em",
                        marginRight: "6px",
                        minWidth: "60px",
                        textAlign: "right",
                      }}>
                        {r.value}
                      </span>
                      <span style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "12px",
                        fontWeight: 300,
                        color: colors.inkMuted,
                        marginRight: "16px",
                        minWidth: "50px",
                      }}>
                        {r.unit}
                      </span>

                      {/* Badge */}
                      <div style={{ minWidth: "90px" }}>
                        {r.badge ? (
                          <StatusBadge badge={r.badge} />
                        ) : (
                          <span style={{
                            fontFamily: "var(--font-dm-sans)",
                            fontSize: "12px",
                            fontWeight: 300,
                            color: colors.inkMuted,
                          }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Add marker */}
      <AddMarkerPanel testId={test.id} />

      {/* Footer */}
      <div style={{
        marginTop: "64px",
        paddingTop: "24px",
        borderTop: `1px solid ${colors.border}`,
      }}>
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 300,
          fontSize: "14px",
          color: colors.inkMuted,
          opacity: 0.5,
        }}>
          No document attached
        </span>
      </div>
    </div>
  );
}
