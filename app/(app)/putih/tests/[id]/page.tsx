import Link from "next/link";
import { notFound } from "next/navigation";
import { colors } from "@/lib/tokens";
import { PUTIH_METRIC_MAP, getPutihRangeStatus } from "@/lib/putih-metrics";
import { getPutihTestDetail, formatPutihDate } from "@/lib/putih-queries";

export default async function PutihTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const test = await getPutihTestDetail(id);
  if (!test) notFound();

  return (
    <div>
      {/* Back */}
      <Link href="/putih/tests" style={{ textDecoration: "none" }}>
        <p style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "13px",
          color: colors.inkMuted,
          margin: "0 0 24px 0",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}>
          ← Test Log
        </p>
      </Link>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.inkMuted,
          margin: "0 0 8px 0",
        }}>
          Putih · {test.lab_name ?? "Unknown Lab"}
        </p>
        <h1 style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "28px",
          fontWeight: 600,
          color: colors.ink,
          margin: 0,
          letterSpacing: "-0.01em",
        }}>
          {formatPutihDate(test.date)}
        </h1>
        {test.notes && (
          <p style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "14px",
            color: colors.inkMuted,
            margin: "12px 0 0 0",
            lineHeight: 1.6,
          }}>
            {test.notes}
          </p>
        )}
      </div>

      {/* Readings */}
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
        {/* Header row */}
        <div style={{
          display: "flex",
          padding: "10px 20px",
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          {["Marker", "Result", "Unit", "Reference Range", ""].map((col, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-outfit)",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: colors.inkMuted,
              flex: i === 0 ? 1 : i === 4 ? "0 0 80px" : "0 0 120px",
              textAlign: i > 0 ? "right" : "left",
            }}>
              {col}
            </span>
          ))}
        </div>

        {test.readings.length === 0 ? (
          <div style={{ padding: "24px 20px" }}>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted, margin: 0 }}>
              No markers recorded for this test.
            </p>
          </div>
        ) : (
          test.readings.map((r, i) => {
            const meta = PUTIH_METRIC_MAP[r.metric_key];
            const rangeLow = r.lab_range_low ?? meta?.rangeLow ?? null;
            const rangeHigh = r.lab_range_high ?? meta?.rangeHigh ?? null;
            const status = getPutihRangeStatus(r.value, rangeLow, rangeHigh);
            const rangeLabel = rangeLow !== null && rangeHigh !== null
              ? `${rangeLow}–${rangeHigh}`
              : rangeHigh !== null ? `< ${rangeHigh}`
              : rangeLow !== null ? `> ${rangeLow}`
              : "—";

            return (
              <div key={r.metric_key} style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: i < test.readings.length - 1 ? `1px solid ${colors.border}` : "none",
              }}>
                {/* Name */}
                <span style={{ flex: 1, fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>
                  {meta?.name ?? r.metric_key.toUpperCase()}
                </span>

                {/* Value */}
                <span style={{
                  flex: "0 0 120px",
                  textAlign: "right",
                  fontFamily: "var(--font-outfit)",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: status === "normal" ? colors.ink : colors.badge.act,
                }}>
                  {r.value}
                </span>

                {/* Unit */}
                <span style={{
                  flex: "0 0 120px",
                  textAlign: "right",
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "12px",
                  color: colors.inkMuted,
                }}>
                  {r.unit || meta?.unit || ""}
                </span>

                {/* Range */}
                <span style={{
                  flex: "0 0 120px",
                  textAlign: "right",
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "12px",
                  color: colors.inkMuted,
                }}>
                  {rangeLabel}
                </span>

                {/* Status */}
                <span style={{
                  flex: "0 0 80px",
                  textAlign: "right",
                  fontFamily: "var(--font-outfit)",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: status === "normal" ? colors.badge.optimal : colors.badge.act,
                }}>
                  {status === "normal" ? "Normal" : status === "high" ? "High" : "Low"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
